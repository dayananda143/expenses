const express = require('express');
const router = express.Router();
const db = require('../db/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');

// ── File upload setup ─────────────────────────────────────────────────────────

const uploadsDir = path.join(__dirname, '../../uploads/bills');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `bill-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

// ── Bill parser ───────────────────────────────────────────────────────────────

function parseBillText(rawText) {
  // Normalize OCR artifacts
  const t = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[;|]/g, ':')        // pipe/semicolon → colon
    .replace(/[''`]/g, "'")
    .replace(/\s{2,}/g, ' ');     // collapse multiple spaces to one

  // Find label in text then grab the first number after it (colon optional)
  // This is far more robust than requiring exact "Label :Value" format
  function after(labelPatterns, options = {}) {
    const { integer = false, maxLook = 80 } = options;
    for (const lp of (Array.isArray(labelPatterns) ? labelPatterns : [labelPatterns])) {
      const re = new RegExp(lp, 'im');
      const m = re.exec(t);
      if (!m) continue;
      // Look for first number within maxLook chars after the label match
      const after = t.slice(m.index + m[0].length, m.index + m[0].length + maxLook);
      const nm = after.match(/[:\s$]+([0-9][0-9,.]*)/);
      if (nm && nm[1]) {
        const v = parseFloat(nm[1].replace(/,/g, '').replace(/-$/, ''));
        if (!isNaN(v)) return integer ? Math.round(v) : v;
      }
    }
    return null;
  }

  function afterStr(labelPatterns, options = {}) {
    const { maxLook = 100 } = options;
    for (const lp of (Array.isArray(labelPatterns) ? labelPatterns : [labelPatterns])) {
      const re = new RegExp(lp, 'im');
      const m = re.exec(t);
      if (!m) continue;
      const after = t.slice(m.index + m[0].length, m.index + m[0].length + maxLook);
      const sm = after.match(/[:\s]+([^\n:]{2,60})/);
      if (sm && sm[1]) return sm[1].trim();
    }
    return null;
  }

  // Standalone FCR: iterate all FCR matches, skip any preceded by "Converted"
  function getFCR() {
    const re = /\bFCR[\s:]+([0-9][0-9.]*)/gim;
    let m;
    while ((m = re.exec(t)) !== null) {
      const before = t.slice(Math.max(0, m.index - 15), m.index).toLowerCase();
      if (!before.includes('convert')) return parseFloat(m[1]);
    }
    return null;
  }

  // Mortality count: iterate all Mortality matches, skip "Mortality %"
  function getMortality() {
    const re = /\bMortality[\s:]+([0-9][0-9,]*)/gim;
    let m;
    while ((m = re.exec(t)) !== null) {
      // Skip if the matched text (or text right after label) contains "%"
      const context = t.slice(m.index, m.index + 20);
      if (context.includes('%')) continue;
      const v = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(v)) return v;
    }
    return null;
  }

  // Cost line: label followed by two numbers (total and Rs/Kg)
  function costLine(labelPattern) {
    const esc = labelPattern.replace(/[./()/]/g, c => `\\${c}`);
    // Match: label then up to two colon-separated numbers
    const m = t.match(new RegExp(
      `\\b${esc}[\\s:]+([0-9][0-9,.]+)[\\s:]+([0-9][0-9.,]+)`, 'im'
    ));
    if (m) return {
      total: parseFloat(m[1].replace(/,/g, '')),
      rs_kg: parseFloat(m[2].replace(/,/g, '')),
    };
    return { total: null, rs_kg: null };
  }

  const chick    = costLine('Chick');
  const feed     = costLine('Feed');
  const medicine = costLine('Medicine');
  const vaccine  = costLine('Vaccine');
  const admin    = costLine('Admin');
  const overhead = costLine('Overheads');
  const prodCost = costLine('Prod Cost');

  const result = {
    voucher_no:   afterStr(['RC\\s*Voucher\\s*No\\.?', 'Voucher\\s*No\\.?'], { maxLook: 30 }),
    bill_date:    (() => {
      // Bill date is the Date: not preceded by Hatch
      const m = t.match(/(?<!Hatch\s{0,5})Date[\s:]+(\d{1,2}[./]\d{1,2}[./]\d{4})/im);
      return m ? m[1] : null;
    })(),
    hatch_date:   (() => {
      const m = t.match(/Hatch\s*Date[\s:1]+(\d{1,2}[./]\d{1,2}[./]\d{4})/im);
      return m ? m[1] : null;
    })(),
    farmer_name:  (() => {
      const m = t.match(/Farmer\s*Name[\s:]+([^\n]{5,80})/im);
      return m ? m[1].trim() : null;
    })(),

    // Production
    chick_housed:      after(['Chick\\s*Hous(?:e?s?d|ed?)?'], { integer: true }),
    mean_age:          after(['Mean\\s*Age']),
    day_gain:          after(['[Dd]ay\\s*[Gg]ain', 'pay\\s*[Gg]ain']),
    mortality:         getMortality(),
    mortality_pct:     after(['Mortality\\s*[$%]']),
    first_wk_mort_pct: after(['1st\\s*Wk\\s*Mort', 'Ist\\s*Wk\\s*Mort', '1\\s*st\\s*Wk\\s*Mort']),
    bird_sold_no:      after(['Bird\\s*Sold\\s*\\(?No'], { integer: true }),
    bird_sold_kgs:     after(['Bird\\s*Sold\\s*Kgs?']),
    feed_cons_kgs:     after(['Feed\\s*Cons\\.?\\s*Kgs?']),
    avg_body_wt:       after(['Avg\\.?\\s*Body\\s*Wt']),
    fcr:               getFCR(),
    converted_fcr:     after(['Converted\\s*FCR']),
    eef:               after(['\\bEEF\\b']),
    grade:             (() => {
      const m = t.match(/\bGrade[\s:]+([A-Z])\b/im);
      return m ? m[1].toUpperCase() : null;
    })(),
    standard_rc:       after(['Standard\\s*RC']),
    std_prod_cost:     after(['Std\\.?\\s*Prod\\.?\\s*Cost']),
    basic_gc_amt:      after(['Basic\\s*GC\\s*Amt']),

    // Costs
    chick_cost:      chick.total,     chick_rs_kg:     chick.rs_kg,
    feed_cost:       feed.total,      feed_rs_kg:      feed.rs_kg,
    medicine_cost:   medicine.total,  medicine_rs_kg:  medicine.rs_kg,
    vaccine_cost:    vaccine.total,   vaccine_rs_kg:   vaccine.rs_kg,
    admin_cost:      admin.total,     admin_rs_kg:     admin.rs_kg,
    overhead_cost:   overhead.total,
    prod_cost_total: prodCost.total,  prod_cost_rs_kg: prodCost.rs_kg,
    ern_rc_kg:       after(['Ern\\s*RC\\s*/\\s*Kg', 'Ern\\s*RC.*Kg']),

    // Financials
    avg_sale_rate: after(['Avg\\.?\\s*Sale\\s*Rate']),
    prod_reco:     after(['Prod\\s*Reco']),
    mort_reco:     after(['Mort\\s*Reco']),
    fcr_reco:      after(['FCR\\s*Reco']),
    bird_sh_rec:   after(['Bird\\s*Sh\\s*Rec']),
    total_rc:      after(['Total\\s*RC']),
    tds:           after(['\\bTDS\\b']),
    net_pay:       after(['Net\\s*Pay']),
  };

  // OCR often misreads ":" as "1", prefixing values. Fix with range checks.
  function stripOcrOne(val, max) {
    if (val == null || val <= max) return val;
    const s = parseFloat(String(val).replace(/^1/, ''));
    return (!isNaN(s) && s > 0 && s <= max) ? s : val;
  }

  // Mortality: cross-validate using mortality_pct × chick_housed
  if (result.mortality != null && result.mortality_pct != null && result.chick_housed != null) {
    const expected = result.mortality_pct / 100 * result.chick_housed;
    const stripped = parseInt(String(result.mortality).slice(1), 10);
    if (!isNaN(stripped) && Math.abs(stripped - expected) < Math.abs(result.mortality - expected)) {
      result.mortality = stripped;
    }
  }
  // Broiler mean age: never exceeds 100 days
  result.mean_age = stripOcrOne(result.mean_age, 100);
  // Daily weight gain: broilers never exceed 130 g/day
  result.day_gain = stripOcrOne(result.day_gain, 130);
  return result;
}

