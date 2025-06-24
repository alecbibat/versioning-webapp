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

const upload = multer();

// Homepage - latest version
app.get('/', async (req, res) => {
  const latest = await db.getLatestVersion();
  res.render('index', { latest });
});

// History of all versions
app.get('/history', async (req, res) => {
  const versions = await db.getAllVersions();
  res.render('history', { versions });
});

// New document form
app.get('/new', (req, res) => {
  res.render('new');
});

// Create new document
app.post('/new', upload.none(), async (req, res) => {
  const { location, title, content } = req.body;

  const data = {
    id: uuidv4(),
    location,
    title,
    content,
    created_at: moment().toISOString()
  };

  await db.saveVersion(data);  // This must exist in db.js
  res.redirect('/');
});

// View a specific version
app.get('/view/:id', async (req, res) => {
  const version = await db.getVersionById(req.params.id);
  if (!version) return res.status(404).send('Version not found');
  res.render('view', { version });
});

// Edit a specific version
app.get('/edit/:id', async (req, res) => {
  const version = await db.getVersionById(req.params.id);
  if (!version) return res.status(404).send('Version not found');
  res.render('edit', { version });
});

app.post('/edit/:id', upload.none(), async (req, res) => {
  const { location, title, content } = req.body;

  const data = {
    id: uuidv4(),
    location,
    title,
    content,
    created_at: moment().toISOString()
  };

  await db.saveVersion(data);
  res.redirect('/');
});

// Versions by location
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
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
