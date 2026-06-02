const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

function getAdminId() {
  return db.prepare('SELECT id FROM users WHERE is_admin = 1 ORDER BY id ASC LIMIT 1').get()?.id;
}

// GET /api/properties
router.get('/', (req, res, next) => {
  try {
    const adminId = getAdminId();
    const rows = db.prepare(
      'SELECT * FROM properties WHERE user_id = ? AND workspace = ? ORDER BY sort_order ASC, created_at ASC'
    ).all(adminId, req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/properties
router.post('/', (req, res, next) => {
  try {
    const adminId = getAdminId();
    const { name, area, actual_price, appreciated_value, purchase_date, sold_date, sold_amount, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM properties WHERE user_id = ? AND workspace = ?').get(adminId, req.workspace).m;
    const result = db.prepare(
      'INSERT INTO properties (user_id, workspace, name, area, actual_price, appreciated_value, purchase_date, sold_date, sold_amount, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(adminId, req.workspace, name.trim(), area?.trim() || null, actual_price ? Number(actual_price) : null, appreciated_value ? Number(appreciated_value) : null, purchase_date || null, sold_date || null, sold_amount ? Number(sold_amount) : null, notes?.trim() || null, maxOrder + 1);
    res.status(201).json({ data: db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/properties/:id
router.put('/:id', (req, res, next) => {
  try {
    const adminId = getAdminId();
    const prop = db.prepare('SELECT * FROM properties WHERE id = ? AND user_id = ? AND workspace = ?').get(req.params.id, adminId, req.workspace);
    if (!prop) return res.status(404).json({ error: 'Not found' });
    const { name, area, actual_price, appreciated_value, purchase_date, sold_date, sold_amount, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    db.prepare('UPDATE properties SET name=?, area=?, actual_price=?, appreciated_value=?, purchase_date=?, sold_date=?, sold_amount=?, notes=? WHERE id=?')
      .run(name.trim(), area?.trim() || null, actual_price ? Number(actual_price) : null, appreciated_value ? Number(appreciated_value) : null, purchase_date || null, sold_date || null, sold_amount ? Number(sold_amount) : null, notes?.trim() || null, prop.id);
    res.json({ data: db.prepare('SELECT * FROM properties WHERE id = ?').get(prop.id) });
  } catch (err) { next(err); }
});

// DELETE /api/properties/:id
router.delete('/:id', (req, res, next) => {
  try {
    const adminId = getAdminId();
    db.prepare('DELETE FROM properties WHERE id = ? AND user_id = ? AND workspace = ?').run(req.params.id, adminId, req.workspace);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
