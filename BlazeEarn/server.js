// server.js — BlazeEarn Backend Server
require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'blazeearn_secret_key_change_this';

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public')); // serve frontend files from /public folder

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Slow down.' }
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Helper to generate ref code
function generateRefCode() {
  const num = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return 'BLZ-' + num;
}

// Helper to get setting
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

// ============================================================
// ===== AUTH ROUTES =====
// ============================================================

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, username, email, phone, password, coupon_code, referred_by } = req.body;

    // Validate fields
    if (!full_name || !username || !email || !phone || !password || !coupon_code) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check coupon
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND status = ?').get(coupon_code.toUpperCase(), 'active');
    if (!coupon) {
      return res.status(400).json({ error: 'Invalid or already used coupon code' });
    }

    // Check username/email uniqueness
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.toLowerCase(), email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Generate unique ref code
    let ref_code;
    do { ref_code = generateRefCode(); }
    while (db.prepare('SELECT id FROM users WHERE ref_code = ?').get(ref_code));

    // Get welcome bonus from settings
    const welcomeBonus = parseFloat(getSetting('welcome_bonus') || '200');

    // Create user
    const insertUser = db.prepare(`
      INSERT INTO users (full_name, username, email, phone, password_hash, ref_code, referred_by, coupon_used, activity_balance, total_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insertUser.run(
      full_name, username.toLowerCase(), email.toLowerCase(),
      phone, password_hash, ref_code,
      referred_by || null, coupon_code.toUpperCase(),
      welcomeBonus, welcomeBonus
    );

    const newUserId = result.lastInsertRowid;

    // Mark coupon as used
    db.prepare('UPDATE coupons SET status = ?, used_by = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?')
      .run('used', username.toLowerCase(), coupon_code.toUpperCase());

    // Handle referral bonuses
    if (referred_by) {
      const referrer = db.prepare('SELECT * FROM users WHERE ref_code = ?').get(referred_by);
      if (referrer) {
        const directBonus = parseFloat(getSetting('referral_bonus') || '300');
        const indirectBonus = parseFloat(getSetting('indirect_referral_bonus') || '50');

        // Direct referral bonus
        db.prepare('UPDATE users SET referral_balance = referral_balance + ?, total_balance = total_balance + ? WHERE id = ?')
          .run(directBonus, directBonus, referrer.id);
        db.prepare('INSERT INTO referrals (referrer_id, referred_id, type, amount) VALUES (?, ?, ?, ?)')
          .run(referrer.id, newUserId, 'direct', directBonus);

        // Indirect referral (referrer's referrer)
        if (referrer.referred_by) {
          const indirectReferrer = db.prepare('SELECT * FROM users WHERE ref_code = ?').get(referrer.referred_by);
          if (indirectReferrer) {
            db.prepare('UPDATE users SET referral_balance = referral_balance + ?, total_balance = total_balance + ? WHERE id = ?')
              .run(indirectBonus, indirectBonus, indirectReferrer.id);
            db.prepare('INSERT INTO referrals (referrer_id, referred_id, type, amount) VALUES (?, ?, ?, ?)')
              .run(indirectReferrer.id, newUserId, 'indirect', indirectBonus);
          }
        }
      }
    }

    // Generate token
    const token = jwt.sign({ id: newUserId, username: username.toLowerCase(), role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account activated successfully!',
      token,
      user: {
        id: newUserId, full_name, username: username.toLowerCase(),
        email, phone, ref_code, activity_balance: welcomeBonus,
        referral_balance: 0, total_balance: welcomeBonus
      }
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .get(username.toLowerCase(), username.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id, full_name: user.full_name, username: user.username,
        email: user.email, phone: user.phone, ref_code: user.ref_code,
        activity_balance: user.activity_balance, referral_balance: user.referral_balance,
        total_balance: user.total_balance, data_network: user.data_network,
        data_phone: user.data_phone, data_claimed: user.data_claimed
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN LOGIN
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'blaze2025';

    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ role: 'admin', username: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// ===== USER ROUTES =====
// ============================================================

// GET profile
app.get('/api/user/profile', authenticateUser, (req, res) => {
  const user = db.prepare('SELECT id, full_name, username, email, phone, ref_code, activity_balance, referral_balance, total_balance, data_network, data_phone, data_claimed, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user });
});

// UPDATE profile
app.put('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    const { full_name, phone, email } = req.body;
    if (!full_name || !phone || !email) return res.status(400).json({ error: 'All fields required' });

    // Check email uniqueness (excluding current user)
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase(), req.user.id);
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    db.prepare('UPDATE users SET full_name = ?, phone = ?, email = ? WHERE id = ?')
      .run(full_name, phone, email.toLowerCase(), req.user.id);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// CHANGE PASSWORD
app.put('/api/user/password', authenticateUser, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both fields required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE data details
app.put('/api/user/data-details', authenticateUser, (req, res) => {
  const { data_network, data_phone } = req.body;
  if (!data_network || !data_phone) return res.status(400).json({ error: 'Network and phone required' });

  db.prepare('UPDATE users SET data_network = ?, data_phone = ? WHERE id = ?')
    .run(data_network, data_phone, req.user.id);
  res.json({ success: true, message: 'Data details saved' });
});

// GET referral stats
app.get('/api/user/referrals', authenticateUser, (req, res) => {
  const user = db.prepare('SELECT ref_code FROM users WHERE id = ?').get(req.user.id);
  const direct = db.prepare("SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND type = 'direct'").get(req.user.id);
  const indirect = db.prepare("SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND type = 'indirect'").get(req.user.id);
  const totalEarned = db.prepare('SELECT SUM(amount) as total FROM referrals WHERE referrer_id = ?').get(req.user.id);
  res.json({
    success: true,
    ref_code: user.ref_code,
    ref_link: `https://blazeearn.com/ref/${user.ref_code}`,
    direct_referrals: direct.count,
    indirect_referrals: indirect.count,
    total_earned: totalEarned.total || 0
  });
});

