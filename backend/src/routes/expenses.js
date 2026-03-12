const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

function buildWhere(query, workspace, userId, isAdmin) {
  const { category_id, date_from, date_to, search, user_id, month, year, type } = query;
  const where = ['e.workspace = ?'];
  const params = [workspace];

  if (isAdmin && user_id && user_id !== 'all') {
    where.push('e.user_id = ?');
    params.push(parseInt(user_id));
  } else if (!isAdmin) {
    where.push('e.user_id = ?');
    params.push(userId);
  }

  if (category_id && category_id !== 'all') {
    where.push('e.category_id = ?');
    params.push(parseInt(category_id));
  }

  // month+year filter takes precedence over date_from/date_to
  if (month && year) {
    const m = String(parseInt(month)).padStart(2, '0');
    const y = parseInt(year);
    const nextM = parseInt(month) === 12 ? '01' : String(parseInt(month) + 1).padStart(2, '0');
    const nextY = parseInt(month) === 12 ? y + 1 : y;
    where.push('e.date >= ?'); params.push(`${y}-${m}-01`);
    where.push('e.date < ?');  params.push(`${nextY}-${nextM}-01`);
  } else if (year && !month) {
    where.push('e.date >= ?'); params.push(`${parseInt(year)}-01-01`);
    where.push('e.date < ?');  params.push(`${parseInt(year) + 1}-01-01`);
  } else {
    if (date_from) { where.push('e.date >= ?'); params.push(date_from); }
    if (date_to)   { where.push('e.date <= ?'); params.push(date_to); }
  }

  if (search) {
    where.push('(e.description LIKE ? OR e.notes LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (type && (type === 'debit' || type === 'credit')) { where.push('e.type = ?'); params.push(type); }

  return { whereClause: `WHERE ${where.join(' AND ')}`, params };
}

// GET /api/expenses?workspace=india
router.get('/', (req, res, next) => {
  try {
    const { sort = 'date', order = 'desc', page = 1, limit = 50 } = req.query;
    const validSorts = ['date', 'amount', 'description', 'created_at'];
    const sortField = validSorts.includes(sort) ? `e.${sort}` : 'e.date';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const { whereClause, params } = buildWhere(req.query, req.workspace, req.user.id, req.user.is_admin);
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const total = db.prepare(`SELECT COUNT(*) as count FROM expenses e ${whereClause}`).get(...params).count;
    const rows = db.prepare(`
      SELECT e.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}, e.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total, total_pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/expenses/export/csv?workspace=india
router.get('/export/csv', (req, res, next) => {
  try {
    const { whereClause, params } = buildWhere(req.query, req.workspace, req.user.id, req.user.is_admin);
    const rows = db.prepare(`
      SELECT e.*, c.name AS category_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      ${whereClause}
      ORDER BY e.date DESC
    `).all(...params);

    const lines = [
      'date,description,amount,category,notes',
      ...rows.map((r) => [
        r.date,
        `"${(r.description ?? '').replace(/"/g, '""')}"`,
        r.amount,
        `"${(r.category_name ?? '').replace(/"/g, '""')}"`,
        `"${(r.notes ?? '').replace(/"/g, '""')}"`,
      ].join(',')),
    ];

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${req.workspace}-${date}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
});

// POST /api/expenses/import/csv?workspace=india
router.post('/import/csv', (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }

    const categories = db.prepare('SELECT * FROM categories WHERE user_id = ? AND workspace = ?').all(req.user.id, req.workspace);
    const catMap = Object.fromEntries(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const insert = db.prepare('INSERT INTO expenses (user_id, category_id, amount, date, description, notes, workspace) VALUES (?, ?, ?, ?, ?, ?, ?)');

    let imported = 0;
    const errors = [];
    for (const [i, row] of rows.entries()) {
      const { date, description, amount, category, notes } = row;
      const amt = parseFloat(amount);
      if (!date || !description || isNaN(amt) || amt <= 0) {
        errors.push(`Row ${i + 1}: date, description, and a positive amount are required`);
        continue;
      }
      const catId = category ? (catMap[category.toLowerCase()] ?? null) : null;
      insert.run(req.user.id, catId, amt, date, description, notes ?? null, req.workspace);
      imported++;
    }

    res.json({ imported, errors });
  } catch (err) {
    next(err);
  }
});

