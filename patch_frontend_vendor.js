const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Add "Make Vendor" button in refreshUsersTable()
content = content.replace(
    /onclick="deleteUser\('\\+u\.id\\+'\)">Delete<\/button><\/td><\/tr>';/g,
    "onclick=\"deleteUser(''+u.id+'')\">Delete</button> <button class=\"btn btn-blaze btn-sm\" onclick=\"upgradeToVendor(''+u.id+'')\" style=\"padding: 4px 8px; font-size: 0.7rem;\">Make Vendor</button></td></tr>';"
);

// Add the upgradeToVendor JS function
const upgradeVendorFn = `
  async function upgradeToVendor(id) {
    if(!confirm('Are you sure you want to upgrade this user to a Vendor?')) return;
    try {
      await api('PUT', '/api/admin/users/' + id + '/vendor', null, true);
      showToast('User upgraded to Vendor successfully!', '#00FF88');
      refreshUsersTable();
      if(typeof refreshVendorAdminList === 'function') refreshVendorAdminList();
    } catch(err) {
      showToast(err.message, '#FF3B3B');
    }
  }
`;
content = content.replace('async function deleteUser(id){', upgradeVendorFn + '\n  async function deleteUser(id){');

// 2. Update refreshVendorAdminList to show stats
const oldRefreshVendorAdminList = `function refreshVendorAdminList(){
  var el=document.getElementById('vendor-admin-list');
  if(!el)return;
  if(!vendors.length){el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;padding:10px 0;">No vendors added yet.</div>';return;}
  el.innerHTML=vendors.map(function(v){
    var pic=v.pic?'<img src="'+v.pic+'" class="vad-pic" onerror="this.style.display=\\'none\\'">':'<div class="vad-ph">'+v.name[0].toUpperCase()+'</div>';
    return '<div class="vad-card">'+pic+'<div><div class="vad-name">'+v.name+'</div><div class="vad-contact">'+v.contact+'</div>'+(v.location?'<div style="font-size:0.72rem;color:var(--muted);">'+v.location+'</div>':'')+'<button class="btn-del" onclick="removeVendor('+v.id+')">Remove</button></div></div>';
  }).join('');
}`;

const newRefreshVendorAdminList = `function refreshVendorAdminList(){
  var el=document.getElementById('vendor-admin-list');
  if(!el)return;
  if(!vendors.length){el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;padding:10px 0;">No vendors added yet.</div>';return;}
  el.innerHTML=vendors.map(function(v){
    var pic=v.pic?'<img src="'+v.pic+'" class="vad-pic" onerror="this.style.display=\\'none\\'">':'<div class="vad-ph">'+v.name[0].toUpperCase()+'</div>';
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
}`;

content = content.replace(oldRefreshVendorAdminList, newRefreshVendorAdminList);

// 3. Update generateCoupons() to pass the vendor dropdown value
content = content.replace(
    /await api\('POST', '\/api\/admin\/coupons', \{count: count\}, true\);/,
    `var vendorVal = document.getElementById('coupon-vendor') ? document.getElementById('coupon-vendor').value : '';
    await api('POST', '/api/admin/coupons', {count: count, vendor: vendorVal}, true);`
);

// 4. Update populateCouponDropdowns()
content = content.replace(
    /refreshVendorAdminList\(\);/g,
    `refreshVendorAdminList();
  var cv = document.getElementById('coupon-vendor');
  if (cv) {
    cv.innerHTML = '<option value="">No specific vendor</option>' + vendors.map(v => '<option value="'+(v.linkedUsername||v.name)+'">'+v.name+'</option>').join('');
  }`
);

// 5. Vendor Dashboard UI for Users
const vendorSidebar = `<div class="sb-item" id="sb-vendor-area" onclick="showPanel('vendor-area',this)" style="display:none;"><span class="sb-item-icon">🏪</span> Vendor Area</div>`;
content = content.replace(`<div class="sb-item" onclick="showPanel('profile',this)">`, `${vendorSidebar}\n      <div class="sb-item" onclick="showPanel('profile',this)">`);

const vendorBottomNav = `<div class="bn-item" id="bn-vendor-area" onclick="showPanel('vendor-area',this);syncBottomNav('vendor-area')" style="display:none;"><div class="bn-icon">🏪</div><div>Vendor</div></div>`;
content = content.replace(`<div class="bn-item" id="bn-profile"`, `${vendorBottomNav}\n    <div class="bn-item" id="bn-profile"`);

