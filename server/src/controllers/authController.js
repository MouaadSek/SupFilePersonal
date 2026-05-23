const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const BCRYPT_COST = 12;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function acceptedGoogleAudiences() {
  const ids = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.OAUTH_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
  ].filter(Boolean);
  return [...new Set(ids)];
}

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

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
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
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

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
      'SELECT id, email, display_name, avatar_url, quota_used, quota_total, theme, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /auth/google — verify Google ID token (mobile / web clients)
async function googleAuth(req, res, next) {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ error: 'id_token is required' });
    }

    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`
    );
    if (!tokenRes.ok) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    const info = await tokenRes.json();
    const allowedAud = acceptedGoogleAudiences();
    if (allowedAud.length > 0 && !allowedAud.includes(info.aud)) {
      return res.status(401).json({ error: 'Google token audience mismatch' });
    }
    if (info.email_verified !== 'true' && info.email_verified !== true) {
      return res.status(401).json({ error: 'Google email not verified' });
    }

    const email = String(info.email).toLowerCase();
    const oauthId = String(info.sub);
    const displayName = info.name || email.split('@')[0];

    let result = await query(
      `SELECT id, email, display_name, avatar_url, quota_used, quota_total
       FROM users WHERE oauth_provider = 'google' AND oauth_id = $1`,
      [oauthId]
    );

    if (!result.rows[0]) {
      const byEmail = await query(
        'SELECT id, email, display_name, avatar_url, quota_used, quota_total, oauth_provider FROM users WHERE email = $1',
        [email]
      );
      if (byEmail.rows[0]) {
        const existing = byEmail.rows[0];
        if (existing.oauth_provider && existing.oauth_provider !== 'google') {
          return res.status(409).json({ error: 'Email already registered with another sign-in method' });
        }
        result = await query(
          `UPDATE users SET oauth_provider = 'google', oauth_id = $1,
             display_name = CASE WHEN display_name = '' THEN $2 ELSE display_name END,
             avatar_url = COALESCE(avatar_url, $3)
           WHERE id = $4
           RETURNING id, email, display_name, avatar_url, quota_used, quota_total`,
          [oauthId, displayName, info.picture || null, existing.id]
        );
      } else {
        result = await query(
          `INSERT INTO users (email, display_name, avatar_url, oauth_provider, oauth_id)
           VALUES ($1, $2, $3, 'google', $4)
           RETURNING id, email, display_name, avatar_url, quota_used, quota_total`,
          [email, displayName, info.picture || null, oauthId]
        );
      }
    }

    const user = result.rows[0];
    return res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

// POST /auth/forgot-password
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const userResult = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    const payload = { message: 'If an account exists, reset instructions were sent.' };

    if (userResult.rows[0]) {
      const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
        [userResult.rows[0].id]
      );
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userResult.rows[0].id, tokenHash, expiresAt]
      );

      if (process.env.NODE_ENV === 'development') {
        console.log(`[dev] Password reset token for ${email}: ${rawToken}`);
        payload.dev_reset_token = rawToken;
      }
    }

    return res.json(payload);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, googleAuth, forgotPassword };
