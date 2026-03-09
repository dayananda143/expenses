const bcrypt = require('bcryptjs');

const ADMIN = { username: 'admin', password: 'changeme', is_admin: 1 };

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining',     color: '#f97316', icon: 'utensils' },
  { name: 'Transportation',    color: '#3b82f6', icon: 'car' },
  { name: 'Shopping',          color: '#a855f7', icon: 'shopping-bag' },
  { name: 'Entertainment',     color: '#ec4899', icon: 'film' },
  { name: 'Healthcare',        color: '#ef4444', icon: 'heart-pulse' },
  { name: 'Bills & Utilities', color: '#eab308', icon: 'zap' },
  { name: 'Housing',           color: '#14b8a6', icon: 'home' },
  { name: 'Education',         color: '#8b5cf6', icon: 'book-open' },
  { name: 'Travel',            color: '#06b6d4', icon: 'plane' },
  { name: 'Other',             color: '#6b7280', icon: 'circle' },
];

function seedCategories(db, userId) {
  const insertCat = db.prepare(
    'INSERT INTO categories (user_id, name, color, icon, workspace) VALUES (?, ?, ?, ?, ?)'
  );
  for (const ws of ['india', 'us']) {
    for (const cat of DEFAULT_CATEGORIES) {
      insertCat.run(userId, cat.name, cat.color, cat.icon, ws);
    }
  }
}

async function seedAdmin(db) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN.username);
  if (existing) return;

  const hash = await bcrypt.hash(ADMIN.password, 12);
  const result = db.prepare(
    "INSERT INTO users (username, password_hash, is_admin, workspaces) VALUES (?, ?, ?, ?)"
  ).run(ADMIN.username, hash, ADMIN.is_admin, '["india","us"]');

  seedCategories(db, result.lastInsertRowid);
  console.log('Seeded admin user with default categories for both workspaces');
}

module.exports = { seedAdmin, seedCategories };
