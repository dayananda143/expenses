const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

// GET /api/budgets?workspace=india
router.get('/', (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const yearStart  = `${now.getFullYear()}-01-01`;

    const budgets = db.prepare(`
      SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.workspace = ?
      ORDER BY b.sort_order ASC, b.created_at ASC
    `).all(req.user.id, req.workspace);

    const result = budgets.map((b) => {
      const periodStart = b.period === 'monthly' ? monthStart : yearStart;
      const spent = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE user_id = ? AND workspace = ? AND date >= ?
          ${b.category_id ? 'AND category_id = ?' : ''}
      `).get(...(b.category_id ? [req.user.id, req.workspace, periodStart, b.category_id] : [req.user.id, req.workspace, periodStart])).total;

      return { ...b, spent };
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/budgets?workspace=india
router.post('/', (req, res, next) => {
  try {
    const { category_id, amount, period } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    if (period && !['monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ error: 'period must be monthly or yearly' });
    }

    if (category_id) {
      const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ? AND workspace = ?').get(category_id, req.user.id, req.workspace);
      if (!cat) return res.status(400).json({ error: 'category not found' });
    }

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM budgets WHERE user_id = ? AND workspace = ?').get(req.user.id, req.workspace).m;
    const result = db.prepare(
      'INSERT INTO budgets (user_id, category_id, amount, period, workspace, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, category_id ?? null, parseFloat(amount), period ?? 'monthly', req.workspace, maxOrder + 1);

    const row = db.prepare(`
      SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json({ data: { ...row, spent: 0 } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/budgets/:id?workspace=india
router.put('/:id', (req, res, next) => {
  try {
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ? AND workspace = ?').get(req.params.id, req.user.id, req.workspace);
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    const { category_id, amount, period } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    if (period && !['monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ error: 'period must be monthly or yearly' });
    }

    db.prepare(
      'UPDATE budgets SET category_id = ?, amount = ?, period = ? WHERE id = ?'
    ).run(category_id ?? null, parseFloat(amount), period ?? budget.period, budget.id);

    const row = db.prepare(`
      SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `).get(budget.id);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/budgets/reorder?workspace=india  body: { ids: [3,1,2] }
router.patch('/reorder', (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const update = db.prepare('UPDATE budgets SET sort_order = ? WHERE id = ? AND user_id = ? AND workspace = ?');
    ids.forEach((id, idx) => update.run(idx, id, req.user.id, req.workspace));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/budgets/:id?workspace=india
router.delete('/:id', (req, res, next) => {
  try {
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ? AND workspace = ?').get(req.params.id, req.user.id, req.workspace);
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    db.prepare('DELETE FROM budgets WHERE id = ?').run(budget.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
