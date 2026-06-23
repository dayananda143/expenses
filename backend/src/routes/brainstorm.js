const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

// GET /api/brainstorm
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT *, (SELECT COALESCE(SUM(given_amount),0) FROM brainstorm_records WHERE item_id = brainstorm_items.id) AS given_amount
       FROM brainstorm_items WHERE workspace = ? ORDER BY sort_order ASC, created_at ASC`
    ).all(req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// GET /api/brainstorm/:id
router.get('/:id', (req, res, next) => {
  try {
    const item = db.prepare(
      `SELECT *, (SELECT COALESCE(SUM(given_amount),0) FROM brainstorm_records WHERE item_id = brainstorm_items.id) AS given_amount
       FROM brainstorm_items WHERE id = ? AND workspace = ?`
    ).get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ data: item });
  } catch (err) { next(err); }
});

// POST /api/brainstorm
router.post('/', (req, res, next) => {
  try {
    const { name, total_amount, notes, currency } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!total_amount || isNaN(Number(total_amount)) || Number(total_amount) <= 0)
      return res.status(400).json({ error: 'total_amount must be a positive number' });
    if (currency != null && !['INR', 'USD'].includes(currency))
      return res.status(400).json({ error: 'currency must be INR or USD' });
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM brainstorm_items WHERE workspace = ?').get(req.workspace).m;
    const result = db.prepare(
      'INSERT INTO brainstorm_items (user_id, workspace, name, total_amount, paid_amount, notes, sort_order, currency) VALUES (?, ?, ?, ?, 0, ?, ?, ?)'
    ).run(req.user.id, req.workspace, name.trim(), Number(total_amount), notes?.trim() || null, maxOrder + 1, currency ?? 'INR');
    res.status(201).json({ data: db.prepare('SELECT * FROM brainstorm_items WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/brainstorm/:id
router.put('/:id', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM brainstorm_items WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const { name, total_amount, notes, currency } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!total_amount || isNaN(Number(total_amount)) || Number(total_amount) <= 0)
      return res.status(400).json({ error: 'total_amount must be a positive number' });
    if (currency != null && !['INR', 'USD'].includes(currency))
      return res.status(400).json({ error: 'currency must be INR or USD' });
    db.prepare('UPDATE brainstorm_items SET name=?, total_amount=?, notes=?, currency=? WHERE id=?')
      .run(name.trim(), Number(total_amount), notes?.trim() || null, currency ?? item.currency ?? 'INR', item.id);
    res.json({ data: db.prepare('SELECT * FROM brainstorm_items WHERE id = ?').get(item.id) });
  } catch (err) { next(err); }
});

// PATCH /api/brainstorm/:id/pay — update paid_amount
router.patch('/:id/pay', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM brainstorm_items WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const paid = Number(req.body.paid_amount);
    if (isNaN(paid) || paid < 0) return res.status(400).json({ error: 'paid_amount must be >= 0' });
    db.prepare('UPDATE brainstorm_items SET paid_amount=? WHERE id=?').run(paid, item.id);
    res.json({ data: db.prepare('SELECT * FROM brainstorm_items WHERE id = ?').get(item.id) });
  } catch (err) { next(err); }
});

// DELETE /api/brainstorm/:id
router.delete('/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM brainstorm_items WHERE id = ? AND workspace = ?').run(req.params.id, req.workspace);
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/brainstorm/:id/records
router.get('/:id/records', (req, res, next) => {
  try {
    const item = db.prepare('SELECT id FROM brainstorm_items WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const rows = db.prepare('SELECT * FROM brainstorm_records WHERE item_id = ? ORDER BY created_at DESC').all(item.id);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/brainstorm/:id/records
router.post('/:id/records', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM brainstorm_items WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const { name, amount, notes, given_amount } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return res.status(400).json({ error: 'amount must be a positive number' });
    const given = given_amount == null || given_amount === '' ? 0 : Number(given_amount);
    if (isNaN(given) || given < 0) return res.status(400).json({ error: 'given_amount must be >= 0' });
    const result = db.prepare(
      'INSERT INTO brainstorm_records (item_id, name, amount, notes, given_amount) VALUES (?, ?, ?, ?, ?)'
    ).run(item.id, name.trim(), Number(amount), notes?.trim() || null, given);
    // Auto-update paid_amount = sum of all records
    const sum = db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM brainstorm_records WHERE item_id = ?').get(item.id).s;
    db.prepare('UPDATE brainstorm_items SET paid_amount = ? WHERE id = ?').run(sum, item.id);
    const record = db.prepare('SELECT * FROM brainstorm_records WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: record });
  } catch (err) { next(err); }
});

// PUT /api/brainstorm/:id/records/:recordId
router.put('/:id/records/:recordId', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM brainstorm_items WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const record = db.prepare('SELECT * FROM brainstorm_records WHERE id = ? AND item_id = ?').get(req.params.recordId, item.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    const { name, amount, notes, given_amount } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return res.status(400).json({ error: 'amount must be a positive number' });
    const given = given_amount == null || given_amount === '' ? 0 : Number(given_amount);
    if (isNaN(given) || given < 0) return res.status(400).json({ error: 'given_amount must be >= 0' });
    db.prepare('UPDATE brainstorm_records SET name=?, amount=?, notes=?, given_amount=? WHERE id=?')
      .run(name.trim(), Number(amount), notes?.trim() || null, given, record.id);
    const sum = db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM brainstorm_records WHERE item_id = ?').get(item.id).s;
    db.prepare('UPDATE brainstorm_items SET paid_amount = ? WHERE id = ?').run(sum, item.id);
    res.json({ data: db.prepare('SELECT * FROM brainstorm_records WHERE id = ?').get(record.id) });
  } catch (err) { next(err); }
});

// DELETE /api/brainstorm/:id/records/:recordId
router.delete('/:id/records/:recordId', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM brainstorm_items WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM brainstorm_records WHERE id = ? AND item_id = ?').run(req.params.recordId, item.id);
    const sum = db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM brainstorm_records WHERE item_id = ?').get(item.id).s;
    db.prepare('UPDATE brainstorm_items SET paid_amount = ? WHERE id = ?').run(sum, item.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
