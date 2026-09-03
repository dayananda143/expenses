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
  try { db.exec("ALTER TABLE accounts ADD COLUMN archived INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN archived_at TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE accounts ADD COLUMN is_liquid INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN uma_sbi_as_of_date TEXT DEFAULT NULL"); } catch {}
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
    try { db.exec(`
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
    `); } catch {}
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
  try {
    db.exec(`ALTER TABLE priority_items ADD COLUMN is_future INTEGER NOT NULL DEFAULT 0`);
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

  // Ledger presets (quick-add templates for credit/debit entries)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger_presets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace   TEXT NOT NULL DEFAULT 'india',
      description TEXT NOT NULL,
      amount      REAL NOT NULL CHECK (amount > 0),
      type        TEXT NOT NULL DEFAULT 'debit' CHECK (type IN ('debit','credit')),
      notes       TEXT DEFAULT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_presets_workspace ON ledger_presets(workspace);
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

  // Health & Diet
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_meals (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date       TEXT NOT NULL,
      meal_type  TEXT NOT NULL DEFAULT 'snack',
      name       TEXT NOT NULL,
      calories   INTEGER NOT NULL DEFAULT 0,
      protein_g  REAL NOT NULL DEFAULT 0,
      carbs_g    REAL NOT NULL DEFAULT 0,
      fat_g      REAL NOT NULL DEFAULT 0,
      notes      TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_health_meals_user_date ON health_meals(user_id, date);

    CREATE TABLE IF NOT EXISTS health_water (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date       TEXT NOT NULL,
      amount_ml  INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_health_water_user_date ON health_water(user_id, date);

    CREATE TABLE IF NOT EXISTS health_weight (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date       TEXT NOT NULL,
      weight     REAL NOT NULL,
      unit       TEXT NOT NULL DEFAULT 'kg',
      notes      TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_health_weight_user_date ON health_weight(user_id, date);

    CREATE TABLE IF NOT EXISTS health_settings (
      user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      calorie_goal   INTEGER NOT NULL DEFAULT 2000,
      water_goal_ml  INTEGER NOT NULL DEFAULT 2000,
      weight_unit    TEXT NOT NULL DEFAULT 'kg'
    );
  `);

  // Poultry Farm
  db.exec(`
    CREATE TABLE IF NOT EXISTS poultry_flock (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      bird_type  TEXT NOT NULL DEFAULT 'chicken',
      count      INTEGER NOT NULL DEFAULT 0,
      date_added TEXT NOT NULL,
      notes      TEXT DEFAULT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_poultry_flock_user ON poultry_flock(user_id);
  `);
  try { db.exec("ALTER TABLE poultry_flock ADD COLUMN end_date TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE poultry_flock ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"); } catch {}
  db.exec(`

    CREATE TABLE IF NOT EXISTS poultry_mortality (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      flock_id   INTEGER REFERENCES poultry_flock(id) ON DELETE SET NULL,
      date       TEXT NOT NULL,
      count      INTEGER NOT NULL DEFAULT 0,
      cause      TEXT DEFAULT NULL,
      notes      TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_poultry_mortality_user_date ON poultry_mortality(user_id, date);

    CREATE TABLE IF NOT EXISTS poultry_expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date        TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'feed',
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      notes       TEXT DEFAULT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_poultry_expenses_user_date ON poultry_expenses(user_id, date);

    CREATE TABLE IF NOT EXISTS poultry_sales (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date        TEXT NOT NULL,
      sale_type   TEXT NOT NULL DEFAULT 'eggs',
      quantity    REAL NOT NULL DEFAULT 0,
      unit        TEXT NOT NULL DEFAULT 'dozen',
      price       REAL NOT NULL DEFAULT 0,
      total       REAL NOT NULL DEFAULT 0,
      buyer       TEXT DEFAULT NULL,
      notes       TEXT DEFAULT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_poultry_sales_user_date ON poultry_sales(user_id, date);
  `);

  // Poultry Bills (rearing charge vouchers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS poultry_bills (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      flock_id          INTEGER NOT NULL REFERENCES poultry_flock(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image_path        TEXT DEFAULT NULL,
      -- Voucher info
      voucher_no        TEXT DEFAULT NULL,
      bill_date         TEXT DEFAULT NULL,
      hatch_date        TEXT DEFAULT NULL,
      farmer_name       TEXT DEFAULT NULL,
      -- Production metrics
      chick_housed      INTEGER DEFAULT NULL,
      mean_age          REAL DEFAULT NULL,
      day_gain          REAL DEFAULT NULL,
      mortality         INTEGER DEFAULT NULL,
      mortality_pct     REAL DEFAULT NULL,
      first_wk_mort_pct REAL DEFAULT NULL,
      bird_sold_no      INTEGER DEFAULT NULL,
      bird_sold_kgs     REAL DEFAULT NULL,
      feed_cons_kgs     REAL DEFAULT NULL,
      avg_body_wt       REAL DEFAULT NULL,
      fcr               REAL DEFAULT NULL,
      converted_fcr     REAL DEFAULT NULL,
      eef               REAL DEFAULT NULL,
      grade             TEXT DEFAULT NULL,
      standard_rc       REAL DEFAULT NULL,
      std_prod_cost     REAL DEFAULT NULL,
      basic_gc_amt      REAL DEFAULT NULL,
      -- Costs (total + Rs/Kg)
      chick_cost        REAL DEFAULT NULL,
      chick_rs_kg       REAL DEFAULT NULL,
      feed_cost         REAL DEFAULT NULL,
      feed_rs_kg        REAL DEFAULT NULL,
      medicine_cost     REAL DEFAULT NULL,
      medicine_rs_kg    REAL DEFAULT NULL,
      vaccine_cost      REAL DEFAULT NULL,
      vaccine_rs_kg     REAL DEFAULT NULL,
      admin_cost        REAL DEFAULT NULL,
      admin_rs_kg       REAL DEFAULT NULL,
      overhead_cost     REAL DEFAULT NULL,
      prod_cost_total   REAL DEFAULT NULL,
      prod_cost_rs_kg   REAL DEFAULT NULL,
      ern_rc_kg         REAL DEFAULT NULL,
      -- Financials
      avg_sale_rate     REAL DEFAULT NULL,
      prod_reco         REAL DEFAULT NULL,
      mort_reco         REAL DEFAULT NULL,
      fcr_reco          REAL DEFAULT NULL,
      bird_sh_rec       REAL DEFAULT NULL,
      total_rc          REAL DEFAULT NULL,
      tds               REAL DEFAULT NULL,
      net_pay           REAL DEFAULT NULL,
      raw_text          TEXT DEFAULT NULL,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_poultry_bills_flock ON poultry_bills(flock_id);
    CREATE INDEX IF NOT EXISTS idx_poultry_bills_user ON poultry_bills(user_id);
  `);

  // Add flock_id and paid_by to poultry_expenses if not present
  try { db.exec(`ALTER TABLE poultry_farm_assets ADD COLUMN acres REAL NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE poultry_bills ADD COLUMN prod_incent REAL DEFAULT NULL`); } catch {}
  try { db.exec(`ALTER TABLE poultry_bills ADD COLUMN mort_inc REAL DEFAULT NULL`); } catch {}
  try { db.exec(`ALTER TABLE poultry_expenses ADD COLUMN flock_id INTEGER REFERENCES poultry_flock(id) ON DELETE SET NULL`); } catch {}
  try { db.exec(`ALTER TABLE poultry_expenses ADD COLUMN paid_by TEXT DEFAULT NULL`); } catch {}
  try { db.exec(`ALTER TABLE poultry_expenses ADD COLUMN section TEXT DEFAULT NULL`); } catch {}
  try { db.exec(`ALTER TABLE poultry_expenses ADD COLUMN subcategory TEXT DEFAULT NULL`); } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS poultry_farm_assets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      land_value  REAL NOT NULL DEFAULT 0,
      shed_value  REAL NOT NULL DEFAULT 0,
      acres       REAL NOT NULL DEFAULT 0,
      notes       TEXT DEFAULT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS poultry_stake (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      percentage     REAL NOT NULL DEFAULT 0,
      invested       REAL NOT NULL DEFAULT 0,
      notes          TEXT DEFAULT NULL,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_poultry_stake_user ON poultry_stake(user_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS poultry_sanjay_salary (
      flock_id   INTEGER PRIMARY KEY REFERENCES poultry_flock(id) ON DELETE CASCADE,
      amount     REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Loans
  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      loan_type        TEXT NOT NULL,
      ref_no           TEXT,
      total_amount     REAL NOT NULL,
      future_amount    REAL,
      future_interest  REAL,
      future_principal REAL,
      monthly_payment  REAL,
      interest_rate    REAL,
      time_period      INTEGER,
      maturity_date    TEXT,
      start_date       TEXT,
      paid_amount      REAL NOT NULL DEFAULT 0,
      notes            TEXT,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
  `);

  try { db.exec(`ALTER TABLE loans ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`); } catch {}

  // Seed loan data from CSV if table is empty
  const adminUser = db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get();
  if (adminUser) {
    const loanCount = db.prepare('SELECT COUNT(*) AS c FROM loans WHERE user_id = ?').get(adminUser.id).c;
    if (loanCount === 0) {
      const insertLoan = db.prepare(`
        INSERT INTO loans (user_id, loan_type, ref_no, total_amount, future_amount, future_interest,
          future_principal, monthly_payment, interest_rate, time_period, maturity_date, start_date,
          paid_amount, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const loans = [
        ['LIC Housing loan', '7002050001081', 3400000, 4973930, 1662081.61, 3311848.39, 43995, 9.25, 119, '2035-10-01', '2025-10-03', 0, 1],
        ['LIC Housing loan', '7002050001094', 600000,  851300,  264442.93,  586857.07,  7400,  8.25, 120, '2035-10-03', '2025-10-04', 500000, 2],
        ['SBI Gold loan',    null,            876079,  null,    null,       null,       null,  9,    null, null,        null,        0, 3],
        ['LIC Housing loan', '720500000225',  1500000, 949134,  152857.20,  796276.80,  22524, 10.1, 100, '2029-10-02', '2020-10-11', 0, 4],
        ['LIC Housing loan', '720500000226',  1200000, 727626,  111552.33,  616073.67,  16430, 9.1,  102, '2029-10-04', '2020-10-11', 561163, 5],
      ];
      loans.forEach(l => insertLoan.run(adminUser.id, ...l));
    }
  }
  // WebAuthn / Face ID credentials
  db.exec(`
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key    TEXT NOT NULL,
      counter       INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials(user_id);
  `);

  // Hospital categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospital_categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#e11d48',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  try { db.exec("ALTER TABLE hospital_expenses ADD COLUMN category_id INTEGER DEFAULT NULL REFERENCES hospital_categories(id) ON DELETE SET NULL"); } catch {}
  try { db.exec("ALTER TABLE hospital_categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'circle'"); } catch {}
  try { db.exec("ALTER TABLE hospital_expenses ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0"); } catch {}

  // Uma SBI ledger
  db.exec(`
    CREATE TABLE IF NOT EXISTS uma_sbi (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      date        TEXT NOT NULL DEFAULT (date('now')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_uma_sbi_user ON uma_sbi(user_id);
  `);

  // Properties (India workspace)
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace         TEXT NOT NULL DEFAULT 'india',
      name              TEXT NOT NULL,
      area              TEXT DEFAULT NULL,
      actual_price      REAL DEFAULT NULL,
      appreciated_value REAL DEFAULT NULL,
      year_purchased    INTEGER DEFAULT NULL,
      notes             TEXT DEFAULT NULL,
      sort_order        INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_properties_user ON properties(user_id);
  `);
  try { db.exec("ALTER TABLE properties ADD COLUMN purchase_date TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE properties ADD COLUMN sold_date TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE properties ADD COLUMN sold_amount REAL DEFAULT NULL"); } catch {}

  // Brainstorm items (India workspace)
  db.exec(`
    CREATE TABLE IF NOT EXISTS brainstorm_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace    TEXT NOT NULL DEFAULT 'india',
      name         TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount  REAL NOT NULL DEFAULT 0,
      notes        TEXT DEFAULT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_brainstorm_items_user ON brainstorm_items(user_id);

    CREATE TABLE IF NOT EXISTS brainstorm_records (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id    INTEGER NOT NULL REFERENCES brainstorm_items(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      amount     REAL NOT NULL CHECK (amount > 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_brainstorm_records_item ON brainstorm_records(item_id);
  `);
  try { db.exec("ALTER TABLE brainstorm_records ADD COLUMN notes TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE brainstorm_records ADD COLUMN given_amount REAL NOT NULL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE brainstorm_items ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR'"); } catch {}

  // Car finance
  db.exec(`
    CREATE TABLE IF NOT EXISTS car_finance (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace        TEXT NOT NULL UNIQUE,
      total_amount     REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      remaining_months INTEGER NOT NULL DEFAULT 0,
      due_date         TEXT DEFAULT NULL,
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS car_finance_payments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace  TEXT NOT NULL,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount     REAL NOT NULL CHECK (amount > 0),
      date       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_car_finance_payments_workspace ON car_finance_payments(workspace);
  `);

  // Trips
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace   TEXT NOT NULL DEFAULT 'us',
      name        TEXT NOT NULL,
      destination TEXT DEFAULT NULL,
      start_date  TEXT DEFAULT NULL,
      end_date    TEXT DEFAULT NULL,
      notes       TEXT DEFAULT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
  `);
  try { db.exec("ALTER TABLE expenses ADD COLUMN trip_id INTEGER DEFAULT NULL REFERENCES trips(id) ON DELETE SET NULL"); } catch {}

  // Salary entries: credit/debit type, with optional linked credit card account
  try { db.exec("ALTER TABLE salary_entries ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'debit'"); } catch {}
  try { db.exec("ALTER TABLE salary_entries ADD COLUMN account_id INTEGER DEFAULT NULL REFERENCES accounts(id) ON DELETE SET NULL"); } catch {}
}

module.exports = { runMigrations };
