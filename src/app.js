const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory document store
const documents = {};

// Multer setup (file uploads)
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Home – list locations
app.get('/', (req, res) => {
  res.render('index');
});

// Location dashboard
app.get('/locations/:location', (req, res) => {
  const location = req.params.location;
  res.render('location', { location });
});

// New document form
app.get('/locations/:location/new', (req, res) => {
  res.render('new', { location: req.params.location });
});

// Save new document version
app.post('/locations/:location/new', upload.single('attachment'), (req, res) => {
  const location = req.params.location;
  const id = uuidv4();

  const {
    documentTitle,
    preparedBy,
    locationName,
    date,
    incidentName202,
    incidentObjective202,
    incidentBriefing201,
    situationSummary201,
    objectives = [],
    strategies = [],
    resources = [],
    assigned = [],
  } = req.body;

  const attachment = req.file ? {
    originalname: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path
  } : null;

  if (!documents[location]) documents[location] = [];

  documents[location].push({
    id,
    documentTitle,
    preparedBy,
    locationName,
    date,
    incidentName202,
    incidentObjective202,
    incidentBriefing201,
    situationSummary201,
    actionPlan: objectives.map((_, i) => ({
      objective: objectives[i],
      strategy: strategies[i],
      resource: resources[i],
      assigned: assigned[i]
    })),
    attachment,
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
  });

  res.redirect(`/locations/${location}/view`);
});

// View latest document
app.get('/locations/:location/view', (req, res) => {
  const location = req.params.location;
  const history = documents[location] || [];
  const latest = history[history.length - 1];
  if (!latest) return res.send('No documents found for this location.');
  res.render('view', { location, document: latest });
});

// View history list
app.get('/locations/:location/history', (req, res) => {
  const location = req.params.location;
  const history = documents[location] || [];
  res.render('history', { location, versions: history });
});

// View specific version
app.get('/locations/:location/history/:id', (req, res) => {
  const location = req.params.location;
  const version = (documents[location] || []).find(doc => doc.id === req.params.id);
  if (!version) return res.send('Version not found.');
  res.render('view', { location, document: version });
});

// Edit latest version (pre-fill form)
app.get('/locations/:location/edit', (req, res) => {
  const location = req.params.location;
  const history = documents[location] || [];
  const latest = history[history.length - 1];
  if (!latest) return res.send('No documents found to edit.');
  res.render('edit', { location, document: latest });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const puppeteer = require('puppeteer');

app.get('/locations/:location/pdf', async (req, res) => {
  const location = req.params.location;
  const history = documents[location] || [];
  const latest = history[history.length - 1];

  if (!latest) return res.send('No document to generate.');

  const html = `
    <html>
    <head>
      <style>
        body { font-family: Arial; padding: 20px; }
        h1, h2 { border-bottom: 1px solid #ccc; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 6px; }
      </style>
    </head>
    <body>
      <h1>${latest.documentTitle}</h1>
      <p><strong>Prepared By:</strong> ${latest.preparedBy}</p>
      <p><strong>Location:</strong> ${latest.locationName}</p>
      <p><strong>Date:</strong> ${latest.date}</p>

      <h2>Goals</h2>
      <p><strong>Incident Name (202):</strong> ${latest.incidentName202}</p>
      <p><strong>Incident Objective (202):</strong> ${latest.incidentObjective202}</p>
      <p><strong>Incident Briefing (201):</strong> ${latest.incidentBriefing201}</p>
      <p><strong>Situation Summary (201):</strong> ${latest.situationSummary201}</p>

      <h2>Action Plan Objectives</h2>
      <table>
        <thead>
          <tr>
            <th>Objective (6A)</th>
            <th>Strategy (6B)</th>
            <th>Resources (6C)</th>
            <th>Assigned To (6D)</th>
          </tr>
        </thead>
        <tbody>
          ${latest.actionPlan.map(row => `
            <tr>
              <td>${row.objective}</td>
              <td>${row.strategy}</td>
              <td>${row.resource}</td>
              <td>${row.assigned}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${latest.documentTitle || 'document'}.pdf"`
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating PDF.');
  }
});


