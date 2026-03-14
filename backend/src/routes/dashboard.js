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

    // Everyone sees admin-entered expenses
    const expUserWhere   = 'user_id IN (SELECT id FROM users WHERE is_admin = 1)';
    const expUserParams  = [];
    const expEUserWhere  = 'e.user_id IN (SELECT id FROM users WHERE is_admin = 1)';
    const catCUserWhere  = 'c.user_id IN (SELECT id FROM users WHERE is_admin = 1)';
    const catUserParams  = [];

    // Total for selected month
    const monthTotal = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE ${expUserWhere} AND workspace = ? AND date >= ? AND date < ?`
    ).get(...expUserParams, ws, monthStart, monthEnd).total;

    const monthCredit = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE ${expUserWhere} AND workspace = ? AND type = 'credit' AND date >= ? AND date < ?`
    ).get(...expUserParams, ws, monthStart, monthEnd).total;

    const monthDebit = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE ${expUserWhere} AND workspace = ? AND type = 'debit' AND date >= ? AND date < ?`
    ).get(...expUserParams, ws, monthStart, monthEnd).total;

    const allTimeCredit = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE ${expUserWhere} AND workspace = ? AND type = 'credit'`
    ).get(...expUserParams, ws).total;

    const allTimeDebit = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE ${expUserWhere} AND workspace = ? AND type = 'debit'`
    ).get(...expUserParams, ws).total;

    // Total for selected year
    const yearTotal = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE ${expUserWhere} AND workspace = ? AND date >= ? AND date < ?`
    ).get(...expUserParams, ws, yearStart, `${nextYear === year ? year + 1 : nextYear}-01-01`).total;

    // Spending by category for selected month
    const byCategory = db.prepare(`
      SELECT c.id, c.name, c.color, c.icon, COALESCE(SUM(e.amount), 0) AS total
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND ${expEUserWhere} AND e.workspace = ? AND e.date >= ? AND e.date < ?
      WHERE ${catCUserWhere} AND c.workspace = ?
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `).all(...expUserParams, ws, monthStart, monthEnd, ...catUserParams, ws);

    // Monthly spending for surrounding 12 months
    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', date) AS month, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE ${expUserWhere} AND workspace = ? AND date >= date(?, '-11 months') AND date < date(?, '+1 month')
      GROUP BY month
      ORDER BY month ASC
    `).all(...expUserParams, ws, monthStart, monthStart);

    // Previous month total (for month-over-month comparison)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevMonthTotal = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE ${expUserWhere} AND workspace = ? AND date >= ? AND date < ?`
    ).get(...expUserParams, ws, prevMonthStart, monthStart).total;

    // Same month last year total
    const lastYearNextMonth = month === 12 ? 1 : month + 1;
    const lastYearNextYear  = month === 12 ? year : year - 1;
    const lastYearMonthStart = `${year - 1}-${monthPad}-01`;
    const lastYearMonthEnd   = `${lastYearNextYear}-${String(lastYearNextMonth).padStart(2, '0')}-01`;
    const sameMonthLastYearTotal = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE ${expUserWhere} AND workspace = ? AND date >= ? AND date < ?`
    ).get(...expUserParams, ws, lastYearMonthStart, lastYearMonthEnd).total;

    // Spending insights: each category this month vs 3-month average
    const threeMonthsAgoDate = new Date(year, month - 1 - 3, 1);
    const threeMonthsAgoStr  = `${threeMonthsAgoDate.getFullYear()}-${String(threeMonthsAgoDate.getMonth() + 1).padStart(2, '0')}-01`;
    const insights = byCategory
      .filter((c) => c.total > 0)
      .map((c) => {
        const { avg } = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) / 3.0 AS avg FROM expenses
          WHERE ${expUserWhere} AND workspace = ? AND category_id = ? AND date >= ? AND date < ?
        `).get(...expUserParams, ws, c.id, threeMonthsAgoStr, monthStart);
        if (avg === 0) return null;
        const changePercent = Math.round(((c.total - avg) / avg) * 100);
        if (Math.abs(changePercent) < 5) return null;
        return { id: c.id, name: c.name, color: c.color, icon: c.icon, thisMonth: c.total, avg3: avg, changePercent };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 4);

    // Recent expenses for selected month (last 5)
    const recent = db.prepare(`
      SELECT e.id, e.description, e.amount, e.date, e.type, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE ${expEUserWhere} AND e.workspace = ? AND e.date >= ? AND e.date < ?
      ORDER BY e.date DESC, e.id DESC
      LIMIT 5
    `).all(...expUserParams, ws, monthStart, monthEnd);

    // Budget status — use current user's budgets but spend from correct expense scope
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
      const catClause   = b.category_id ? 'AND category_id = ?' : '';
      const catParam    = b.category_id ? [b.category_id] : [];
      const spent = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
        WHERE ${expUserWhere} AND workspace = ? AND date >= ? AND date < ? ${catClause}
      `).get(...expUserParams, ws, periodStart, periodEnd, ...catParam).total;
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
      prevMonthTotal,
      sameMonthLastYearTotal,
      insights,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
