const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { query } = require('../db');
const bcrypt = require('bcrypt');

// GET /users/lookup?email= — resolve user id for folder invites
router.get('/lookup', auth, async (req, res, next) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email query parameter is required' });
    }
    const result = await query('SELECT id, email, display_name FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /users/me
router.put('/me', auth, async (req, res, next) => {
  try {
    const { email, display_name, theme } = req.body;
    const result = await query(
      `UPDATE users SET
         email        = COALESCE($1, email),
         display_name = COALESCE($2, display_name),
         theme        = COALESCE($3, theme)
       WHERE id = $4
       RETURNING id, email, display_name, avatar_url, quota_used, quota_total, theme`,
      [email || null, display_name || null, theme || null, req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /users/me/password
router.put('/me/password', auth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0]?.password_hash) {
      return res.status(400).json({ error: 'Password sign-in is not enabled for this account' });
    }
    const match = await bcrypt.compare(current_password, user.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    return res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
});

const path = require('path');
const fs = require('fs');
const STORAGE_PATH = process.env.STORAGE_PATH || './storage';
const avatarStorage = require('multer').diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(STORAGE_PATH, 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.user.id}${ext}`);
  },
});
const avatarUpload = require('multer')({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /users/me/avatar
router.post('/me/avatar', auth, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const avatarUrl = `/avatars/${req.file.filename}`;
    const result = await query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, email, display_name, avatar_url',
      [avatarUrl, req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
