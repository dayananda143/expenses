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

function getOrCreateConfig(workspace) {
  let row = db.prepare('SELECT * FROM car_finance WHERE workspace = ?').get(workspace);
  if (!row) {
    db.prepare('INSERT INTO car_finance (workspace) VALUES (?)').run(workspace);
    row = db.prepare('SELECT * FROM car_finance WHERE workspace = ?').get(workspace);
  }
  return row;
}

// GET /api/car-finance?workspace=us
router.get('/', (req, res, next) => {
  try {
    const config = getOrCreateConfig(req.workspace);
    const payments = db.prepare(
      'SELECT * FROM car_finance_payments WHERE workspace = ? ORDER BY date DESC, created_at DESC'
    ).all(req.workspace);
    res.json({ data: { config, payments } });
  } catch (err) { next(err); }
});

// POST /api/car-finance/import?workspace=us — one-time migration from browser localStorage
router.post('/import', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const config = getOrCreateConfig(req.workspace);
    const existingPayments = db.prepare('SELECT COUNT(*) AS c FROM car_finance_payments WHERE workspace = ?').get(req.workspace).c;
    if (config.total_amount > 0 || config.remaining_amount > 0 || existingPayments > 0) {
      return res.status(409).json({ error: 'Car finance data already exists; import skipped' });
    }

    const { totalAmount, remainingAmount, remainingMonths, dueDate, payments } = req.body;
    db.prepare(
      `UPDATE car_finance SET total_amount = ?, remaining_amount = ?, remaining_months = ?, due_date = ?, updated_at = datetime('now') WHERE workspace = ?`
    ).run(parseFloat(totalAmount) || 0, parseFloat(remainingAmount) || 0, parseInt(remainingMonths) || 0, dueDate || null, req.workspace);

    const insert = db.prepare('INSERT INTO car_finance_payments (workspace, user_id, amount, date) VALUES (?, ?, ?, ?)');
    for (const p of (Array.isArray(payments) ? payments : [])) {
      const amt = parseFloat(p?.amount);
      if (amt > 0 && p?.date) insert.run(req.workspace, req.user.id, amt, p.date);
    }

    res.status(201).json({
      data: {
        config: db.prepare('SELECT * FROM car_finance WHERE workspace = ?').get(req.workspace),
        payments: db.prepare('SELECT * FROM car_finance_payments WHERE workspace = ? ORDER BY date DESC, created_at DESC').all(req.workspace),
      },
    });
  } catch (err) { next(err); }
});

// PUT /api/car-finance?workspace=us
router.put('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { totalAmount, remainingAmount, remainingMonths, dueDate } = req.body;
    getOrCreateConfig(req.workspace);
    db.prepare(
      `UPDATE car_finance SET total_amount = ?, remaining_amount = ?, remaining_months = ?, due_date = ?, updated_at = datetime('now') WHERE workspace = ?`
    ).run(parseFloat(totalAmount) || 0, parseFloat(remainingAmount) || 0, parseInt(remainingMonths) || 0, dueDate || null, req.workspace);
    const config = db.prepare('SELECT * FROM car_finance WHERE workspace = ?').get(req.workspace);
    res.json({ data: config });
  } catch (err) { next(err); }
});

// POST /api/car-finance/payments?workspace=us
router.post('/payments', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { amount, date } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    if (!date) return res.status(400).json({ error: 'date is required' });

    const config = getOrCreateConfig(req.workspace);
    const paid = parseFloat(amount);
    if (paid > config.remaining_amount) return res.status(400).json({ error: 'Amount exceeds remaining balance' });

    let nextDueDate = config.due_date;
    if (config.due_date) {
      const day = parseInt(config.due_date.split('-')[2]);
      const paidDate = new Date(date + 'T00:00:00');
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), day);
      const baseDue = thisMonthDue >= today ? thisMonthDue : new Date(now.getFullYear(), now.getMonth() + 1, day);
      const cycleStart = new Date(baseDue.getFullYear(), baseDue.getMonth() - 1, day);
      const next = paidDate >= cycleStart
        ? new Date(baseDue.getFullYear(), baseDue.getMonth() + 1, day)
        : baseDue;
      nextDueDate = next.toLocaleDateString('en-CA');
    }

    db.prepare(
      `UPDATE car_finance SET remaining_amount = ?, remaining_months = ?, due_date = ?, updated_at = datetime('now') WHERE workspace = ?`
    ).run(Math.max(0, config.remaining_amount - paid), Math.max(0, config.remaining_months - 1), nextDueDate, req.workspace);

    const result = db.prepare(
      'INSERT INTO car_finance_payments (workspace, user_id, amount, date) VALUES (?, ?, ?, ?)'
    ).run(req.workspace, req.user.id, paid, date);

    const payment = db.prepare('SELECT * FROM car_finance_payments WHERE id = ?').get(result.lastInsertRowid);
    const config2 = db.prepare('SELECT * FROM car_finance WHERE workspace = ?').get(req.workspace);
    res.status(201).json({ data: { payment, config: config2 } });
  } catch (err) { next(err); }
});

// PUT /api/car-finance/payments/:id?workspace=us
router.put('/payments/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const payment = db.prepare('SELECT * FROM car_finance_payments WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const { amount, date } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    if (!date) return res.status(400).json({ error: 'date is required' });

    const config = getOrCreateConfig(req.workspace);
    const newAmount = parseFloat(amount);
    const diff = newAmount - payment.amount;
    if (diff > config.remaining_amount) return res.status(400).json({ error: 'Amount exceeds remaining balance' });

    db.prepare(`UPDATE car_finance SET remaining_amount = ?, updated_at = datetime('now') WHERE workspace = ?`)
      .run(Math.max(0, config.remaining_amount - diff), req.workspace);
    db.prepare('UPDATE car_finance_payments SET amount = ?, date = ? WHERE id = ?').run(newAmount, date, payment.id);

    const updatedPayment = db.prepare('SELECT * FROM car_finance_payments WHERE id = ?').get(payment.id);
    const config2 = db.prepare('SELECT * FROM car_finance WHERE workspace = ?').get(req.workspace);
    res.json({ data: { payment: updatedPayment, config: config2 } });
  } catch (err) { next(err); }
});

// DELETE /api/car-finance/payments/:id?workspace=us
router.delete('/payments/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const payment = db.prepare('SELECT * FROM car_finance_payments WHERE id = ? AND workspace = ?').get(req.params.id, req.workspace);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const config = getOrCreateConfig(req.workspace);
    db.prepare(`UPDATE car_finance SET remaining_amount = remaining_amount + ?, remaining_months = remaining_months + 1, updated_at = datetime('now') WHERE workspace = ?`)
      .run(payment.amount, req.workspace);
    db.prepare('DELETE FROM car_finance_payments WHERE id = ?').run(payment.id);

    const config2 = db.prepare('SELECT * FROM car_finance WHERE workspace = ?').get(req.workspace);
    res.status(200).json({ data: { config: config2 } });
  } catch (err) { next(err); }
});

module.exports = router;
