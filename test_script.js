
// ===== API CONFIG =====
// Change this URL to your deployed backend URL when you go live
// Dynamically route API traffic so mobile devices don't try to connect to their own 'localhost'
var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.match(/^(192|10)\./);
var API_BASE_URL = isLocal ? window.location.protocol + '//' + window.location.hostname + ':3000' : '';

window.addEventListener('DOMContentLoaded', async function(){
  loadVendors();
  if (window.location.pathname.startsWith('/admin')) {
    showPage('adminlogin');
  }
  // Check for Referral Link in URL
  var urlParams = new URLSearchParams(window.location.search);
  var refParam = urlParams.get('ref');
  if(refParam) {
    // Switch to Register Form automatically
    showPage('register');
    var refInput = document.getElementById('reg-ref');
    if(refInput) {
      refInput.value = refParam;
      refInput.readOnly = true; // Lock it if it came from the link
      refInput.style.backgroundColor = 'rgba(255,170,0,0.1)';
      refInput.style.borderColor = 'var(--gold)';
      refInput.style.color = 'var(--gold)';
    }
  }
});

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
        'Bypass-Tunnel-Reminder': 'true',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      }
    };
    if (data) opts.body = JSON.stringify(data);
    var res = await fetch(API_BASE_URL + endpoint, opts);
    var text = await res.text();
    var json;
    try {
      json = JSON.parse(text);
    } catch(err) {
      console.error("Tunnel intercept or bad response:", text);
      throw new Error("Server connection issue (Tunnel warning intercepted it). Please try again.");
    }
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  } catch(err) {
    throw err;
  }
}

// ===== STATE =====
var balance=200, actBalance=0, refBalance=0;
var minRefWd=900, minActWd=100;
var coupons=[], vendors=[], users=[], tasks=[], withdrawals=[];
var currentUser=null, claimDate='', dataDetails={network:'',phone:''};
var ADMIN_USER='admin', ADMIN_PASS='blaze2025';

// Tasks icons
var taskIcons={
  'WhatsApp Group':'💬','WhatsApp Channel':'📣',
  'Telegram Channel':'📢','Telegram Group':'📡',
  'Instagram':'📸','TikTok':'🎵','Facebook':'📘',
  'YouTube':'▶️','Twitter':'🐦'
};

// ===== PAGE ROUTING =====
function showPage(id){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  var bn = document.getElementById('bottom-nav');
  if(bn) {
    if(id === 'dashboard') bn.style.setProperty('display', 'flex', 'important');
    else bn.style.setProperty('display', 'none', 'important');
  }
}

// ===== DASHBOARD PANELS =====
function showPanel(name, el){
  document.querySelectorAll('#dashboard .panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.sidebar .sb-item').forEach(function(i){i.classList.remove('active');});
  document.getElementById('panel-'+name).classList.add('active');
  if(el && el.classList.contains('sb-item')) el.classList.add('active');
  syncBottomNav(name);
  window.scrollTo(0,0);
  if(name==='profile'){loadProfile();}
  if(name==='withdraw'){
    document.getElementById('wd-form').style.display='none';
    document.getElementById('wd-choose').style.display='block';
    document.getElementById('wd-act-bal-card').textContent='N'+actBalance.toLocaleString()+'.00';
    document.getElementById('wd-ref-bal-card').textContent='N'+refBalance.toLocaleString()+'.00';
    refreshWithdrawalTables();
  }
}

function syncBottomNav(name){
  var map={'home':'bn-home','tasks':'bn-tasks','data':'bn-data','withdraw':'bn-withdraw','referral':'bn-referral','profile':'bn-profile'};
  document.querySelectorAll('.bn-item').forEach(function(i){i.classList.remove('active');});
  if(map[name]){
    var el=document.getElementById(map[name]);
    if(el) el.classList.add('active');
  }
  // Also sync sidebar
  var sideMap={'home':0,'tasks':1,'data':2,'withdraw':3,'referral':4,'profile':5};
  var items=document.querySelectorAll('.sidebar .sb-item');
  items.forEach(function(i){i.classList.remove('active');});
  if(sideMap[name]!==undefined && items[sideMap[name]]){
    items[sideMap[name]].classList.add('active');
  }
}

