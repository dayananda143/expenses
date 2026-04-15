const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/lent
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM lent_items WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/lent
router.post('/', (req, res, next) => {
  try {
    const { person, amount, notes, date_lent, due_date } = req.body;
    if (!person?.trim()) return res.status(400).json({ error: 'person is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    const result = db.prepare(
      'INSERT INTO lent_items (user_id, person, amount, notes, date_lent, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, person.trim(), parseFloat(amount), notes?.trim() || null, date_lent || null, due_date || null, 'pending');
    res.status(201).json({ data: db.prepare('SELECT * FROM lent_items WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/lent/:id
router.put('/:id', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM lent_items WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const { person, amount, notes, date_lent, due_date, status } = req.body;
    if (!person?.trim()) return res.status(400).json({ error: 'person is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    db.prepare(
      'UPDATE lent_items SET person=?, amount=?, notes=?, date_lent=?, due_date=?, status=? WHERE id=?'
    ).run(person.trim(), parseFloat(amount), notes?.trim() || null, date_lent || null, due_date || null, status || 'pending', item.id);
    res.json({ data: db.prepare('SELECT * FROM lent_items WHERE id = ?').get(item.id) });
  } catch (err) { next(err); }
});

// DELETE /api/lent/:id
router.delete('/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM lent_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
