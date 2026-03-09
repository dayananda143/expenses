function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin      INTEGER NOT NULL DEFAULT 0,
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#6366f1',
      icon       TEXT NOT NULL DEFAULT 'circle',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      amount      REAL NOT NULL CHECK (amount > 0),
      date        TEXT NOT NULL,
      description TEXT NOT NULL,
      notes       TEXT DEFAULT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TRIGGER IF NOT EXISTS expenses_updated_at
      AFTER UPDATE ON expenses FOR EACH ROW
      BEGIN UPDATE expenses SET updated_at = datetime('now') WHERE id = OLD.id; END;

    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

    CREATE TABLE IF NOT EXISTS budgets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      amount      REAL NOT NULL CHECK (amount > 0),
      period      TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'yearly')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
  `);

  // Workspace support (idempotent via try/catch)
  try { db.exec("ALTER TABLE categories ADD COLUMN workspace TEXT NOT NULL DEFAULT 'india'"); } catch {}
  try { db.exec("ALTER TABLE expenses   ADD COLUMN workspace TEXT NOT NULL DEFAULT 'india'"); } catch {}
  try { db.exec("ALTER TABLE budgets    ADD COLUMN workspace TEXT NOT NULL DEFAULT 'india'"); } catch {}
  try { db.exec("ALTER TABLE budgets    ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"); } catch {}

  // Accounts module
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace          TEXT NOT NULL DEFAULT 'india',
      name               TEXT NOT NULL,
      type               TEXT NOT NULL DEFAULT 'savings' CHECK (type IN ('savings', 'credit')),
      balance            REAL NOT NULL DEFAULT 0,
      credit_limit       REAL DEFAULT NULL,
      due_date           TEXT DEFAULT NULL,
      promo_apr_end_date TEXT DEFAULT NULL,
      is_active          INTEGER NOT NULL DEFAULT 1,
      notes              TEXT DEFAULT NULL,
      sort_order         INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
  `);
  try { db.exec("ALTER TABLE users      ADD COLUMN workspaces TEXT NOT NULL DEFAULT '[\"india\",\"us\"]'"); } catch {}
  try { db.exec("ALTER TABLE users      ADD COLUMN accounts_access INTEGER NOT NULL DEFAULT 0"); } catch {}
  // Accounts new columns (idempotent for existing DBs)
  try { db.exec("ALTER TABLE accounts ADD COLUMN due_date TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN due_day INTEGER DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN promo_apr_end_date TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"); } catch {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN last_paid_date TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE expenses ADD COLUMN type TEXT NOT NULL DEFAULT 'debit' CHECK(type IN ('debit','credit'))"); } catch {}

  // Account payments
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_payments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace  TEXT NOT NULL DEFAULT 'us',
      amount     REAL NOT NULL CHECK(amount > 0),
      date       TEXT NOT NULL,
      notes      TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_account_payments_account ON account_payments(account_id);
    CREATE INDEX IF NOT EXISTS idx_account_payments_user ON account_payments(user_id);
  `);
}

module.exports = { runMigrations };
