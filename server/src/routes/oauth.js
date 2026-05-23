const router = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { findOrCreateGoogleUser } = require('../services/googleUserService');

const CLIENT_WEB = (process.env.CLIENT_ORIGIN || 'http://localhost:4000').split(',')[0].trim();
const CALLBACK_URL =
  process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/auth/oauth/google/callback';

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

function oauthDisabled(_req, res) {
  return res.status(503).json({ error: 'OAuth is not configured on this server' });
}

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error('Google account has no email'));
          const user = await findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            displayName: profile.displayName || email.split('@')[0],
            avatarUrl: profile.photos?.[0]?.value || null,
          });
          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ),
  );

  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_WEB}/login?error=oauth_failed` }),
    (req, res) => {
      const token = signToken(req.user);
      res.redirect(`${CLIENT_WEB}/login?token=${encodeURIComponent(token)}`);
    },
  );
} else {
  router.get('/google', oauthDisabled);
  router.get('/google/callback', oauthDisabled);
}

router.get('/github', (_req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(503).json({ error: 'GitHub OAuth is not configured' });
  }
  const redirectUri = encodeURIComponent(
    process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/oauth/github/callback',
  );
  const scope = encodeURIComponent('user:email');
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`,
  );
});

router.get('/github/callback', async (req, res, next) => {
  try {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return res.redirect(`${CLIENT_WEB}/login?error=oauth_failed`);
    }
    const { code } = req.query;
    if (!code) return res.redirect(`${CLIENT_WEB}/login?error=oauth_failed`);

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:
          process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/oauth/github/callback',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.redirect(`${CLIENT_WEB}/login?error=oauth_failed`);

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
    });
    const ghUser = await userRes.json();
    if (!ghUser.id) return res.redirect(`${CLIENT_WEB}/login?error=oauth_failed`);

    let email = ghUser.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
      });
      const emails = await emailsRes.json();
      email = emails.find((e) => e.primary && e.verified)?.email || emails[0]?.email;
    }
    if (!email) return res.redirect(`${CLIENT_WEB}/login?error=oauth_failed`);

    const { query } = require('../db');
    const existing = await query(
      `SELECT id, email, password_hash, display_name, avatar_url, quota_used, quota_total, created_at
       FROM users WHERE oauth_provider = 'github' AND oauth_id = $1`,
      [String(ghUser.id)],
    );
    let user = existing.rows[0];
    if (!user) {
      const byEmail = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (byEmail.rows[0]) {
        await query(
          `UPDATE users SET oauth_provider = 'github', oauth_id = $1 WHERE id = $2`,
          [String(ghUser.id), byEmail.rows[0].id],
        );
        const row = await query(
          'SELECT id, email, password_hash, display_name, avatar_url, quota_used, quota_total, created_at FROM users WHERE id = $1',
          [byEmail.rows[0].id],
        );
        user = row.rows[0];
      } else {
        const inserted = await query(
          `INSERT INTO users (email, display_name, avatar_url, oauth_provider, oauth_id)
           VALUES ($1, $2, $3, 'github', $4)
           RETURNING id, email, password_hash, display_name, avatar_url, quota_used, quota_total, created_at`,
          [email.toLowerCase(), ghUser.name || ghUser.login, ghUser.avatar_url, String(ghUser.id)],
        );
        user = inserted.rows[0];
      }
    }

    const token = signToken(user);
    return res.redirect(`${CLIENT_WEB}/login?token=${encodeURIComponent(token)}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
