const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../db/database');
const requireAuth = require('../middleware/auth');

function buildUserPayload(user) {
  let workspaces = ['india', 'us'];
  try { workspaces = JSON.parse(user.workspaces ?? '["india","us"]'); } catch {}
  const accounts_access = user.is_admin ? true : !!user.accounts_access;
  const hospital_access = user.is_admin ? true : !!user.hospital_access;
  return { id: user.id, username: user.username, is_admin: user.is_admin, workspaces, accounts_access, hospital_access, totp_enabled: !!user.totp_enabled };
}

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

    // If 2FA is enabled, issue a short-lived temp token instead of full JWT
    if (user.totp_enabled) {
      const tempToken = jwt.sign(
        { pending_2fa: true, sub: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({ require_2fa: true, temp_token: tempToken });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: buildUserPayload(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/2fa/login — verify TOTP after password step
router.post('/2fa/login', (req, res, next) => {
  try {
    const { temp_token, code } = req.body;
    if (!temp_token || !code) {
      return res.status(400).json({ error: 'temp_token and code are required' });
    }

    let payload;
    try {
      payload = jwt.verify(temp_token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    if (!payload.pending_2fa) {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user || !user.totp_enabled || !user.totp_secret) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const valid = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });

    if (!valid) {
      return res.status(401).json({ error: 'Invalid authenticator code' });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: buildUserPayload(user) });
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
  const user = db.prepare('SELECT id, username, is_admin, is_active, workspaces, accounts_access, hospital_access, totp_enabled, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user: buildUserPayload(user) });
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

// GET /api/auth/2fa/setup — generate secret + QR code (not saved until /enable)
router.get('/2fa/setup', requireAuth, async (req, res, next) => {
  try {
    const user = db.prepare('SELECT username, totp_enabled FROM users WHERE id = ?').get(req.user.id);
    if (user.totp_enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    const secret = speakeasy.generateSecret({
      name: `Expenses (${user.username})`,
      issuer: 'Expenses',
      length: 20,
    });

    db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret.base32, req.user.id);

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qr: qrDataUrl });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/2fa/enable — verify code and activate 2FA
router.post('/2fa/enable', requireAuth, (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });

    const user = db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?').get(req.user.id);
    if (user.totp_enabled) return res.status(400).json({ error: '2FA is already enabled' });
    if (!user.totp_secret) return res.status(400).json({ error: 'No setup in progress. Refresh and try again.' });

    const valid = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });

    if (!valid) return res.status(401).json({ error: 'Invalid code. Make sure your authenticator time is synced.' });

    db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/2fa/disable — disable 2FA (requires password + current TOTP)
router.post('/2fa/disable', requireAuth, async (req, res, next) => {
  try {
    const { password, code } = req.body;
    if (!password || !code) return res.status(400).json({ error: 'password and code are required' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user.totp_enabled) return res.status(400).json({ error: '2FA is not enabled' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    const valid = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });

    if (!valid) return res.status(401).json({ error: 'Invalid authenticator code' });

    db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?').run(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
