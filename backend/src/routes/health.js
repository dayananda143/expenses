const express = require('express');
const router = express.Router();
const db = require('../db/database');

function getSettings(userId) {
  let s = db.prepare('SELECT * FROM health_settings WHERE user_id = ?').get(userId);
  if (!s) {
    db.prepare('INSERT OR IGNORE INTO health_settings (user_id) VALUES (?)').run(userId);
    s = db.prepare('SELECT * FROM health_settings WHERE user_id = ?').get(userId);
  }
  return s;
}

// GET /api/health/settings
router.get('/settings', (req, res, next) => {
  try {
    res.json({ data: getSettings(req.user.id) });
  } catch (err) { next(err); }
});

// PATCH /api/health/settings
router.patch('/settings', (req, res, next) => {
  try {
    const curr = getSettings(req.user.id);
    const { calorie_goal, water_goal_ml, weight_unit } = req.body;
    db.prepare('UPDATE health_settings SET calorie_goal = ?, water_goal_ml = ?, weight_unit = ? WHERE user_id = ?')
      .run(
        calorie_goal ?? curr.calorie_goal,
        water_goal_ml ?? curr.water_goal_ml,
        weight_unit ?? curr.weight_unit,
        req.user.id
      );
    res.json({ data: getSettings(req.user.id) });
  } catch (err) { next(err); }
});

// GET /api/health/summary?date=YYYY-MM-DD
router.get('/summary', (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const uid = req.user.id;

    const meals = db.prepare(`
      SELECT COALESCE(SUM(calories),0) AS calories,
             COALESCE(SUM(protein_g),0) AS protein,
             COALESCE(SUM(carbs_g),0) AS carbs,
             COALESCE(SUM(fat_g),0) AS fat,
             COUNT(*) AS count
      FROM health_meals WHERE user_id = ? AND date = ?
    `).get(uid, date);

    const water = db.prepare(`
      SELECT COALESCE(SUM(amount_ml),0) AS total_ml, COUNT(*) AS count
      FROM health_water WHERE user_id = ? AND date = ?
    `).get(uid, date);

    const weight = db.prepare(`
      SELECT * FROM health_weight WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 1
    `).get(uid);

    res.json({ data: { meals, water, weight, settings: getSettings(uid) } });
  } catch (err) { next(err); }
});

// GET /api/health/monthly?year=YYYY&month=MM
router.get('/monthly', (req, res, next) => {
  try {
    const uid = req.user.id;
    const now = new Date();
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const pad   = n => String(n).padStart(2, '0');
    const from  = `${year}-${pad(month)}-01`;
    // last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const to    = `${year}-${pad(month)}-${pad(lastDay)}`;

    const calories = db.prepare(`
      SELECT date, COALESCE(SUM(calories),0) AS total
      FROM health_meals WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY date
    `).all(uid, from, to);

    const water = db.prepare(`
      SELECT date, COALESCE(SUM(amount_ml),0) AS total_ml
      FROM health_water WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY date
    `).all(uid, from, to);

    const weight = db.prepare(`
      SELECT date, weight, unit
      FROM health_weight WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `).all(uid, from, to);

    res.json({ data: { calories, water, weight } });
  } catch (err) { next(err); }
});

// GET /api/health/trends?days=7
router.get('/trends', (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90);
    const uid = req.user.id;

    const calories = db.prepare(`
      SELECT date, COALESCE(SUM(calories),0) AS total
      FROM health_meals WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
      GROUP BY date ORDER BY date ASC
    `).all(uid, days);

    const water = db.prepare(`
      SELECT date, COALESCE(SUM(amount_ml),0) AS total_ml
      FROM health_water WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
      GROUP BY date ORDER BY date ASC
    `).all(uid, days);

    const weight = db.prepare(`
      SELECT date, weight, unit
      FROM health_weight WHERE user_id = ? AND date >= date('now', '-' || ? || ' days')
      ORDER BY date ASC
    `).all(uid, days);

    res.json({ data: { calories, water, weight } });
  } catch (err) { next(err); }
});

// ── IMPORT / EXPORT ───────────────────────────────────────────────────────────

