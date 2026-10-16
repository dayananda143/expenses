const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

const adminUserWhere = 'p.user_id IN (SELECT id FROM users WHERE is_admin = 1)';

function getFirstAdminId() {
  return db.prepare('SELECT id FROM users WHERE is_admin = 1 ORDER BY id ASC LIMIT 1').get()?.id;
}

// GET /api/pantry?workspace=us
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT p.* FROM pantry_items p
      WHERE ${adminUserWhere} AND p.workspace = ?
      ORDER BY p.sort_order ASC, p.created_at ASC
    `).all(req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/pantry?workspace=us
router.post('/', (req, res, next) => {
  try {
    const { name, quantity, unit, low_stock_at, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const adminId = getFirstAdminId();
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM pantry_items WHERE workspace = ?').get(req.workspace).m;
    const result = db.prepare(
      'INSERT INTO pantry_items (user_id, workspace, name, quantity, unit, low_stock_at, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(adminId, req.workspace, name.trim(), parseFloat(quantity ?? 0), unit?.trim() || 'pcs', low_stock_at !== undefined && low_stock_at !== null && low_stock_at !== '' ? parseFloat(low_stock_at) : null, notes?.trim() || null, maxOrder + 1);
    res.status(201).json({ data: db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/pantry/:id?workspace=us
router.put('/:id', (req, res, next) => {
  try {
    const item = db.prepare(`SELECT p.* FROM pantry_items p WHERE p.id = ? AND ${adminUserWhere} AND p.workspace = ?`).get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const { name, quantity, unit, low_stock_at, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    db.prepare(
      'UPDATE pantry_items SET name=?, quantity=?, unit=?, low_stock_at=?, notes=? WHERE id=?'
    ).run(name.trim(), parseFloat(quantity ?? 0), unit?.trim() || 'pcs', low_stock_at !== undefined && low_stock_at !== null && low_stock_at !== '' ? parseFloat(low_stock_at) : null, notes?.trim() || null, item.id);
    res.json({ data: db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(item.id) });
  } catch (err) { next(err); }
});

// PATCH /api/pantry/:id/adjust?workspace=us  { delta: 1 } or { delta: -1 }
router.patch('/:id/adjust', (req, res, next) => {
  try {
    const item = db.prepare(`SELECT p.* FROM pantry_items p WHERE p.id = ? AND ${adminUserWhere} AND p.workspace = ?`).get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const delta = parseFloat(req.body.delta);
    if (isNaN(delta)) return res.status(400).json({ error: 'delta is required' });
    const nextQty = Math.max(0, item.quantity + delta);
    db.prepare('UPDATE pantry_items SET quantity = ? WHERE id = ?').run(nextQty, item.id);
    res.json({ data: db.prepare('SELECT * FROM pantry_items WHERE id = ?').get(item.id) });
  } catch (err) { next(err); }
});

// DELETE /api/pantry/:id?workspace=us
router.delete('/:id', (req, res, next) => {
  try {
    const item = db.prepare(`SELECT p.* FROM pantry_items p WHERE p.id = ? AND ${adminUserWhere} AND p.workspace = ?`).get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM pantry_items WHERE id = ?').run(item.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// PATCH /api/pantry/reorder?workspace=us
router.patch('/reorder', (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE pantry_items SET sort_order = ? WHERE id = ? AND workspace = ?');
    ids.forEach((id, idx) => update.run(idx, id, req.workspace));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
