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

// Homepage - list latest version
app.get('/', async (req, res) => {
  const latest = await db.getLatestVersion();
  res.render('index', { latest });
});

// View all versions
app.get('/history', async (req, res) => {
  const versions = await db.getAllVersions();
  res.render('history', { versions });
});

// New document form
app.get('/new', (req, res) => {
  res.render('new');
});

// Create new version
app.post('/new', upload.none(), async (req, res) => {
  const data = {
    id: uuidv4(),
    location: req.body.location,
    title: req.body.title,
    content: req.body.content,
    created_at: moment().toISOString()
  };
  await db.saveVersion(data);
  res.redirect('/');
});

// Edit a version
app.get('/edit/:id', async (req, res) => {
  const version = await db.getVersionById(req.params.id);
  if (!version) {
    return res.status(404).send('Version not found');
  }
  res.render('edit', { version });
});

app.post('/edit/:id', upload.none(), async (req, res) => {
  const data = {
    id: uuidv4(),
    location: req.body.location,
    title: req.body.title,
    content: req.body.content,
    created_at: moment().toISOString()
  };
  await db.saveVersion(data);
  res.redirect('/');
});

// View a single version
app.get('/view/:id', async (req, res) => {
  const version = await db.getVersionById(req.params.id);
  if (!version) {
    return res.status(404).send('Version not found');
  }
  res.render('view', { version });
});

// View all versions for a location
app.get('/locations/:id', async (req, res) => {
  const locationId = req.params.id;

  try {
    const snapshot = await db.collection('documents')
      .where('location', '==', locationId)
      .orderBy('created_at', 'desc')
      .get();

    const versions = snapshot.docs.map(doc => doc.data());

    res.render('location', { location: locationId, versions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching location versions');
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
