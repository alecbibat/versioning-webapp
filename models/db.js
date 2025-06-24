const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../firebase-key.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = {
  getLatestVersion: async () => {
    const snapshot = await db.collection('documents')
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();
    return snapshot.docs[0]?.data();
  },

  getAllVersions: async () => {
    const snapshot = await db.collection('documents').orderBy('created_at', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  getVersionById: async (id) => {
    const doc = await db.collection('documents').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  getVersionsByLocation: async (location) => {
    const snapshot = await db.collection('documents').where('location', '==', location).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  saveNewVersion: async (location, content) => {
    const docRef = await db.collection('documents').add({
      location,
      content,
      created_at: new Date().toISOString()
    });
    return { id: docRef.id };
  },

  updateVersion: async (id, location, content) => {
    await db.collection('documents').doc(id).update({
      location,
      content
    });
    return { id, location, content };
  }
};