const vendorPanel = `
    <!-- VENDOR DASHBOARD PANEL -->
    <div class="panel" id="panel-vendor-area">
      <!-- Mini profile header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:22px;padding:14px 18px;background:var(--card);border:1px solid var(--border);border-radius:12px;">
        <div class="sb-av" id="ph-av-vendor-area" style="width:38px;height:38px;font-size:0.9rem;">U</div>
        <div style="flex:1;">
          <div id="ph-name-vendor-area" style="font-weight:700;font-size:0.9rem;">Loading...</div>
          <div id="ph-uname-vendor-area" style="font-size:0.72rem;color:var(--muted);">@username</div>
        </div>
        <button onclick="toggleTheme()" style="background:transparent;border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:7px;cursor:pointer;font-size:0.9rem;" title="Toggle theme">🌙</button>
      </div>
      <div class="pane-title">VENDOR DASHBOARD</div>
      <div class="pane-sub">Monitor your generated coupon codes and track usage.</div>

      <div class="net-cards" style="margin-bottom:20px;">
        <div class="net-card" style="border-color:var(--gold);">
            <div class="net-val" id="vend-total" style="color:var(--gold);">0</div>
            <div class="net-lbl">Total Coupons</div>
        </div>
        <div class="net-card" style="border-color:var(--green);">
            <div class="net-val" id="vend-active" style="color:var(--green);">0</div>
            <div class="net-lbl">Active Coupons</div>
        </div>
        <div class="net-card" style="border-color:var(--fire);">
            <div class="net-val" id="vend-used" style="color:var(--fire);">0</div>
            <div class="net-lbl">Used Coupons</div>
        </div>
      </div>
      
      <div class="tbox">
        <div class="tbox-head"><h4>My Coupon Codes</h4></div>
        <div style="overflow-x:auto;">
            <table>
                <thead><tr><th>#</th><th>Code</th><th>Status</th><th>Used By</th><th>Date</th></tr></thead>
                <tbody id="vend-coupons-tbody"><tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px;">Loading...</td></tr></tbody>
            </table>
        </div>
      </div>
    </div>
`;
content = content.replace(`<!-- PROFILE PANEL -->`, `${vendorPanel}\n    <!-- PROFILE PANEL -->`);

// Update phIds for vendor area
content = content.replace(/var phIds = \['ph-name-tasks', 'ph-name-data', 'ph-name-withdraw', 'ph-name-referral', 'ph-name-profile', 'ph-name-earners'\];/, "var phIds = ['ph-name-tasks', 'ph-name-data', 'ph-name-withdraw', 'ph-name-referral', 'ph-name-profile', 'ph-name-earners', 'ph-name-vendor-area'];");

// 6. Vendor Dashboard Data Logic
const vendorLogic = `
async function loadVendorDashboard() {
    try {
        var res = await api('GET', '/api/vendor/dashboard', null, true);
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
                return '<tr><td>'+(i+1)+'</td><td style="font-family:\\'Bebas Neue\\',sans-serif;letter-spacing:1px;font-size:1.1rem;">'+c.code+'</td><td>'+status+'</td><td style="color:var(--gold);">'+usedBy+'</td><td>'+date+'</td></tr>';
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px;">No coupons assigned to you.</td></tr>';
        }
    } catch(err) {
        console.error('Failed to load vendor dashboard', err);
    }
}
`;

content = content.replace('async function loadDashboardTopEarners()', vendorLogic + '\nasync function loadDashboardTopEarners()');

// Trigger vendor tab display if isVendor
content = content.replace(
    /localStorage\.setItem\('blaze_user', JSON\.stringify\(currentUser\)\);/,
    `localStorage.setItem('blaze_user', JSON.stringify(currentUser));
      if (currentUser.isVendor) {
          if(document.getElementById('sb-vendor-area')) document.getElementById('sb-vendor-area').style.display = 'flex';
          if(document.getElementById('bn-vendor-area')) document.getElementById('bn-vendor-area').style.display = 'flex';
          loadVendorDashboard();
      }`
);

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully patched index.html for vendor functionality.");
