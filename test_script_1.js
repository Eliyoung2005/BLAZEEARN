
// ===== API CONFIG =====
// Change this URL to your deployed backend URL when you go live
// Dynamically route API traffic so mobile devices don't try to connect to their own 'localhost'
var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.match(/^(192|10)\./);
var API_BASE_URL = isLocal ? window.location.protocol + '//' + window.location.hostname + ':3000' : '';

// ===== AUTH =====
async function handleLogin() {
  var u = document.getElementById('login-user').value.trim();
  var p = document.getElementById('login-pass').value.trim();
  if(!u || !p) { showToast('Enter username or email, and password', '#FFAA00'); return; }
  showToast('Logging in...', '#4488FF');
  try {
    var res = await api('POST', '/api/auth/login', { username: u, password: p });
    userToken = res.token;
    localStorage.setItem('blaze_token', userToken);
    currentUser = res.user;
    localStorage.setItem('blaze_user', JSON.stringify(currentUser));
      if (currentUser.isVendor) {
          if(document.getElementById('sb-vendor-area')) document.getElementById('sb-vendor-area').style.display = 'flex';
          if(document.getElementById('bn-vendor-area')) document.getElementById('bn-vendor-area').style.display = 'flex';
          loadVendorDashboard();
      }
    loadProfile();
    showPage('dashboard');
    showPanel('home');
    if(typeof loadSettings === 'function') loadSettings();
    showToast('Login successful!', '#00FF88');
  } catch(err) {
    showToast(err.message, '#FF3B3B');
  }
}

async function handleRegister() {
    var n = document.getElementById('reg-name').value.trim();
    var u = document.getElementById('reg-username').value.trim().toLowerCase();
    var p = document.getElementById('reg-phone').value.trim();
    var e = document.getElementById('reg-email').value.trim();
    var c = document.getElementById('reg-coupon').value.trim();
    var pw = document.getElementById('reg-pass').value.trim();
    var ref = document.getElementById('reg-ref').value.trim() || undefined;
  
    
    if(!n) { showToast('Full Name is required', '#FFAA00'); return; }
    if(!u) { showToast('Username is required', '#FFAA00'); return; }
    if(!p) { showToast('Phone Number is required', '#FFAA00'); return; }
    if(!e) { showToast('Email Address is required', '#FFAA00'); return; }
    if(!c) { showToast('Coupon Code is required', '#FFAA00'); return; }
    if(!pw) { showToast('Password is required', '#FFAA00'); return; }

    
    var parts = n.split(' ').filter(x => x.trim().length > 0);
    if(parts.length < 2) {
      showToast('Please enter both your First Name and Last Name', '#FFAA00');
      return;
    }
    var firstName = parts[0] || '';
    var lastName = parts.slice(1).join(' ') || '';

  showToast('Creating account...', '#4488FF');
  try {
    var res = await api('POST', '/api/auth/register', {
      firstName: firstName, lastName: lastName, username: u, phone: p, email: e, password: pw, couponCode: c, referredBy: ref
    });
    userToken = res.token;
    localStorage.setItem('blaze_token', userToken);
    currentUser = res.user;
    localStorage.setItem('blaze_user', JSON.stringify(currentUser));
    sessionStorage.setItem('just_registered', 'true');
    loadProfile();
    showPage('dashboard');
    showPanel('home');
    if(typeof loadSettings === 'function') loadSettings();
    showToast('Welcome to BlazeEarn!', '#00FF88');
  } catch(err) {
    showToast(err.message, '#FF3B3B');
  }
}

function handleLogout() {
  userToken = null;
  currentUser = null;
  localStorage.removeItem('blaze_token');
  localStorage.removeItem('blaze_user');
  sessionStorage.removeItem('global_popup_shown');
  if(document.getElementById('sb-vendor-area')) document.getElementById('sb-vendor-area').style.display = 'none';
  if(document.getElementById('bn-vendor-area')) document.getElementById('bn-vendor-area').style.display = 'none';
  showPage('landing');
  showToast('Logged out', '#00FF88');
}

function loadAdminDashboard() {
  updateAdminStats();
  refreshCouponsTable();
  refreshVendorAdminList();
  var cv = document.getElementById('coupon-vendor');
  if (cv && typeof vendors !== 'undefined' && vendors.length > 0) {
    cv.innerHTML = '<option value="">No specific vendor</option>' + vendors.map(v => '<option value="'+(v.linkedUsername||v.name)+'">'+v.name+'</option>').join('');
  }
  refreshUsersTable();
  refreshVendorDropdown();
  refreshTasksAdminTable();
  refreshDataClaimsTable();
  refreshWithdrawalTables();
  showPage('staff-board');
}

window.addEventListener('DOMContentLoaded', async function(){
  loadVendors();
  if (window.location.pathname === '/staff-dashboard') {
    if (adminToken) {
      loadAdminDashboard();
    } else {
      window.location.href = '/admin-login';
    }
  } else {
    // Check for Referral/Coupon Link in URL
    var urlParams = new URLSearchParams(window.location.search);
    var refParam = urlParams.get('ref');
    var couponParam = urlParams.get('coupon');
    if(refParam || couponParam) {
      // Switch to Register Form automatically
      showPage('register');
      
      var refInput = document.getElementById('reg-ref');
      if(refInput && refParam) {
        refInput.value = refParam;
        refInput.readOnly = true; // Lock it if it came from the link
        refInput.style.backgroundColor = 'rgba(255,170,0,0.1)';
        refInput.style.borderColor = 'var(--gold)';
        refInput.style.color = 'var(--gold)';
      }
      
      var couponInput = document.getElementById('reg-coupon');
      if(couponInput && couponParam) {
        couponInput.value = couponParam;
        couponInput.readOnly = true;
        couponInput.style.backgroundColor = 'rgba(255,170,0,0.1)';
        couponInput.style.borderColor = 'var(--gold)';
        couponInput.style.color = 'var(--gold)';
      }
    }
  }
});

var currentUser = null;
var userToken = localStorage.getItem('blaze_token') || null;
var adminToken = localStorage.getItem('blaze_admin_token') || null;

// API helper function
async function api(method, endpoint, data=null, isAdmin=false) {
  var token = isAdmin ? adminToken : userToken;
  try {
    var opts = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    };
    if (data) opts.body = JSON.stringify(data);
    var res = await fetch(API_BASE_URL + endpoint, opts);
    if (!res.ok) {
      if(res.status === 401 || res.status === 403) {
        if(isAdmin && typeof logoutAdmin === 'function') logoutAdmin();
        else if (typeof handleLogout === 'function') handleLogout();
      }
      var err = await res.json().catch(()=>({}));
      throw new Error(err.error || 'Request failed');
    }
    return await res.json();
  } catch(err) {
    throw err;
  }
}

