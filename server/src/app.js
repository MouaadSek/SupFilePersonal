require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { pool } = require('./db');

const authRoutes      = require('./routes/auth');
const fileRoutes      = require('./routes/files');
const folderRoutes    = require('./routes/folders');
const shareRoutes     = require('./routes/shares');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:4000',
  credentials: true,
}));
app.use(express.json());
app.use(require('passport').initialize());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth/oauth', require('./routes/oauth'));
app.use('/auth',       authRoutes);
app.use('/files',     fileRoutes);
app.use('/folders',   folderRoutes);
app.use('/shares',    shareRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/search',    require('./routes/search'));
app.use('/users',     require('./routes/users'));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅  Database schema applied successfully.');
}

const PORT = process.env.PORT || 3000;

migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`SUPFile server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌  Migration failed — server did not start:', err.message);
    process.exit(1);
  });
