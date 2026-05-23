const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const {
  verifyGoogleIdToken,
  findOrCreateGoogleUser,
} = require('../services/googleUserService');

const BCRYPT_COST = 12;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /auth/register
async function register(req, res, next) {
  try {
    const { email, password, display_name } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_COST);
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, quota_used, quota_total, created_at`,
      [email.toLowerCase(), password_hash, display_name || '']
    );

    const user = result.rows[0];
    return res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

// POST /auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, email, password_hash, display_name, avatar_url, quota_used, quota_total FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password_hash: _, ...safeUser } = user;
    return res.json({ token: signToken(user), user: safeUser });
  } catch (err) {
    next(err);
  }
}

// GET /auth/me
async function me(req, res, next) {
  try {
    const result = await query(
      'SELECT id, email, display_name, avatar_url, quota_used, quota_total, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /auth/google — mobile id_token
async function googleAuth(req, res, next) {
  try {
    const { id_token } = req.body;
    const profile = await verifyGoogleIdToken(id_token);
    const user = await findOrCreateGoogleUser({
      googleId: profile.googleId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });
    const { password_hash: _, ...safeUser } = user;
    return res.json({ token: signToken(user), user: safeUser });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message });
    next(err);
  }
}

// POST /auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email],
    );
    const generic = { message: 'If that email exists, reset instructions were sent.' };
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.json(generic);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
      [resetHash, expires, user.id],
    );

    if (process.env.NODE_ENV !== 'production') {
      return res.json({ ...generic, dev_reset_token: resetToken });
    }
    // Production: integrate email provider here; never expose token in response.
    return res.json(generic);
  } catch (err) {
    next(err);
  }
}

// POST /auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Valid token and password (min 8 chars) required' });
    }
    const resetHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const result = await query(
      `SELECT id FROM users
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [resetHash],
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const password_hash = await bcrypt.hash(password, BCRYPT_COST);
    await query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = $2`,
      [password_hash, user.id],
    );
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, googleAuth, forgotPassword, resetPassword };