// Navigation & Panels
function openDrawer() {
  document.getElementById('side-drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('side-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

function showPage(pageId) {
  var pages = document.querySelectorAll('.page');
  pages.forEach(function(p){ p.classList.remove('active'); });
  var target = document.getElementById(pageId);
  if(target) target.classList.add('active');
  window.scrollTo(0,0);
}


  function showAdminPanel(panelId, el) {
    var panels = document.querySelectorAll('.admin-main .panel');
    panels.forEach(function(p){ p.classList.remove('active'); });
    var target = document.getElementById('apanel-' + panelId);
    if(target) target.classList.add('active');
    
    if (panelId === 'vendors') {
        var sel = document.getElementById('v-user-select');
        if(sel && typeof users !== 'undefined') {
            var nonVendors = users.filter(u => !u.isVendor);
            if (nonVendors.length === 0) {
                sel.innerHTML = '<option value="">No eligible users found</option>';
            } else {
                sel.innerHTML = '<option value="">Select a user to promote...</option>' + nonVendors.map(u => 
                    '<option value="' + u.id + '">@' + u.username + ' (' + u.firstName + ' ' + u.lastName + ')</option>'
                ).join('');
            }
        }
    }
    
    if(el && el.classList.contains('sb-item')) {
      var items = document.querySelectorAll('.admin-sidebar .sb-item');
      items.forEach(function(i){ i.classList.remove('active'); });
      el.classList.add('active');
    }
    window.scrollTo(0,0);
  }

  function showPanel(panelId, el) {
    if(panelId === 'referral' && typeof loadUserReferrals === 'function') loadUserReferrals();
    if(panelId === 'earners' && typeof loadDashboardTopEarners === 'function') loadDashboardTopEarners();
    if(panelId === 'tasks' && typeof loadUserTasks === 'function') loadUserTasks();

    if (window.innerWidth <= 768) {
        let sb = document.getElementById('mobile-sidebar');
        let ov = document.querySelector('.sidebar-overlay');
        if (sb) sb.classList.remove('active');
        if (ov) ov.classList.remove('active');
    }
  var panels = document.querySelectorAll('.panel');
  panels.forEach(function(p){ p.classList.remove('active'); });
  var target = document.getElementById('panel-' + panelId);
  if(target) target.classList.add('active');
  
  if(el && el.classList.contains('sb-item')) {
    var items = document.querySelectorAll('.sb-item');
    items.forEach(function(i){ i.classList.remove('active'); });
    el.classList.add('active');
  }
  
  var bnItems = document.querySelectorAll('.bn-item');
  bnItems.forEach(function(i){ i.classList.remove('active'); });
  var bn = document.getElementById('bn-' + panelId);
  if(bn) bn.classList.add('active');
  window.scrollTo(0,0);
}

function syncBottomNav(panelId) {
    var items = document.querySelectorAll('.sb-item');
    items.forEach(function(i){ i.classList.remove('active'); });
    var sbMap = {
        'home': 0, 'tasks': 1, 'data': 2, 'withdraw': 3, 'referral': 4, 'profile': 5
    };
    if (sbMap[panelId] !== undefined) {
        if (items[sbMap[panelId]]) items[sbMap[panelId]].classList.add('active');
    }
}

// ===== TASKS =====
window.tasks = [];
async function loadUserTasks() {
  try {
    var res = await api('GET', '/api/tasks');
    window.tasks = res.tasks || [];
    renderTasks();
  } catch(e) {
    console.error(e);
  }
}

function renderTasks() {
  var container = document.getElementById('tasks-container');
  if (!window.tasks || !window.tasks.length) {
    container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:48px 0;"><div style="font-size:2.5rem;margin-bottom:12px;">📝</div><div>No tasks available yet. Check back soon.</div></div>';
    return;
  }
  container.innerHTML = window.tasks.map(function(t, i) {
    var ico = '📝';
    var done = t.completed;
    return '<div class="task-card">' +
      '<div class="task-head">' +
        '<div class="task-ico">' + ico + '</div>' +
        '<div class="task-info"><div class="task-title">' + t.title + '</div><div class="task-desc">' + t.type + '</div></div>' +
        '<div class="task-earn">+N' + t.reward + '</div>' +
      '</div>' +
      '<div class="task-body">' +
        '<div class="task-instructions">📌 Instructions: ' + t.instructions + '</div>' +
        '<div class="task-actions">' +
          '<a href="' + t.link + '" target="_blank" class="btn-link" onclick="sessionStorage.setItem(\'task_opened_' + t.id + '\', \'true\')">🌐 Open Task Link</a>' +
          (done ? '<button class="btn-done completed" disabled>✅ Completed</button>' :
            '<button class="btn-done" onclick="completeTask(' + i + ',this)">I\'ve Done This - Earn N' + t.reward + '</button>') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

async function completeTask(idx, btn){
  var task=tasks[idx];
  if(!task||!currentUser)return;
  if (!sessionStorage.getItem('task_opened_' + task.id)) {
      return showToast('You must open the task link before completing it!', '#FF3B3B');
  }
  btn.disabled=true; btn.textContent='Verifying...';
  try {
    var res = await api('POST','/api/tasks/'+task.id+'/complete');
    task.completedBy=[currentUser.username];
    actBalance=res.new_activity_balance||actBalance+task.reward;
    balance=res.new_total_balance||balance+task.reward;
    updateBalanceDisplay();
    btn.textContent='✅ Completed';
    btn.className='btn-done completed';
    sessionStorage.removeItem('task_opened_' + task.id);
    sessionStorage.removeItem('task_opened_' + task.id);
    showToast('+₦'+task.reward+' activity earnings added!','#00FF88');
  } catch(err){
    btn.disabled=false;
    btn.textContent="I've Done This — Earn ₦"+task.reward;
    showToast(err.message||'Error completing task','#FF3B3B');
  }
}

// ===== REFERRAL =====
async function loadUserReferrals() {
  try {
    var res = await api('GET', '/api/user/referrals');
    var tbody = document.getElementById('user-ref-tbody');
    if(!res.referrals || !res.referrals.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:22px;">No referrals yet. Share your link to start earning!</td></tr>';
      return;
    }
    tbody.innerHTML = res.referrals.map(function(r) {
      var levelBadge = r.level === 'Direct' ? '<span style="background:rgba(0,255,136,0.1);color:var(--green);padding:4px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">Direct</span>' : '<span style="background:rgba(255,170,0,0.1);color:var(--gold);padding:4px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">Indirect</span>';
      return '<tr><td style="padding:12px;border-bottom:1px solid var(--border);font-weight:600;">'+r.firstName+' '+r.lastName+'</td><td style="padding:12px;border-bottom:1px solid var(--border);color:var(--gold);">@'+r.username+'</td><td style="padding:12px;border-bottom:1px solid var(--border);color:var(--muted);">'+r.email+'</td><td style="padding:12px;border-bottom:1px solid var(--border);color:var(--muted);">'+(r.phone||'')+'</td><td style="padding:12px;border-bottom:1px solid var(--border);">'+levelBadge+'</td></tr>';
    }).join('');
  } catch(e) {
    document.getElementById('user-ref-tbody').innerHTML = '<tr><td colspan="5" style="color:var(--red);text-align:center;padding:22px;">Failed to load referrals.</td></tr>';
  }
}

function copyRef(){
  var text=document.getElementById('home-ref-link').textContent||document.getElementById('ref-link-display').textContent;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(function() {
      showToast('Referral link copied!','#00FF88');
    }).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Referral link copied!','#00FF88');
  } catch (err) {
    showToast('Failed to copy. Please select and copy manually.','#FF3B3B');
  }
  document.body.removeChild(textArea);
}

// ===== WITHDRAWAL =====
function openWdForm(type){
  var actBal=actBalance, refBal=refBalance;
  document.getElementById('wd-choose').style.display='none';
  document.getElementById('wd-form').style.display='block';
  document.getElementById('wd-current-type').value=type;
  document.getElementById('wd-accname').value='';
  document.getElementById('wd-accnum').value='';
  document.getElementById('wd-bank').value='';
  document.getElementById('wd-amount').value='';
  if(type==='activity'){
    document.getElementById('wd-form-title').textContent='ACTIVITY WITHDRAWAL';
    document.getElementById('wd-avail-bal').textContent='N'+actBal.toLocaleString()+'.00';
    document.getElementById('wd-type-label').textContent='Activity Earnings';
    document.getElementById('wd-form-notice').innerHTML='<span style="font-size:1.2rem;flex-shrink:0;">📅</span><div><strong>Activity withdrawals</strong> are paid on the <strong style="color:var(--gold);">15th of every month</strong>. Minimum withdrawal is <strong style="color:var(--gold);">N'+minActWd+'</strong>.</div>';
    document.getElementById('wd-form-notice').style.cssText='border-radius:10px;padding:14px 18px;margin-bottom:22px;display:flex;align-items:flex-start;gap:12px;font-size:0.83rem;background:rgba(255,170,0,0.06);border:1px solid rgba(255,170,0,0.2);color:var(--text);';
  } else {
    document.getElementById('wd-form-title').textContent='REFERRAL WITHDRAWAL';
    document.getElementById('wd-avail-bal').textContent='N'+refBal.toLocaleString()+'.00';
    document.getElementById('wd-type-label').textContent='Referral Earnings';
    document.getElementById('wd-form-notice').innerHTML='<span style="font-size:1.2rem;flex-shrink:0;">💰</span><div><strong>Referral withdrawals</strong> are processed anytime. Minimum withdrawal is <strong style="color:var(--green);">N'+minRefWd+'</strong>. Allow 24–48 hours for processing.</div>';
    document.getElementById('wd-form-notice').style.cssText='border-radius:10px;padding:14px 18px;margin-bottom:22px;display:flex;align-items:flex-start;gap:12px;font-size:0.83rem;background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.2);color:var(--text);';
  }
}

function closeWdForm(){
  document.getElementById('wd-form').style.display='none';
  document.getElementById('wd-choose').style.display='block';
  document.getElementById('wd-act-bal-card').textContent='N'+actBalance.toLocaleString()+'.00';
  document.getElementById('wd-ref-bal-card').textContent='N'+refBalance.toLocaleString()+'.00';
}

async function submitWithdrawal(){
  var type=document.getElementById('wd-current-type').value;
  var accname=document.getElementById('wd-accname').value.trim();
  var accnum=document.getElementById('wd-accnum').value.trim();
  var bank=document.getElementById('wd-bank').value;
  var amount=parseInt(document.getElementById('wd-amount').value)||0;
  if(!accname||!accnum||!bank||!amount){showToast('Please fill in all bank details!','#FFB800');return;}
  if(accnum.length!==10){showToast('Account number must be 10 digits!','#FFB800');return;}
  var avail=type==='activity'?currentUser.activity_balance:currentUser.referral_balance;
  if(amount>avail){showToast('Insufficient balance!','#FF3B3B');return;}
  try {
    var payload = { type: type, amount: amount, bank: bank, accnum: accnum, accname: accname };
    await api('POST', '/api/withdrawals', payload, false);
    // Update local currentUser balances directly so the UI responds immediately
    if(type==='activity'){currentUser.activity_balance-=amount;}else{currentUser.referral_balance-=amount;}
    currentUser.total_balance-=amount;
    updateBalanceDisplay();
    refreshWithdrawalTables();
    closeWdForm();
    showToast('Withdrawal request submitted securely!','#00FF88');
  } catch(err) {
    showToast(err.message, '#FF3B3B');
  }
}

async function refreshWithdrawalTables(){
  try {
    // Determine if admin is viewing or user is viewing
    var isAdminPage = document.getElementById('admin').classList.contains('active');
    var res;
    
    if (isAdminPage) {
      res = await api('GET', '/api/admin/withdrawals', null, true);
    } else {
      res = await api('GET', '/api/withdrawals', null, false);
    }
    
    var arr = res.withdrawals || [];
    withdrawals = arr; // Sync global state for updateAdminStats
    var actWds=arr.filter(function(w){return w.type==='activity';});
    var refWds=arr.filter(function(w){return w.type==='referral';});

    var wdHtml=function(list,isAdmin){
      return list.map(function(w){
        return '<tr><td style="color:var(--muted);">'+w.id+'</td>'+(isAdmin?'<td>@'+w.username+'</td>':'')+'<td>N'+w.amount.toLocaleString()+'</td><td>'+w.bank+'</td><td style="font-family:monospace;">'+w.accnum+'</td>'+(isAdmin?'<td>'+w.accname+'</td>':'')+'<td>'+w.date+'</td><td><span class="badge badge-'+w.status+'">'+w.status+'</span></td>'+(isAdmin?'<td>'+(w.status==='pending'?'<button class="btn-approve" onclick="approveWd('+w.id+')">Approve</button>':'—')+'</td>':'')+'</tr>';
      }).join('');
    };

    if(!isAdminPage){
      var allTbody=document.getElementById('all-wd-tbody');
      if(allTbody)allTbody.innerHTML=arr.length?wdHtml(arr,false):'<tr><td colspan="8" style="color:var(--muted);text-align:center;padding:26px;">No withdrawals yet.</td></tr>';
    } else {
      var aActTbody=document.getElementById('admin-act-tbody');
      var aRefTbody=document.getElementById('admin-ref-tbody');
      if(aActTbody)aActTbody.innerHTML=actWds.length?wdHtml(actWds,true):'<tr><td colspan="9" style="color:var(--muted);text-align:center;padding:22px;">No activity withdrawals yet.</td></tr>';
      if(aRefTbody)aRefTbody.innerHTML=refWds.length?wdHtml(refWds,true):'<tr><td colspan="9" style="color:var(--muted);text-align:center;padding:22px;">No referral withdrawals yet.</td></tr>';
    }
  } catch(err) {
    console.error("Withdrawal error:", err);
  }
}

async function approveWd(id){
  try {
    await api('PUT', '/api/admin/withdrawals/'+id+'/approve', null, true);
    refreshWithdrawalTables();
    showToast('Withdrawal marked as successful!','#00FF88');
  } catch(err) {
    showToast('Failed to mark withdrawal successful', '#FF3B3B');
  }
}

// ===== ADMIN LOGIN =====
async function handleAdminLogin(){
  var u=document.getElementById('admin-user').value.trim();
  var p=document.getElementById('admin-pass').value.trim();
  try {
    var res = await api('POST', '/api/admin/login', {username: u, password: p});
    adminToken = res.token;
    localStorage.setItem('blaze_admin_token', adminToken);
    showPage('admin');
    updateAdminStats();refreshCouponsTable();refreshVendorAdminList();
  var cv = document.getElementById('coupon-vendor');
  if (cv && typeof vendors !== 'undefined' && vendors.length > 0) {
    cv.innerHTML = '<option value="">No specific vendor</option>' + vendors.map(v => '<option value="'+(v.linkedUsername||v.name)+'">'+v.name+'</option>').join('');
  }refreshUsersTable();refreshVendorDropdown();refreshTasksAdminTable();refreshDataClaimsTable();refreshWithdrawalTables();
    showToast('Admin access granted','#4488FF');
  } catch(err) {
    showToast(err.message || 'Invalid admin credentials','#FF3B3B');
  }
}

// ===== COUPONS =====
async function generateCoupons(){
  var count=parseInt(document.getElementById('coupon-count').value)||0;
  if(count<1||count>100){showToast('Enter 1-100 coupons','#FFB800');return;}
  try {
    var vendorVal = document.getElementById('coupon-vendor') ? document.getElementById('coupon-vendor').value : '';
    await api('POST', '/api/admin/coupons', {count: count, vendor: vendorVal}, true);
    refreshCouponsTable();
    showToast(count+' coupon(s) generated securely!','#00FF88');
  } catch(err) {
    showToast(err.message, '#FF3B3B');
  }
}

function randomCode(){return Math.random().toString(36).substring(2,8).toUpperCase();}

function exportCoupons(){
  var active=coupons.filter(function(c){return !c.isUsed;}).map(function(c){return c.code;}).join('\n');
  if(!active){showToast('No active coupons','#FFB800');return;}
  var blob=new Blob([active],{type:'text/plain'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='blazeearn-coupons.txt';a.click();
  showToast('Exported!','#00FF88');
}

async function deleteCoupon(code) {
  if(!confirm('Are you sure you want to delete coupon: ' + code + '?')) return;
  try {
    await api('DELETE', '/api/admin/coupons/' + code, null, true);
    refreshCouponsTable();
    showToast('Coupon deleted', '#00FF88');
  } catch(e) {
    showToast(e.message, '#FF3B3B');
  }
}

async function refreshCouponsTable(){
  var tbody=document.getElementById('coupons-tbody');
  if(!tbody)return;
  try {
    var res = await api('GET', '/api/admin/coupons', null, true);
    var arr = res.coupons || [];
    coupons = arr;
    var visibleCoupons = arr.filter(function(c) { return !c.isDeleted; });
    tbody.innerHTML=visibleCoupons.length?visibleCoupons.map(function(c,i){return '<tr><td style="color:var(--muted);">'+(i+1)+'</td><td><span style="font-family:monospace;color:var(--gold);">'+c.code+'</span></td><td><span class="badge badge-'+(c.isUsed?'used':'active')+'">'+(c.isUsed?'used':'active')+'</span></td><td style="color:var(--muted);">'+(c.usedBy||'—')+'</td><td><button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="deleteCoupon(\''+c.code+'\')">Delete</button></td></tr>';}).join(''):'<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:22px;">No coupons yet.</td></tr>';
    updateAdminStats();
  } catch(err){
    tbody.innerHTML='<tr><td colspan="5" style="color:var(--red);text-align:center;">Failed to load coupons</td></tr>';
  }
}


  async function makeVendorFromUsers(userId, username, fullname) {
    if (!confirm('Upgrade ' + username + ' to a Code Vendor? This will give them a Vendor Dashboard.')) return;
    try {
      var res = await api('POST', '/api/admin/vendors', {name: fullname + ' Vendor', phone: '0000000000', linkedUsername: username}, true);
      showToast(username + ' is now a Vendor!','#00FF88');
      refreshUsersTable();
      refreshVendorAdminList();
    } catch(err) {
      showToast(err.message || 'Failed to upgrade user','#FF3B3B');
    }
  }

// ===== VENDORS =====
async function loadVendors() {
  try {
    var res = await api('GET', '/api/vendors');
    vendors = res.vendors || [];
    refreshPublicVendors();
    refreshVendorAdminList();
  var cv = document.getElementById('coupon-vendor');
  if (cv && typeof vendors !== 'undefined' && vendors.length > 0) {
    cv.innerHTML = '<option value="">No specific vendor</option>' + vendors.map(v => '<option value="'+(v.linkedUsername||v.name)+'">'+v.name+'</option>').join('');
  }
    refreshVendorDropdown();
  } catch(e) { console.error('Failed to load vendors', e); }
}


async function addVendorFromDropdown() {
    var userId = document.getElementById('v-user-select').value;
    if(!userId) { showToast('Please select a user', '#FFB800'); return; }
    
    // Check if toggleVendor is available
    if(typeof toggleVendor === 'function') {
        await toggleVendor(userId, true);
        document.getElementById('v-user-select').value = '';
        if(typeof showAdminPanel !== 'undefined') {
            // Trigger refresh of dropdown
            showAdminPanel('vendors', document.querySelector('.sb-item[onclick*="vendors"]'));
        }
    } else {
        showToast('Error: Vendor toggle function missing', '#FF3B3B');
    }
}

async function addVendor(){
  var name=document.getElementById('v-name').value.trim();
  var contact=document.getElementById('v-contact').value.trim();
  var pic=document.getElementById('v-pic').value.trim();
  var location=document.getElementById('v-location').value.trim();
  if(!name||!contact){showToast('Name and contact are required','#FFB800');return;}
  try {
    var res = await api('POST', '/api/admin/vendors', {name:name, contact:contact, pic:pic, location:location}, true);
    vendors.unshift(res.vendor);
    document.getElementById('v-name').value='';document.getElementById('v-contact').value='';
    document.getElementById('v-pic').value='';document.getElementById('v-location').value='';
    updateAdminStats();refreshVendorAdminList();
  var cv = document.getElementById('coupon-vendor');
  if (cv && typeof vendors !== 'undefined' && vendors.length > 0) {
    cv.innerHTML = '<option value="">No specific vendor</option>' + vendors.map(v => '<option value="'+(v.linkedUsername||v.name)+'">'+v.name+'</option>').join('');
  }refreshPublicVendors();refreshVendorDropdown();
    showToast('Vendor added!','#00FF88');
  } catch(e) {
    showToast('Failed to add vendor','#FF3B3B');
  }
}

async function removeVendor(id){
  try {
    await api('DELETE', '/api/admin/vendors/'+id, null, true);
    vendors = vendors.filter(function(v){ return v.id !== id; });
    updateAdminStats();refreshVendorAdminList();
  var cv = document.getElementById('coupon-vendor');
  if (cv && typeof vendors !== 'undefined' && vendors.length > 0) {
    cv.innerHTML = '<option value="">No specific vendor</option>' + vendors.map(v => '<option value="'+(v.linkedUsername||v.name)+'">'+v.name+'</option>').join('');
  }refreshPublicVendors();refreshVendorDropdown();
    showToast('Vendor removed','#FFB800');
  } catch(e) {
    showToast('Failed to remove vendor','#FF3B3B');
  }
}

function refreshVendorAdminList(){
  var el=document.getElementById('vendor-admin-list');
  if(!el)return;
  if(!vendors.length){el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;padding:10px 0;">No vendors added yet.</div>';return;}
  el.innerHTML=vendors.map(function(v){
    var pic=v.pic?'<img src="'+v.pic+'" class="vad-pic" onerror="this.style.display=\'none\'">':'<div class="vad-ph">'+v.name[0].toUpperCase()+'</div>';
    var statsHtml = '';
    if (v.totalCoupons !== undefined) {
        statsHtml = '<div style="font-size:0.7rem;color:var(--gold);margin-top:4px;">Coupons: '+v.totalCoupons+' Total | '+v.activeCoupons+' Active | '+v.usedCoupons+' Used</div>';
    }
    return '<div class="vad-card" style="flex-direction:column;align-items:flex-start;">' + 
      '<div style="display:flex;align-items:center;gap:12px;">' + pic + '<div><div class="vad-name">'+v.name+(v.linkedUsername?' <span style="color:var(--muted);">(@'+v.linkedUsername+')</span>':'')+'</div><div class="vad-contact">'+v.contact+'</div>'+(v.location?'<div style="font-size:0.72rem;color:var(--muted);">'+v.location+'</div>':'')+'</div></div>' +
      statsHtml +
      '<button class="btn-del" onclick="removeVendor('+v.id+')">Remove</button>' +
      '</div>';
  }).join('');
}

function refreshPublicVendors(){
  var el=document.getElementById('public-vendors-grid');
  if(!el)return;
  if(!vendors.length){el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;padding:20px 0;">No vendors added yet. Check back soon.</div>';return;}
  el.style.display = 'block'; // Make it full width block to avoid grid restrictions
  var tbody = vendors.map(function(v){
    var pic=v.pic?'<img src="'+v.pic+'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid var(--border); flex-shrink:0;">':'<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--fire),var(--gold));display:flex;align-items:center;justify-content:center;color:#000;font-family:\'Bebas Neue\',sans-serif;font-size:1.3rem;flex-shrink:0;">'+v.name[0].toUpperCase()+'</div>';
    var safeMsg = v.customMessage ? v.customMessage.replace(/'/g,"\\'").replace(/"/g,'&quot;') : '';
    return '<tr>'+
           '<td style="display:flex;align-items:center;gap:16px;padding:16px 24px;border-bottom:1px solid var(--border);">'+pic+'<span style="font-weight:700;font-size:1.05rem;color:var(--text);">'+v.name+'</span></td>'+
           '<td style="padding:16px 24px;border-bottom:1px solid var(--border);color:var(--muted);font-size:0.95rem;">'+(v.location?'📍 '+v.location:'BlazeEarn Vendor')+'</td>'+
           '<td style="padding:16px 24px;border-bottom:1px solid var(--border);"><button onclick="openWaChoiceModal(\''+v.contact+'\', \''+safeMsg+'\')" style="display:inline-block;padding:8px 18px;background:rgba(0,255,136,0.1);color:var(--green);border-radius:8px;font-weight:700;font-size:0.9rem;border:1px solid rgba(0,255,136,0.2); cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background=\'var(--green)\';this.style.color=\'#000\'" onmouseout="this.style.background=\'rgba(0,255,136,0.1)\';this.style.color=\'var(--green)\'">💬 WhatsApp</button></td>'+
           '</tr>';
  }).join('');
  el.innerHTML = '<div style="overflow-x:auto;background:var(--card);border:1px solid var(--border);border-radius:12px;margin-top:10px;"><table style="width:100%;min-width:800px;border-collapse:collapse;text-align:left;">'+
                 '<thead><tr>'+
                 '<th style="padding:18px 24px;border-bottom:1px solid var(--border);color:var(--muted);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;background:var(--card2);">Vendor</th>'+
                 '<th style="padding:18px 24px;border-bottom:1px solid var(--border);color:var(--muted);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;background:var(--card2);">Location</th>'+
                 '<th style="padding:18px 24px;border-bottom:1px solid var(--border);color:var(--muted);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;background:var(--card2);">Contact</th>'+
                 '</tr></thead>'+
                 '<tbody>'+tbody+'</tbody></table></div>';
}

function refreshVendorDropdown(){
  var sel=document.getElementById('coupon-vendor');
  if(!sel)return;
  sel.innerHTML='<option value="">No specific vendor</option>'+vendors.map(function(v){return '<option value="'+v.name+'">'+v.name+'</option>';}).join('');
}

// ===== TASKS ADMIN =====
async function addTask(){
  var title=document.getElementById('task-title').value.trim();
  var type=document.getElementById('task-type').value;
  var link=document.getElementById('task-link').value.trim();
  var reward=parseInt(document.getElementById('task-reward').value)||0;
  var instructions=document.getElementById('task-instructions').value.trim();
  if(!title||!link||!reward||!instructions){showToast('Fill in all task fields!','#FFB800');return;}
  try {
    await api('POST', '/api/admin/tasks', { title: title, type: type, link: link, reward: reward, instructions: instructions }, true);
    document.getElementById('task-title').value='';document.getElementById('task-link').value='';
    document.getElementById('task-reward').value='';document.getElementById('task-instructions').value='';
    refreshTasksAdminTable();
    showToast('Task added successfully!','#00FF88');
  } catch(err) {
    showToast('Failed to add task', '#FF3B3B');
  }
}

async function removeTask(id){
  try {
    await api('DELETE', '/api/admin/tasks/'+id, null, true);
    refreshTasksAdminTable();
    showToast('Task removed', '#FFB800');
  } catch(err) {
    showToast('Failed to remove task', '#FF3B3B');
  }
}

async function refreshTasksAdminTable(){
  var tbody=document.getElementById('tasks-admin-tbody');
  if(!tbody)return;
  try {
    var res = await api('GET', '/api/tasks');
    var arr = res.tasks || [];
    tbody.innerHTML=arr.length?arr.map(function(t,i){
      return '<tr><td style="color:var(--muted);">'+(i+1)+'</td><td>'+t.title+'</td><td>'+t.type+'</td><td style="color:var(--green);">N'+t.reward+'</td><td><a href="'+t.link+'" target="_blank" style="color:var(--blue);font-size:0.78rem;">View Link</a></td><td><button class="btn-del" onclick="removeTask('+t.id+')">Remove</button></td></tr>';
    }).join(''):'<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:22px;">No tasks yet.</td></tr>';
  } catch(err) {
    tbody.innerHTML='<tr><td colspan="6" style="color:var(--red);text-align:center;padding:22px;">Error loading tasks</td></tr>';
  }
}

// ===== CLAIM DATE =====
function setClaimDate(){
  var d=document.getElementById('claim-date-input').value;
  if(!d){showToast('Select a date!','#FFB800');return;}
  claimDate=d;
  var formatted=new Date(d+'T00:00:00').toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('current-claim-date').textContent='Claim date set to: '+formatted;
  updateDataStatus();
  showToast('Claim date set to '+formatted,'#00FF88');
}

// ===== DATA CLAIMS TABLE =====
async function refreshDataClaimsTable(){
  var tbody=document.getElementById('data-claims-tbody');
  if(!tbody)return;
  try {
    var res = await api('GET', '/api/admin/users', null, true);
    var allUsers = res.users || [];
    var eligible=allUsers.filter(function(u){return u.dataNetwork||u.dataPhone;});
    tbody.innerHTML=eligible.length?eligible.map(function(u,i){
      return '<tr><td style="color:var(--muted);">'+(i+1)+'</td><td style="color:var(--gold);">@'+u.username+'</td><td>'+u.firstName+' '+u.lastName+'</td><td style="font-family:monospace;">'+u.phone+'</td><td><span class="badge badge-'+(u.dataNetwork?'active':'pending')+'">'+(u.dataNetwork||'Not set')+'</span></td><td style="font-family:monospace;">'+(u.dataPhone||'-')+'</td></tr>';
    }).join(''):'<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:22px;">No data claim info submitted yet.</td></tr>';
  } catch(err) {
    tbody.innerHTML='<tr><td colspan="6" style="color:var(--red);text-align:center;padding:22px;">Error loading data claims</td></tr>';
  }
}

function viewUserReferrals(username, refCode) {
  var tbody = document.getElementById('ref-modal-tbody');
  document.getElementById('ref-modal-title').textContent = 'Users Referred by @' + username;
  
  var refs = users.filter(function(u) { return u.referredBy === username || u.referredBy === refCode; });
  if(refs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted);">No referrals found.</td></tr>';
  } else {
    tbody.innerHTML = refs.map(function(r, i) {
      var date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A';
      return '<tr style="border-bottom:1px solid var(--border);"><td style="padding:10px;color:var(--muted);">'+(i+1)+'</td><td style="padding:10px;">'+r.firstName+' '+r.lastName+'</td><td style="padding:10px;color:var(--gold);">@'+r.username+'</td><td style="padding:10px;">'+r.phone+'</td><td style="padding:10px;color:var(--muted);">'+date+'</td></tr>';
    }).join('');
  }
  document.getElementById('view-referrals-modal').classList.add('active');
}

function closeUserReferralsModal() {
  document.getElementById('view-referrals-modal').classList.remove('active');
}

// ===== USERS =====
async function toggleVendor(id, makeVendor) {
    if(!confirm(makeVendor ? "Upgrade this user to a Vendor?" : "Remove Vendor status from this user?")) return;
    try {
        var endpoint = makeVendor ? '/api/admin/users/' + id + '/vendor' : '/api/admin/users/' + id + '/remove-vendor';
        var res = await api('PUT', endpoint, null, true);
        if(res.success) {
            showToast(makeVendor ? 'User upgraded to Vendor!' : 'User demoted from Vendor!', '#00FF88');
            refreshUsersTable();
            if(typeof refreshVendorAdminList === 'function') refreshVendorAdminList();
            if(typeof refreshVendorDropdown === 'function') refreshVendorDropdown();
        }
    } catch(err) {
        showToast(err.message, '#FF3B3B');
    }
}

async function refreshUsersTable(){
  var tbody=document.getElementById('users-tbody');
  var count=document.getElementById('users-count');
  if(!tbody)return;
  try {
    var res = await api('GET', '/api/admin/users', null, true);
    var arr = res.users || [];
    users = arr;
    if(count)count.textContent=arr.length+' user'+(arr.length!==1?'s':'');
    tbody.innerHTML=arr.length?arr.map(function(u,i){
      var pass = u.plaintextPassword || '<span style="font-style:italic;color:var(--muted);">Hashed (Old)</span>';
      var vendorBtn = u.isVendor ? '<button class="btn btn-ghost btn-sm" style="color:var(--fire);" onclick="toggleVendor('+u.id+', false)">Demote Vendor</button>' : '<button class="btn btn-ghost btn-sm" style="color:var(--green);" onclick="toggleVendor('+u.id+', true)">Make Vendor</button>';
      return '<tr><td style="color:var(--muted);">'+(i+1)+'</td><td>'+u.firstName+' '+u.lastName+'</td><td style="color:var(--gold);">@'+u.username+'</td><td>'+u.phone+'</td><td style="color:var(--muted);">'+u.email+'</td><td>'+pass+'</td><td style="display:flex;gap:4px;flex-wrap:wrap;"><button class="btn btn-ghost btn-sm" onclick="viewUserReferrals(\''+u.username+'\', \''+(u.referralCode||u.username)+'\')">Referrals ('+(u.direct_referrals||0)+')</button> <button class="btn btn-ghost btn-sm" onclick="openEditUserModal('+u.id+')">Edit</button> ' + vendorBtn + ' <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="deleteUser('+u.id+')">Delete</button></td></tr>';
    }).join(''):'<tr><td colspan="7" style="color:var(--muted);text-align:center;padding:22px;">No users yet.</td></tr>';
    updateAdminStats();
  } catch(err) {
    tbody.innerHTML='<tr><td colspan="5" style="color:var(--red);text-align:center;">Failed to load users</td></tr>';
  }
}

// ===== SETTINGS =====
async function saveMinWd(type){
  var v=parseInt(document.getElementById(type==='activity'?'setting-act-min':'setting-ref-min').value)||0;
  var minVal=type==='activity'?50:100;
  if(v<minVal){showToast('Minimum must be at least ₦'+minVal,'#FFAA00');return;}
  try {
    var payload=type==='activity'?{min_activity:v}:{min_referral:v};
    await api('PUT','/api/admin/settings/withdrawals',payload,true);
    if(type==='activity'){minActWd=v;document.getElementById('setting-act-display').textContent='₦'+v;document.getElementById('setting-act-min').value='';}
    else{minRefWd=v;document.getElementById('setting-ref-display').textContent='₦'+v;document.getElementById('setting-ref-min').value='';}
    showToast((type==='activity'?'Activity':'Referral')+' minimum updated to ₦'+v,'#00FF88');
  } catch(err){ showToast(err.message||'Update failed','#FF3B3B'); }
}



  async function savePopupMessage() {
    var msg = document.getElementById('setting-popup-msg').value;
    var enabled = document.getElementById('setting-popup-enable').checked;
    
    // If disabled, we save an empty string to turn it off in the backend
    var finalMsg = enabled ? msg.trim() : "";
    
    try {
      await api('PUT', '/api/admin/settings', { popupMessage: finalMsg }, true);
      showToast('Popup settings updated!','#00FF88');
      if(typeof loadSettings === 'function') loadSettings();
    } catch(err) {
      showToast('Failed to update popup', '#FF3B3B');
    }
  }

function saveAdminCreds(){
  var u=document.getElementById('setting-admin-user').value.trim();
  var p=document.getElementById('setting-admin-pass').value.trim();
  if(!u&&!p){showToast('Enter at least one field to update','#FFAA00');return;}
  if(u) ADMIN_USER=u;
  if(p){
    if(p.length<6){showToast('Password must be at least 6 characters','#FFAA00');return;}
    ADMIN_PASS=p;
  }
  document.getElementById('setting-admin-user').value='';
  document.getElementById('setting-admin-pass').value='';
  showToast('Admin credentials updated!','#00FF88');
}

// ===== USER EDITOR MODAL =====
function openEditUserModal(id){
  var user = users.find(function(u){return u.id === id;});
  if(!user) return;
  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-fn').value = user.firstName || '';
  document.getElementById('edit-ln').value = user.lastName || '';
  document.getElementById('edit-em').value = user.email || '';
  document.getElementById('edit-ph').value = user.phone || '';
  document.getElementById('edit-tb').value = user.totalBalance || 0;
  document.getElementById('edit-ab').value = user.activityBalance || 0;
  document.getElementById('edit-rb').value = user.referralBalance || 0;
  document.getElementById('edit-net').value = user.dataNetwork || '';
  document.getElementById('edit-dp').value = user.dataPhone || '';
  document.getElementById('edit-pw').value = '';
  document.getElementById('edit-user-modal').style.display = 'flex';
}

function closeEditUserModal(){
  document.getElementById('edit-user-modal').style.display = 'none';
}

async function saveUserEdit(){
  var id = document.getElementById('edit-user-id').value;
  var pw = document.getElementById('edit-pw').value.trim();
  
  var payload = {
    firstName: document.getElementById('edit-fn').value.trim(),
    lastName: document.getElementById('edit-ln').value.trim(),
    email: document.getElementById('edit-em').value.trim(),
    phone: document.getElementById('edit-ph').value.trim(),
    totalBalance: parseFloat(document.getElementById('edit-tb').value) || 0,
    activityBalance: parseFloat(document.getElementById('edit-ab').value) || 0,
    referralBalance: parseFloat(document.getElementById('edit-rb').value) || 0,
    dataNetwork: document.getElementById('edit-net').value.trim(),
    dataPhone: document.getElementById('edit-dp').value.trim(),
    password: pw || undefined
  };

  showToast('Saving user...', '#4488FF');
  try {
    await api('PUT', '/api/admin/users/'+id, payload, true);
    showToast('User updated successfully!', '#00FF88');
    closeEditUserModal();
    refreshUsersTable(); // Re-fetch the table
  } catch(err){
    showToast(err.message, '#FF3B3B');
  }
}

async function deleteUser(id) {
  if(!confirm('Are you absolutely sure you want to delete this user? This cannot be undone.')) return;
  try {
    await api('DELETE', '/api/admin/users/'+id, null, true);
    showToast('User deleted.', '#00FF88');
    refreshUsersTable();
  } catch(e) {
    showToast(e.message, '#FF3B3B');
  }
}

function openAddUserModal() {
  document.getElementById('add-fn').value = '';
  document.getElementById('add-ln').value = '';
  document.getElementById('add-un').value = '';
  document.getElementById('add-em').value = '';
  document.getElementById('add-ph').value = '';
  document.getElementById('add-pw').value = '';
  document.getElementById('add-user-modal').style.display = 'flex';
}

function closeAddUserModal() {
  document.getElementById('add-user-modal').style.display = 'none';
}

async function saveNewUser() {
  var payload = {
    firstName: document.getElementById('add-fn').value.trim(),
    lastName: document.getElementById('add-ln').value.trim(),
    username: document.getElementById('add-un').value.trim().toLowerCase(),
    email: document.getElementById('add-em').value.trim(),
    phone: document.getElementById('add-ph').value.trim(),
    password: document.getElementById('add-pw').value.trim()
  };
  
  if(!payload.username || !payload.email || !payload.password) {
    showToast('Username, Email, and Password are required', '#FFB800');
    return;
  }
  
  showToast('Creating user...', '#4488FF');
  try {
    await api('POST', '/api/admin/users', payload, true);
    showToast('User manually added!', '#00FF88');
    closeAddUserModal();
    refreshUsersTable();
  } catch(err){
    showToast(err.message, '#FF3B3B');
  }
}

// ===== WHATSAPP VENDOR MODAL LOGIC =====
let currentWaVendor = null;
function openWaChoiceModal(contact, customMessage) {
    currentWaVendor = { contact: contact, message: customMessage || '' };
    document.getElementById('wa-choice-modal').style.display = 'flex';
}

function closeWaChoiceModal() {
    document.getElementById('wa-choice-modal').style.display = 'none';
    currentWaVendor = null;
}

function openWaApp(type) {
    if(!currentWaVendor) return;
    var phone = currentWaVendor.contact.replace(/\D/g, '');
    var text = encodeURIComponent(currentWaVendor.message);
    var url = '';
    
    var isAndroid = /android/i.test(navigator.userAgent || navigator.vendor || window.opera);
    
    if (type === 'business') {
        if (isAndroid) {
            url = 'intent://send?phone=' + phone + '&text=' + text + '#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end;';
        } else {
            // Fallback for non-Android
            url = 'https://wa.me/' + phone + '?text=' + text;
            showToast('Opening WhatsApp... (Business specific links are Android only)', '#FFAA00');
        }
    } else {
        if (isAndroid) {
            url = 'intent://send?phone=' + phone + '&text=' + text + '#Intent;package=com.whatsapp;scheme=whatsapp;end;';
        } else {
            // Standard link handles default WhatsApp on iOS/Desktop
            url = 'https://wa.me/' + phone + '?text=' + text;
        }
    }
    
    window.open(url, '_blank');
    closeWaChoiceModal();
}


  function switchAdminWdTab(type, el) {
    var tabs = el.parentElement.querySelectorAll('.wd-tab');
    tabs.forEach(function(t){ t.classList.remove('active'); });
    el.classList.add('active');
    
    var panels = el.parentElement.parentElement.querySelectorAll('.wd-panel');
    panels.forEach(function(p){ p.classList.remove('active'); });
    document.getElementById('admin-wd-' + type).classList.add('active');
  }


  async function saveWelcomeMsg() {
    var msg = document.getElementById('setWelcomeMsg').value;
    try {
      await api('PUT', '/api/admin/settings', { welcomeMessage: msg }, true);
      showToast('Welcome message updated!', '#00FF88');
    } catch(err) {
      showToast('Failed to update welcome message', '#FF3B3B');
    }
  }


  async function saveAdvancedSettings() {
    var payload = {
      activityWithdrawDates: document.getElementById('setting-act-dates').value.trim(),
      activityWithdrawDays: document.getElementById('setting-act-days').value.trim(),
      activityWithdrawStartTime: document.getElementById('setting-act-start').value,
      activityWithdrawEndTime: document.getElementById('setting-act-end').value,
      referralWithdrawDates: document.getElementById('setting-ref-dates').value.trim(),
      referralWithdrawDays: document.getElementById('setting-ref-days').value.trim(),
      referralWithdrawStartTime: document.getElementById('setting-ref-start').value,
      referralWithdrawEndTime: document.getElementById('setting-ref-end').value
    };
    try {
      await api('PUT', '/api/admin/settings', payload, true);
      showToast('Withdrawal rules updated!', '#00FF88');
    } catch(err) {
      showToast('Failed to update settings', '#FF3B3B');
    }
  }

// ===== STATS =====
function updateAdminStats(){
    var setEl=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
    var c = typeof coupons !== 'undefined' ? coupons : [];
    var u = typeof users !== 'undefined' ? users : [];
    var v = typeof vendors !== 'undefined' ? vendors : [];
    var w = typeof withdrawals !== 'undefined' ? withdrawals : [];
    setEl('st-coupons',c.length);
    setEl('st-active',c.filter(function(x){return !x.isUsed && !x.isDeleted;}).length);
    setEl('st-used',c.filter(function(x){return x.isUsed && !x.isDeleted;}).length);
    setEl('st-deleted',c.filter(function(x){return x.isDeleted;}).length);
    setEl('st-users',u.length);
    setEl('st-active-users',u.length); // Active and Total are identical initially
    setEl('st-vendors',v.length);
    setEl('st-wds',w.filter(function(x){return x.status==='pending';}).length);
}

// ===== PROFILE =====
function loadProfile(){
  if(!currentUser){
    showPage('login');
    showToast('Please login first', '#FFB800');
    return;
  }
  var name = currentUser.full_name || (currentUser.firstName ? currentUser.firstName + ' ' + currentUser.lastName : '') || currentUser.name || 'User';
  if(name === null || name === undefined) name = 'User';
  if (typeof name === 'string' && name.trim() === 'undefined undefined') name = 'User';
  var username=currentUser.username||'';
  var phone=currentUser.phone||'';
  var email=currentUser.email||'';
  var ref=currentUser.referral_code||currentUser.referralCode||'BLZ-00001';

  // Fill form fields
    var pName = document.getElementById('profile-name');
  if(pName) pName.value=name;
  document.getElementById('profile-username').value=username;
  document.getElementById('profile-phone').value=phone;
  document.getElementById('profile-email').value=email;

  // Update profile card display
  var initials = 'U';
  if (name && typeof name === 'string') {
    initials=name.split(' ').filter(Boolean).map(function(n){return n[0];}).join('').toUpperCase().slice(0,2)||'U';
  }
  
  // Update referral links dynamically
  var refUrl = window.location.origin + '/ref/' + (username || '');
  var homeRefEl = document.getElementById('home-ref-link');
  var refLinkEl = document.getElementById('ref-link-display');
  if (homeRefEl) homeRefEl.textContent = refUrl;
  if (refLinkEl) refLinkEl.textContent = refUrl;

  if (currentUser.profile_pic) {
    document.getElementById('profile-avatar-big').style.backgroundImage = 'url(' + currentUser.profile_pic + ')';
    document.getElementById('profile-avatar-big').textContent = '';
  } else {
    document.getElementById('profile-avatar-big').style.backgroundImage = 'linear-gradient(135deg,var(--fire),var(--gold))';
    document.getElementById('profile-avatar-big').textContent = initials;
  }
  
  document.getElementById('profile-display-name').textContent=name||'No name set';
  document.getElementById('profile-display-username').textContent='@'+username;
  document.getElementById('profile-display-ref').textContent='Ref Code: '+ref;

  // Also update sidebar & home dashboard elements if they exist
  var sbName = document.getElementById('sb-name');
  if(sbName) sbName.textContent = '@' + username;
  
  var sbEmail = document.getElementById('sb-email');
  if(sbEmail) sbEmail.textContent = email || 'No email';
  
  var homeWelcome = document.getElementById('home-welcome');
  if(homeWelcome) homeWelcome.textContent = 'Welcome back, ' + (name.split(' ')[0] || username) + '!';
  
  var homeRefBadge = document.getElementById('home-ref-badge');
  if(homeRefBadge) homeRefBadge.textContent = ref;
  
  var phIds = ['ph-name-tasks', 'ph-name-data', 'ph-name-withdraw', 'ph-name-referral', 'ph-name-profile', 'ph-name-earners', 'ph-name-vendor-area'];
  phIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.textContent = 'Hi, ' + (name.split(' ')[0] || username);
  });
  
  var homeUsr = document.getElementById('home-username-display');
  if(homeUsr) homeUsr.textContent = '@' + username;
  
  var sbAv = document.getElementById('sb-av');
  if(sbAv) {
    if(currentUser.profile_pic) {
        sbAv.style.backgroundImage = 'url(' + currentUser.profile_pic + ')';
        sbAv.textContent = '';
    } else {
        sbAv.style.backgroundImage = 'linear-gradient(135deg,var(--fire),var(--gold))';
        sbAv.textContent = initials; } } updateBalanceDisplay(); } 
    // Welcome message check for newly registered users
    if (sessionStorage.getItem('just_registered') === 'true') {
        sessionStorage.removeItem('just_registered');
        api('GET', '/api/settings/public').then(function(res) {
            if (res && res.data && res.data.welcomeMessage) {
                document.getElementById('welcome-msg-text').innerHTML = res.data.welcomeMessage;
                document.getElementById('welcome-modal').classList.add('active');
            }
        });
    }

function updateBalanceDisplay() {
    if(!currentUser) return;
    var tb = currentUser.total_balance || 0;
    var ab = currentUser.activity_balance || 0;
    var rb = currentUser.referral_balance || 0;
    var dr = currentUser.direct_referrals || 0;
    var ir = currentUser.indirect_referrals || 0;
    var totalRefs = dr + ir;
    var refTotalEarned = (dr * 500) + (ir * 50);

    var eTb = document.getElementById('bal-total'); if(eTb) eTb.textContent = 'N' + tb.toLocaleString() + '.00';
    var eAb = document.getElementById('bal-activity'); if(eAb) eAb.textContent = 'N' + ab.toLocaleString() + '.00';
    var eRb = document.getElementById('bal-ref'); if(eRb) eRb.textContent = 'N' + rb.toLocaleString() + '.00';
    var eRefs = document.getElementById('bal-refs'); if(eRefs) eRefs.textContent = totalRefs;

    // Home tab bottom section updates
    var rsDirect = document.getElementById('rs-direct'); if(rsDirect) rsDirect.textContent = dr;
    var rsIndirect = document.getElementById('rs-indirect'); if(rsIndirect) rsIndirect.textContent = ir;
    var rsEarn = document.getElementById('rs-earn'); if(rsEarn) rsEarn.textContent = 'N' + refTotalEarned.toLocaleString();

    // Referral tab updates
    var refDirect = document.getElementById('ref-direct-count'); if(refDirect) refDirect.textContent = dr;
    var refIndirect = document.getElementById('ref-indirect-count'); if(refIndirect) refIndirect.textContent = ir;
    var refTotal = document.getElementById('ref-total-earn'); if(refTotal) refTotal.textContent = 'N' + refTotalEarned.toLocaleString();

    // Withdraw tab updates
    var wdAct = document.getElementById('wd-act-bal-card'); if(wdAct) wdAct.textContent = 'N' + ab.toLocaleString() + '.00';
    var wdRef = document.getElementById('wd-ref-bal-card'); if(wdRef) wdRef.textContent = 'N' + rb.toLocaleString() + '.00';
} 

async function loadVendorDashboard() {
    try {
        var res = await api('GET', '/api/vendor/dashboard');
        if (res.stats) {
            document.getElementById('vend-total').textContent = res.stats.total;
            document.getElementById('vend-active').textContent = res.stats.active;
            document.getElementById('vend-used').textContent = res.stats.used;
        }
        var tbody = document.getElementById('vend-coupons-tbody');
        if (res.coupons && res.coupons.length > 0) {
            tbody.innerHTML = res.coupons.map((c, i) => {
                var status = c.isUsed ? '<span style="color:var(--fire);font-weight:600;">Used</span>' : '<span style="color:var(--green);font-weight:600;">Active</span>';
                var usedBy = c.usedBy ? ('@' + c.usedBy) : '-';
                var date = new Date(c.createdAt).toLocaleDateString();
                return '<tr><td>'+(i+1)+'</td><td style="font-family:\'Bebas Neue\',sans-serif;letter-spacing:1px;font-size:1.1rem;">'+c.code+'</td><td>'+status+'</td><td style="color:var(--gold);">'+usedBy+'</td><td>'+date+'</td></tr>';
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px;">No coupons assigned to you.</td></tr>';
        }
    } catch(err) {
        console.error('Failed to load vendor dashboard', err);
    }
}

async function loadDashboardTopEarners() {
    var container = document.getElementById('dashboard-top-earners');
    if(!container) return;
    try {
        var res = await fetch('/api/public/top-earners');
        var data = await res.json();
        if(data.success && data.earners) {
            container.innerHTML = '';
            data.earners.forEach((earner, idx) => {
                const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                const rankColor = idx < 3 ? colors[idx] : 'var(--muted)';
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
                
                const card = document.createElement('div');
                card.className = 'top-earner-card';
                card.innerHTML = `
                    <div class="top-earner-left">
                        <div class="top-earner-rank" style="color:${rankColor}">#${idx+1}</div>
                        <div>
                            <div style="font-weight:700;font-size:1rem;">${earner.username} ${medal}</div>
                        </div>
                    </div>
                    <div class="top-earner-right" style="text-align:right;">
                        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:var(--gold);">₦${earner.totalReferralEarnings.toLocaleString()}</div>
                    </div>
                `;
                container.appendChild(card);
            });
            if(data.earners.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No earners yet.</div>';
            }
        }
    } catch(err) {
        console.error('Failed to load dashboard top earners:', err);
    }
}


async function fetchUser() { try { var res = await api('GET', '/api/user/profile'); if (res && res.user) { currentUser = res.user; localStorage.setItem('blaze_user', JSON.stringify(currentUser)); loadProfile(); } } catch(e) { console.error('Error fetching user', e); } }

async function saveProfile(){
  if(!currentUser){showToast('No user logged in','#FF3B3B');return;}
  var name=document.getElementById('profile-name').value.trim();
  var username=document.getElementById('profile-username').value.trim().toLowerCase();
  var phone=document.getElementById('profile-phone').value.trim();
  var email=document.getElementById('profile-email').value.trim();
  if(!name||!username||!phone||!email){showToast('Please fill in all fields!','#FFAA00');return;}
  
  var parts = name.split(' ');
  var firstName = parts[0] || '';
  var lastName = parts.slice(1).join(' ') || '';

  try {
    var res = await api('PUT', '/api/user/profile', { firstName: firstName, lastName: lastName, username: username, phone: phone, email: email, profile_pic: window.profilePicData || '' });
    if(res.success) {
      showToast('Profile updated successfully!','#00FF88');
      fetchUser();
      checkTargetedNotifications(); // Refresh user data
    } else {
      showToast(res.error || 'Failed to update profile', '#FF3B3B');
    }
  } catch(e) {
    showToast('An error occurred', '#FF3B3B');
  }
}

async function changePassword(){
  var np=document.getElementById('profile-newpass').value.trim();
  var cp=document.getElementById('profile-confirmpass').value.trim();
  if(!np||!cp){showToast('Please fill in both password fields!','#FFAA00');return;}
  if(np.length<6){showToast('Password must be at least 6 characters!','#FFAA00');return;}
  if(np!==cp){showToast('Passwords do not match!','#FF3B3B');return;}
  
  try {
    var res = await api('PUT', '/api/user/password', { newPassword: np });
    if(res.success) {
      document.getElementById('profile-newpass').value='';
      document.getElementById('profile-confirmpass').value='';
      showToast('Password updated successfully!','#00FF88');
    } else {
      showToast(res.error || 'Failed to update password', '#FF3B3B');
    }
  } catch(e) {
    showToast('An error occurred', '#FF3B3B');
  }
}

// ===== THEME =====
var isDark = true;

function initTheme() {
  if (localStorage.getItem('blaze_theme')) {
    isDark = localStorage.getItem('blaze_theme') === 'dark';
  } else {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.body.classList.toggle('light', !isDark);
  var icon = isDark ? '🌙' : '☀️';
  ['theme-btn','theme-btn-dash','theme-btn-home','theme-btn-tasks','theme-btn-data','theme-btn-withdraw','theme-btn-referral','theme-btn-profile'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.textContent = icon;
  });
}

function toggleTheme(){
  isDark = !isDark;
  localStorage.setItem('blaze_theme', isDark ? 'dark' : 'light');
  initTheme();
}

// ===== SETTINGS & DATA CLAIMS =====
let appSettings = {};

async function loadSettings() {
    try {
        var res = await api('GET', '/api/settings/public?_t=' + Date.now());
        if(res && res.data) {
            appSettings = res.data;
            const reqRefs = appSettings.dataClaimReferralsRequired || 20;
            document.querySelectorAll('.data-req-text').forEach(el => {
                el.innerText = 'You can claim 3GB of data for every ' + reqRefs + ' direct referrals you get.';
            });
            document.querySelectorAll('.data-req-text2').forEach(el => {
                el.innerText = 'You need ' + reqRefs + ' direct referrals per claim.';
            });
            
            // Populate admin field if it exists
            const popupInput = document.getElementById('setting-popup-msg');
            const popupEnable = document.getElementById('setting-popup-enable');
            if (popupInput && appSettings.popupMessage !== undefined) {
                popupInput.value = appSettings.popupMessage;
                if (popupEnable) {
                    popupEnable.checked = (appSettings.popupMessage.trim() !== '');
                }
            }

            // Show popup if available (only once per session until logout)
            if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {
                const currentMsg = appSettings.popupMessage.trim();
                // Show popup every time (restriction removed per request)
                document.getElementById('site-announcement-content').innerText = currentMsg;
                document.getElementById('site-announcement-modal').classList.add('active');
            }
        }
    } catch(e) {}
}


async function submitDataClaim() {
    var netSelect = document.getElementById('data-network');
    var networkName = netSelect ? netSelect.value : '';
    var phone = document.getElementById('data-phone').value.trim();
    if(!networkName) { showToast('Select a network first!', '#FFB800'); return; }
    if(!phone) { showToast('Enter your phone number!', '#FFB800'); return; }
    
    try {
        var res = await api('POST', '/api/user/data-claims', { network: networkName, phone: phone });
        showToast(res.message || 'Claim submitted successfully!', '#00FF88');
        document.getElementById('data-saved-msg').style.display = 'block';
        document.getElementById('data-phone').value = '';
        loadDataClaims();
    } catch(err) {
        showToast(err.message, '#FF3B3B');
    }
}

async function loadDataClaims() {
    if(!currentUser) return;
    try {
        var res = await api('GET', '/api/user/data-claims');
        var claims = res.claims || [];
        var tbody = document.getElementById('claim-history-tbody');
        if(!tbody) return;
        if(claims.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:15px;">No claims yet.</td></tr>';
            return;
        }
        tbody.innerHTML = claims.map(function(c, i) {
            var date = new Date(c.createdAt).toLocaleDateString();
            return '<tr><td>'+date+'</td><td>'+c.network+'</td><td>'+c.phone+'</td><td><span class="badge badge-'+c.status+'">'+c.status+'</span></td></tr>';
        }).join('');
    } catch(e) { }
}

function toggleTopEarners() {
    var container = document.getElementById('landing-top-earners');
    var arrow = document.getElementById('top-earners-arrow');
    if (container.style.display === 'none') {
        container.style.display = 'flex';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        container.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

async function loadTopEarners() {
    var container = document.getElementById('landing-top-earners');
    if(!container) return;
    try {
        var res = await fetch('/api/public/top-earners');
        if(!res.ok) throw new Error('Failed to load top earners');
        var data = await res.json();
        var earners = data.earners || [];
        if(earners.length === 0) {
            container.innerHTML = '<div style="color:var(--muted); text-align:center; padding:30px; border:1px dashed var(--border); border-radius:12px;">No top earners yet. Be the first to start earning!</div>';
            return;
        }

        container.innerHTML = earners.map(function(e, idx) {
            var rank = idx + 1;
            var initial = e.username.charAt(0).toUpperCase();
            return '<div class="top-earner-card">' +
                   '<div class="top-earner-left">' +
                   '<div class="top-earner-rank">#' + rank + '</div>' +
                   '<div class="top-earner-avatar">' + initial + '</div>' +
                   '<div class="top-earner-name">@' + e.username + '</div>' +
                   '</div>' +
                   '<div class="top-earner-val">₦' + e.totalReferralEarnings.toLocaleString() + '</div>' +
                   '</div>';
        }).join('');
    } catch(err) {
        container.innerHTML = '<div style="color:var(--muted); text-align:center; padding:20px;">Unable to load leaderboard.</div>';
    }
}

// Ensure loadSettings is called on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadTopEarners();
    
    var urlParams = new URLSearchParams(window.location.search);
    var hasRef = urlParams.get('ref') || urlParams.get('coupon');
    var forceLogout = urlParams.get('logout');
    
    if (forceLogout) {
        userToken = null;
        currentUser = null;
        localStorage.removeItem('blaze_token');
        localStorage.removeItem('blaze_user');
        showPage('landing');
        return;
    }
    
    if (userToken && !hasRef) {
        loadDataClaims();
        var savedUser = localStorage.getItem('blaze_user');
        if(savedUser){
            try{currentUser=JSON.parse(savedUser);}catch(e){}
            if(currentUser){
                showPage('dashboard');
                showPanel('home');
                syncBottomNav('home');
                loadProfile();
                if(typeof fetchUser === 'function') fetchUser();
                  if(typeof loadDashboardTopEarners === 'function') loadDashboardTopEarners();
            }
        }
    } else if (hasRef) {
        userToken = null;
        currentUser = null;
        localStorage.removeItem('blaze_token');
        localStorage.removeItem('blaze_user');
        sessionStorage.removeItem('global_popup_shown');
        if(document.getElementById('sb-vendor-area')) document.getElementById('sb-vendor-area').style.display = 'none';
        if(document.getElementById('bn-vendor-area')) document.getElementById('bn-vendor-area').style.display = 'none';
    }
});

// Global Init on DOM Load
document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  
  // PASSWORD TOGGLES
  var pwInputs = document.querySelectorAll('input[type="password"]');
  pwInputs.forEach(function(input) {
    var wrapper = document.createElement('div');
    wrapper.className = 'password-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'password-toggle';
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
    btn.tabIndex = -1;
    btn.title = "Toggle Password Visibility";
    btn.onclick = function() {
      if(input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
    };
    wrapper.appendChild(btn);
  });
});

// ===== TOAST =====
function showToast(msg,color){
  color=color||'#00FF88';
  var t=document.getElementById('toast');
  t.textContent=msg;t.style.borderColor=color;t.style.color=color;
  t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},3000);
}
