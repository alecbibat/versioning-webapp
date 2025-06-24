const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store
const documents = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Home page – list locations
app.get('/', (req, res) => {
  res.render('index', { locations: Object.keys(documents) });
});

// Create form
app.get('/locations/:location/new', (req, res) => {
  res.render('new', { location: req.params.location });
});

// Submit new document
app.post('/locations/:location/new', (req, res) => {
  const { title, author, body, tags } = req.body;
  const location = req.params.location;
  const id = uuidv4();

  if (!documents[location]) documents[location] = [];

  documents[location].push({
    id,
    title,
    author,
    body,
    tags,
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
  });

  res.redirect(`/locations/${location}/view`);
});

// View latest document for location
app.get('/locations/:location/view', (req, res) => {
  const location = req.params.location;
  const history = documents[location] || [];
  const latest = history[history.length - 1];

  if (!latest) return res.send('No documents found for this location.');

  res.render('view', { location, document: latest });
});

// View history
app.get('/locations/:location/history', (req, res) => {
  const location = req.params.location;
  const history = documents[location] || [];
  res.render('history', { location, versions: history });
});

// View a past version
app.get('/locations/:location/history/:id', (req, res) => {
  const location = req.params.location;
  const version = (documents[location] || []).find(doc => doc.id === req.params.id);
  if (!version) return res.send('Version not found.');
  res.render('view', { location, document: version });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
