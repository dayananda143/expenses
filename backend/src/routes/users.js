const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { seedCategories } = require('../db/seed');

function requireAdmin(req, res, next) {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

function parseWorkspaces(raw) {
  try { return JSON.parse(raw ?? '[]'); } catch { return []; }
}

// GET /api/users  (admin only)
router.get('/', requireAdmin, (req, res, next) => {
  try {
    const users = db.prepare(
      'SELECT id, username, is_admin, is_active, workspaces, accounts_access, created_at FROM users ORDER BY created_at ASC'
    ).all();
    res.json({ data: users.map((u) => ({ ...u, workspaces: parseWorkspaces(u.workspaces), accounts_access: !!u.accounts_access })) });
  } catch (err) {
    next(err);
  }
});

// POST /api/users  (admin only)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { username, password, is_admin, workspaces, accounts_access } = req.body;
    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase().trim());
    if (existing) return res.status(409).json({ error: 'Username already exists' });

    const wsArray = Array.isArray(workspaces) ? workspaces.filter((w) => ['india', 'us'].includes(w)) : ['india', 'us'];

    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, is_admin, workspaces, accounts_access) VALUES (?, ?, ?, ?, ?)'
    ).run(username.toLowerCase().trim(), hash, is_admin ? 1 : 0, JSON.stringify(wsArray), accounts_access ? 1 : 0);

    seedCategories(db, result.lastInsertRowid);

    const user = db.prepare('SELECT id, username, is_admin, is_active, workspaces, accounts_access, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: { ...user, workspaces: parseWorkspaces(user.workspaces), accounts_access: !!user.accounts_access } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id  (admin only — toggle active / change admin / set workspaces)
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot modify your own account' });

    const is_active       = req.body.is_active       !== undefined ? (req.body.is_active       ? 1 : 0) : user.is_active;
    const is_admin        = req.body.is_admin        !== undefined ? (req.body.is_admin        ? 1 : 0) : user.is_admin;
    const accounts_access = req.body.accounts_access !== undefined ? (req.body.accounts_access ? 1 : 0) : user.accounts_access;

    let workspaces = parseWorkspaces(user.workspaces);
    if (Array.isArray(req.body.workspaces)) {
      workspaces = req.body.workspaces.filter((w) => ['india', 'us'].includes(w));
    }

    // Handle username change
    let username = user.username;
    if (req.body.username && req.body.username.trim().toLowerCase() !== user.username) {
      const newUsername = req.body.username.trim().toLowerCase();
      const conflict = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, user.id);
      if (conflict) return res.status(400).json({ error: 'Username already taken' });
      username = newUsername;
    }

    // Handle password change
    let password_hash = user.password_hash;
    if (req.body.password) {
      if (req.body.password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
      password_hash = await bcrypt.hash(req.body.password, 12);
    }

    db.prepare('UPDATE users SET username = ?, password_hash = ?, is_active = ?, is_admin = ?, workspaces = ?, accounts_access = ? WHERE id = ?')
      .run(username, password_hash, is_active, is_admin, JSON.stringify(workspaces), accounts_access, user.id);

    const updated = db.prepare('SELECT id, username, is_admin, is_active, workspaces, accounts_access, created_at FROM users WHERE id = ?').get(user.id);
    res.json({ data: { ...updated, workspaces: parseWorkspaces(updated.workspaces), accounts_access: !!updated.accounts_access } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id  (admin only)
router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
