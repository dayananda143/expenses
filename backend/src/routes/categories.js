const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

// GET /api/categories?workspace=india
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM categories WHERE user_id = ? AND workspace = ? ORDER BY sort_order ASC, name ASC'
    ).all(req.user.id, req.workspace);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories?workspace=india
router.post('/', (req, res, next) => {
  try {
    const { name, color, icon } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories WHERE user_id = ? AND workspace = ?').get(req.user.id, req.workspace).m;
    const result = db.prepare(
      'INSERT INTO categories (user_id, name, color, icon, workspace, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, name.trim(), color ?? '#6366f1', icon ?? 'circle', req.workspace, maxOrder + 1);

    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/categories/reorder?workspace=india  body: { ids: [3,1,2] }
router.patch('/reorder', (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ? AND user_id = ? AND workspace = ?');
    ids.forEach((id, idx) => update.run(idx, id, req.user.id, req.workspace));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id?workspace=india
router.put('/:id', (req, res, next) => {
  try {
    const cat = db.prepare(
      'SELECT * FROM categories WHERE id = ? AND user_id = ? AND workspace = ?'
    ).get(req.params.id, req.user.id, req.workspace);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const { name, color, icon } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    db.prepare(
      'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?'
    ).run(name.trim(), color ?? cat.color, icon ?? cat.icon, cat.id);

    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(cat.id);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id?workspace=india
router.delete('/:id', (req, res, next) => {
  try {
    const cat = db.prepare(
      'SELECT * FROM categories WHERE id = ? AND user_id = ? AND workspace = ?'
    ).get(req.params.id, req.user.id, req.workspace);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id/subtypes
router.get('/:id/subtypes', (req, res, next) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM category_subtypes WHERE category_id = ? AND user_id = ? ORDER BY sort_order ASC, name ASC'
    ).all(req.params.id, req.user.id);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/categories/:id/subtypes
router.post('/:id/subtypes', (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM category_subtypes WHERE category_id = ? AND user_id = ?').get(req.params.id, req.user.id).m;
    const result = db.prepare(
      'INSERT INTO category_subtypes (category_id, user_id, name, sort_order) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, req.user.id, name.trim(), maxOrder + 1);
    res.status(201).json({ data: db.prepare('SELECT * FROM category_subtypes WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// DELETE /api/categories/:id/subtypes/:sid
router.delete('/:id/subtypes/:sid', (req, res, next) => {
  try {
    db.prepare('DELETE FROM category_subtypes WHERE id = ? AND user_id = ?').run(req.params.sid, req.user.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/categories/subtypes/all  — all subtypes for a workspace (for expense form)
router.get('/subtypes/all', (req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT cs.* FROM category_subtypes cs
       JOIN categories c ON c.id = cs.category_id
       WHERE cs.user_id = ? AND c.workspace = ?
       ORDER BY cs.category_id, cs.sort_order ASC, cs.name ASC`
    ).all(req.user.id, req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
