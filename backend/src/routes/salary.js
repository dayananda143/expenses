const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/salary/settings
router.get('/settings', (req, res, next) => {
  try {
    // Non-admins see admin's salary settings
    const targetId = req.user.is_admin ? req.user.id : db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
    const row = db.prepare('SELECT monthly_amount FROM salary_settings WHERE user_id = ?').get(targetId);
    res.json({ monthly_amount: row?.monthly_amount ?? 0 });
  } catch (err) {
    next(err);
  }
});

// PUT /api/salary/settings
router.put('/settings', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { monthly_amount } = req.body;
    const amount = parseFloat(monthly_amount);
    if (isNaN(amount) || amount < 0) return res.status(400).json({ error: 'Invalid amount' });
    db.prepare(`
      INSERT INTO salary_settings (user_id, monthly_amount) VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET monthly_amount = excluded.monthly_amount
    `).run(req.user.id, amount);
    res.json({ monthly_amount: amount });
  } catch (err) {
    next(err);
  }
});

// GET /api/salary/summary
router.get('/summary', (req, res, next) => {
  try {
    // Non-admins see admin's salary data
    const targetId = req.user.is_admin ? req.user.id : db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
    const settings = db.prepare('SELECT monthly_amount FROM salary_settings WHERE user_id = ?').get(targetId);
    const monthly = settings?.monthly_amount ?? 0;

    const spent = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM salary_entries WHERE user_id = ?'
    ).get(targetId).total;

    res.json({ salary: monthly, remaining: monthly - spent });
  } catch (err) {
    next(err);
  }
});

// GET /api/salary
router.get('/', (req, res, next) => {
  try {
    const { search, page = 1, sort, order } = req.query;
    const SORT_COLS = { description: 's.description', amount: 's.amount' };
    const sortCol = SORT_COLS[sort] ?? 's.created_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';
    const limit = 50;
    const offset = (parseInt(page) - 1) * limit;

    // Non-admins see admin's salary entries
    const targetId = req.user.is_admin ? req.user.id : db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
    let where = 's.user_id = ?';
    const params = [targetId];

    if (search) {
      where += ' AND (s.description LIKE ? OR s.notes LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    const total = db.prepare(
      `SELECT COUNT(*) AS n FROM salary_entries s WHERE ${where}`
    ).get(...params).n;

    const rows = db.prepare(
      `SELECT s.* FROM salary_entries s
       WHERE ${where}
       ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({ data: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// POST /api/salary
router.post('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { description, amount, notes } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    const parsedAmount = (amount != null && amount !== '') ? parseFloat(amount) : null;
    if (parsedAmount !== null && parsedAmount < 0) return res.status(400).json({ error: 'amount cannot be negative' });

    const result = db.prepare(
      'INSERT INTO salary_entries (user_id, description, amount, notes) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, description.trim(), parsedAmount, notes?.trim() ?? null);

    const row = db.prepare('SELECT * FROM salary_entries WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

// PUT /api/salary/:id
router.put('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const row = db.prepare('SELECT * FROM salary_entries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const { description, amount, notes } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    const parsedAmount = (amount != null && amount !== '') ? parseFloat(amount) : null;
    if (parsedAmount !== null && parsedAmount < 0) return res.status(400).json({ error: 'amount cannot be negative' });

    db.prepare(
      'UPDATE salary_entries SET description = ?, amount = ?, notes = ? WHERE id = ?'
    ).run(description.trim(), parsedAmount, notes?.trim() ?? null, row.id);

    const updated = db.prepare('SELECT * FROM salary_entries WHERE id = ?').get(row.id);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/salary/:id
router.delete('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const row = db.prepare('SELECT * FROM salary_entries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM salary_entries WHERE id = ?').run(row.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
