const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const requireAuth = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase().trim());
    const hash = user?.password_hash ?? '$2a$12$invalidhashtopreventtimingattacks00000000000000000000000';
    const match = await bcrypt.compare(password, hash);

    if (!user || !match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    let workspaces = ['india', 'us'];
    try { workspaces = JSON.parse(user.workspaces ?? '["india","us"]'); } catch {}
    const accounts_access  = user.is_admin ? true : !!user.accounts_access;
    const hospital_access  = user.is_admin ? true : !!user.hospital_access;
    res.json({ token, user: { id: user.id, username: user.username, is_admin: user.is_admin, workspaces, accounts_access, hospital_access } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, is_admin, is_active, workspaces, accounts_access, hospital_access, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  let workspaces = ['india', 'us'];
  try { workspaces = JSON.parse(user.workspaces ?? '["india","us"]'); } catch {}
  const accounts_access = user.is_admin ? true : !!user.accounts_access;
  const hospital_access = user.is_admin ? true : !!user.hospital_access;
  res.json({ user: { ...user, workspaces, accounts_access, hospital_access } });
});

// PATCH /api/auth/password
router.patch('/password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
