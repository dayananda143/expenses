const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

// GET /api/dashboard?workspace=india&year=2026&month=3
router.get('/', (req, res, next) => {
  try {
    const now = new Date();
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const monthPad  = String(month).padStart(2, '0');
    const monthStart = `${year}-${monthPad}-01`;
    const yearStart  = `${year}-01-01`;

    // Calculate end of selected month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear  = month === 12 ? year + 1 : year;
    const monthEnd  = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const userId = req.user.id;
    const ws = req.workspace;

    // Total for selected month
    const monthTotal = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND workspace = ? AND date >= ? AND date < ?'
    ).get(userId, ws, monthStart, monthEnd).total;

    const monthCredit = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND workspace = ? AND type = 'credit' AND date >= ? AND date < ?"
    ).get(userId, ws, monthStart, monthEnd).total;

    const monthDebit = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND workspace = ? AND type = 'debit' AND date >= ? AND date < ?"
    ).get(userId, ws, monthStart, monthEnd).total;

    const allTimeCredit = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND workspace = ? AND type = 'credit'"
    ).get(userId, ws).total;

    const allTimeDebit = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND workspace = ? AND type = 'debit'"
    ).get(userId, ws).total;

    // Total for selected year
    const yearTotal = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND workspace = ? AND date >= ? AND date < ?'
    ).get(userId, ws, yearStart, `${nextYear === year ? year + 1 : nextYear}-01-01`).total;

    // Spending by category for selected month
    const byCategory = db.prepare(`
      SELECT c.id, c.name, c.color, c.icon, COALESCE(SUM(e.amount), 0) AS total
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = ? AND e.workspace = ? AND e.date >= ? AND e.date < ?
      WHERE c.user_id = ? AND c.workspace = ?
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `).all(userId, ws, monthStart, monthEnd, userId, ws);

    // Monthly spending for surrounding 12 months (6 before + selected + 5 after, capped at now)
    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', date) AS month, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE user_id = ? AND workspace = ? AND date >= date(?, '-11 months') AND date < date(?, '+1 month')
      GROUP BY month
      ORDER BY month ASC
    `).all(userId, ws, monthStart, monthStart);

    // Recent expenses for selected month (last 5)
    const recent = db.prepare(`
      SELECT e.id, e.description, e.amount, e.date, e.type, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ? AND e.workspace = ? AND e.date >= ? AND e.date < ?
      ORDER BY e.date DESC, e.id DESC
      LIMIT 5
    `).all(userId, ws, monthStart, monthEnd);

    // Budget status (always based on selected month/year for monthly, selected year for yearly)
    const budgets = db.prepare(`
      SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.workspace = ?
      ORDER BY b.sort_order ASC, b.created_at ASC
    `).all(userId, ws);

    const budgetStatus = budgets.map((b) => {
      const periodStart = b.period === 'monthly' ? monthStart : yearStart;
      const periodEnd   = b.period === 'monthly' ? monthEnd   : `${year + 1}-01-01`;
      const spent = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
        WHERE user_id = ? AND workspace = ? AND date >= ? AND date < ? ${b.category_id ? 'AND category_id = ?' : ''}
      `).get(...(b.category_id ? [userId, ws, periodStart, periodEnd, b.category_id] : [userId, ws, periodStart, periodEnd])).total;
      return { ...b, spent };
    });

    res.json({
      monthTotal,
      yearTotal,
      byCategory,
      monthly,
      recent,
      budgetStatus,
      selectedYear: year,
      selectedMonth: month,
      monthCredit,
      monthDebit,
      allTimeCredit,
      allTimeDebit,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
