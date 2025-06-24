// In db.js:
module.exports.initTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      location TEXT,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
};
