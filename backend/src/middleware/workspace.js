const db = require('../db/database');

const VALID = ['india', 'us'];

module.exports = function requireWorkspace(req, res, next) {
  const workspace = req.query.workspace || req.body?.workspace;

  if (!workspace || !VALID.includes(workspace)) {
    return res.status(400).json({ error: 'workspace query param must be "india" or "us"' });
  }

  if (req.user.is_admin) {
    req.workspace = workspace;
    return next();
  }

  const user = db.prepare('SELECT workspaces FROM users WHERE id = ?').get(req.user.id);
  let allowed = [];
  try { allowed = JSON.parse(user?.workspaces ?? '[]'); } catch {}

  if (!allowed.includes(workspace)) {
    return res.status(403).json({ error: `You do not have access to the "${workspace}" workspace` });
  }

  req.workspace = workspace;
  next();
};
