const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

// Require accounts_access (admins always pass) — same guard as accounts.js
router.use((req, res, next) => {
  if (req.user.is_admin) return next();
  const u = db.prepare('SELECT accounts_access FROM users WHERE id = ?').get(req.user.id);
  if (u?.accounts_access) return next();
  return res.status(403).json({ error: 'No access to accounts' });
});

const is401k = (name) => /401k|principal/i.test(name ?? '');

// POST /api/net-worth/snapshot?workspace=us
// Idempotent: computes today's totals from live accounts and upserts one row for today.
router.post('/snapshot', (req, res, next) => {
  try {
    const accounts = db.prepare(
      `SELECT * FROM accounts WHERE user_id IN (SELECT id FROM users WHERE is_admin = 1) AND workspace = ? AND is_active = 1 AND archived = 0`
    ).all(req.workspace);

    let totalSavings = 0, total401k = 0, totalCredit = 0;
    for (const a of accounts) {
      if (a.type === 'savings') {
        if (is401k(a.name)) total401k += a.balance;
        else totalSavings += a.balance;
      } else if (a.type === 'credit') {
        totalCredit += a.balance;
      }
    }
    const netWorth = totalSavings + total401k - totalCredit;
    const today = new Date().toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO net_worth_snapshots (workspace, date, total_savings, total_401k, total_credit, net_worth)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(workspace, date) DO UPDATE SET
        total_savings = excluded.total_savings,
        total_401k = excluded.total_401k,
        total_credit = excluded.total_credit,
        net_worth = excluded.net_worth
    `).run(req.workspace, today, totalSavings, total401k, totalCredit, netWorth);

    res.json({ data: { date: today, total_savings: totalSavings, total_401k: total401k, total_credit: totalCredit, net_worth: netWorth } });
  } catch (err) { next(err); }
});

// GET /api/net-worth/history?workspace=us&months=12
router.get('/history', (req, res, next) => {
  try {
    const months = Math.min(60, Math.max(1, parseInt(req.query.months) || 12));
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const sinceStr = since.toISOString().slice(0, 10);

    const rows = db.prepare(
      `SELECT * FROM net_worth_snapshots WHERE workspace = ? AND date >= ? ORDER BY date ASC`
    ).all(req.workspace, sinceStr);

    res.json({ data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
