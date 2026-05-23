const jwt = require('jsonwebtoken');

/** JWT via `Authorization: Bearer` or `?access_token=` (preview / images in mobile WebViews). */
function authOrQueryMiddleware(req, res, next) {
  const header = req.headers.authorization;
  let token = null;
  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (typeof req.query.access_token === 'string' && req.query.access_token) {
    token = req.query.access_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authOrQueryMiddleware;
