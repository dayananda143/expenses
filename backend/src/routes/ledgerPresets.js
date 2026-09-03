const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

// GET /api/ledger-presets?workspace=india
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM ledger_presets WHERE workspace = ? ORDER BY sort_order ASC, created_at ASC'
    ).all(req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/ledger-presets?workspace=india
router.post('/', (req, res, next) => {
  try {
    const { description, amount, type, notes } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    const txType = type === 'credit' ? 'credit' : 'debit';
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM ledger_presets WHERE workspace = ?').get(req.workspace).m;
    const result = db.prepare(
      'INSERT INTO ledger_presets (workspace, description, amount, type, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.workspace, description.trim(), parseFloat(amount), txType, notes?.trim() || null, maxOrder + 1);
    res.status(201).json({ data: db.prepare('SELECT * FROM ledger_presets WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/ledger-presets/:id?workspace=india
router.put('/:id', (req, res, next) => {
  try {
    const preset = db.prepare('SELECT * FROM ledger_presets WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!preset) return res.status(404).json({ error: 'Not found' });
    const { description, amount, type, notes } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    const txType = type === 'credit' ? 'credit' : 'debit';
    db.prepare('UPDATE ledger_presets SET description=?, amount=?, type=?, notes=? WHERE id=?')
      .run(description.trim(), parseFloat(amount), txType, notes?.trim() || null, preset.id);
    res.json({ data: db.prepare('SELECT * FROM ledger_presets WHERE id = ?').get(preset.id) });
  } catch (err) { next(err); }
});

// DELETE /api/ledger-presets/:id?workspace=india
router.delete('/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM ledger_presets WHERE id = ? AND workspace = ?').run(req.params.id, req.workspace);
    res.status(204).send();
  } catch (err) { next(err); }
});

// PATCH /api/ledger-presets/reorder?workspace=india
router.patch('/reorder', (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE ledger_presets SET sort_order = ? WHERE id = ? AND workspace = ?');
    ids.forEach((id, idx) => update.run(idx, id, req.workspace));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
