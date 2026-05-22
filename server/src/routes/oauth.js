const router = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { query } = require('../db');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    callbackURL:  process.env.OAUTH_CALLBACK_URL,
  },
  async (_access, _refresh, profile, done) => {
    try {
      const email       = profile.emails?.[0]?.value?.toLowerCase() ?? null;
      const displayName = profile.displayName || (email ? email.split('@')[0] : 'User');
      const avatarUrl   = profile.photos?.[0]?.value ?? null;

      // 1. Existing user matched by Google ID
      let { rows } = await query(
        'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
        ['google', profile.id]
      );
      if (rows[0]) return done(null, rows[0]);

      // 2. Existing email/password account — merge with Google
      if (email) {
        ({ rows } = await query('SELECT * FROM users WHERE email = $1', [email]));
        if (rows[0]) {
          await query(
            `UPDATE users SET oauth_provider = 'google', oauth_id = $1,
             avatar_url = COALESCE(avatar_url, $2) WHERE id = $3`,
            [profile.id, avatarUrl, rows[0].id]
          );
          return done(null, rows[0]);
        }
      }

      // 3. Create a new OAuth-only account (password_hash stays NULL)
      ({ rows } = await query(
        `INSERT INTO users (email, display_name, oauth_provider, oauth_id, avatar_url)
         VALUES ($1, $2, 'google', $3, $4) RETURNING *`,
        [email, displayName, profile.id, avatarUrl]
      ));
      return done(null, rows[0]);
    } catch (err) {
      return done(err);
    }
  }
));

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:4000';

// GET /auth/oauth/google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

// GET /auth/oauth/google/callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${CLIENT_ORIGIN}/login?error=oauth_failed`);
    }
    const token = signToken(user);
    return res.redirect(`${CLIENT_ORIGIN}/login?token=${encodeURIComponent(token)}`);
  })(req, res, next);
});

module.exports = router;
