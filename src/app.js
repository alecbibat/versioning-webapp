const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

const db = require('../models/db');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer();

// Home page showing latest version of the document
app.get('/', async (req, res) => {
  const latest = await db.getLatestVersion();
  res.render('index', { document: latest });
});

// Page to create new version
app.get('/new', (req, res) => {
  res.render('new');
});

app.post('/new', upload.none(), async (req, res) => {
  const { location, content } = req.body;
  await db.saveNewVersion(location, content);
  res.redirect('/');
});

// View history
app.get('/history', async (req, res) => {
  const history = await db.getAllVersions();
  res.render('history', { versions: history });
});

// View specific version
app.get('/view/:id', async (req, res) => {
  const version = await db.getVersionById(req.params.id);
  res.render('view', { document: version });
});

// Edit version
app.get('/edit/:id', async (req, res) => {
  const version = await db.getVersionById(req.params.id);
  res.render('edit', { document: version });
});

app.post('/edit/:id', upload.none(), async (req, res) => {
  const { location, content } = req.body;
  await db.updateVersion(req.params.id, location, content);
  res.redirect('/');
});

// Location-specific view
app.get('/location/:location', async (req, res) => {
  const docs = await db.getVersionsByLocation(req.params.location);
  res.render('location', { documents: docs, location: req.params.location });
});

// PDF download route
app.get('/download/:id', async (req, res) => {
  const version = await db.getVersionById(req.params.id);
  const templatePath = path.join(__dirname, '../views/view.ejs');

  ejs.renderFile(templatePath, { document: version }, async (err, html) => {
    if (err) return res.status(500).send('Template render error');

    try {
     const browser = await puppeteer.launch({
  executablePath: '/app/.apt/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({ format: 'A4' });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="document-${req.params.id}.pdf"`);
      res.send(pdfBuffer);
    } catch (e) {
      res.status(500).send('PDF generation failed');
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
