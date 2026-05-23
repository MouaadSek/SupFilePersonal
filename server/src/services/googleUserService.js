const bcrypt = require('bcrypt');
const { query } = require('../db');

async function verifyGoogleIdToken(idToken) {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    const err = new Error('Invalid Google token');
    err.status = 401;
    throw err;
  }
  const data = await res.json();
  if (!data.sub || !data.email) {
    const err = new Error('Invalid Google token payload');
    err.status = 401;
    throw err;
  }
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
  if (clientId && data.aud !== clientId) {
    const err = new Error('Google token audience mismatch');
    err.status = 401;
    throw err;
  }
  return {
    googleId: data.sub,
    email: String(data.email).toLowerCase(),
    displayName: data.name || data.email.split('@')[0],
    avatarUrl: data.picture || null,
  };
}

async function findOrCreateGoogleUser({ googleId, email, displayName, avatarUrl }) {
  const byOAuth = await query(
    `SELECT id, email, password_hash, display_name, avatar_url, quota_used, quota_total, created_at
     FROM users WHERE oauth_provider = 'google' AND oauth_id = $1`,
    [googleId],
  );
  if (byOAuth.rows[0]) return byOAuth.rows[0];

  const byEmail = await query(
    `SELECT id, email, password_hash, display_name, avatar_url, quota_used, quota_total, created_at
     FROM users WHERE email = $1`,
    [email],
  );
  if (byEmail.rows[0]) {
    const user = byEmail.rows[0];
    if (!user.password_hash) {
      await query(
        `UPDATE users SET oauth_provider = 'google', oauth_id = $1,
         display_name = COALESCE(NULLIF(display_name, ''), $2),
         avatar_url = COALESCE(avatar_url, $3)
         WHERE id = $4`,
        [googleId, displayName, avatarUrl, user.id],
      );
    }
    const updated = await query(
      'SELECT id, email, password_hash, display_name, avatar_url, quota_used, quota_total, created_at FROM users WHERE id = $1',
      [user.id],
    );
    return updated.rows[0];
  }

  const inserted = await query(
    `INSERT INTO users (email, display_name, avatar_url, oauth_provider, oauth_id)
     VALUES ($1, $2, $3, 'google', $4)
     RETURNING id, email, password_hash, display_name, avatar_url, quota_used, quota_total, created_at`,
    [email, displayName || '', avatarUrl, googleId],
  );
  return inserted.rows[0];
}

module.exports = { verifyGoogleIdToken, findOrCreateGoogleUser };
