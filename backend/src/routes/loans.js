const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/loans
router.get('/', (req, res, next) => {
  try {
    const targetId = req.user.is_admin
      ? req.user.id
      : db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()?.id;
    const rows = db.prepare(
      'SELECT * FROM loans WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC'
    ).all(targetId);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/loans
router.post('/', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const {
      loan_type, ref_no, total_amount, future_amount, future_interest,
      future_principal, monthly_payment, interest_rate, time_period,
      maturity_date, start_date, paid_amount, notes
    } = req.body;
    if (!loan_type?.trim()) return res.status(400).json({ error: 'loan_type is required' });
    if (!total_amount || parseFloat(total_amount) <= 0) return res.status(400).json({ error: 'total_amount must be > 0' });

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM loans WHERE user_id = ?').get(req.user.id).m;
    const result = db.prepare(`
      INSERT INTO loans (user_id, loan_type, ref_no, total_amount, future_amount, future_interest,
        future_principal, monthly_payment, interest_rate, time_period, maturity_date, start_date,
        paid_amount, notes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      loan_type.trim(),
      ref_no?.trim() || null,
      parseFloat(total_amount),
      future_amount ? parseFloat(future_amount) : null,
      future_interest ? parseFloat(future_interest) : null,
      future_principal ? parseFloat(future_principal) : null,
      monthly_payment ? parseFloat(monthly_payment) : null,
      interest_rate ? parseFloat(interest_rate) : null,
      time_period ? parseInt(time_period) : null,
      maturity_date || null,
      start_date || null,
      paid_amount ? parseFloat(paid_amount) : 0,
      notes?.trim() || null,
      maxOrder + 1
    );
    res.status(201).json({ data: db.prepare('SELECT * FROM loans WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/loans/:id
router.put('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const {
      loan_type, ref_no, total_amount, future_amount, future_interest,
      future_principal, monthly_payment, interest_rate, time_period,
      maturity_date, start_date, paid_amount, notes
    } = req.body;

    db.prepare(`
      UPDATE loans SET loan_type = ?, ref_no = ?, total_amount = ?, future_amount = ?,
        future_interest = ?, future_principal = ?, monthly_payment = ?, interest_rate = ?,
        time_period = ?, maturity_date = ?, start_date = ?, paid_amount = ?, notes = ?
      WHERE id = ?
    `).run(
      loan_type?.trim() ?? loan.loan_type,
      ref_no?.trim() || null,
      parseFloat(total_amount ?? loan.total_amount),
      future_amount ? parseFloat(future_amount) : null,
      future_interest ? parseFloat(future_interest) : null,
      future_principal ? parseFloat(future_principal) : null,
      monthly_payment ? parseFloat(monthly_payment) : null,
      interest_rate ? parseFloat(interest_rate) : null,
      time_period ? parseInt(time_period) : null,
      maturity_date || null,
      start_date || null,
      paid_amount !== undefined ? parseFloat(paid_amount) : loan.paid_amount,
      notes?.trim() || null,
      loan.id
    );
    res.json({ data: db.prepare('SELECT * FROM loans WHERE id = ?').get(loan.id) });
  } catch (err) { next(err); }
});

// PATCH /api/loans/:id/status
router.patch('/:id/status', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    const newStatus = loan.status === 'completed' ? 'active' : 'completed';
    db.prepare('UPDATE loans SET status = ? WHERE id = ?').run(newStatus, loan.id);
    res.json({ data: db.prepare('SELECT * FROM loans WHERE id = ?').get(loan.id) });
  } catch (err) { next(err); }
});

// DELETE /api/loans/:id
router.delete('/:id', (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  try {
    const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    db.prepare('DELETE FROM loans WHERE id = ?').run(loan.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