function switchWdTab(tab, btn){
  document.querySelectorAll('.wd-tab').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('#panel-withdraw .wd-panel').forEach(function(p){p.classList.remove('active');});
  btn.classList.add('active');
  document.getElementById('wd-'+tab).classList.add('active');
}

// ===== ADMIN PANELS =====
function showAdminPanel(name, el){
  document.querySelectorAll('#admin .panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.admin-sidebar .sb-item').forEach(function(i){i.classList.remove('active');});
  document.getElementById('apanel-'+name).classList.add('active');
  if(el) el.classList.add('active');
  // Refresh settings display when opened
  if(name==='settings'){
    var actEl=document.getElementById('setting-act-display');
    var refEl=document.getElementById('setting-ref-display');
    if(actEl) actEl.textContent='N'+minActWd;
    if(refEl) refEl.textContent='N'+minRefWd;
  }
}

function switchAdminWdTab(tab, btn){
  document.querySelectorAll('#apanel-withdrawals .wd-tab').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('#apanel-withdrawals .wd-panel').forEach(function(p){p.classList.remove('active');});
  btn.classList.add('active');
  document.getElementById('admin-wd-'+tab).classList.add('active');
}

// Submit on Enter
var regInputs = ['reg-name', 'reg-username', 'reg-phone', 'reg-email', 'reg-coupon', 'reg-pass'];
regInputs.forEach(function(id) {
  var el = document.getElementById(id);
  if (el) {
    el.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleRegister();
    });
  }
});

var loginInputs = ['login-user', 'login-pass'];
loginInputs.forEach(function(id) {
  var el = document.getElementById(id);
  if (el) {
    el.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleLogin();
    });
  }
});

var adminInputs = ['admin-user', 'admin-pass'];
adminInputs.forEach(function(id) {
  var el = document.getElementById(id);
  if (el) {
    el.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleAdminLogin();
    });
  }
});

// ===== LOGIN =====
async function handleLogin(){
  var u=document.getElementById('login-user').value.trim();
  var p=document.getElementById('login-pass').value.trim();
  if(!u||!p){showToast('Fill in all fields','#FFB800');return;}
  showToast('Logging in...','#4488FF');
  try {
    var res = await api('POST','/api/auth/login',{username:u, password:p});
    userToken = res.token;
    localStorage.setItem('blaze_token', userToken);
    var user={name:res.user.full_name || res.user.firstName, username:res.user.username,
      phone:res.user.phone, email:res.user.email, refCode:res.user.referralCode || res.user.username, id:res.user.id,
      directCount: res.user.direct_referrals || 0, indirectCount: res.user.indirect_referrals || 0};
    loadUserDash(user);
    actBalance=res.user.activity_balance||0;
    refBalance=res.user.referral_balance||0;
    balance=res.user.total_balance||0;
    updateBalanceDisplay();
    if(res.user.data_network) dataDetails.network=res.user.data_network;
    if(res.user.data_phone) dataDetails.phone=res.user.data_phone;
    showPage('dashboard');
    showToast('Welcome back, '+user.name.split(' ')[0]+'!','#00FF88');
    // Load public settings
    loadPublicSettings();
    loadTasks();
    loadUserReferrals();
  } catch(err){
    showToast(err.message||'Login failed','#FF3B3B');
  }
}

function handleLogout() {
  localStorage.removeItem('blaze_token');
  userToken = null;
  currentUser = null;
  showPage('login');
  showToast('Logged out successfully', '#4488FF');
}

async function loadPublicSettings(){
  try {
    var res = await api('GET','/api/settings/public');
    var s = res.settings;
    if(s.min_activity_withdrawal) minActWd = parseFloat(s.min_activity_withdrawal);
    if(s.min_referral_withdrawal) minRefWd = parseFloat(s.min_referral_withdrawal);
    if(s.data_claim_date) { claimDate = s.data_claim_date; updateDataStatus(); }
  } catch(e){ console.log('Settings load failed', e); }
}

async function loadTasks(){
  try {
    var res = await api('GET','/api/tasks');
    tasks = res.tasks.map(function(t){ return {
      title:t.title, type:t.type, link:t.link, reward:t.reward,
      instructions:t.instructions, id:t.id,
      completedBy: t.completed ? [currentUser.username] : []
    };});
    renderTasks();
  } catch(e){ console.log('Tasks load failed', e); }
}

