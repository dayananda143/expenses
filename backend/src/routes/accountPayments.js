const express = require('express');
const router = express.Router();
const db = require('../db/database');
const requireWorkspace = require('../middleware/workspace');

router.use(requireWorkspace);

// Access guard
router.use((req, res, next) => {
  if (req.user.is_admin) return next();
  const u = db.prepare('SELECT accounts_access FROM users WHERE id = ?').get(req.user.id);
  if (u?.accounts_access) return next();
  return res.status(403).json({ error: 'No access to accounts' });
});

// GET /api/account-payments?workspace=us
router.get('/', (req, res, next) => {
  try {
    // Non-admins see admin's payments
    const targetId = req.user.is_admin ? req.user.id : db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
    const rows = db.prepare(`
      SELECT p.*, a.name AS account_name, a.type AS account_type
      FROM account_payments p
      JOIN accounts a ON a.id = p.account_id
      WHERE p.user_id = ? AND p.workspace = ?
      ORDER BY p.date DESC, p.created_at DESC
    `).all(targetId, req.workspace);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/account-payments?workspace=us
router.post('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { account_id, amount, date, notes } = req.body;
    if (!account_id) return res.status(400).json({ error: 'account_id is required' });
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    if (!date) return res.status(400).json({ error: 'date is required' });

    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ? AND workspace = ?')
      .get(account_id, req.user.id, req.workspace);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.type !== 'credit') return res.status(400).json({ error: 'Payments can only be made on credit accounts' });

    const paid = parseFloat(amount);

    // Insert payment record
    const result = db.prepare(
      'INSERT INTO account_payments (account_id, user_id, workspace, amount, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(account_id, req.user.id, req.workspace, paid, date, notes ?? null);

    // Reduce outstanding balance and track last payment date
    const newBalance = Math.max(0, account.balance - paid);
    db.prepare('UPDATE accounts SET balance = ?, last_paid_date = ? WHERE id = ?').run(newBalance, date, account.id);

    const payment = db.prepare(`
      SELECT p.*, a.name AS account_name, a.type AS account_type
      FROM account_payments p JOIN accounts a ON a.id = p.account_id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ data: payment });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/account-payments/:id?workspace=us
router.delete('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const payment = db.prepare('SELECT * FROM account_payments WHERE id = ? AND user_id = ? AND workspace = ?')
      .get(req.params.id, req.user.id, req.workspace);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Restore balance
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(payment.amount, payment.account_id);

    db.prepare('DELETE FROM account_payments WHERE id = ?').run(payment.id);

    // Recalculate last_paid_date from remaining payments
    const latest = db.prepare(
      'SELECT MAX(date) AS d FROM account_payments WHERE account_id = ?'
    ).get(payment.account_id);
    db.prepare('UPDATE accounts SET last_paid_date = ? WHERE id = ?').run(latest?.d ?? null, payment.account_id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
