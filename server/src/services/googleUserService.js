const { query } = require('../db');

function allowedAudiences() {
  return [
    process.env.GOOGLE_CLIENT_ID,
    process.env.OAUTH_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter(Boolean);
}

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
  const audiences = allowedAudiences();
  if (audiences.length > 0 && !audiences.includes(data.aud)) {
    const err = new Error('Invalid Google token audience');
    err.status = 401;
    throw err;
  }
  return {
    googleId: data.sub,
    email: String(data.email).toLowerCase(),
    displayName: data.name || '',
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

  const byEmail = await query('SELECT * FROM users WHERE email = $1', [email]);
  if (byEmail.rows[0]) {
    const existing = byEmail.rows[0];
    if (!existing.oauth_id) {
      const linked = await query(
        `UPDATE users SET oauth_provider = 'google', oauth_id = $1,
           display_name = CASE WHEN display_name = '' THEN $2 ELSE display_name END,
           avatar_url = COALESCE(avatar_url, $3)
         WHERE id = $4
         RETURNING id, email, password_hash, display_name, avatar_url, quota_used, quota_total, created_at`,
        [googleId, displayName, avatarUrl, existing.id],
      );
      return linked.rows[0];
    }
    return existing;
  }

  const created = await query(
    `INSERT INTO users (email, display_name, avatar_url, oauth_provider, oauth_id)
     VALUES ($1, $2, $3, 'google', $4)
     RETURNING id, email, password_hash, display_name, avatar_url, quota_used, quota_total, created_at`,
    [email, displayName || '', avatarUrl, googleId],
  );
  return created.rows[0];
}

module.exports = { verifyGoogleIdToken, findOrCreateGoogleUser };
