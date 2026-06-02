const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

const adminUserWhere = 'user_id IN (SELECT id FROM users WHERE is_admin = 1)';

function getAdminId() {
  return db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
}

function tripRow(id) {
  return db.prepare(`
    SELECT t.*,
           (SELECT COUNT(*) FROM expenses e WHERE e.trip_id = t.id) AS expense_count,
           (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.trip_id = t.id) AS total_amount
    FROM trips t WHERE t.id = ?
  `).get(id);
}

// GET /api/trips
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT t.*,
             (SELECT COUNT(*) FROM expenses e WHERE e.trip_id = t.id) AS expense_count,
             (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.trip_id = t.id) AS total_amount
      FROM trips t
      WHERE t.user_id IN (SELECT id FROM users WHERE is_admin = 1) AND t.workspace = ?
      ORDER BY COALESCE(t.start_date, t.created_at) DESC
    `).all(req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/trips
router.post('/', (req, res, next) => {
  try {
    const { name, destination, start_date, end_date, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    const adminId = getAdminId();
    const result = db.prepare(
      'INSERT INTO trips (user_id, workspace, name, destination, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(adminId, req.workspace, name.trim(), destination?.trim() || null, start_date || null, end_date || null, notes?.trim() || null);
    res.status(201).json({ data: tripRow(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/trips/:id
router.put('/:id', (req, res, next) => {
  try {
    const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND ${adminUserWhere} AND workspace = ?`).get(req.params.id, req.workspace);
    if (!trip) return res.status(404).json({ error: 'Not found' });
    const { name, destination, start_date, end_date, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    db.prepare('UPDATE trips SET name=?, destination=?, start_date=?, end_date=?, notes=? WHERE id=?')
      .run(name.trim(), destination?.trim() || null, start_date || null, end_date || null, notes?.trim() || null, trip.id);
    res.json({ data: tripRow(trip.id) });
  } catch (err) { next(err); }
});

// DELETE /api/trips/:id
router.delete('/:id', (req, res, next) => {
  try {
    const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND ${adminUserWhere} AND workspace = ?`).get(req.params.id, req.workspace);
    if (!trip) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE expenses SET trip_id = NULL WHERE trip_id = ?').run(trip.id);
    db.prepare('DELETE FROM trips WHERE id = ?').run(trip.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/trips/:id/expenses
router.get('/:id/expenses', (req, res, next) => {
  try {
    const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND ${adminUserWhere} AND workspace = ?`).get(req.params.id, req.workspace);
    if (!trip) return res.status(404).json({ error: 'Not found' });
    const expenses = db.prepare(`
      SELECT e.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.trip_id = ? AND e.workspace = ?
      ORDER BY e.date DESC
    `).all(trip.id, req.workspace);
    res.json({ data: expenses, trip });
  } catch (err) { next(err); }
});

module.exports = router;
