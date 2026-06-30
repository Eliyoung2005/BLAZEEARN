// database.js — BlazeEarn Database Setup
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'blazeearn.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
// CREATE TABLES
// ============================================================
db.exec(`

  -- USERS TABLE
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    ref_code TEXT UNIQUE NOT NULL,
    referred_by TEXT DEFAULT NULL,
    coupon_used TEXT NOT NULL,
    activity_balance REAL DEFAULT 200,
    referral_balance REAL DEFAULT 0,
    total_balance REAL DEFAULT 200,
    data_network TEXT DEFAULT NULL,
    data_phone TEXT DEFAULT NULL,
    data_claimed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- COUPONS TABLE
  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    vendor_name TEXT DEFAULT NULL,
    used_by TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME DEFAULT NULL
  );

  -- VENDORS TABLE
  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    picture_url TEXT DEFAULT NULL,
    location TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- TASKS TABLE
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT NOT NULL,
    reward INTEGER NOT NULL,
    instructions TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- TASK COMPLETIONS TABLE
  CREATE TABLE IF NOT EXISTS task_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    earned INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    UNIQUE(user_id, task_id)
  );

  -- WITHDRAWALS TABLE
  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- REFERRALS TABLE
  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id)
  );

  -- SETTINGS TABLE
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Default settings
  INSERT OR IGNORE INTO settings (key, value) VALUES
    ('min_activity_withdrawal', '100'),
    ('min_referral_withdrawal', '900'),
    ('data_claim_date', ''),
    ('welcome_bonus', '200'),
    ('referral_bonus', '300'),
    ('indirect_referral_bonus', '50');

`);

console.log('✅ Database initialized successfully');

module.exports = db;
