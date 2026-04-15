const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

// GET /api/india-list
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM india_list_items WHERE workspace = ? ORDER BY sort_order ASC, created_at ASC'
    ).all(req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/india-list
router.post('/', (req, res, next) => {
  try {
    const { name, notes, type } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM india_list_items WHERE workspace = ?').get(req.workspace).m;
    const result = db.prepare(
      'INSERT INTO india_list_items (workspace, name, notes, type, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(req.workspace, name.trim(), notes?.trim() || null, type?.trim() || 'buy', maxOrder + 1);
    res.status(201).json({ data: db.prepare('SELECT * FROM india_list_items WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/india-list/:id
router.put('/:id', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM india_list_items WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const { name, notes, type, done } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    db.prepare('UPDATE india_list_items SET name=?, notes=?, type=?, done=? WHERE id=?')
      .run(name.trim(), notes?.trim() || null, type?.trim() || 'buy', done ? 1 : 0, item.id);
    res.json({ data: db.prepare('SELECT * FROM india_list_items WHERE id = ?').get(item.id) });
  } catch (err) { next(err); }
});

// PATCH /api/india-list/:id/toggle
router.patch('/:id/toggle', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM india_list_items WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!item) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE india_list_items SET done = ? WHERE id = ?').run(item.done ? 0 : 1, item.id);
    res.json({ data: db.prepare('SELECT * FROM india_list_items WHERE id = ?').get(item.id) });
  } catch (err) { next(err); }
});

// DELETE /api/india-list/:id
router.delete('/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM india_list_items WHERE id = ? AND workspace = ?').run(req.params.id, req.workspace);
    res.status(204).send();
  } catch (err) { next(err); }
});

// PATCH /api/india-list/reorder
router.patch('/reorder', (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE india_list_items SET sort_order = ? WHERE id = ? AND workspace = ?');
    ids.forEach((id, idx) => update.run(idx, id, req.workspace));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
