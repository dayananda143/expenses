const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/lic
router.get('/', (req, res, next) => {
  try {
    const targetId = req.user.is_admin
      ? req.user.id
      : db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
    const rows = db.prepare(
      'SELECT * FROM lic_policies WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC'
    ).all(targetId);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/lic
router.post('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { lic_number, name, amount, start_date, maturity_date, premium, notes, status } = req.body;
    if (!lic_number?.trim()) return res.status(400).json({ error: 'lic_number is required' });
    if (!name?.trim())       return res.status(400).json({ error: 'name is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    if (!start_date)    return res.status(400).json({ error: 'start_date is required' });
    if (!maturity_date) return res.status(400).json({ error: 'maturity_date is required' });

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM lic_policies WHERE user_id = ?').get(req.user.id).m;
    const result = db.prepare(
      `INSERT INTO lic_policies (user_id, lic_number, name, amount, start_date, maturity_date, premium, notes, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.user.id,
      lic_number.trim(),
      name.trim(),
      parseFloat(amount),
      start_date,
      maturity_date,
      premium ? parseFloat(premium) : null,
      notes?.trim() || null,
      status ?? 'active',
      maxOrder + 1
    );
    res.status(201).json({ data: db.prepare('SELECT * FROM lic_policies WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PATCH /api/lic/reorder
router.patch('/reorder', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE lic_policies SET sort_order = ? WHERE id = ? AND user_id = ?');
    ids.forEach((id, idx) => update.run(idx, id, req.user.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/lic/:id
router.put('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const policy = db.prepare('SELECT * FROM lic_policies WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    const { lic_number, name, amount, start_date, maturity_date, premium, notes, status } = req.body;
    if (!lic_number?.trim()) return res.status(400).json({ error: 'lic_number is required' });
    if (!name?.trim())       return res.status(400).json({ error: 'name is required' });

    db.prepare(
      `UPDATE lic_policies SET lic_number = ?, name = ?, amount = ?, start_date = ?, maturity_date = ?, premium = ?, notes = ?, status = ? WHERE id = ?`
    ).run(
      lic_number.trim(),
      name.trim(),
      parseFloat(amount ?? policy.amount),
      start_date ?? policy.start_date,
      maturity_date ?? policy.maturity_date,
      premium ? parseFloat(premium) : null,
      notes?.trim() || null,
      status ?? policy.status,
      policy.id
    );
    res.json({ data: db.prepare('SELECT * FROM lic_policies WHERE id = ?').get(policy.id) });
  } catch (err) { next(err); }
});

// DELETE /api/lic/:id
router.delete('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const policy = db.prepare('SELECT * FROM lic_policies WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    db.prepare('DELETE FROM lic_policies WHERE id = ?').run(policy.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
