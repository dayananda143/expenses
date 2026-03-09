require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { runMigrations } = require('./migrations');
const { seedAdmin } = require('./seed');

const DB_PATH = path.join(__dirname, '../../data/expenses.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

runMigrations(db);

const ready = seedAdmin(db).catch(console.error);

module.exports = db;
module.exports.ready = ready;
