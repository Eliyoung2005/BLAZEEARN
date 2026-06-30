const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Add switchAdminWdTab function if it doesn't exist
if (!content.includes('function switchAdminWdTab')) {
    const fnCode = `
  function switchAdminWdTab(type, el) {
    var tabs = el.parentElement.querySelectorAll('.wd-tab');
    tabs.forEach(function(t){ t.classList.remove('active'); });
    el.classList.add('active');
    
    var panels = el.parentElement.parentElement.querySelectorAll('.wd-panel');
    panels.forEach(function(p){ p.classList.remove('active'); });
    document.getElementById('admin-wd-' + type).classList.add('active');
  }
`;
    content = content.replace('// ===== STATS =====', fnCode + '\n// ===== STATS =====');
}

// 2. Add 'Make Vendor' button to users table
const oldUserRow = `onclick="viewUserReferrals('\\''+u.username+'\\'', '\\''+(u.referralCode||u.username)+'\\')">Referrals ('+(u.direct_referrals||0)+')</button> <button class="btn btn-ghost btn-sm" onclick="openEditUserModal('+u.id+')">Edit</button> <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="deleteUser('+u.id+')">Delete</button>`;

const newUserRow = `onclick="viewUserReferrals('\\''+u.username+'\\'', '\\''+(u.referralCode||u.username)+'\\')">Referrals ('+(u.direct_referrals||0)+')</button> <button class="btn btn-ghost btn-sm" onclick="makeVendorFromUsers('+u.id+', \\''+u.username+'\\', \\''+u.firstName+' '+u.lastName+'\\')">Make Vendor</button> <button class="btn btn-ghost btn-sm" onclick="openEditUserModal('+u.id+')">Edit</button> <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="deleteUser('+u.id+')">Delete</button>`;

content = content.replace(oldUserRow, newUserRow);

// 3. Add makeVendorFromUsers function
if (!content.includes('function makeVendorFromUsers')) {
    const makeVendorFn = `
  async function makeVendorFromUsers(userId, username, fullname) {
    if (!confirm('Upgrade ' + username + ' to a Code Vendor? This will give them a Vendor Dashboard.')) return;
    try {
      var res = await api('POST', '/api/vendors', {name: fullname + ' Vendor', phone: '0000000000', linkedUsername: username}, true);
      showToast(username + ' is now a Vendor!','#00FF88');
      refreshUsersTable();
      refreshVendorAdminList();
    } catch(err) {
      showToast(err.message || 'Failed to upgrade user','#FF3B3B');
    }
  }
`;
    content = content.replace('// ===== VENDORS =====', makeVendorFn + '\n// ===== VENDORS =====');
}

// 4. Update Popup Settings
const popupSaveFnHtml = `function savePopupMessage(){`;
const togglePopupHtml = `
          <div class="fg" style="margin-top:15px; display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="setting-popup-enable" style="width:18px; height:18px; accent-color:var(--fire);">
            <label for="setting-popup-enable" style="margin:0; font-weight:600; cursor:pointer;">Enable Global Popup</label>
          </div>
`;
content = content.replace(`          <button style="margin-top:8px;background:var(--card2);border:1px solid `, togglePopupHtml + `\n          <button style="margin-top:8px;background:var(--card2);border:1px solid `);

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully patched index.html");
