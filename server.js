
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { nanoid } = require('nanoid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/versioned-docs';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const VersionSchema = new mongoose.Schema({
  title: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
});

const DocumentSchema = new mongoose.Schema({
  current: VersionSchema,
  history: [VersionSchema],
  sharedToken: String,
});

const Document = mongoose.model('Document', DocumentSchema);

// Ensure at least one document exists
const initialize = async () => {
  const docCount = await Document.countDocuments();
  if (docCount === 0) {
    const newDoc = new Document({
      current: { title: '', content: '' },
      history: [],
    });
    await newDoc.save();
  }
};

initialize();

app.get('/document', async (req, res) => {
  const doc = await Document.findOne();
  res.json(doc);
});

app.post('/document', async (req, res) => {
  const { title, content } = req.body;
  const doc = await Document.findOne();
  doc.history.unshift({ ...doc.current });
  doc.current = { title, content, timestamp: new Date() };
  await doc.save();
  res.json(doc);
});

app.post('/share', async (req, res) => {
  const doc = await Document.findOne();
  const token = nanoid(10);
  doc.sharedToken = token;
  await doc.save();
  res.json({ token });
});

app.get('/shared/:token', async (req, res) => {
  const doc = await Document.findOne({ sharedToken: req.params.token });
  if (!doc) return res.status(404).send('Not found');
  res.json(doc.current);
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
