const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

// Require accounts_access (admins always pass)
router.use((req, res, next) => {
  if (req.user.is_admin) return next();
  const u = db.prepare('SELECT accounts_access FROM users WHERE id = ?').get(req.user.id);
  if (u?.accounts_access) return next();
  return res.status(403).json({ error: 'No access to accounts' });
});

const adminUserWhere = 'a.user_id IN (SELECT id FROM users WHERE is_admin = 1)';

function getFirstAdminId() {
  return db.prepare('SELECT id FROM users WHERE is_admin = 1 ORDER BY id ASC LIMIT 1').get()?.id;
}

// GET /api/accounts?workspace=us
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT a.*, u.username AS belongs_to_username
       FROM accounts a
       LEFT JOIN users u ON u.id = a.belongs_to_user_id
       WHERE ${adminUserWhere} AND a.workspace = ?
       ORDER BY a.sort_order ASC, a.created_at ASC`
    ).all(req.workspace);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/accounts?workspace=us
router.post('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { name, type, balance, credit_limit, due_day, promo_apr_end_date, is_active, notes, belongs_to_user_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (type && !['savings', 'credit'].includes(type)) return res.status(400).json({ error: 'type must be savings or credit' });
    const adminId = getFirstAdminId();
    const maxOrder = db.prepare(`SELECT COALESCE(MAX(a.sort_order), 0) AS m FROM accounts a WHERE ${adminUserWhere} AND a.workspace = ?`).get(req.workspace).m;
    const result = db.prepare(
      'INSERT INTO accounts (user_id, workspace, name, type, balance, credit_limit, due_day, promo_apr_end_date, is_active, notes, sort_order, belongs_to_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(adminId, req.workspace, name.trim(), type ?? 'savings', parseFloat(balance ?? 0), credit_limit ? parseFloat(credit_limit) : null, due_day ? parseInt(due_day) : null, promo_apr_end_date ?? null, is_active !== false ? 1 : 0, notes ?? null, maxOrder + 1, belongs_to_user_id ? parseInt(belongs_to_user_id) : null);
    const row = db.prepare('SELECT a.*, u.username AS belongs_to_username FROM accounts a LEFT JOIN users u ON u.id = a.belongs_to_user_id WHERE a.id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

// PATCH /api/accounts/reorder?workspace=us
router.patch('/reorder', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE accounts SET sort_order = ? WHERE id = ?');
    ids.forEach((id, idx) => update.run(idx, id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/accounts/:id?workspace=us
router.put('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const account = db.prepare(`SELECT a.* FROM accounts a WHERE a.id = ? AND ${adminUserWhere} AND a.workspace = ?`).get(req.params.id, req.workspace);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const { name, type, balance, credit_limit, due_day, promo_apr_end_date, is_active, notes, belongs_to_user_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (type && !['savings', 'credit'].includes(type)) return res.status(400).json({ error: 'type must be savings or credit' });
    db.prepare(
      'UPDATE accounts SET name = ?, type = ?, balance = ?, credit_limit = ?, due_day = ?, promo_apr_end_date = ?, is_active = ?, notes = ?, belongs_to_user_id = ? WHERE id = ?'
    ).run(name.trim(), type ?? account.type, parseFloat(balance ?? 0), credit_limit ? parseFloat(credit_limit) : null, due_day ? parseInt(due_day) : null, promo_apr_end_date ?? null, is_active !== false ? 1 : 0, notes ?? null, belongs_to_user_id ? parseInt(belongs_to_user_id) : null, account.id);
    const row = db.prepare('SELECT a.*, u.username AS belongs_to_username FROM accounts a LEFT JOIN users u ON u.id = a.belongs_to_user_id WHERE a.id = ?').get(account.id);
    res.json({ data: row });
  } catch (err) { next(err); }
});

// PATCH /api/accounts/:id/archive?workspace=us
router.patch('/:id/archive', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const account = db.prepare(`SELECT a.* FROM accounts a WHERE a.id = ? AND ${adminUserWhere} AND a.workspace = ?`).get(req.params.id, req.workspace);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const nowArchived = account.archived ? 0 : 1;
    db.prepare('UPDATE accounts SET archived = ?, archived_at = ? WHERE id = ?').run(nowArchived, nowArchived ? new Date().toISOString() : null, account.id);
    const row = db.prepare('SELECT a.*, u.username AS belongs_to_username FROM accounts a LEFT JOIN users u ON u.id = a.belongs_to_user_id WHERE a.id = ?').get(account.id);
    res.json({ data: row });
  } catch (err) { next(err); }
});

// DELETE /api/accounts/:id?workspace=us
router.delete('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const account = db.prepare(`SELECT a.* FROM accounts a WHERE a.id = ? AND ${adminUserWhere} AND a.workspace = ?`).get(req.params.id, req.workspace);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    db.prepare('DELETE FROM accounts WHERE id = ?').run(account.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