// ── Flock ────────────────────────────────────────────────────────────────────

router.get('/flock', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM poultry_flock ORDER BY date_added DESC').all();
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/flock', (req, res, next) => {
  try {
    const { name, bird_type = 'chicken', count, date_added, end_date, notes } = req.body;
    const r = db.prepare(
      'INSERT INTO poultry_flock (user_id, name, bird_type, count, date_added, end_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, name, bird_type, count, date_added, end_date ?? null, notes ?? null);
    res.json({ data: db.prepare('SELECT * FROM poultry_flock WHERE id = ?').get(r.lastInsertRowid) });
  } catch (err) { next(err); }
});

router.patch('/flock/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM poultry_flock WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { name, bird_type, count, date_added, end_date, notes, status } = req.body;
    db.prepare(
      'UPDATE poultry_flock SET name=?, bird_type=?, count=?, date_added=?, end_date=?, notes=?, status=? WHERE id=?'
    ).run(
      name ?? row.name,
      bird_type ?? row.bird_type,
      count ?? row.count,
      date_added ?? row.date_added,
      end_date !== undefined ? end_date : row.end_date,
      notes !== undefined ? notes : row.notes,
      status ?? row.status ?? 'active',
      row.id
    );
    res.json({ data: db.prepare('SELECT * FROM poultry_flock WHERE id = ?').get(row.id) });
  } catch (err) { next(err); }
});

