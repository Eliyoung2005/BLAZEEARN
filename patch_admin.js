const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'BlazeEarn', 'public', 'admin.html');
let content = fs.readFileSync(filePath, 'utf8');

const newScript = `
<script>
// ===== CREDENTIALS =====
var ADMIN_USER = 'admin';
var ADMIN_PASS = 'blaze2025';
var adminToken = '';

// ===== SHARED DATA =====
var coupons = [];
var vendors = [];
var tasks = [];
var users = [];
var withdrawals = [];
var claimDate = '';

// ===== AUTH =====
function handleLogin() {
  var u = document.getElementById('admin-user').value.trim();
  var p = document.getElementById('admin-pass').value.trim();
  var err = document.getElementById('login-error');
  
  fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p })
  })
  .then(res => {
      if (!res.ok) throw new Error('Invalid credentials');
      return res.json();
  })
  .then(data => {
      adminToken = data.token;
      err.style.display = 'none';
      document.getElementById('adminlogin').classList.remove('active');
      document.getElementById('adminpanel').classList.add('active');
      refreshAll();
      showToast('Welcome back, Admin!', '#4488FF');
  })
  .catch(e => {
      err.style.display = 'block';
  });
}

function logout() {
  adminToken = '';
  document.getElementById('adminpanel').classList.remove('active');
  document.getElementById('adminlogin').classList.add('active');
  document.getElementById('admin-user').value = '';
  document.getElementById('admin-pass').value = '';
}

// ===== PANEL ROUTING =====
function showPanel(name, el) {
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.sb-item').forEach(function(i) { i.classList.remove('active'); });
  document.getElementById('panel-' + name).classList.add('active');
  if (el) el.classList.add('active');
}

function switchTab(name, btn) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
    };
}

// ===== FETCH DATA API =====
function fetchUsers() {
    fetch('/api/admin/users', { headers: getAuthHeaders() })
    .then(res => res.json())
    .then(data => {
        if(data.users) {
            users = data.users;
            refreshUsersTable();
            refreshDataClaimsTable();
            updateStats();
        }
    })
    .catch(console.error);
}

function fetchCoupons() {
    fetch('/api/admin/coupons', { headers: getAuthHeaders() })
    .then(res => res.json())
    .then(data => {
        if(data.coupons) {
            coupons = data.coupons;
            refreshCouponsTable();
            updateStats();
        }
    })
    .catch(console.error);
}

function fetchVendors() {
    fetch('/api/vendors') // public endpoint
    .then(res => res.json())
    .then(data => {
        if(data.vendors) {
            vendors = data.vendors;
            refreshVendorList();
            refreshVendorDropdown();
            updateStats();
        }
    })
    .catch(console.error);
}

function fetchTasks() {
    fetch('/api/tasks') // public endpoint, returns tasks
    .then(res => res.json())
    .then(data => {
        if(data.tasks) {
            tasks = data.tasks;
            refreshTasksTable();
            updateStats();
        }
    })
    .catch(console.error);
}

function fetchWithdrawals() {
    fetch('/api/admin/withdrawals', { headers: getAuthHeaders() })
    .then(res => res.json())
    .then(data => {
        if(data.withdrawals) {
            withdrawals = data.withdrawals;
            refreshWithdrawalsTable();
            updateStats();
        }
    })
    .catch(console.error);
}

// ===== COUPONS =====
function generateCoupons() {
  var count = parseInt(document.getElementById('coupon-count').value) || 0;
  var vendor = document.getElementById('coupon-vendor').value;
  if (count < 1 || count > 200) { showToast('Enter 1–200 coupons', '#FFAA00'); return; }
  
  fetch('/api/admin/coupons', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ count: count })
  })
  .then(res => res.json())
  .then(data => {
      if (data.codes) {
          fetchCoupons();
          showToast(count + ' coupon(s) generated securely on backend!', '#00FF88');
      } else {
          showToast('Failed to generate on server', '#FF3B3B');
      }
  })
  .catch(err => {
      showToast('Error connecting to backend API', '#FF3B3B');
      console.error(err);
  });
}

function exportCoupons() {
  var active = coupons.filter(function(c) { return !c.isUsed && !c.isDeleted; }).map(function(c) { return c.code; }).join('\\n');
  if (!active) { showToast('No active coupons to export', '#FFAA00'); return; }
  var blob = new Blob([active], { type: 'text/plain' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'blazeearn-active-coupons.txt';
  a.click();
  showToast('Exported successfully!', '#00FF88');
}

function refreshCouponsTable() {
  var tbody = document.getElementById('coupons-tbody');
  var label = document.getElementById('coupon-count-label');
  var activeCoupons = coupons.filter(c => !c.isDeleted);
  if (label) label.textContent = activeCoupons.length + ' code' + (activeCoupons.length !== 1 ? 's' : '');
  if (!activeCoupons.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:26px;">No coupons generated yet.</td></tr>';
    return;
  }
  tbody.innerHTML = activeCoupons.map(function(c, i) {
    var stat = c.isUsed ? 'used' : 'active';
    var uBy = c.usedBy || '—';
    return '<tr>' +
      '<td style="color:var(--muted);">' + (i + 1) + '</td>' +
      '<td><span style="font-family:\\'DM Mono\\',monospace;font-size:0.88rem;color:var(--gold);">' + c.code + '</span></td>' +
      '<td><span class="badge ' + (c.isUsed ? 'b-used' : 'b-active') + '">' + stat + '</span></td>' +
      '<td style="color:var(--muted);">—</td>' +
      '<td style="color:var(--muted);font-family:\\'DM Mono\\',monospace;font-size:0.8rem;">' + uBy + '</td>' +
      '</tr>';
  }).join('');
}

// ===== VENDORS =====
function addVendor() {
  var name = document.getElementById('v-name').value.trim();
  var contact = document.getElementById('v-contact').value.trim();
  var pic = document.getElementById('v-pic').value.trim();
  var location = document.getElementById('v-location').value.trim();
  if (!name || !contact) { showToast('Name and WhatsApp number are required', '#FFAA00'); return; }
  
  fetch('/api/admin/vendors', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: name, contact: contact, pic: pic, location: location })
  })
  .then(res => res.json())
  .then(data => {
      document.getElementById('v-name').value = '';
      document.getElementById('v-contact').value = '';
      document.getElementById('v-pic').value = '';
      document.getElementById('v-location').value = '';
      fetchVendors();
      showToast('Vendor added successfully!', '#00FF88');
  });
}

function removeVendor(id) {
  if (!confirm('Remove this vendor?')) return;
  fetch('/api/admin/vendors/' + id, { method: 'DELETE', headers: getAuthHeaders() })
  .then(() => {
      fetchVendors();
      showToast('Vendor removed', '#FFAA00');
  });
}

function refreshVendorList() {
  var el = document.getElementById('vendor-list');
  var label = document.getElementById('vendor-count-label');
  if (label) label.textContent = vendors.length + ' vendor' + (vendors.length !== 1 ? 's' : '');
  if (!vendors.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;padding:10px 0;">No vendors added yet.</div>';
    return;
  }
  el.innerHTML = vendors.map(function(v) {
    var pic = v.pic
      ? '<img src="' + v.pic + '" class="vpic" onerror="this.style.display=\\'none\\">'
      : '<div class="vph">' + v.name[0].toUpperCase() + '</div>';
    return '<div class="vcard">' + pic +
      '<div class="vinfo">' +
        '<div class="vname">' + v.name + '</div>' +
        '<div class="vcontact">📱 ' + v.contact + '</div>' +
        (v.location ? '<div class="vloc">📍 ' + v.location + '</div>' : '') +
        '<button class="btn-action btn-red btn-sm-a" style="margin-top:8px;" onclick="removeVendor(' + v.id + ')">Remove</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function refreshVendorDropdown() {
  var sel = document.getElementById('coupon-vendor');
  if (!sel) return;
  sel.innerHTML = '<option value="">— No specific vendor —</option>' +
    vendors.map(function(v) { return '<option value="' + v.name + '">' + v.name + '</option>'; }).join('');
}

// ===== TASKS =====
function addTask() {
  var title = document.getElementById('task-title').value.trim();
  var type = document.getElementById('task-type').value;
  var link = document.getElementById('task-link').value.trim();
  var reward = parseInt(document.getElementById('task-reward').value) || 0;
  var instructions = document.getElementById('task-instructions').value.trim();
  if (!title || !link || !reward || !instructions) { showToast('Fill in all task fields!', '#FFAA00'); return; }
  
  fetch('/api/admin/tasks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, type, link, reward, instructions })
  })
  .then(() => {
      document.getElementById('task-title').value = '';
      document.getElementById('task-link').value = '';
      document.getElementById('task-reward').value = '';
      document.getElementById('task-instructions').value = '';
      fetchTasks();
      showToast('Task added!', '#00FF88');
  });
}

function removeTask(id) {
  if (!confirm('Remove this task?')) return;
  fetch('/api/admin/tasks/' + id, { method: 'DELETE', headers: getAuthHeaders() })
  .then(() => {
      fetchTasks();
      showToast('Task removed', '#FFAA00');
  });
}

function refreshTasksTable() {
  var tbody = document.getElementById('tasks-tbody');
  var label = document.getElementById('task-count-label');
  if (label) label.textContent = tasks.length + ' task' + (tasks.length !== 1 ? 's' : '');
  if (!tasks.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:var(--muted);text-align:center;padding:26px;">No tasks added yet.</td></tr>';
    return;
  }
  tbody.innerHTML = tasks.map(function(t, i) {
    return '<tr>' +
      '<td style="color:var(--muted);">' + (i + 1) + '</td>' +
      '<td style="font-weight:600;">' + t.title + '</td>' +
      '<td>' + t.type + '</td>' +
      '<td style="color:var(--green);font-weight:700;">₦' + t.reward + '</td>' +
      '<td><a href="' + t.link + '" target="_blank" style="color:var(--blue);font-size:0.78rem;text-decoration:none;">🔗 View</a></td>' +
      '<td style="color:var(--muted);">—</td>' +
      '<td><button class="btn-action btn-red btn-sm-a" onclick="removeTask(' + t.id + ')">Remove</button></td>' +
      '</tr>';
  }).join('');
}

// ===== DATA CLAIM DATE =====
function setClaimDate() {
  var d = document.getElementById('claim-date-input').value;
  if (!d) { showToast('Please select a date!', '#FFAA00'); return; }
  claimDate = d;
  var formatted = new Date(d + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var display = document.getElementById('current-claim-display');
  display.style.display = 'block';
  display.innerHTML = '✅ <strong>Claim date set:</strong> ' + formatted;
  var stEl = document.getElementById('st-claimdate');
  if (stEl) stEl.textContent = new Date(d + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  showToast('Claim date set to ' + formatted, '#00FF88');
}

function refreshDataClaimsTable() {
  var tbody = document.getElementById('data-claims-tbody');
  var countEl = document.getElementById('data-claim-count');
  var eligible = users.filter(function(u) { return u.dataNetwork || u.dataPhone; });
  if (countEl) countEl.textContent = eligible.length + ' submission' + (eligible.length !== 1 ? 's' : '');
  if (!eligible.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:26px;">No data submissions yet.</td></tr>';
    return;
  }
  tbody.innerHTML = eligible.map(function(u, i) {
    return '<tr>' +
      '<td style="color:var(--muted);">' + (i + 1) + '</td>' +
      '<td style="color:var(--gold);font-weight:600;">@' + u.username + '</td>' +
      '<td>' + u.firstName + ' ' + u.lastName + '</td>' +
      '<td style="font-family:\\'DM Mono\\',monospace;">' + u.phone + '</td>' +
      '<td><span class="badge ' + (u.dataNetwork ? 'b-active' : 'b-pending') + '">' + (u.dataNetwork || 'Not set') + '</span></td>' +
      '<td style="font-family:\\'DM Mono\\',monospace;font-weight:600;">' + (u.dataPhone || '—') + '</td>' +
      '</tr>';
  }).join('');
}

// ===== WITHDRAWALS =====
function approveWithdrawal(id) {
  fetch('/api/admin/withdrawals/' + id + '/approve', { method: 'PUT', headers: getAuthHeaders() })
  .then(() => {
      fetchWithdrawals();
      showToast('Withdrawal approved!', '#00FF88');
  });
}

function refreshWithdrawalsTable() {
  var actList = withdrawals.filter(function(w) { return w.type === 'activity'; });
  var refList = withdrawals.filter(function(w) { return w.type === 'referral'; });
  var actCount = document.getElementById('act-wd-count');
  var refCount = document.getElementById('ref-wd-count');
  if (actCount) actCount.textContent = actList.length + ' request' + (actList.length !== 1 ? 's' : '');
  if (refCount) refCount.textContent = refList.length + ' request' + (refList.length !== 1 ? 's' : '');
  var actTbody = document.getElementById('act-wd-tbody');
  var refTbody = document.getElementById('ref-wd-tbody');
  
  var wdHTML = (list) => list.length ? list.map(function(w, i) {
    return '<tr>' +
      '<td style="color:var(--muted);">' + (i + 1) + '</td>' +
      '<td style="color:var(--gold);">@' + w.username + '</td>' +
      '<td style="font-weight:700;">₦' + w.amount.toLocaleString() + '</td>' +
      '<td>' + w.bank + '</td>' +
      '<td style="font-family:\\'DM Mono\\',monospace;">' + w.accnum + '</td>' +
      '<td>' + w.accname + '</td>' +
      '<td style="color:var(--muted);">' + w.date + '</td>' +
      '<td><span class="badge b-' + w.status + '">' + w.status + '</span></td>' +
      '<td>' + (w.status === 'pending' ? '<button class="btn-action btn-green btn-sm-a" onclick="approveWithdrawal(' + w.id + ')">Approve</button>' : '—') + '</td>' +
      '</tr>';
  }).join('') : '<tr><td colspan="9" style="color:var(--muted);text-align:center;padding:26px;">No withdrawals yet.</td></tr>';
  
  actTbody.innerHTML = wdHTML(actList);
  refTbody.innerHTML = wdHTML(refList);
}

// ===== USERS =====
function refreshUsersTable() {
  var tbody = document.getElementById('users-tbody');
  var label = document.getElementById('users-count-label');
  if (label) label.textContent = users.length + ' user' + (users.length !== 1 ? 's' : '');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:var(--muted);text-align:center;padding:26px;">No registered users yet.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(function(u, i) {
    return '<tr>' +
      '<td style="color:var(--muted);">' + (i + 1) + '</td>' +
      '<td style="font-weight:600;">' + u.firstName + ' ' + u.lastName + '</td>' +
      '<td style="color:var(--gold);">@' + u.username + '</td>' +
      '<td style="font-family:\\'DM Mono\\',monospace;">' + u.phone + '</td>' +
      '<td style="color:var(--muted);">' + u.email + '</td>' +
      '<td style="font-family:\\'DM Mono\\',monospace;font-size:0.78rem;color:var(--muted);">—</td>' +
      '<td style="font-family:\\'DM Mono\\',monospace;font-size:0.78rem;color:var(--muted);">' + (u.referralCode || '—') + '</td>' +
      '</tr>';
  }).join('');
}

// ===== STATS =====
function updateStats() {
  var s = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
  s('st-total', coupons.length);
  s('st-active', coupons.filter(function(c) { return !c.isUsed && !c.isDeleted; }).length);
  s('st-used', coupons.filter(function(c) { return c.isUsed; }).length);
  s('st-users', users.length);
  s('st-vendors', vendors.length);
  s('st-tasks', tasks.length);
  s('st-pending-wd', withdrawals.filter(function(w) { return w.status === 'pending'; }).length);
}

function refreshAll() {
  fetchUsers();
  fetchCoupons();
  fetchVendors();
  fetchTasks();
  fetchWithdrawals();
}

// ===== TOAST =====
function showToast(msg, color) {
  color = color || '#00FF88';
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = color;
  t.style.color = color;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}
</script>
`;

const regex = /<script>[\s\S]*?<\/script>/;
content = content.replace(regex, newScript.trim());
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched admin.html');
