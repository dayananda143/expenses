const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.pending_2fa) {
      return res.status(401).json({ error: '2FA verification required' });
    }
    req.user = { id: payload.sub, username: payload.username, is_admin: payload.is_admin };
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
};