// GET /api/expenses/:id?workspace=india
router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare(`
      SELECT e.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ? AND e.workspace = ? AND (e.user_id = ? OR ?)
    `).get(req.params.id, req.workspace, req.user.id, req.user.is_admin ? 1 : 0);
    if (!row) return res.status(404).json({ error: 'Expense not found' });
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// POST /api/expenses/apply-recurring?workspace=india
router.post('/apply-recurring', (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });
    const m = parseInt(month);
    const y = parseInt(year);
    const monthPad = String(m).padStart(2, '0');
    const monthStart = `${y}-${monthPad}-01`;
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    const monthEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

    // Find all recurring templates for this user+workspace
    const templates = db.prepare(
      'SELECT * FROM expenses WHERE user_id = ? AND workspace = ? AND is_recurring = 1'
    ).all(req.user.id, req.workspace);

    if (templates.length === 0) return res.json({ created: 0, skipped: 0 });

    // Find which are already in target month (by description+category_id to avoid dupes)
    const existing = db.prepare(
      'SELECT description, category_id FROM expenses WHERE user_id = ? AND workspace = ? AND date >= ? AND date < ?'
    ).all(req.user.id, req.workspace, monthStart, monthEnd);
    const existingSet = new Set(existing.map((e) => `${e.description}|${e.category_id}`));

    const insert = db.prepare(
      'INSERT INTO expenses (user_id, category_id, amount, date, description, notes, workspace, type, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'
    );

    let created = 0;
    let skipped = 0;
    const insertMany = db.transaction(() => {
      for (const t of templates) {
        const key = `${t.description}|${t.category_id}`;
        if (existingSet.has(key)) { skipped++; continue; }
        // Use same day-of-month from original, capped to last day of target month
        const origDay = parseInt(t.date.split('-')[2]);
        const lastDay = new Date(y, m, 0).getDate();
        const day = Math.min(origDay, lastDay);
        const dateStr = `${y}-${monthPad}-${String(day).padStart(2, '0')}`;
        insert.run(t.user_id, t.category_id, t.amount, dateStr, t.description, t.notes, t.workspace, t.type);
        created++;
      }
    });
    insertMany();

    res.json({ created, skipped });
  } catch (err) {
    next(err);
  }
});

// POST /api/expenses?workspace=india
router.post('/', (req, res, next) => {
  try {
    const { category_id, amount, date, description, notes, type, is_recurring } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    if (!date) return res.status(400).json({ error: 'date is required' });
    const txType = type === 'credit' ? 'credit' : 'debit';

    const result = db.prepare(
      'INSERT INTO expenses (user_id, category_id, amount, date, description, notes, workspace, type, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, category_id ?? null, parseFloat(amount), date, description.trim(), notes ?? null, req.workspace, txType, is_recurring ? 1 : 0);

    const row = db.prepare(`
      SELECT e.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

// PUT /api/expenses/:id?workspace=india
router.put('/:id', (req, res, next) => {
  try {
    const existing = db.prepare(
      'SELECT * FROM expenses WHERE id = ? AND workspace = ? AND (user_id = ? OR ?)'
    ).get(req.params.id, req.workspace, req.user.id, req.user.is_admin ? 1 : 0);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    const { category_id, amount, date, description, notes, type, is_recurring } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    if (!date) return res.status(400).json({ error: 'date is required' });
    const txType = type === 'credit' ? 'credit' : 'debit';

    db.prepare(
      'UPDATE expenses SET category_id=?, amount=?, date=?, description=?, notes=?, type=?, is_recurring=? WHERE id=?'
    ).run(category_id ?? null, parseFloat(amount), date, description.trim(), notes ?? null, txType, is_recurring ? 1 : 0, existing.id);

    const row = db.prepare(`
      SELECT e.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.id = ?
    `).get(existing.id);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/expenses/:id?workspace=india
router.delete('/:id', (req, res, next) => {
  try {
    const existing = db.prepare(
      'SELECT * FROM expenses WHERE id = ? AND workspace = ? AND (user_id = ? OR ?)'
    ).get(req.params.id, req.workspace, req.user.id, req.user.is_admin ? 1 : 0);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });
    db.prepare('DELETE FROM expenses WHERE id = ?').run(existing.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
