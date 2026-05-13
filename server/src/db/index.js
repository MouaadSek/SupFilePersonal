const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'supfile_dev',
  user: process.env.DB_USER || 'supfile',
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});

/**
 * Run a parameterised query.
 * @param {string} text  SQL string with $1, $2 … placeholders
 * @param {any[]}  params
 */
const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };
