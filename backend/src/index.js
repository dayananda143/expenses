require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./db/database');

const authRouter       = require('./routes/auth');
const expensesRouter   = require('./routes/expenses');
const categoriesRouter = require('./routes/categories');
const budgetsRouter    = require('./routes/budgets');
const dashboardRouter  = require('./routes/dashboard');
const usersRouter      = require('./routes/users');
const accountsRouter        = require('./routes/accounts');
const accountPaymentsRouter = require('./routes/accountPayments');
const carFinanceRouter      = require('./routes/carFinance');
const hospitalRouter        = require('./routes/hospital');
const salaryRouter          = require('./routes/salary');
const savingsRouter         = require('./routes/savings');
const licRouter             = require('./routes/lic');
const priorityRouter        = require('./routes/priority');
const indiaListRouter       = require('./routes/indiaList');
const ledgerPresetsRouter   = require('./routes/ledgerPresets');
const lentRouter            = require('./routes/lent');
const healthRouter          = require('./routes/health');
const poultryRouter         = require('./routes/poultry');
const loansRouter           = require('./routes/loans');
const umaSbiRouter          = require('./routes/umaSbi');
const tripsRouter           = require('./routes/trips');
const brainstormRouter      = require('./routes/brainstorm');
const propertiesRouter      = require('./routes/properties');
const errorHandler     = require('./middleware/errorHandler');
const requireAuth      = require('./middleware/auth');

const path = require('path');

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
  origin: [
    'http://localhost:5174',
    'http://localhost:4174',
    'https://expenses.money-matriz.co.in',
  ]
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Public routes
app.use('/api/auth', authRouter);

// All routes below require a valid JWT
app.use(requireAuth);
app.use('/api/expenses',   expensesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets',    budgetsRouter);
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/users',      usersRouter);
app.use('/api/accounts',          accountsRouter);
app.use('/api/account-payments',  accountPaymentsRouter);
app.use('/api/car-finance',       carFinanceRouter);
app.use('/api/hospital-expenses', hospitalRouter);
app.use('/api/salary',           salaryRouter);
app.use('/api/savings',          savingsRouter);
app.use('/api/lic',              licRouter);
app.use('/api/priority',         priorityRouter);
app.use('/api/india-list',       indiaListRouter);
app.use('/api/ledger-presets',   ledgerPresetsRouter);
app.use('/api/lent',             lentRouter);
app.use('/api/health',           healthRouter);
app.use('/api/poultry',          poultryRouter);
app.use('/api/loans',            loansRouter);
app.use('/api/uma-sbi',          umaSbiRouter);
app.use('/api/trips',            tripsRouter);
app.use('/api/brainstorm',       brainstormRouter);
app.use('/api/properties',      propertiesRouter);
app.use(errorHandler);

db.ready.then(() => {
  app.listen(PORT, () => console.log(`Expenses backend running on http://localhost:${PORT}`));
});