// ============================================================
// ===== TASKS ROUTES =====
// ============================================================

// GET all active tasks
app.get('/api/tasks', authenticateUser, (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE is_active = 1 ORDER BY created_at DESC').all();
  const completedIds = db.prepare('SELECT task_id FROM task_completions WHERE user_id = ?')
    .all(req.user.id).map(r => r.task_id);

  const tasksWithStatus = tasks.map(t => ({
    ...t,
    completed: completedIds.includes(t.id)
  }));

  res.json({ success: true, tasks: tasksWithStatus });
});

// COMPLETE a task
app.post('/api/tasks/:id/complete', authenticateUser, (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND is_active = 1').get(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Check already completed
    const already = db.prepare('SELECT id FROM task_completions WHERE user_id = ? AND task_id = ?').get(req.user.id, taskId);
    if (already) return res.status(400).json({ error: 'Task already completed' });

    // Add completion
    db.prepare('INSERT INTO task_completions (user_id, task_id, earned) VALUES (?, ?, ?)').run(req.user.id, taskId, task.reward);

    // Update balance
    db.prepare('UPDATE users SET activity_balance = activity_balance + ?, total_balance = total_balance + ? WHERE id = ?')
      .run(task.reward, task.reward, req.user.id);

    // Get updated balance
    const user = db.prepare('SELECT activity_balance, total_balance FROM users WHERE id = ?').get(req.user.id);

    res.json({
      success: true,
      message: `+₦${task.reward} earned!`,
      reward: task.reward,
      new_activity_balance: user.activity_balance,
      new_total_balance: user.total_balance
    });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Task already completed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// ===== WITHDRAWAL ROUTES =====
// ============================================================

// SUBMIT withdrawal
app.post('/api/withdrawals', authenticateUser, (req, res) => {
  try {
    const { type, amount, bank_name, account_number, account_name } = req.body;
    if (!type || !amount || !bank_name || !account_number || !account_name) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (account_number.length !== 10) return res.status(400).json({ error: 'Account number must be 10 digits' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const minActivity = parseFloat(getSetting('min_activity_withdrawal') || '100');
    const minReferral = parseFloat(getSetting('min_referral_withdrawal') || '900');

    if (type === 'activity') {
      if (amount < minActivity) return res.status(400).json({ error: `Minimum activity withdrawal is ₦${minActivity}` });
      if (amount > user.activity_balance) return res.status(400).json({ error: 'Insufficient activity balance' });
      db.prepare('UPDATE users SET activity_balance = activity_balance - ?, total_balance = total_balance - ? WHERE id = ?')
        .run(amount, amount, req.user.id);
    } else if (type === 'referral') {
      if (amount < minReferral) return res.status(400).json({ error: `Minimum referral withdrawal is ₦${minReferral}` });
      if (amount > user.referral_balance) return res.status(400).json({ error: 'Insufficient referral balance' });
      db.prepare('UPDATE users SET referral_balance = referral_balance - ?, total_balance = total_balance - ? WHERE id = ?')
        .run(amount, amount, req.user.id);
    } else {
      return res.status(400).json({ error: 'Invalid withdrawal type' });
    }

    db.prepare('INSERT INTO withdrawals (user_id, username, type, amount, bank_name, account_number, account_name) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(req.user.id, user.username, type, amount, bank_name, account_number, account_name);

    const updated = db.prepare('SELECT activity_balance, referral_balance, total_balance FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, message: 'Withdrawal request submitted!', ...updated });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET user withdrawals
app.get('/api/withdrawals', authenticateUser, (req, res) => {
  const withdrawals = db.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY submitted_at DESC').all(req.user.id);
  res.json({ success: true, withdrawals });
});

// ============================================================
// ===== PUBLIC ROUTES =====
// ============================================================

// GET public vendors list
app.get('/api/vendors', (req, res) => {
  const vendors = db.prepare('SELECT id, name, whatsapp, picture_url, location FROM vendors ORDER BY created_at DESC').all();
  res.json({ success: true, vendors });
});

// GET public settings (claim date, min withdrawals)
app.get('/api/settings/public', (req, res) => {
  const settings = db.prepare("SELECT key, value FROM settings WHERE key IN ('data_claim_date','min_activity_withdrawal','min_referral_withdrawal','welcome_bonus','referral_bonus','indirect_referral_bonus')").all();
  const obj = {};
  settings.forEach(s => obj[s.key] = s.value);
  res.json({ success: true, settings: obj });
});

// ============================================================
// ===== ADMIN ROUTES =====
// ============================================================

// GET dashboard stats
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  const totalCoupons = db.prepare('SELECT COUNT(*) as count FROM coupons').get().count;
  const activeCoupons = db.prepare("SELECT COUNT(*) as count FROM coupons WHERE status = 'active'").get().count;
  const usedCoupons = db.prepare("SELECT COUNT(*) as count FROM coupons WHERE status = 'used'").get().count;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalVendors = db.prepare('SELECT COUNT(*) as count FROM vendors').get().count;
  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE is_active = 1').get().count;
  const pendingWd = db.prepare("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'").get().count;
  const dataClaimDate = getSetting('data_claim_date') || '';

  res.json({ success: true, stats: { totalCoupons, activeCoupons, usedCoupons, totalUsers, totalVendors, totalTasks, pendingWd, dataClaimDate } });
});

// ---- COUPONS ----
app.post('/api/admin/coupons/generate', authenticateAdmin, (req, res) => {
  const { count, vendor_name } = req.body;
  if (!count || count < 1 || count > 200) return res.status(400).json({ error: 'Count must be 1-200' });

  const insertCoupon = db.prepare('INSERT INTO coupons (code, vendor_name) VALUES (?, ?)');
  const generated = [];

  const generateMany = db.transaction(() => {
    for (let i = 0; i < count; i++) {
      const code = 'BLZ' + Math.random().toString(36).substring(2, 8).toUpperCase();
      insertCoupon.run(code, vendor_name || null);
      generated.push(code);
    }
  });
  generateMany();

  res.json({ success: true, message: `${count} coupon(s) generated`, codes: generated });
});

app.get('/api/admin/coupons', authenticateAdmin, (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  res.json({ success: true, coupons });
});

// ---- VENDORS ----
app.post('/api/admin/vendors', authenticateAdmin, (req, res) => {
  const { name, whatsapp, picture_url, location } = req.body;
  if (!name || !whatsapp) return res.status(400).json({ error: 'Name and WhatsApp required' });
  const result = db.prepare('INSERT INTO vendors (name, whatsapp, picture_url, location) VALUES (?, ?, ?, ?)').run(name, whatsapp, picture_url || null, location || null);
  res.json({ success: true, message: 'Vendor added', id: result.lastInsertRowid });
});

app.delete('/api/admin/vendors/:id', authenticateAdmin, (req, res) => {
  db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Vendor removed' });
});

app.get('/api/admin/vendors', authenticateAdmin, (req, res) => {
  const vendors = db.prepare('SELECT * FROM vendors ORDER BY created_at DESC').all();
  res.json({ success: true, vendors });
});

// ---- TASKS ----
app.post('/api/admin/tasks', authenticateAdmin, (req, res) => {
  const { title, type, link, reward, instructions } = req.body;
  if (!title || !type || !link || !reward || !instructions) return res.status(400).json({ error: 'All fields required' });
  const result = db.prepare('INSERT INTO tasks (title, type, link, reward, instructions) VALUES (?, ?, ?, ?, ?)').run(title, type, link, reward, instructions);
  res.json({ success: true, message: 'Task added', id: result.lastInsertRowid });
});

app.delete('/api/admin/tasks/:id', authenticateAdmin, (req, res) => {
  db.prepare('UPDATE tasks SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Task removed' });
});

app.get('/api/admin/tasks', authenticateAdmin, (req, res) => {
  const tasks = db.prepare('SELECT *, (SELECT COUNT(*) FROM task_completions WHERE task_id = tasks.id) as completions FROM tasks WHERE is_active = 1 ORDER BY created_at DESC').all();
  res.json({ success: true, tasks });
});

// ---- DATA CLAIM DATE ----
app.put('/api/admin/settings/claim-date', authenticateAdmin, (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required' });
  db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(date, 'data_claim_date');
  res.json({ success: true, message: 'Claim date updated' });
});

// ---- WITHDRAWAL SETTINGS ----
app.put('/api/admin/settings/withdrawals', authenticateAdmin, (req, res) => {
  const { min_activity, min_referral } = req.body;
  if (min_activity) db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(String(min_activity), 'min_activity_withdrawal');
  if (min_referral) db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(String(min_referral), 'min_referral_withdrawal');
  res.json({ success: true, message: 'Withdrawal settings updated' });
});

// ---- WITHDRAWALS ADMIN ----
app.get('/api/admin/withdrawals', authenticateAdmin, (req, res) => {
  const withdrawals = db.prepare('SELECT w.*, u.full_name FROM withdrawals w JOIN users u ON w.user_id = u.id ORDER BY w.submitted_at DESC').all();
  res.json({ success: true, withdrawals });
});

app.put('/api/admin/withdrawals/:id/approve', authenticateAdmin, (req, res) => {
  db.prepare("UPDATE withdrawals SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: 'Withdrawal approved' });
});

app.put('/api/admin/withdrawals/:id/reject', authenticateAdmin, (req, res) => {
  const wd = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id);
  if (!wd) return res.status(404).json({ error: 'Not found' });

  // Refund the balance
  if (wd.type === 'activity') {
    db.prepare('UPDATE users SET activity_balance = activity_balance + ?, total_balance = total_balance + ? WHERE id = ?').run(wd.amount, wd.amount, wd.user_id);
  } else {
    db.prepare('UPDATE users SET referral_balance = referral_balance + ?, total_balance = total_balance + ? WHERE id = ?').run(wd.amount, wd.amount, wd.user_id);
  }
  db.prepare("UPDATE withdrawals SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: 'Withdrawal rejected and balance refunded' });
});

// ---- USERS ADMIN ----
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  const users = db.prepare('SELECT id, full_name, username, email, phone, ref_code, referred_by, coupon_used, activity_balance, referral_balance, total_balance, data_network, data_phone, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ success: true, users });
});

// ---- DATA CLAIMS ADMIN ----
app.get('/api/admin/data-claims', authenticateAdmin, (req, res) => {
  const claims = db.prepare('SELECT id, full_name, username, phone, data_network, data_phone FROM users WHERE data_network IS NOT NULL OR data_phone IS NOT NULL ORDER BY created_at DESC').all();
  res.json({ success: true, claims });
});

// ---- ADMIN SETTINGS ----
app.get('/api/admin/settings', authenticateAdmin, (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const obj = {};
  settings.forEach(s => obj[s.key] = s.value);
  res.json({ success: true, settings: obj });
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'BlazeEarn', version: '1.0.0' });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🔥 BlazeEarn server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
