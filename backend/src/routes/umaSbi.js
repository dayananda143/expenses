const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/uma-sbi
router.get('/', (req, res, next) => {
  try {
    const targetId = req.user.is_admin
      ? req.user.id
      : db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
    const rows = db.prepare(
      'SELECT * FROM uma_sbi WHERE user_id = ? ORDER BY date DESC, created_at DESC'
    ).all(targetId);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/uma-sbi
router.post('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { description, amount, date } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    if (amount == null || isNaN(parseFloat(amount))) return res.status(400).json({ error: 'amount is required' });

    const result = db.prepare(
      `INSERT INTO uma_sbi (user_id, description, amount, date) VALUES (?, ?, ?, ?)`
    ).run(
      req.user.id,
      description.trim(),
      parseFloat(amount),
      date || new Date().toISOString().slice(0, 10)
    );
    res.status(201).json({ data: db.prepare('SELECT * FROM uma_sbi WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/uma-sbi/:id
router.put('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const row = db.prepare('SELECT * FROM uma_sbi WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Entry not found' });

    const { description, amount, date } = req.body;
    db.prepare(
      `UPDATE uma_sbi SET description = ?, amount = ?, date = ? WHERE id = ?`
    ).run(
      description?.trim() ?? row.description,
      amount != null ? parseFloat(amount) : row.amount,
      date ?? row.date,
      row.id
    );
    res.json({ data: db.prepare('SELECT * FROM uma_sbi WHERE id = ?').get(row.id) });
  } catch (err) { next(err); }
});

// DELETE /api/uma-sbi/:id
router.delete('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const row = db.prepare('SELECT * FROM uma_sbi WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Entry not found' });
    db.prepare('DELETE FROM uma_sbi WHERE id = ?').run(row.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