// ===== REGISTER =====
async function handleRegister(){
  var name=document.getElementById('reg-name').value.trim();
  var uname=document.getElementById('reg-username').value.trim().toLowerCase();
  var phone=document.getElementById('reg-phone').value.trim();
  var email=document.getElementById('reg-email').value.trim();
  var coupon=document.getElementById('reg-coupon').value.trim().toUpperCase();
  var pass=document.getElementById('reg-pass').value.trim();
  var refBy=document.getElementById('reg-ref').value.trim().toLowerCase();
  if(!name||!uname||!phone||!email||!coupon||!pass){showToast('Please fill in all fields!','#FFB800');return;}
  if(pass.length<6){showToast('Password must be at least 6 characters','#FFB800');return;}
  showToast('Creating your account...','#4488FF');
  try {
    var res = await api('POST','/api/auth/register',{
      full_name:name, username:uname, email:email, phone:phone,
      password:pass, coupon_code:coupon, referred_by:refBy||undefined
    });
    userToken = res.token;
    localStorage.setItem('blaze_token', userToken);
    var user={name:res.user.full_name || res.user.firstName, username:res.user.username, phone:res.user.phone,
      email:res.user.email, coupon:coupon, dataPhone:'', dataNetwork:'',
      refCode:res.user.referralCode || res.user.username, id:res.user.id,
      directCount: res.user.direct_referrals || 0, indirectCount: res.user.indirect_referrals || 0};
    loadUserDash(user);
    actBalance=res.user.activity_balance||200;
    refBalance=res.user.referral_balance||0;
    balance=res.user.total_balance||200;
    updateBalanceDisplay();
    showPage('dashboard');
    showToast('Account activated! Welcome to BlazeEarn!','#00FF88');
  } catch(err){
    showToast(err.message||'Registration failed','#FF3B3B');
  }
}

function loadUserDash(user){
  currentUser=user;
  balance=200; actBalance=0; refBalance=0;
  var initials=user.name.split(' ').map(function(n){return n[0];}).join('').toUpperCase().slice(0,2);
  document.getElementById('sb-av').textContent=initials;
  document.getElementById('sb-name').textContent='@'+user.username;
  document.getElementById('sb-ref').textContent='Ref: '+(user.refCode||'BLZ-00001');
  var baseUrl = window.location.origin + window.location.pathname;
  var fullRefLink = baseUrl + '?ref=' + (user.refCode||'BLZ-00001');
  document.getElementById('home-ref-link').textContent = fullRefLink;
  document.getElementById('ref-link-display').textContent = fullRefLink;
  
  var directEl = document.getElementById('rs-direct');
  var indirectEl = document.getElementById('rs-indirect');
  var refDirectCountEl = document.getElementById('ref-direct-count');
  var refIndirectCountEl = document.getElementById('ref-indirect-count');
  
  if (directEl) directEl.textContent = user.directCount || 0;
  if (indirectEl) indirectEl.textContent = user.indirectCount || 0;
  if (refDirectCountEl) refDirectCountEl.textContent = user.directCount || 0;
  if (refIndirectCountEl) refIndirectCountEl.textContent = user.indirectCount || 0;
  // Welcome header
  var firstName=user.name.split(' ')[0]||user.name;
  document.getElementById('home-av').textContent=initials;
  document.getElementById('home-welcome').textContent='Welcome, '+firstName+'!';
  document.getElementById('home-username-display').textContent='@'+user.username+' — '+new Date().toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long'});
  document.getElementById('home-ref-badge').textContent=(user.refCode||'BLZ-00001');
  // Panel mini headers
  var panels=['tasks','data','withdraw','referral','profile'];
  panels.forEach(function(p){
    var avEl=document.getElementById('ph-av-'+p);
    var nameEl=document.getElementById('ph-name-'+p);
    var unEl=document.getElementById('ph-uname-'+p);
    if(avEl)avEl.textContent=initials;
    if(nameEl)nameEl.textContent=user.name;
    if(unEl)unEl.textContent='@'+user.username;
  });
  updateBalanceDisplay();
  updateDataStatus();
  renderTasks();
  showPanel('home', document.querySelector('.sidebar .sb-item'));
}

