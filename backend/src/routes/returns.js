const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

const adminUserWhere = 'r.user_id IN (SELECT id FROM users WHERE is_admin = 1)';

function getFirstAdminId() {
  return db.prepare('SELECT id FROM users WHERE is_admin = 1 ORDER BY id ASC LIMIT 1').get()?.id;
}

// GET /api/returns?workspace=us
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT r.*, a.name AS account_name
      FROM returns r
      LEFT JOIN accounts a ON a.id = r.account_id
      WHERE ${adminUserWhere} AND r.workspace = ?
      ORDER BY r.status ASC, r.date DESC, r.created_at DESC
    `).all(req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/returns?workspace=us
router.post('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { item_name, amount, account_id, date, notes } = req.body;
    if (!item_name?.trim()) return res.status(400).json({ error: 'item_name is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    const adminId = getFirstAdminId();
    const result = db.prepare(
      'INSERT INTO returns (user_id, workspace, account_id, item_name, amount, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(adminId, req.workspace, account_id ? parseInt(account_id) : null, item_name.trim(), parseFloat(amount), date || new Date().toISOString().slice(0, 10), notes?.trim() || null);
    const row = db.prepare(`
      SELECT r.*, a.name AS account_name FROM returns r LEFT JOIN accounts a ON a.id = r.account_id WHERE r.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

// PUT /api/returns/:id?workspace=us
router.put('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const existing = db.prepare(`SELECT r.* FROM returns r WHERE r.id = ? AND ${adminUserWhere} AND r.workspace = ?`).get(req.params.id, req.workspace);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { item_name, amount, account_id, date, notes, status } = req.body;
    if (!item_name?.trim()) return res.status(400).json({ error: 'item_name is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    db.prepare(
      'UPDATE returns SET item_name=?, amount=?, account_id=?, date=?, notes=?, status=? WHERE id=?'
    ).run(item_name.trim(), parseFloat(amount), account_id ? parseInt(account_id) : null, date || existing.date, notes?.trim() || null, status === 'returned' ? 'returned' : 'pending', existing.id);
    const row = db.prepare(`
      SELECT r.*, a.name AS account_name FROM returns r LEFT JOIN accounts a ON a.id = r.account_id WHERE r.id = ?
    `).get(existing.id);
    res.json({ data: row });
  } catch (err) { next(err); }
});

// PATCH /api/returns/:id/toggle?workspace=us
router.patch('/:id/toggle', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const existing = db.prepare(`SELECT r.* FROM returns r WHERE r.id = ? AND ${adminUserWhere} AND r.workspace = ?`).get(req.params.id, req.workspace);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const nextStatus = existing.status === 'pending' ? 'returned' : 'pending';
    db.prepare('UPDATE returns SET status = ? WHERE id = ?').run(nextStatus, existing.id);
    const row = db.prepare(`
      SELECT r.*, a.name AS account_name FROM returns r LEFT JOIN accounts a ON a.id = r.account_id WHERE r.id = ?
    `).get(existing.id);
    res.json({ data: row });
  } catch (err) { next(err); }
});

// DELETE /api/returns/:id?workspace=us
router.delete('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const existing = db.prepare(`SELECT r.* FROM returns r WHERE r.id = ? AND ${adminUserWhere} AND r.workspace = ?`).get(req.params.id, req.workspace);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM returns WHERE id = ?').run(existing.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
