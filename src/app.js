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

app.get('/', async (req, res) => {
  try {
    const latest = await db.getLatestVersion();
    res.render('index', { document: latest });
  } catch (error) {
    console.error('Error in GET /:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/new', (req, res) => {
  try {
    res.render('new');
  } catch (error) {
    console.error('Error in GET /new:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/new', upload.none(), async (req, res) => {
  try {
    const { location, content } = req.body;
    await db.saveNewVersion(location, content);
    res.redirect('/');
  } catch (error) {
    console.error('Error in POST /new:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/history', async (req, res) => {
  try {
    const history = await db.getAllVersions();
    res.render('history', { versions: history });
  } catch (error) {
    console.error('Error in GET /history:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/view/:id', async (req, res) => {
  try {
    const version = await db.getVersionById(req.params.id);
    res.render('view', { document: version });
  } catch (error) {
    console.error('Error in GET /view/:id:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/edit/:id', async (req, res) => {
  try {
    const version = await db.getVersionById(req.params.id);
    res.render('edit', { document: version });
  } catch (error) {
    console.error('Error in GET /edit/:id:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/edit/:id', upload.none(), async (req, res) => {
  try {
    const { location, content } = req.body;
    await db.updateVersion(req.params.id, location, content);
    res.redirect('/');
  } catch (error) {
    console.error('Error in POST /edit/:id:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/location/:location', async (req, res) => {
  try {
    const docs = await db.getVersionsByLocation(req.params.location);
    res.render('location', { documents: docs, location: req.params.location });
  } catch (error) {
    console.error('Error in GET /location/:location:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/download/:id', async (req, res) => {
  try {
    const version = await db.getVersionById(req.params.id);
    const templatePath = path.join(__dirname, '../views/view.ejs');

    ejs.renderFile(templatePath, { document: version }, async (err, html) => {
      if (err) return res.status(500).send('Template render error');

      try {
        const browser = await puppeteer.launch({
          headless: 'new',
          executablePath: '/app/.apt/opt/chrome/chrome', // For Heroku w/ buildpack
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="document-${req.params.id}.pdf"`);
        res.send(pdfBuffer);
      } catch (e) {
        console.error('PDF generation error:', e);
        res.status(500).send('PDF generation failed');
      }
    });
  } catch (error) {
    console.error('Error in GET /download/:id:', error);
    res.status(500).send('Internal server error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
