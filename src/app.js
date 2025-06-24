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

const pdf = require('html-pdf');

app.get('/locations/:location/pdf', (req, res) => {
  const location = req.params.location;
  const history = documents[location] || [];
  const latest = history[history.length - 1];

  if (!latest) return res.send('No document to generate.');

  const html = `
    <h1>${latest.documentTitle}</h1>
    <p><strong>Prepared By:</strong> ${latest.preparedBy}</p>
    <p><strong>Location:</strong> ${latest.locationName}</p>
    <p><strong>Date:</strong> ${latest.date}</p>
    <hr>
    <h2>Goals</h2>
    <p><strong>Incident Name (202):</strong> ${latest.incidentName202}</p>
    <p><strong>Incident Objective (202):</strong> ${latest.incidentObjective202}</p>
    <p><strong>Incident Briefing (201):</strong> ${latest.incidentBriefing201}</p>
    <p><strong>Situation Summary (201):</strong> ${latest.situationSummary201}</p>
    <hr>
    <h2>Action Plan Objectives</h2>
    <table border="1" cellspacing="0" cellpadding="5">
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
  `;

  pdf.create(html).toStream((err, stream) => {
    if (err) return res.status(500).send('Error creating PDF.');
    res.setHeader('Content-type', 'application/pdf');
    res.setHeader('Content-disposition', `attachment; filename="${latest.documentTitle || 'document'}.pdf"`);
    stream.pipe(res);
  });
});