function updateBalanceDisplay(){
  document.getElementById('bal-total').textContent='N'+balance.toLocaleString()+'.00';
  document.getElementById('bal-activity').textContent='N'+actBalance.toLocaleString()+'.00';
  document.getElementById('bal-ref').textContent='N'+refBalance.toLocaleString()+'.00';
  
  if (currentUser) {
    var totalRefs = (currentUser.directCount || 0) + (currentUser.indirectCount || 0);
    var balRefsEl = document.getElementById('bal-refs');
    if (balRefsEl) balRefsEl.textContent = totalRefs;
  }
  
  var rsEarnEl = document.getElementById('rs-earn');
  if (rsEarnEl) rsEarnEl.textContent = 'N' + refBalance.toLocaleString();
  
  var refTotalEarnEl = document.getElementById('ref-total-earn');
  if (refTotalEarnEl) refTotalEarnEl.textContent = 'N' + refBalance.toLocaleString();
}

// ===== DATA STATUS =====
function updateDataStatus(){
  var statusEl=document.getElementById('data-status-display');
  var homeStatusEl=document.getElementById('home-data-status');
  var claimEl=document.getElementById('claim-date-display');
  var homeClaimEl=document.getElementById('home-claim-date');
  if(claimDate){
    var formatted=new Date(claimDate+'T00:00:00').toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'});
    statusEl.innerHTML='<span class="badge badge-pending">📅 Claim Date: '+formatted+'</span>';
    homeStatusEl.textContent='📅 Claim Date Set';
    homeStatusEl.className='data-badge data-badge-pending';
    claimEl.textContent='Claim your 3GB data on or after '+formatted;
    homeClaimEl.innerHTML='Claim date: <span>'+formatted+'</span>';
    if(document.getElementById('claim-date-input'))document.getElementById('claim-date-input').value=claimDate;
    if(document.getElementById('current-claim-date'))document.getElementById('current-claim-date').textContent='Current claim date: '+formatted;
  } else {
    statusEl.innerHTML='<span class="badge badge-pending">🔒 Locked — Claim Date Not Yet Set</span>';
    homeStatusEl.textContent='🔒 Locked — Awaiting Claim Date';
    homeStatusEl.className='data-badge data-badge-locked';
    claimEl.textContent='';
    homeClaimEl.textContent='';
  }
}

async function saveDataDetails(){
  var net=document.getElementById('data-network').value;
  var ph=document.getElementById('data-phone').value.trim();
  
  if (currentUser && (currentUser.directCount || 0) < 20) {
      showToast('You need at least 20 direct referrals to claim data!', '#FFB800');
      return;
  }
  
  if(net) dataDetails.network=net;
  if(ph) dataDetails.phone=ph;
  if(net||ph){
    try {
      await api('PUT', '/api/user/data', { network: net, phone: ph });
      document.getElementById('data-saved-msg').style.display='block';
      if(currentUser){currentUser.dataNetwork=net;currentUser.dataPhone=ph;}
      refreshDataClaimsTable();
    } catch(err) {
      showToast(err.message || 'Failed to save data details', '#FF3B3B');
    }
  }
}

