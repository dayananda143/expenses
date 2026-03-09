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

// GET /api/accounts?workspace=india
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM accounts WHERE user_id = ? AND workspace = ? ORDER BY sort_order ASC, created_at ASC'
    ).all(req.user.id, req.workspace);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts?workspace=india
router.post('/', (req, res, next) => {
  try {
    const { name, type, balance, credit_limit, due_day, promo_apr_end_date, is_active, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (type && !['savings', 'credit'].includes(type)) return res.status(400).json({ error: 'type must be savings or credit' });

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM accounts WHERE user_id = ? AND workspace = ?').get(req.user.id, req.workspace).m;
    const result = db.prepare(
      'INSERT INTO accounts (user_id, workspace, name, type, balance, credit_limit, due_day, promo_apr_end_date, is_active, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, req.workspace, name.trim(), type ?? 'savings', parseFloat(balance ?? 0), credit_limit ? parseFloat(credit_limit) : null, due_day ? parseInt(due_day) : null, promo_apr_end_date ?? null, is_active !== false ? 1 : 0, notes ?? null, maxOrder + 1);

    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/accounts/reorder?workspace=india
router.patch('/reorder', (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE accounts SET sort_order = ? WHERE id = ? AND user_id = ? AND workspace = ?');
    ids.forEach((id, idx) => update.run(idx, id, req.user.id, req.workspace));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/accounts/:id?workspace=india
router.put('/:id', (req, res, next) => {
  try {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ? AND workspace = ?').get(req.params.id, req.user.id, req.workspace);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const { name, type, balance, credit_limit, due_day, promo_apr_end_date, is_active, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (type && !['savings', 'credit'].includes(type)) return res.status(400).json({ error: 'type must be savings or credit' });

    db.prepare(
      'UPDATE accounts SET name = ?, type = ?, balance = ?, credit_limit = ?, due_day = ?, promo_apr_end_date = ?, is_active = ?, notes = ? WHERE id = ?'
    ).run(name.trim(), type ?? account.type, parseFloat(balance ?? 0), credit_limit ? parseFloat(credit_limit) : null, due_day ? parseInt(due_day) : null, promo_apr_end_date ?? null, is_active !== false ? 1 : 0, notes ?? null, account.id);

    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts/:id?workspace=india
router.delete('/:id', (req, res, next) => {
  try {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ? AND workspace = ?').get(req.params.id, req.user.id, req.workspace);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    db.prepare('DELETE FROM accounts WHERE id = ?').run(account.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
