const { Pool } = require('pg');

// Hardcoded Heroku Postgres URL (for dev/testing only)
const pool = new Pool({
  connectionString: 'postgres://ueelb64amdntr5:p93db78ed02d6403bdf63e5d66e871447c0878fa8010cc8453b3e8a3366866755@cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dd3put1k047dqs',
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  getLatestVersion: async () => {
    const result = await pool.query('SELECT * FROM documents ORDER BY created_at DESC LIMIT 1');
    return result.rows[0];
  },

  getAllVersions: async () => {
    const result = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
    return result.rows;
  },

  getVersionById: async (id) => {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    return result.rows[0];
  },

  getVersionsByLocation: async (location) => {
    const result = await pool.query('SELECT * FROM documents WHERE location = $1 ORDER BY created_at DESC', [location]);
    return result.rows;
  },

  saveNewVersion: async (location, content) => {
    const result = await pool.query(
      'INSERT INTO documents (location, content, created_at) VALUES ($1, $2, NOW()) RETURNING *',
      [location, content]
    );
    return result.rows[0];
  },

  updateVersion: async (id, location, content) => {
    const result = await pool.query(
      'UPDATE documents SET location = $1, content = $2 WHERE id = $3 RETURNING *',
      [location, content, id]
    );
    return result.rows[0];
  }
};
