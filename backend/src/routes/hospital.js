const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Require hospital_access (admins always pass)
router.use((req, res, next) => {
  if (req.user.is_admin) return next();
  const u = db.prepare('SELECT hospital_access FROM users WHERE id = ?').get(req.user.id);
  if (u?.hospital_access) return next();
  return res.status(403).json({ error: 'No access to hospital expenses' });
});

// GET /api/hospital-expenses/users  — list of users with hospital access (for assignment dropdown)
router.get('/users', (req, res, next) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
    const users = db.prepare(
      'SELECT id, username FROM users WHERE (hospital_access = 1 OR is_admin = 1) AND is_active = 1 ORDER BY username ASC'
    ).all();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
});

// GET /api/hospital-expenses
router.get('/', (req, res, next) => {
  try {
    const { month, year, search, page = 1, limit: limitQ = 25, user_id, sort, order } = req.query;
    const SORT_COLS = { date: 'h.date', description: 'h.description', hospital: 'h.hospital', amount: 'h.amount' };
    const sortCol   = SORT_COLS[sort] ?? 'h.date';
    const sortDir   = order === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(Math.max(parseInt(limitQ) || 25, 1), 100);
    const offset = (parseInt(page) - 1) * limit;

    // Everyone with hospital_access sees all records; admin can filter by user_id
    let where = '1=1';
    const params = [];

    if (req.user.is_admin && user_id) {
      where = 'h.user_id = ?';
      params.push(user_id);
    }

    if (month && year) {
      where += ' AND strftime(\'%m\', h.date) = ? AND strftime(\'%Y\', h.date) = ?';
      params.push(String(month).padStart(2, '0'), String(year));
    } else if (year) {
      where += ' AND strftime(\'%Y\', h.date) = ?';
      params.push(String(year));
    }

    if (search) {
      where += ' AND (h.description LIKE ? OR h.hospital LIKE ? OR h.notes LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const total = db.prepare(
      `SELECT COUNT(*) AS n FROM hospital_expenses h WHERE ${where}`
    ).get(...params).n;

    const rows = db.prepare(
      `SELECT h.*, u.username FROM hospital_expenses h
       LEFT JOIN users u ON u.id = h.user_id
       WHERE ${where}
       ORDER BY ${sortCol} ${sortDir}, h.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({ data: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// POST /api/hospital-expenses
router.post('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { description, amount, date, hospital, notes, assigned_to } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    if (!date) return res.status(400).json({ error: 'date is required' });
    const parsedAmount = (amount != null && amount !== '') ? parseFloat(amount) : null;
    if (parsedAmount !== null && parsedAmount < 0) return res.status(400).json({ error: 'amount cannot be negative' });

    // Admins can assign to another user; others always own themselves
    let targetUserId = req.user.id;
    if (req.user.is_admin && assigned_to) {
      const target = db.prepare('SELECT id FROM users WHERE id = ?').get(assigned_to);
      if (!target) return res.status(400).json({ error: 'Assigned user not found' });
      targetUserId = target.id;
    }

    const result = db.prepare(
      'INSERT INTO hospital_expenses (user_id, description, amount, date, hospital, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(targetUserId, description.trim(), parsedAmount, date, hospital?.trim() ?? null, notes?.trim() ?? null);

    const row = db.prepare(
      'SELECT h.*, u.username FROM hospital_expenses h LEFT JOIN users u ON u.id = h.user_id WHERE h.id = ?'
    ).get(result.lastInsertRowid);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

// PUT /api/hospital-expenses/:id
router.put('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const row = db.prepare('SELECT * FROM hospital_expenses WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const { description, amount, date, hospital, notes, assigned_to } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    if (!date) return res.status(400).json({ error: 'date is required' });
    const parsedAmount = (amount != null && amount !== '') ? parseFloat(amount) : null;
    if (parsedAmount !== null && parsedAmount < 0) return res.status(400).json({ error: 'amount cannot be negative' });

    let targetUserId = row.user_id;
    if (req.user.is_admin && assigned_to) {
      const target = db.prepare('SELECT id FROM users WHERE id = ?').get(assigned_to);
      if (!target) return res.status(400).json({ error: 'Assigned user not found' });
      targetUserId = target.id;
    }

    db.prepare(
      'UPDATE hospital_expenses SET user_id = ?, description = ?, amount = ?, date = ?, hospital = ?, notes = ? WHERE id = ?'
    ).run(targetUserId, description.trim(), parsedAmount, date, hospital?.trim() ?? null, notes?.trim() ?? null, row.id);

    const updated = db.prepare(
      'SELECT h.*, u.username FROM hospital_expenses h LEFT JOIN users u ON u.id = h.user_id WHERE h.id = ?'
    ).get(row.id);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/hospital-expenses/:id
router.delete('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const row = db.prepare('SELECT * FROM hospital_expenses WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM hospital_expenses WHERE id = ?').run(row.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/hospital-expenses/summary
router.get('/summary', (req, res, next) => {
  try {
    const { year, user_id } = req.query;
    const yearParam = year ?? new Date().getFullYear().toString();

    // Everyone with hospital_access sees all records; admin can filter by user_id
    const scopeWhere  = user_id && req.user.is_admin ? 'user_id = ?' : '1=1';
    const scopeParams = user_id && req.user.is_admin ? [user_id] : [];

    const yearTotal = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM hospital_expenses WHERE ${scopeWhere} AND strftime('%Y', date) = ?`
    ).get(...scopeParams, yearParam).total;

    const monthly = db.prepare(
      `SELECT strftime('%m', date) AS month, SUM(amount) AS total FROM hospital_expenses WHERE ${scopeWhere} AND strftime('%Y', date) = ? GROUP BY month ORDER BY month`
    ).all(...scopeParams, yearParam);

    const allTime = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM hospital_expenses WHERE ${scopeWhere}`
    ).get(...scopeParams).total;

    res.json({ yearTotal, allTime, monthly, year: yearParam });
  } catch (err) {
    next(err);
  }
});

// GET /api/hospital-expenses/export/csv
router.get('/export/csv', (req, res, next) => {
  try {
    const { month, year, search, user_id } = req.query;

    let where = '1=1';
    const params = [];

    if (req.user.is_admin && user_id) {
      where = 'h.user_id = ?';
      params.push(user_id);
    }

    if (month && year) {
      where += ` AND strftime('%m', h.date) = ? AND strftime('%Y', h.date) = ?`;
      params.push(String(month).padStart(2, '0'), String(year));
    } else if (year) {
      where += ` AND strftime('%Y', h.date) = ?`;
      params.push(String(year));
    }

    if (search) {
      where += ' AND (h.description LIKE ? OR h.hospital LIKE ? OR h.notes LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const rows = db.prepare(
      `SELECT h.*, u.username FROM hospital_expenses h LEFT JOIN users u ON u.id = h.user_id WHERE ${where} ORDER BY h.date DESC`
    ).all(...params);

    const lines = [
      'date,description,amount,hospital,notes,assigned_to',
      ...rows.map((r) => [
        r.date,
        `"${(r.description ?? '').replace(/"/g, '""')}"`,
        r.amount ?? '',
        `"${(r.hospital ?? '').replace(/"/g, '""')}"`,
        `"${(r.notes ?? '').replace(/"/g, '""')}"`,
        `"${(r.username ?? '').replace(/"/g, '""')}"`,
      ].join(',')),
    ];

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hospital-expenses-${date}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
});

// POST /api/hospital-expenses/import/csv
router.post('/import/csv', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }

    const insert = db.prepare(
      'INSERT INTO hospital_expenses (user_id, description, amount, date, hospital, notes) VALUES (?, ?, ?, ?, ?, ?)'
    );

    let imported = 0;
    const errors = [];
    for (const [i, row] of rows.entries()) {
      const { date, description, amount, hospital, notes } = row;
      if (!date || !description) {
        errors.push(`Row ${i + 1}: date and description are required`);
        continue;
      }
      const parsedAmount = (amount != null && amount !== '') ? parseFloat(amount) : null;
      if (parsedAmount !== null && isNaN(parsedAmount)) {
        errors.push(`Row ${i + 1}: invalid amount`);
        continue;
      }
      insert.run(req.user.id, description.trim(), parsedAmount, date, hospital?.trim() ?? null, notes?.trim() ?? null);
      imported++;
    }

    res.json({ imported, errors });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
