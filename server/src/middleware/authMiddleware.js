const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT in the Authorization header.
 * Attaches req.user = { id, email } on success.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const queryToken = req.query?.token || req.query?.access_token;

  let token;
  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (typeof queryToken === 'string' && queryToken) {
    token = queryToken;
  } else {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
