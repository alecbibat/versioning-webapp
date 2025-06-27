const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const path = require('path');
const ejs = require('ejs');

const db = require('../models/db');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 10 * 1024 * 1024, // 10MB for text fields
    fields: 100,                 // Max number of non-file fields
  }
});


// Homepage - latest version
app.get('/', async (req, res) => {
  const latest = await db.getLatestVersion();
  res.render('index', { latest });
});

// View all versions (global history)
app.get('/history', async (req, res) => {
  const versions = await db.getAllVersions();
  res.render('history', { versions, location: 'all' });
});

// Location-specific history
app.get('/locations/:location/history', async (req, res) => {
  const location = req.params.location;
  const versions = await db.getVersionsByLocation(location);
  res.render('history', { location, versions });
});

// Location-specific new document form
app.get('/locations/:location/new', (req, res) => {
  res.render('new', { location: req.params.location });
});

// ✅ Location-specific document submission route
app.post('/locations/:location/new', upload.none(), async (req, res) => {
  const location = req.params.location;

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
    assigned = []
  } = req.body;

  // Build actionPlan array from aligned inputs
  const actionPlan = [];
  for (let i = 0; i < objectives.length; i++) {
    actionPlan.push({
      objective: objectives[i],
      strategy: strategies[i],
      resource: resources[i],
      assigned: assigned[i]
    });
  }

  const data = {
    id: uuidv4(),
    location,
    title: documentTitle,
    preparedBy,
    locationName,
    date,
    incidentName202,
    incidentObjective202,
    incidentBriefing201,
    situationSummary201,
    actionPlan,
    created_at: moment().toISOString()
  };

  await db.saveVersion(data);
  res.redirect(`/locations/${encodeURIComponent(location)}`);
});


// View a specific version
app.get('/view/:id', async (req, res) => {
  const version = await db.getVersionById(req.params.id);
  if (!version) return res.status(404).send('Version not found');

  res.render('view', {
    document: version,
    location: version.location
  });
});


// Edit a specific version
app.get('/edit/:id', async (req, res) => {
  const version = await db.getVersionById(req.params.id);
  if (!version) return res.status(404).send('Version not found');

  res.render('edit', {
    document: version,
    location: version.location
  });
});


app.post('/edit/:id', upload.none(), async (req, res) => {
  const cleaned = {};

  for (const key in req.body) {
    if (req.body[key] !== undefined && req.body[key] !== '') {
      cleaned[key] = req.body[key];
    }
  }

  const data = {
    id: uuidv4(),
    ...cleaned,
    created_at: moment().toISOString()
  };

  try {
    await db.saveVersion(data);
    res.redirect(`/locations/${encodeURIComponent(data.location || data.locationName || 'unknown')}`);
  } catch (err) {
    console.error('Error saving edited version:', err);
    res.status(500).send('Failed to save version.');
  }
});



// View dashboard for a specific location
app.get('/locations/:id', async (req, res) => {
  const locationId = req.params.id;

  try {
    const versions = await db.getVersionsByLocation(locationId);
    res.render('location', { location: locationId, versions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching location versions');
  }
});

// Catch-all
app.use((req, res) => {
  res.status(404).send('Page not found');
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
