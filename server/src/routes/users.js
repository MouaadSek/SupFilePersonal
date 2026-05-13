const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { query } = require('../db');
const bcrypt = require('bcrypt');

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

module.exports = router;
