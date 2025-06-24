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
