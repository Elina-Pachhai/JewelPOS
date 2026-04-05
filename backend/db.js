const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'group11secretpassword',
  database: process.env.DB_NAME || 'posdb',
  port: 5432
});

module.exports = pool;