require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const encryptionService = require('./services/encryptionService');
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

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const corsOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:4000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production') {
      const devOrigin =
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/;
      if (devOrigin.test(origin)) return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';
app.use('/avatars', express.static(path.resolve(STORAGE_PATH)));
app.use(require('passport').initialize());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth/oauth', require('./routes/oauth'));
app.use('/auth',       authRoutes);
app.use('/files',     fileRoutes);
app.use('/folders',   folderRoutes);
app.use('/shares',    shareRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/trash',     require('./routes/trash'));
app.use('/search',    require('./routes/search'));
app.use('/users',     require('./routes/users'));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

async function maybeMigrate() {
  const runOnStart =
    process.env.RUN_MIGRATE_ON_START === 'true' ||
    (process.env.RUN_MIGRATE_ON_START !== 'false' && process.env.NODE_ENV !== 'production');
  if (!runOnStart) {
    console.log('ℹ️  Skipping schema apply on start (set RUN_MIGRATE_ON_START=true to enable).');
    return;
  }
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅  Database schema applied successfully.');
}

const PORT = process.env.PORT || 3000;

maybeMigrate()
  .then(() => {
    if (!process.env.JWT_SECRET) {
      console.error('❌  JWT_SECRET is required');
      process.exit(1);
    }
    encryptionService.logStartupWarning();
    app.listen(PORT, () => console.log(`SUPFile server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌  Server startup failed:', err.message);
    process.exit(1);
  });