router.delete('/flock/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM poultry_flock WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Mortality ─────────────────────────────────────────────────────────────────

router.get('/mortality', (req, res, next) => {
  try {
    const { from, to } = req.query;
    let q = 'SELECT m.*, f.name as flock_name FROM poultry_mortality m LEFT JOIN poultry_flock f ON f.id = m.flock_id WHERE 1=1';
    const params = [];
    if (from) { q += ' AND m.date >= ?'; params.push(from); }
    if (to)   { q += ' AND m.date <= ?'; params.push(to); }
    q += ' ORDER BY m.date DESC, m.id DESC';
    res.json({ data: db.prepare(q).all(...params) });
  } catch (err) { next(err); }
});

router.post('/mortality', (req, res, next) => {
  try {
    const { flock_id, date, count, cause, notes } = req.body;
    const r = db.prepare(
      'INSERT INTO poultry_mortality (user_id, flock_id, date, count, cause, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, flock_id ?? null, date, count, cause ?? null, notes ?? null);
    const row = db.prepare('SELECT m.*, f.name as flock_name FROM poultry_mortality m LEFT JOIN poultry_flock f ON f.id = m.flock_id WHERE m.id = ?').get(r.lastInsertRowid);
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.patch('/mortality/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM poultry_mortality WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { flock_id, date, count, cause, notes } = req.body;
    db.prepare('UPDATE poultry_mortality SET flock_id=?, date=?, count=?, cause=?, notes=? WHERE id=?').run(
      flock_id !== undefined ? flock_id : row.flock_id,
      date ?? row.date,
      count ?? row.count,
      cause !== undefined ? cause : row.cause,
      notes !== undefined ? notes : row.notes,
      row.id
    );
    const updated = db.prepare('SELECT m.*, f.name as flock_name FROM poultry_mortality m LEFT JOIN poultry_flock f ON f.id = m.flock_id WHERE m.id = ?').get(row.id);
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/mortality/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM poultry_mortality WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Expenses ─────────────────────────────────────────────────────────────────

router.get('/expenses', (req, res, next) => {
  try {
    const { from, to, flock_id } = req.query;
    let q = 'SELECT * FROM poultry_expenses WHERE 1=1';
    const params = [];
    if (from) { q += ' AND date >= ?'; params.push(from); }
    if (to)   { q += ' AND date <= ?'; params.push(to); }
    if (flock_id) { q += ' AND flock_id = ?'; params.push(flock_id); }
    q += ' ORDER BY date DESC, id DESC';
    res.json({ data: db.prepare(q).all(...params) });
  } catch (err) { next(err); }
});

router.post('/expenses', (req, res, next) => {
  try {
    const { date, category = 'feed', subcategory, description, amount, notes, flock_id } = req.body;
    const r = db.prepare(
      'INSERT INTO poultry_expenses (user_id, flock_id, date, category, subcategory, description, amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, flock_id ?? null, date, category, subcategory ?? null, description, amount, notes ?? null);
    res.json({ data: db.prepare('SELECT * FROM poultry_expenses WHERE id = ?').get(r.lastInsertRowid) });
  } catch (err) { next(err); }
});

router.patch('/expenses/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM poultry_expenses WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { date, category, subcategory, description, amount, notes } = req.body;
    db.prepare('UPDATE poultry_expenses SET date=?, category=?, subcategory=?, description=?, amount=?, notes=? WHERE id=?').run(
      date ?? row.date,
      category ?? row.category,
      subcategory !== undefined ? subcategory : row.subcategory,
      description ?? row.description,
      amount ?? row.amount,
      notes !== undefined ? notes : row.notes,
      row.id
    );
    res.json({ data: db.prepare('SELECT * FROM poultry_expenses WHERE id = ?').get(row.id) });
  } catch (err) { next(err); }
});

router.delete('/expenses/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM poultry_expenses WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Excel import ──────────────────────────────────────────────────────────────

const XLSX = require('xlsx');
const excelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/expenses/import', excelUpload.single('file'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { flock_id } = req.body;

    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const [labelRow, headerRow] = rows;
    const dataRows = rows.slice(2); // skip 2 header rows

    function parseDate(val) {
      if (!val) return null;
      // JS Date object (from xlsx cellDates:true on .xlsx files)
      if (val instanceof Date) {
        const y = val.getFullYear(), mo = val.getMonth() + 1, d = val.getDate();
        if (isNaN(y)) return null;
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      const s = String(val).trim();
      // MM/DD/YYYY or M/D/YYYY (from CSV)
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
      // YYYY-MM-DD
      if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
      return null;
    }
    function parseAmt(val) {
      const n = parseFloat(String(val ?? '').replace(/,/g, '').trim());
      return isNaN(n) || n <= 0 ? null : n;
    }
    function str(val) { return val ? String(val).trim() : ''; }

    // The 4 sections (shed / shed labor / sanjay labor / medicines) don't sit at fixed
    // column offsets — different batch exports insert varying numbers of spacer columns
    // between them. Instead, detect each section's columns from the header rows:
    // "Date" cells in the sub-header row mark each section's start (item/expense follow
    // immediately after), and "Who paid" cells in the label row mark the paid-by column.
    // Any columns between expense and paid-by are treated as free-text notes.
    const SECTION_NAMES = ['shed', 'shed_labor', 'sanjay_labor', 'medicine'];
    const dateCols  = headerRow.reduce((acc, v, i) => (str(v).toLowerCase() === 'date' ? [...acc, i] : acc), []);
    const paidCols  = labelRow.reduce((acc, v, i) => (str(v).toLowerCase() === 'who paid' ? [...acc, i] : acc), []);
    if (dateCols.length !== paidCols.length || dateCols.length < SECTION_NAMES.length) {
      return res.status(400).json({ error: 'Could not detect expense section columns in this sheet' });
    }
    const SECTIONS = SECTION_NAMES.map((name, i) => {
      const dateCol = dateCols[i];
      const itemCol = dateCol + 1;
      const amtCol  = dateCol + 2;
      const paidCol = paidCols[i];
      const notesCols = [];
      for (let c = amtCol + 1; c < paidCol; c++) notesCols.push(c);
      return { name, dateCol, itemCol, amtCol, notesCols, paidCol };
    });

    const lastDate = {};
    const stmt = db.prepare(
      'INSERT INTO poultry_expenses (user_id, flock_id, date, category, section, subcategory, description, amount, paid_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    let count = 0;
    db.exec('BEGIN');
    try {
      for (const row of dataRows) {
        for (const sec of SECTIONS) {
          const d = parseDate(row[sec.dateCol]);
          if (d) lastDate[sec.name] = d;
          const amount = parseAmt(row[sec.amtCol]);
          if (!amount || !lastDate[sec.name]) continue;
          const item = str(row[sec.itemCol]);
          const notes = sec.notesCols.map(c => str(row[c])).filter(Boolean).join(' | ');
          stmt.run(
            req.user.id,
            flock_id ? parseInt(flock_id) : null,
            lastDate[sec.name],
            sec.name,                           // category = section name
            sec.name,                           // section
            item || null,                       // subcategory = item name
            notes || item || '-',               // description = notes, fallback to item
            amount,
            str(row[sec.paidCol]) || null
          );
          count++;
        }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({ data: { imported: count } });
  } catch (err) { next(err); }
});

// ── Sales ─────────────────────────────────────────────────────────────────────

router.get('/sales', (req, res, next) => {
  try {
    const { from, to } = req.query;
    let q = 'SELECT * FROM poultry_sales WHERE 1=1';
    const params = [];
    if (from) { q += ' AND date >= ?'; params.push(from); }
    if (to)   { q += ' AND date <= ?'; params.push(to); }
    q += ' ORDER BY date DESC, id DESC';
    res.json({ data: db.prepare(q).all(...params) });
  } catch (err) { next(err); }
});

router.post('/sales', (req, res, next) => {
  try {
    const { date, sale_type = 'eggs', quantity, unit = 'dozen', price, total, buyer, notes } = req.body;
    const r = db.prepare(
      'INSERT INTO poultry_sales (user_id, date, sale_type, quantity, unit, price, total, buyer, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, date, sale_type, quantity, unit, price, total, buyer ?? null, notes ?? null);
    res.json({ data: db.prepare('SELECT * FROM poultry_sales WHERE id = ?').get(r.lastInsertRowid) });
  } catch (err) { next(err); }
});

router.patch('/sales/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM poultry_sales WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { date, sale_type, quantity, unit, price, total, buyer, notes } = req.body;
    db.prepare('UPDATE poultry_sales SET date=?, sale_type=?, quantity=?, unit=?, price=?, total=?, buyer=?, notes=? WHERE id=?').run(
      date ?? row.date,
      sale_type ?? row.sale_type,
      quantity ?? row.quantity,
      unit ?? row.unit,
      price ?? row.price,
      total ?? row.total,
      buyer !== undefined ? buyer : row.buyer,
      notes !== undefined ? notes : row.notes,
      row.id
    );
    res.json({ data: db.prepare('SELECT * FROM poultry_sales WHERE id = ?').get(row.id) });
  } catch (err) { next(err); }
});

router.delete('/sales/:id', (req, res, next) => {
  try {
    db.prepare('DELETE FROM poultry_sales WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Summary ───────────────────────────────────────────────────────────────────

// GET /api/poultry/expenses/batch-summary — total + by-category + revenue per batch
router.get('/expenses/batch-summary', (req, res, next) => {
  try {
    const batches = db.prepare('SELECT id, name, date_added, end_date FROM poultry_flock ORDER BY date_added DESC').all();
    const INCOME_CATS = ['pottu_sold', 'feed_bags_sold'];
    const incomePlaceholders = INCOME_CATS.map(() => '?').join(',');
    const result = batches.map(b => {
      const expenses = db.prepare(
        `SELECT COALESCE(SUM(amount),0) as total FROM poultry_expenses WHERE flock_id = ? AND category NOT IN (${incomePlaceholders})`
      ).get(b.id, ...INCOME_CATS).total;
      const cats = db.prepare(
        `SELECT category, COALESCE(SUM(amount),0) as total FROM poultry_expenses WHERE flock_id = ? AND category NOT IN (${incomePlaceholders}) GROUP BY category`
      ).all(b.id, ...INCOME_CATS);
      const billRevenue = db.prepare(
        'SELECT COALESCE(SUM(net_pay),0) as total FROM poultry_bills WHERE flock_id = ?'
      ).get(b.id).total;
      const incomeRevenue = db.prepare(
        `SELECT COALESCE(SUM(amount),0) as total FROM poultry_expenses WHERE flock_id = ? AND category IN (${incomePlaceholders})`
      ).get(b.id, ...INCOME_CATS).total;
      const revenue = billRevenue + incomeRevenue;
      const profit = revenue - expenses;
      return { flock_id: b.id, name: b.name, date_added: b.date_added, end_date: b.end_date, total: expenses, by_category: cats, revenue, profit };
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/summary', (req, res, next) => {
  try {
    // Active batches with their death counts
    const activeBatches = db.prepare(
      "SELECT f.*, COALESCE((SELECT SUM(count) FROM poultry_mortality m WHERE m.flock_id = f.id), 0) as deaths FROM poultry_flock f WHERE f.status = 'active' ORDER BY f.date_added DESC"
    ).all();

    const totalBirds = activeBatches.reduce((s, b) => s + Math.max(0, b.count - b.deaths), 0);

    const deathsThisMonth = db.prepare(
      "SELECT COALESCE(SUM(count), 0) as total FROM poultry_mortality WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')"
    ).get().total;

    const expensesThisMonth = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM poultry_expenses WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')"
    ).get().total;

    const salesThisMonth = db.prepare(
      "SELECT COALESCE(SUM(total), 0) as total FROM poultry_sales WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')"
    ).get().total;

    const recentMortality = db.prepare(
      "SELECT date, SUM(count) as count FROM poultry_mortality GROUP BY date ORDER BY date DESC LIMIT 7"
    ).all();

    res.json({
      data: {
        activeBatches,
        totalBirds,
        deathsThisMonth,
        expensesThisMonth,
        salesThisMonth,
        profit: salesThisMonth - expensesThisMonth,
        recentMortality,
      }
    });
  } catch (err) { next(err); }
});

// ── Bills ─────────────────────────────────────────────────────────────────────

// POST /api/poultry/bills/upload  — upload image, run OCR, return parsed fields
router.post('/bills/upload', upload.single('bill'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const imagePath = req.file.path;
  const processedPath = imagePath + '_processed.png';
  try {
    // Preprocess: grayscale + normalize contrast + sharpen — improves OCR on printed bills
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.5 })
      .png()
      .toFile(processedPath);

    const worker = await createWorker('eng', 1, {
      tessedit_pageseg_mode: '6',  // assume uniform block of text
    });
    const { data: { text } } = await worker.recognize(processedPath);
    await worker.terminate();
    fs.unlink(processedPath, () => {});

    const parsed = parseBillText(text);
    res.json({ data: { parsed, raw_text: text, image_file: req.file.filename } });
  } catch (err) {
    fs.unlink(processedPath, () => {});
    fs.unlink(imagePath, () => {});
    next(err);
  }
});

// POST /api/poultry/bills — save confirmed bill data
router.post('/bills', (req, res, next) => {
  try {
    const { flock_id, image_file, raw_text, ...fields } = req.body;
    const image_path = image_file ? `bills/${image_file}` : null;
    const cols = ['flock_id', 'user_id', 'image_path', 'raw_text', ...Object.keys(fields)];
    const vals = [flock_id, req.user.id, image_path, raw_text ?? null, ...Object.values(fields).map(v => v ?? null)];
    const placeholders = vals.map(() => '?').join(', ');
    const r = db.prepare(`INSERT INTO poultry_bills (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);
    res.json({ data: db.prepare('SELECT * FROM poultry_bills WHERE id = ?').get(r.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PATCH /api/poultry/bills/:id — update bill fields
router.patch('/bills/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM poultry_bills WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const allowed = [
      'voucher_no','bill_date','hatch_date','farmer_name','chick_housed','mean_age','day_gain',
      'mortality','mortality_pct','first_wk_mort_pct','bird_sold_no','bird_sold_kgs','feed_cons_kgs',
      'avg_body_wt','fcr','converted_fcr','eef','grade','standard_rc','std_prod_cost','basic_gc_amt',
      'chick_cost','chick_rs_kg','feed_cost','feed_rs_kg','medicine_cost','medicine_rs_kg',
      'vaccine_cost','vaccine_rs_kg','admin_cost','admin_rs_kg','overhead_cost',
      'prod_cost_total','prod_cost_rs_kg','ern_rc_kg','avg_sale_rate',
      'prod_reco','mort_reco','fcr_reco','bird_sh_rec','prod_incent','mort_inc','total_rc','tds','net_pay',
    ];
    const updates = allowed.filter(k => k in req.body);
    if (updates.length === 0) return res.json({ data: row });
    const set = updates.map(k => `${k} = ?`).join(', ');
    const vals = [...updates.map(k => req.body[k] ?? null), row.id];
    db.prepare(`UPDATE poultry_bills SET ${set} WHERE id = ?`).run(...vals);
    res.json({ data: db.prepare('SELECT * FROM poultry_bills WHERE id = ?').get(row.id) });
  } catch (err) { next(err); }
});

// GET /api/poultry/bills?flock_id= — list bills for a batch
router.get('/bills', (req, res, next) => {
  try {
    const { flock_id } = req.query;
    let q = 'SELECT * FROM poultry_bills WHERE 1=1';
    const params = [];
    if (flock_id) { q += ' AND flock_id = ?'; params.push(flock_id); }
    q += ' ORDER BY created_at DESC';
    res.json({ data: db.prepare(q).all(...params) });
  } catch (err) { next(err); }
});

// GET /api/poultry/bills/all — all bills for insights (across batches)
router.get('/bills/all', (req, res, next) => {
  try {
    const rows = db.prepare(
      'SELECT b.*, f.name as batch_name FROM poultry_bills b JOIN poultry_flock f ON f.id = b.flock_id ORDER BY b.bill_date DESC, b.created_at DESC'
    ).all();
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// DELETE /api/poultry/bills/:id
router.delete('/bills/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM poultry_bills WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.image_path) {
      const fullPath = path.join(__dirname, '../../uploads', row.image_path);
      fs.unlink(fullPath, () => {});
    }
    db.prepare('DELETE FROM poultry_bills WHERE id = ?').run(row.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/poultry/farm-assets
// Farm assets are a single shared record for the whole farm, not per-user —
// grab whichever row exists regardless of who last saved it.
router.get('/farm-assets', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM poultry_farm_assets ORDER BY updated_at DESC LIMIT 1').get();
    res.json({ data: row ?? { land_value: 0, shed_value: 0, notes: null } });
  } catch (err) { next(err); }
});

// PUT /api/poultry/farm-assets
router.put('/farm-assets', (req, res, next) => {
  try {
    const { land_value, shed_value, acres, notes } = req.body;
    const existing = db.prepare('SELECT id FROM poultry_farm_assets ORDER BY updated_at DESC LIMIT 1').get();
    if (existing) {
      db.prepare(
        `UPDATE poultry_farm_assets SET land_value=?, shed_value=?, acres=?, notes=?, updated_at=datetime('now') WHERE id=?`
      ).run(land_value ?? 0, shed_value ?? 0, acres ?? 0, notes ?? null, existing.id);
    } else {
      db.prepare(
        `INSERT INTO poultry_farm_assets (user_id, land_value, shed_value, acres, notes, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
      ).run(req.user.id, land_value ?? 0, shed_value ?? 0, acres ?? 0, notes ?? null);
    }
    const row = db.prepare('SELECT * FROM poultry_farm_assets ORDER BY updated_at DESC LIMIT 1').get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

// GET /api/poultry/stake
router.get('/stake', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM poultry_stake ORDER BY percentage DESC').all();
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/poultry/stake
router.post('/stake', (req, res, next) => {
  try {
    const { name, percentage, invested, notes } = req.body;
    const r = db.prepare(
      'INSERT INTO poultry_stake (user_id, name, percentage, invested, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, name, percentage ?? 0, invested ?? 0, notes ?? null);
    res.json({ data: db.prepare('SELECT * FROM poultry_stake WHERE id = ?').get(r.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PATCH /api/poultry/stake/:id
router.patch('/stake/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM poultry_stake WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    const { name, percentage, invested, notes } = req.body;
    db.prepare('UPDATE poultry_stake SET name=?, percentage=?, invested=?, notes=? WHERE id=?').run(
      name ?? row.name,
      percentage !== undefined ? percentage : row.percentage,
      invested !== undefined ? invested : row.invested,
      notes !== undefined ? notes : row.notes,
      row.id
    );
    res.json({ data: db.prepare('SELECT * FROM poultry_stake WHERE id = ?').get(row.id) });
  } catch (err) { next(err); }
});

// DELETE /api/poultry/stake/:id
router.delete('/stake/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM poultry_stake WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM poultry_stake WHERE id = ?').run(row.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Sanjay's salary (per batch) ───────────────────────────────────────────────

// GET /api/poultry/sanjay-salary?flock_id= — amount for one batch, or all batches if omitted
router.get('/sanjay-salary', (req, res, next) => {
  try {
    const { flock_id } = req.query;
    if (flock_id) {
      const row = db.prepare('SELECT * FROM poultry_sanjay_salary WHERE flock_id = ?').get(flock_id);
      res.json({ data: row ?? { flock_id: Number(flock_id), amount: 0 } });
    } else {
      res.json({ data: db.prepare('SELECT * FROM poultry_sanjay_salary').all() });
    }
  } catch (err) { next(err); }
});

// PUT /api/poultry/sanjay-salary — upsert amount for a batch
router.put('/sanjay-salary', (req, res, next) => {
  try {
    const { flock_id, amount } = req.body;
    if (!flock_id) return res.status(400).json({ error: 'flock_id is required' });
    db.prepare(`
      INSERT INTO poultry_sanjay_salary (flock_id, amount, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(flock_id) DO UPDATE SET amount=excluded.amount, updated_at=excluded.updated_at
    `).run(flock_id, amount ?? 0);
    res.json({ data: db.prepare('SELECT * FROM poultry_sanjay_salary WHERE flock_id = ?').get(flock_id) });
  } catch (err) { next(err); }
});

module.exports = router;