// POST /api/health/import  — body: { meals?, water?, weight? }
router.post('/import', (req, res, next) => {
  try {
    const uid = req.user.id;
    const { meals = [], water = [], weight = [] } = req.body;

    if (!Array.isArray(meals) && !Array.isArray(water) && !Array.isArray(weight)) {
      return res.status(400).json({ error: 'JSON must contain at least one of: meals, water, weight arrays' });
    }

    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

    const insertMeal   = db.prepare(`INSERT INTO health_meals (user_id,date,meal_type,name,calories,protein_g,carbs_g,fat_g,notes) VALUES (?,?,?,?,?,?,?,?,?)`);
    const insertWater  = db.prepare(`INSERT INTO health_water (user_id,date,amount_ml) VALUES (?,?,?)`);
    const insertWeight = db.prepare(`INSERT INTO health_weight (user_id,date,weight,unit,notes) VALUES (?,?,?,?,?)`);

    let mealsOk = 0, mealsSkipped = 0;
    let waterOk = 0, waterSkipped = 0;
    let weightOk = 0, weightSkipped = 0;

    db.exec('BEGIN');
    try {
      for (const m of (Array.isArray(meals) ? meals : [])) {
        if (!m.date || !DATE_RE.test(m.date) || !m.name) { mealsSkipped++; continue; }
        const mtype = VALID_MEAL_TYPES.includes(m.meal_type) ? m.meal_type : 'snack';
        insertMeal.run(uid, m.date, mtype, String(m.name).trim(),
          parseInt(m.calories) || 0, parseFloat(m.protein_g) || 0,
          parseFloat(m.carbs_g) || 0, parseFloat(m.fat_g) || 0,
          m.notes ? String(m.notes) : null);
        mealsOk++;
      }

      for (const w of (Array.isArray(water) ? water : [])) {
        if (!w.date || !DATE_RE.test(w.date) || !w.amount_ml) { waterSkipped++; continue; }
        insertWater.run(uid, w.date, parseInt(w.amount_ml));
        waterOk++;
      }

      for (const wt of (Array.isArray(weight) ? weight : [])) {
        if (!wt.date || !DATE_RE.test(wt.date) || wt.weight == null) { weightSkipped++; continue; }
        const unit = wt.unit === 'lbs' ? 'lbs' : 'kg';
        insertWeight.run(uid, wt.date, parseFloat(wt.weight), unit, wt.notes ? String(wt.notes) : null);
        weightOk++;
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({
      data: {
        imported: { meals: mealsOk, water: waterOk, weight: weightOk },
        skipped:  { meals: mealsSkipped, water: waterSkipped, weight: weightSkipped },
      }
    });
  } catch (err) { next(err); }
});

// GET /api/health/export?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/export', (req, res, next) => {
  try {
    const uid = req.user.id;
    const from = req.query.from || '2000-01-01';
    const to   = req.query.to   || new Date().toISOString().slice(0, 10);

    const meals  = db.prepare(`SELECT date,meal_type,name,calories,protein_g,carbs_g,fat_g,notes FROM health_meals WHERE user_id=? AND date>=? AND date<=? ORDER BY date,created_at`).all(uid, from, to);
    const water  = db.prepare(`SELECT date,amount_ml FROM health_water WHERE user_id=? AND date>=? AND date<=? ORDER BY date,created_at`).all(uid, from, to);
    const weight = db.prepare(`SELECT date,weight,unit,notes FROM health_weight WHERE user_id=? AND date>=? AND date<=? ORDER BY date,created_at`).all(uid, from, to);

    res.setHeader('Content-Disposition', `attachment; filename="health-export-${from}-to-${to}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json({ meals, water, weight });
  } catch (err) { next(err); }
});

// ── MEALS ──────────────────────────────────────────────────────────────────────

// GET /api/health/meals?date=YYYY-MM-DD
router.get('/meals', (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const meals = db.prepare(
      'SELECT * FROM health_meals WHERE user_id = ? AND date = ? ORDER BY created_at ASC'
    ).all(req.user.id, date);
    res.json({ data: meals });
  } catch (err) { next(err); }
});

// POST /api/health/meals
router.post('/meals', (req, res, next) => {
  try {
    const { date, meal_type, name, calories, protein_g, carbs_g, fat_g, notes } = req.body;
    if (!name?.trim() || !date) return res.status(400).json({ error: 'name and date are required' });
    const result = db.prepare(`
      INSERT INTO health_meals (user_id, date, meal_type, name, calories, protein_g, carbs_g, fat_g, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, date, meal_type || 'snack', name.trim(), calories || 0, protein_g || 0, carbs_g || 0, fat_g || 0, notes || null);
    res.status(201).json({ data: db.prepare('SELECT * FROM health_meals WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/health/meals/:id
router.put('/meals/:id', (req, res, next) => {
  try {
    const meal = db.prepare('SELECT * FROM health_meals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!meal) return res.status(404).json({ error: 'Not found' });
    const { date, meal_type, name, calories, protein_g, carbs_g, fat_g, notes } = req.body;
    db.prepare(`
      UPDATE health_meals SET date=?, meal_type=?, name=?, calories=?, protein_g=?, carbs_g=?, fat_g=?, notes=? WHERE id=?
    `).run(
      date ?? meal.date, meal_type ?? meal.meal_type, name?.trim() ?? meal.name,
      calories ?? meal.calories, protein_g ?? meal.protein_g, carbs_g ?? meal.carbs_g,
      fat_g ?? meal.fat_g, notes !== undefined ? notes : meal.notes, meal.id
    );
    res.json({ data: db.prepare('SELECT * FROM health_meals WHERE id = ?').get(meal.id) });
  } catch (err) { next(err); }
});

// DELETE /api/health/meals/:id
router.delete('/meals/:id', (req, res, next) => {
  try {
    const meal = db.prepare('SELECT * FROM health_meals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!meal) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM health_meals WHERE id = ?').run(meal.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── WATER ──────────────────────────────────────────────────────────────────────

// GET /api/health/water?date=YYYY-MM-DD
router.get('/water', (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const entries = db.prepare(
      'SELECT * FROM health_water WHERE user_id = ? AND date = ? ORDER BY created_at ASC'
    ).all(req.user.id, date);
    res.json({ data: entries });
  } catch (err) { next(err); }
});

// POST /api/health/water
router.post('/water', (req, res, next) => {
  try {
    const { date, amount_ml } = req.body;
    if (!date || !amount_ml) return res.status(400).json({ error: 'date and amount_ml are required' });
    const result = db.prepare(
      'INSERT INTO health_water (user_id, date, amount_ml) VALUES (?, ?, ?)'
    ).run(req.user.id, date, parseInt(amount_ml));
    res.status(201).json({ data: db.prepare('SELECT * FROM health_water WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// DELETE /api/health/water/:id
router.delete('/water/:id', (req, res, next) => {
  try {
    const entry = db.prepare('SELECT * FROM health_water WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM health_water WHERE id = ?').run(entry.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── WEIGHT ─────────────────────────────────────────────────────────────────────

// GET /api/health/weight?limit=30
router.get('/weight', (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 365);
    const entries = db.prepare(
      'SELECT * FROM health_weight WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT ?'
    ).all(req.user.id, limit);
    res.json({ data: entries });
  } catch (err) { next(err); }
});

// POST /api/health/weight
router.post('/weight', (req, res, next) => {
  try {
    const { date, weight, unit, notes } = req.body;
    if (!date || !weight) return res.status(400).json({ error: 'date and weight are required' });
    const result = db.prepare(
      'INSERT INTO health_weight (user_id, date, weight, unit, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, date, parseFloat(weight), unit || 'kg', notes || null);
    res.status(201).json({ data: db.prepare('SELECT * FROM health_weight WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) { next(err); }
});

// PUT /api/health/weight/:id
router.put('/weight/:id', (req, res, next) => {
  try {
    const entry = db.prepare('SELECT * FROM health_weight WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    const { date, weight, unit, notes } = req.body;
    db.prepare('UPDATE health_weight SET date=?, weight=?, unit=?, notes=? WHERE id=?')
      .run(date ?? entry.date, weight ?? entry.weight, unit ?? entry.unit, notes !== undefined ? notes : entry.notes, entry.id);
    res.json({ data: db.prepare('SELECT * FROM health_weight WHERE id = ?').get(entry.id) });
  } catch (err) { next(err); }
});

// DELETE /api/health/weight/:id
router.delete('/weight/:id', (req, res, next) => {
  try {
    const entry = db.prepare('SELECT * FROM health_weight WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM health_weight WHERE id = ?').run(entry.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
