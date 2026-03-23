const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/savings - list all FDs for the admin user
router.get('/', (req, res, next) => {
  try {
    const targetId = req.user.is_admin
      ? req.user.id
      : db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
    const rows = db.prepare(
      'SELECT * FROM bank_fds WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC'
    ).all(targetId);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/savings - create FD (admin only)
router.post('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { type, bank_name, fd_number, principal_amount, interest_rate, tenure_months, tenure_unit, start_date, maturity_date, maturity_amount, status, notes } = req.body;
    if (!bank_name?.trim()) return res.status(400).json({ error: 'bank_name is required' });
    if (!principal_amount || parseFloat(principal_amount) <= 0) return res.status(400).json({ error: 'principal_amount must be > 0' });
    const entryType = ['savings', 'fd', 'bonds'].includes(type) ? type : 'fd';
    if (entryType === 'fd' || entryType === 'bonds') {
      if (!start_date) return res.status(400).json({ error: 'start_date is required' });
      if (!maturity_date) return res.status(400).json({ error: 'maturity_date is required' });
    }

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM bank_fds WHERE user_id = ?').get(req.user.id).m;
    const result = db.prepare(
      `INSERT INTO bank_fds (user_id, type, bank_name, fd_number, principal_amount, interest_rate, tenure_months, tenure_unit, start_date, maturity_date, maturity_amount, status, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.user.id,
      entryType,
      bank_name.trim(),
      fd_number?.trim() || null,
      parseFloat(principal_amount),
      parseFloat(interest_rate ?? 0),
      tenure_months ? parseInt(tenure_months) : null,
      ['days', 'months'].includes(tenure_unit) ? tenure_unit : 'months',
      start_date || null,
      maturity_date || null,
      maturity_amount ? parseFloat(maturity_amount) : null,
      status ?? 'active',
      notes?.trim() || null,
      maxOrder + 1
    );

    const row = db.prepare('SELECT * FROM bank_fds WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/savings/reorder - reorder FDs (admin only)
router.patch('/reorder', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE bank_fds SET sort_order = ? WHERE id = ? AND user_id = ?');
    ids.forEach((id, idx) => update.run(idx, id, req.user.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/savings/:id - update FD (admin only)
router.put('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const fd = db.prepare('SELECT * FROM bank_fds WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!fd) return res.status(404).json({ error: 'FD not found' });

    const { bank_name, fd_number, principal_amount, interest_rate, tenure_months, tenure_unit, start_date, maturity_date, maturity_amount, status, notes } = req.body;
    if (!bank_name?.trim()) return res.status(400).json({ error: 'bank_name is required' });

    db.prepare(
      `UPDATE bank_fds SET bank_name = ?, fd_number = ?, principal_amount = ?, interest_rate = ?, tenure_months = ?, tenure_unit = ?,
       start_date = ?, maturity_date = ?, maturity_amount = ?, status = ?, notes = ? WHERE id = ?`
    ).run(
      bank_name.trim(),
      fd_number?.trim() || null,
      parseFloat(principal_amount ?? fd.principal_amount),
      parseFloat(interest_rate ?? fd.interest_rate),
      tenure_months ? parseInt(tenure_months) : null,
      ['days', 'months'].includes(tenure_unit) ? tenure_unit : fd.tenure_unit ?? 'months',
      start_date || null,
      maturity_date || null,
      maturity_amount ? parseFloat(maturity_amount) : null,
      status ?? fd.status,
      notes?.trim() || null,
      fd.id
    );

    const row = db.prepare('SELECT * FROM bank_fds WHERE id = ?').get(fd.id);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/savings/:id - delete FD (admin only)
router.delete('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const fd = db.prepare('SELECT * FROM bank_fds WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!fd) return res.status(404).json({ error: 'FD not found' });
    db.prepare('DELETE FROM bank_fds WHERE id = ?').run(fd.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
