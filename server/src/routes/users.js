const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { query } = require('../db');
const bcrypt = require('bcrypt');

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

// PUT /users/me
router.put('/me', auth, async (req, res, next) => {
  try {
    const { email, display_name } = req.body;
    const result = await query(
      `UPDATE users SET
         email        = COALESCE($1, email),
         display_name = COALESCE($2, display_name)
       WHERE id = $3
       RETURNING id, email, display_name, avatar_url, quota_used, quota_total`,
      [email || null, display_name || null, req.user.id]
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
    const match = await bcrypt.compare(current_password, user.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    return res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
});

// POST /users/me/avatar
router.post('/me/avatar', auth, upload.single('avatar'), async (req, res, next) => {
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

// DELETE /users/me/avatar
router.delete('/me/avatar', auth, async (req, res, next) => {
  try {
    const row = await query('SELECT avatar_url FROM users WHERE id = $1', [req.user.id]);
    const avatarUrl = row.rows[0]?.avatar_url;

    await query('UPDATE users SET avatar_url = NULL WHERE id = $1', [req.user.id]);

    if (avatarUrl) {
      const filename = path.basename(avatarUrl);
      const filePath = path.resolve(STORAGE_PATH, filename);
      fs.unlink(filePath, () => {});
    }

    return res.json({ message: 'Avatar removed' });
  } catch (err) { next(err); }
});

// GET /users/search?q=query — search users by name or email (excludes self, max 20)
router.get('/search', auth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length < 1) return res.json([]);
    const term = `%${String(q).trim()}%`;
    const result = await query(
      `SELECT id, email, display_name, avatar_url
       FROM users
       WHERE id != $1
         AND (LOWER(display_name) LIKE LOWER($2) OR LOWER(email) LIKE LOWER($2))
       ORDER BY display_name
       LIMIT 20`,
      [req.user.id, term]
    );
    return res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /users/sharing — summary of who you've shared with and who shared with you
router.get('/sharing', auth, async (req, res, next) => {
  try {
    const sharedByMe = await query(
      `SELECT DISTINCT u.id, u.display_name, u.email, u.avatar_url,
              f.id AS folder_id, f.name AS folder_name, fm.permission
       FROM folder_members fm
       JOIN folders f ON f.id = fm.folder_id
       JOIN users u ON u.id = fm.user_id
       WHERE f.owner_id = $1 AND u.id != $1 AND f.trashed = FALSE
       ORDER BY u.display_name`,
      [req.user.id]
    );
    const sharedWithMe = await query(
      `SELECT DISTINCT u.id, u.display_name, u.email, u.avatar_url,
              f.id AS folder_id, f.name AS folder_name, fm.permission
       FROM folder_members fm
       JOIN folders f ON f.id = fm.folder_id
       JOIN users u ON u.id = f.owner_id
       WHERE fm.user_id = $1 AND f.owner_id != $1 AND f.trashed = FALSE
       ORDER BY u.display_name`,
      [req.user.id]
    );
    return res.json({ shared_by_me: sharedByMe.rows, shared_with_me: sharedWithMe.rows });
  } catch (err) { next(err); }
});

// GET /users/lookup?email=... — find a user by email (for folder sharing)
router.get('/lookup', auth, async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email query param is required' });
    const result = await query(
      'SELECT id, email, display_name FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
