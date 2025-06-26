const admin = require('firebase-admin');

// Decode the base64 config var from Heroku
const decodedKey = Buffer.from(process.env.FIREBASE_KEY_BASE64, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decodedKey);

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
    const doc = snapshot.docs[0];
    return doc ? { id: doc.id, ...doc.data() } : null;
  },

  getAllVersions: async () => {
    const snapshot = await db.collection('documents')
      .orderBy('created_at', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  getVersionById: async (id) => {
    const doc = await db.collection('documents').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  getVersionsByLocation: async (location) => {
    const snapshot = await db.collection('documents')
      .where('location', '==', location)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  saveVersion: async (data) => {
    const ref = await db.collection('documents').add(data);
    data.id = ref.id; // ✅ Attach Firestore ID to the data object (for UI use)
    return data;
  }
};
