const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

const adminUserWhere = 'user_id IN (SELECT id FROM users WHERE is_admin = 1)';

function getAdminId(db) {
  return db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
}

// GET /api/priority — shared across all admins
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT * FROM priority_items WHERE ${adminUserWhere} AND workspace = ? ORDER BY sort_order ASC, created_at ASC`
    ).all(req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/priority — write under first admin
router.post('/', (req, res, next) => {
  try {
    const { name, budget, saved, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!budget || parseFloat(budget) <= 0) return res.status(400).json({ error: 'budget must be > 0' });
    const adminId = getAdminId(db);
    const maxOrder = db.prepare(`SELECT COALESCE(MAX(sort_order),0) AS m FROM priority_items WHERE ${adminUserWhere} AND workspace = ?`).get(req.workspace).m;
    const result = db.prepare(
      'INSERT INTO priority_items (user_id, workspace, name, budget, saved, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(adminId, req.workspace, name.trim(), parseFloat(budget), parseFloat(saved ?? 0), notes?.trim() || null, maxOrder + 1);
    res.status(201).json({ data: db.prepare('SELECT * FROM priority_items WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/priority/:id
router.put('/:id', (req, res, next) => {
  try {
    const item = db.prepare(`SELECT * FROM priority_items WHERE id = ? AND ${adminUserWhere} AND workspace = ?`).get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const { name, budget, saved, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!budget || parseFloat(budget) <= 0) return res.status(400).json({ error: 'budget must be > 0' });
    db.prepare('UPDATE priority_items SET name=?, budget=?, saved=?, notes=? WHERE id=?')
      .run(name.trim(), parseFloat(budget), parseFloat(saved ?? 0), notes?.trim() || null, item.id);
    res.json({ data: db.prepare('SELECT * FROM priority_items WHERE id = ?').get(item.id) });
  } catch (err) { next(err); }
});

// DELETE /api/priority/:id
router.delete('/:id', (req, res, next) => {
  try {
    const item = db.prepare(`SELECT * FROM priority_items WHERE id = ? AND ${adminUserWhere} AND workspace = ?`).get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM priority_items WHERE id = ?').run(item.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// PATCH /api/priority/:id/archive
router.patch('/:id/archive', (req, res, next) => {
  try {
    const item = db.prepare(`SELECT * FROM priority_items WHERE id = ? AND ${adminUserWhere} AND workspace = ?`).get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const now = item.archived ? null : new Date().toISOString();
    db.prepare('UPDATE priority_items SET archived = ?, archived_at = ? WHERE id = ?').run(item.archived ? 0 : 1, now, item.id);
    res.json({ data: db.prepare('SELECT * FROM priority_items WHERE id = ?').get(item.id) });
  } catch (err) { next(err); }
});

// PATCH /api/priority/reorder
router.patch('/reorder', (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE priority_items SET sort_order = ? WHERE id = ?');
    ids.forEach((id, idx) => update.run(idx, id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