// ===== TASKS =====
function renderTasks(){
  var container=document.getElementById('tasks-container');
  if(!tasks.length){
    container.innerHTML='<div style="color:var(--muted);text-align:center;padding:48px 0;"><div style="font-size:2.5rem;margin-bottom:12px;">📋</div><div>No tasks available yet. Check back soon.</div></div>';
    return;
  }
  container.innerHTML=tasks.map(function(t,i){
    var ico=taskIcons[t.type]||'📌';
    var done=t.completedBy&&t.completedBy.indexOf(currentUser?currentUser.username:'')>-1;
    return '<div class="task-card">'+
      '<div class="task-head">'+
        '<div class="task-ico">'+ico+'</div>'+
        '<div class="task-info"><div class="task-title">'+t.title+'</div><div class="task-desc">'+t.type+'</div></div>'+
        '<div class="task-earn">+N'+t.reward+'</div>'+
      '</div>'+
      '<div class="task-body">'+
        '<div class="task-instructions">📌 Instructions: '+t.instructions+'</div>'+
        '<div class="task-actions">'+
          '<a href="'+t.link+'" target="_blank" class="btn-link">🔗 Open Task Link</a>'+
          (done?'<button class="btn-done completed" disabled>✅ Completed</button>':
            '<button class="btn-done" onclick="completeTask('+i+',this)">I\'ve Done This — Earn N'+t.reward+'</button>')+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

async function completeTask(idx, btn){
  var task=tasks[idx];
  if(!task||!currentUser)return;
  btn.disabled=true; btn.textContent='Verifying...';
  try {
    var res = await api('POST','/api/tasks/'+task.id+'/complete');
    task.completedBy=[currentUser.username];
    actBalance=res.new_activity_balance||actBalance+task.reward;
    balance=res.new_total_balance||balance+task.reward;
    updateBalanceDisplay();
    btn.textContent='✅ Completed';
    btn.className='btn-done completed';
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
      var actTbody=document.getElementById('act-wd-tbody');
      var refTbody=document.getElementById('ref-wd-tbody');
      if(actTbody)actTbody.innerHTML=actWds.length?wdHtml(actWds,false):'<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:22px;">No withdrawals yet.</td></tr>';
      if(refTbody)refTbody.innerHTML=refWds.length?wdHtml(refWds,false):'<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:22px;">No withdrawals yet.</td></tr>';
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
    showToast('Withdrawal approved!','#00FF88');
  } catch(err) {
    showToast('Failed to approve withdrawal', '#FF3B3B');
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
    updateAdminStats();refreshCouponsTable();refreshVendorAdminList();refreshUsersTable();refreshVendorDropdown();refreshTasksAdminTable();refreshDataClaimsTable();refreshWithdrawalTables();
    showPage('admin');
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
    await api('POST', '/api/admin/coupons', {count: count}, true);
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

// ===== VENDORS =====
async function loadVendors() {
  try {
    var res = await api('GET', '/api/vendors');
    vendors = res.vendors || [];
    refreshPublicVendors();
    refreshVendorAdminList();
    refreshVendorDropdown();
  } catch(e) { console.error('Failed to load vendors', e); }
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
    updateAdminStats();refreshVendorAdminList();refreshPublicVendors();refreshVendorDropdown();
    showToast('Vendor added!','#00FF88');
  } catch(e) {
    showToast('Failed to add vendor','#FF3B3B');
  }
}

async function removeVendor(id){
  try {
    await api('DELETE', '/api/admin/vendors/'+id, null, true);
    vendors = vendors.filter(function(v){ return v.id !== id; });
    updateAdminStats();refreshVendorAdminList();refreshPublicVendors();refreshVendorDropdown();
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
    return '<div class="vad-card">'+pic+'<div><div class="vad-name">'+v.name+'</div><div class="vad-contact">'+v.contact+'</div>'+(v.location?'<div style="font-size:0.72rem;color:var(--muted);">'+v.location+'</div>':'')+'<button class="btn-del" onclick="removeVendor('+v.id+')">Remove</button></div></div>';
  }).join('');
}

function refreshPublicVendors(){
  var el=document.getElementById('public-vendors-grid');
  if(!el)return;
  if(!vendors.length){el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;padding:20px 0;">No vendors added yet. Check back soon.</div>';return;}
  el.style.display = 'block'; // Make it full width block to avoid grid restrictions
  var tbody = vendors.map(function(v){
    var pic=v.pic?'<img src="'+v.pic+'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid var(--border); flex-shrink:0;">':'<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--fire),var(--gold));display:flex;align-items:center;justify-content:center;color:#000;font-family:\'Bebas Neue\',sans-serif;font-size:1.3rem;flex-shrink:0;">'+v.name[0].toUpperCase()+'</div>';
    return '<tr>'+
           '<td style="display:flex;align-items:center;gap:16px;padding:16px 24px;border-bottom:1px solid var(--border);">'+pic+'<span style="font-weight:700;font-size:1.05rem;color:var(--text);">'+v.name+'</span></td>'+
           '<td style="padding:16px 24px;border-bottom:1px solid var(--border);color:var(--muted);font-size:0.95rem;">'+(v.location?'📍 '+v.location:'BlazeEarn Vendor')+'</td>'+
           '<td style="padding:16px 24px;border-bottom:1px solid var(--border);"><a href="https://wa.me/'+v.contact.replace(/\D/g,'')+'" target="_blank" style="display:inline-block;padding:8px 18px;background:rgba(0,255,136,0.1);color:var(--green);text-decoration:none;border-radius:8px;font-weight:700;font-size:0.9rem;border:1px solid rgba(0,255,136,0.2); transition:all 0.2s;" onmouseover="this.style.background=\'var(--green)\';this.style.color=\'#000\'" onmouseout="this.style.background=\'rgba(0,255,136,0.1)\';this.style.color=\'var(--green)\'">💬 WhatsApp</a></td>'+
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
      return '<tr><td style="color:var(--muted);">'+(i+1)+'</td><td>'+u.firstName+' '+u.lastName+'</td><td style="color:var(--gold);">@'+u.username+'</td><td>'+u.phone+'</td><td style="color:var(--muted);">'+u.email+'</td><td>'+pass+'</td><td><button class="btn btn-ghost btn-sm" onclick="viewUserReferrals(\''+u.username+'\', \''+(u.referralCode||u.username)+'\')">Referrals ('+(u.direct_referrals||0)+')</button> <button class="btn btn-ghost btn-sm" onclick="openEditUserModal('+u.id+')">Edit</button> <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="deleteUser('+u.id+')">Delete</button></td></tr>';
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

// ===== STATS =====
function updateAdminStats(){
  var setEl=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
  setEl('st-coupons',coupons.length);
  setEl('st-active',coupons.filter(function(c){return !c.isUsed && !c.isDeleted;}).length);
  setEl('st-used',coupons.filter(function(c){return c.isUsed && !c.isDeleted;}).length);
  setEl('st-deleted',coupons.filter(function(c){return c.isDeleted;}).length);
  setEl('st-users',users.length);
  setEl('st-active-users',users.length); // Active and Total are identical initially
  setEl('st-vendors',vendors.length);
  setEl('st-wds',withdrawals.filter(function(w){return w.status==='pending';}).length);
}

// ===== PROFILE =====
function loadProfile(){
  if(!currentUser){
    showPage('login');
    showToast('Please login first', '#FFB800');
    return;
  }
  var name=currentUser.name||'';
  var username=currentUser.username||'';
  var phone=currentUser.phone||'';
  var email=currentUser.email||'';
  var ref=currentUser.refCode||'BLZ-00001';

  // Fill form fields
  document.getElementById('profile-name').value=name;
  document.getElementById('profile-username').value=username;
  document.getElementById('profile-phone').value=phone;
  document.getElementById('profile-email').value=email;

  // Update profile card display
  var initials=name.split(' ').filter(Boolean).map(function(n){return n[0];}).join('').toUpperCase().slice(0,2)||'U';
  document.getElementById('profile-avatar-big').textContent=initials;
  document.getElementById('profile-display-name').textContent=name||'No name set';
  document.getElementById('profile-display-username').textContent='@'+username;
  document.getElementById('profile-display-ref').textContent='Ref Code: '+ref;
}

function saveProfile(){
  if(!currentUser){showToast('No user logged in','#FF3B3B');return;}
  var name=document.getElementById('profile-name').value.trim();
  var username=document.getElementById('profile-username').value.trim().toLowerCase();
  var phone=document.getElementById('profile-phone').value.trim();
  var email=document.getElementById('profile-email').value.trim();
  if(!name||!username||!phone||!email){showToast('Please fill in all fields!','#FFAA00');return;}
  currentUser.name=name;
  currentUser.username=username;
  currentUser.phone=phone;
  currentUser.email=email;
  // Update sidebar
  var initials=name.split(' ').map(function(n){return n[0];}).join('').toUpperCase().slice(0,2);
  document.getElementById('sb-av').textContent=initials;
  document.getElementById('sb-name').textContent='@'+username;
  document.getElementById('profile-avatar-big').textContent=initials;
  document.getElementById('profile-display-name').textContent=name;
  document.getElementById('profile-display-username').textContent='@'+username;
  refreshUsersTable();
  showToast('Profile updated successfully!','#00FF88');
}

function changePassword(){
  var np=document.getElementById('profile-newpass').value.trim();
  var cp=document.getElementById('profile-confirmpass').value.trim();
  if(!np||!cp){showToast('Please fill in both password fields!','#FFAA00');return;}
  if(np.length<6){showToast('Password must be at least 6 characters!','#FFAA00');return;}
  if(np!==cp){showToast('Passwords do not match!','#FF3B3B');return;}
  if(currentUser)currentUser.password=np;
  document.getElementById('profile-newpass').value='';
  document.getElementById('profile-confirmpass').value='';
  showToast('Password updated successfully!','#00FF88');
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
