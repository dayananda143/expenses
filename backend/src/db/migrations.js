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
  try { db.exec("ALTER TABLE accounts ADD COLUMN belongs_to_user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL"); } catch {}
  try { db.exec("ALTER TABLE expenses ADD COLUMN type TEXT NOT NULL DEFAULT 'debit' CHECK(type IN ('debit','credit'))"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN hospital_access INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE expenses ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0"); } catch {}

  // Hospital expenses (always USD)
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospital_expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount      REAL NOT NULL CHECK (amount > 0),
      date        TEXT NOT NULL,
      description TEXT NOT NULL,
      hospital    TEXT DEFAULT NULL,
      notes       TEXT DEFAULT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TRIGGER IF NOT EXISTS hospital_expenses_updated_at
      AFTER UPDATE ON hospital_expenses FOR EACH ROW
      BEGIN UPDATE hospital_expenses SET updated_at = datetime('now') WHERE id = OLD.id; END;
    CREATE INDEX IF NOT EXISTS idx_hospital_expenses_user ON hospital_expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_hospital_expenses_date ON hospital_expenses(date);
  `);

  // Make hospital_expenses.amount nullable (idempotent: try inserting NULL; if it fails the constraint exists and we recreate)
  try {
    const testRow = db.prepare("INSERT INTO hospital_expenses (user_id, amount, date, description) VALUES (0, NULL, '1970-01-01', '__test__')").run();
    db.prepare('DELETE FROM hospital_expenses WHERE id = ?').run(testRow.lastInsertRowid);
  } catch {
    db.exec(`
      CREATE TABLE hospital_expenses_v2 (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount      REAL DEFAULT NULL,
        date        TEXT NOT NULL,
        description TEXT NOT NULL,
        hospital    TEXT DEFAULT NULL,
        notes       TEXT DEFAULT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO hospital_expenses_v2 SELECT * FROM hospital_expenses;
      DROP TABLE hospital_expenses;
      ALTER TABLE hospital_expenses_v2 RENAME TO hospital_expenses;
      CREATE TRIGGER IF NOT EXISTS hospital_expenses_updated_at
        AFTER UPDATE ON hospital_expenses FOR EACH ROW
        BEGIN UPDATE hospital_expenses SET updated_at = datetime('now') WHERE id = OLD.id; END;
      CREATE INDEX IF NOT EXISTS idx_hospital_expenses_user ON hospital_expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_hospital_expenses_date ON hospital_expenses(date);
    `);
  }

  // Salary entries (per-user, always USD, no date)
  db.exec(`
    CREATE TABLE IF NOT EXISTS salary_entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount      REAL DEFAULT NULL,
      notes       TEXT DEFAULT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TRIGGER IF NOT EXISTS salary_entries_updated_at
      AFTER UPDATE ON salary_entries FOR EACH ROW
      BEGIN UPDATE salary_entries SET updated_at = datetime('now') WHERE id = OLD.id; END;
    CREATE INDEX IF NOT EXISTS idx_salary_entries_user ON salary_entries(user_id);
  `);

  // Salary settings (monthly salary per user)
  db.exec(`
    CREATE TABLE IF NOT EXISTS salary_settings (
      user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      monthly_amount REAL NOT NULL DEFAULT 0
    );
  `);

  // Remove date column from salary_entries if it exists (idempotent)
  try {
    db.prepare("INSERT INTO salary_entries (user_id, description) VALUES (0, '__test__')").run();
    db.prepare("DELETE FROM salary_entries WHERE description = '__test__'").run();
  } catch {
    db.exec(`
      CREATE TABLE salary_entries_v2 (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount      REAL DEFAULT NULL,
        notes       TEXT DEFAULT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO salary_entries_v2 (id, user_id, description, amount, notes, created_at, updated_at)
        SELECT id, user_id, description, amount, notes, created_at, updated_at FROM salary_entries;
      DROP TABLE salary_entries;
      ALTER TABLE salary_entries_v2 RENAME TO salary_entries;
      CREATE TRIGGER IF NOT EXISTS salary_entries_updated_at
        AFTER UPDATE ON salary_entries FOR EACH ROW
        BEGIN UPDATE salary_entries SET updated_at = datetime('now') WHERE id = OLD.id; END;
      CREATE INDEX IF NOT EXISTS idx_salary_entries_user ON salary_entries(user_id);
    `);
  }

  // Bank FDs (India savings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_fds (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bank_name        TEXT NOT NULL,
      fd_number        TEXT DEFAULT NULL,
      principal_amount REAL NOT NULL CHECK (principal_amount > 0),
      interest_rate    REAL NOT NULL DEFAULT 0,
      tenure_months    INTEGER NOT NULL DEFAULT 12,
      start_date       TEXT NOT NULL,
      maturity_date    TEXT NOT NULL,
      maturity_amount  REAL DEFAULT NULL,
      status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'broken')),
      notes            TEXT DEFAULT NULL,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_bank_fds_user ON bank_fds(user_id);
  `);

  try { db.exec("ALTER TABLE bank_fds ADD COLUMN tenure_unit TEXT NOT NULL DEFAULT 'months'"); } catch {}
  try { db.exec("ALTER TABLE bank_fds ADD COLUMN belongs_to_user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL"); } catch {}

  // LIC policies (India)
  db.exec(`
    CREATE TABLE IF NOT EXISTS lic_policies (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lic_number    TEXT NOT NULL,
      name          TEXT NOT NULL,
      amount        REAL NOT NULL CHECK (amount > 0),
      start_date    TEXT NOT NULL,
      maturity_date TEXT NOT NULL,
      premium       REAL DEFAULT NULL,
      notes         TEXT DEFAULT NULL,
      status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'surrendered')),
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_lic_policies_user ON lic_policies(user_id);
  `);
  try { db.exec("ALTER TABLE bank_fds ADD COLUMN type TEXT NOT NULL DEFAULT 'fd'"); } catch {}

  // Make start_date, maturity_date, tenure_months nullable (savings type has no dates/tenure)
  try {
    db.prepare("INSERT INTO bank_fds (user_id, bank_name, principal_amount, start_date, maturity_date, tenure_months) VALUES (0, '__nullable_test__', 1, NULL, NULL, NULL)").run();
    db.prepare("DELETE FROM bank_fds WHERE bank_name = '__nullable_test__'").run();
  } catch {
    db.exec(`
      CREATE TABLE bank_fds_v2 (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bank_name        TEXT NOT NULL,
        fd_number        TEXT DEFAULT NULL,
        principal_amount REAL NOT NULL CHECK (principal_amount > 0),
        interest_rate    REAL NOT NULL DEFAULT 0,
        tenure_months    INTEGER DEFAULT NULL,
        tenure_unit      TEXT NOT NULL DEFAULT 'months',
        start_date       TEXT DEFAULT NULL,
        maturity_date    TEXT DEFAULT NULL,
        maturity_amount  REAL DEFAULT NULL,
        type             TEXT NOT NULL DEFAULT 'fd',
        status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'broken')),
        notes            TEXT DEFAULT NULL,
        sort_order       INTEGER NOT NULL DEFAULT 0,
        created_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO bank_fds_v2 SELECT id, user_id, bank_name, fd_number, principal_amount, interest_rate, tenure_months, COALESCE(tenure_unit,'months'), start_date, maturity_date, maturity_amount, COALESCE(type,'fd'), status, notes, sort_order, created_at FROM bank_fds;
      DROP TABLE bank_fds;
      ALTER TABLE bank_fds_v2 RENAME TO bank_fds;
      CREATE INDEX IF NOT EXISTS idx_bank_fds_user ON bank_fds(user_id);
    `);
  }

  // Category subtypes
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_subtypes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_category_subtypes_cat ON category_subtypes(category_id);
  `);
  try { db.exec("ALTER TABLE expenses ADD COLUMN subtype TEXT DEFAULT NULL"); } catch {}
  // Make description nullable (SQLite can't ALTER COLUMN, use a workaround via NULL default)
  // We handle this at app level — existing NOT NULL constraint is bypassed by passing NULL which SQLite allows for TEXT NOT NULL if we recreate, but we can just leave existing rows and allow NULL from app side via the check below
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS expenses_v2 (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        amount      REAL NOT NULL CHECK (amount > 0),
        date        TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        notes       TEXT DEFAULT NULL,
        workspace   TEXT NOT NULL DEFAULT 'us',
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        type        TEXT NOT NULL DEFAULT 'debit',
        is_recurring INTEGER NOT NULL DEFAULT 0,
        subtype     TEXT DEFAULT NULL
      );
    `);
    const cols = db.prepare("PRAGMA table_info(expenses)").all().map(c => c.name);
    if (cols.includes('description')) {
      const info = db.prepare("PRAGMA table_info(expenses)").all().find(c => c.name === 'description');
      if (info && info.notnull === 1) {
        db.exec(`
          INSERT INTO expenses_v2 (id, user_id, category_id, amount, date, description, notes, workspace, created_at, updated_at, type, is_recurring, subtype)
            SELECT id, user_id, category_id, amount, date, description, notes, workspace, created_at, updated_at, type, is_recurring, subtype FROM expenses;
          DROP TABLE expenses;
          ALTER TABLE expenses_v2 RENAME TO expenses;
          CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
          CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
          CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
        `);
      } else {
        db.exec("DROP TABLE IF EXISTS expenses_v2");
      }
    }
  } catch {}

  // Priority list
  db.exec(`
    CREATE TABLE IF NOT EXISTS priority_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace   TEXT NOT NULL DEFAULT 'us',
      name        TEXT NOT NULL,
      budget      REAL NOT NULL CHECK (budget > 0),
      saved       REAL NOT NULL DEFAULT 0,
      notes       TEXT DEFAULT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_priority_items_user ON priority_items(user_id);
  `);

  // Add archived column to priority_items if missing
  try {
    db.exec(`ALTER TABLE priority_items ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE priority_items ADD COLUMN archived_at TEXT DEFAULT NULL`);
  } catch {}

  // Lent items
  db.exec(`
    CREATE TABLE IF NOT EXISTS lent_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      person     TEXT NOT NULL,
      amount     REAL NOT NULL CHECK (amount > 0),
      notes      TEXT DEFAULT NULL,
      date_lent  TEXT DEFAULT NULL,
      due_date   TEXT DEFAULT NULL,
      status     TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_lent_items_user ON lent_items(user_id);
  `);

  // India list
  db.exec(`
    CREATE TABLE IF NOT EXISTS india_list_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace  TEXT NOT NULL DEFAULT 'india',
      name       TEXT NOT NULL,
      notes      TEXT DEFAULT NULL,
      type       TEXT NOT NULL DEFAULT 'buy',
      done       INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_india_list_workspace ON india_list_items(workspace);
  `);

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
