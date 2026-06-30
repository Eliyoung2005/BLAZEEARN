const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Fix saveWelcomeMsg function
if (!content.includes('async function saveWelcomeMsg')) {
    const welcomeMsgFn = `
  async function saveWelcomeMsg() {
    var msg = document.getElementById('setWelcomeMsg').value;
    try {
      await api('PUT', '/api/admin/settings', { welcomeMessage: msg }, true);
      showToast('Welcome message updated!', '#00FF88');
    } catch(err) {
      showToast('Failed to update welcome message', '#FF3B3B');
    }
  }
`;
    content = content.replace('// ===== STATS =====', welcomeMsgFn + '\n// ===== STATS =====');
}

// 2. Fix refreshUsersTable to include Make Vendor button
const regexRefreshUsers = /async function refreshUsersTable\(\) \{[\s\S]*?updateAdminStats\(\);\s*\} catch\(err\) \{[\s\S]*?\}\s*\}/;

const newRefreshUsers = `async function refreshUsersTable(){
    var tbody=document.getElementById('users-tbody');
    var count=document.getElementById('users-count');
    if(!tbody)return;
    try {
      var res = await api('GET', '/api/admin/users', null, true);
      var arr = res.users || [];
      users = arr;
      if(count)count.textContent=arr.length+' user'+(arr.length!==1?'s':'');
      tbody.innerHTML=arr.length?arr.map(function(u,i){
        var pass = u.plaintextPassword || '<span style="font-style:italic;color:var(--muted);">Hashed</span>';
        var row = '<tr><td style="color:var(--muted);">' + (i+1) + '</td>';
        row += '<td>' + u.firstName + ' ' + u.lastName + '</td>';
        row += '<td style="color:var(--gold);">@' + u.username + '</td>';
        row += '<td>' + u.phone + '</td><td style="color:var(--muted);">' + u.email + '</td>';
        row += '<td>' + pass + '</td><td>';
        row += '<button class="btn btn-ghost btn-sm" onclick="viewUserReferrals(\\''+u.username+'\\', \\''+(u.referralCode||u.username)+'\\')">Referrals</button> ';
        row += '<button class="btn btn-ghost btn-sm" onclick="makeVendorFromUsers('+u.id+', \\''+u.username+'\\', \\''+u.firstName+' '+u.lastName+'\\')">Make Vendor</button> ';
        row += '<button class="btn btn-ghost btn-sm" onclick="openEditUserModal('+u.id+')">Edit</button> ';
        row += '<button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="deleteUser('+u.id+')">Delete</button></td></tr>';
        return row;
      }).join(''):'<tr><td colspan="7" style="color:var(--muted);text-align:center;padding:22px;">No users yet.</td></tr>';
      updateAdminStats();
    } catch(err) {
      tbody.innerHTML='<tr><td colspan="7" style="color:var(--red);text-align:center;">Failed to load users</td></tr>';
    }
  }`;

content = content.replace(regexRefreshUsers, newRefreshUsers);

// 3. Add Advanced Withdrawal Settings back to the UI
const extraSettingsHtml = `
          <!-- Advanced Withdrawal Times & Dates -->
          <div style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;margin-bottom:14px;color:var(--gold);">WITHDRAWAL WINDOWS & DATES</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
              
              <!-- Activity Config -->
              <div style="padding-right:15px; border-right:1px solid var(--border);">
                <div style="font-weight:700;margin-bottom:10px;text-transform:uppercase;font-size:0.8rem;color:var(--muted);">Activity Earnings</div>
                <div class="fg">
                  <label>Allowed Dates (comma separated, e.g. 15,28)</label>
                  <input type="text" id="setting-act-dates" placeholder="Leave blank to allow any day">
                </div>
                <div class="fg">
                  <label>Allowed Days of Week (e.g. Sunday,Tuesday)</label>
                  <input type="text" id="setting-act-days" placeholder="Leave blank to allow any day of week">
                </div>
                <div class="fg" style="display:flex;gap:10px;">
                  <div style="flex:1;"><label>Start Time</label><input type="time" id="setting-act-start"></div>
                  <div style="flex:1;"><label>End Time</label><input type="time" id="setting-act-end"></div>
                </div>
              </div>

              <!-- Referral Config -->
              <div>
                <div style="font-weight:700;margin-bottom:10px;text-transform:uppercase;font-size:0.8rem;color:var(--muted);">Referral Earnings</div>
                <div class="fg">
                  <label>Allowed Dates (comma separated, e.g. 15,28)</label>
                  <input type="text" id="setting-ref-dates" placeholder="Leave blank to allow any day">
                </div>
                <div class="fg">
                  <label>Allowed Days of Week (e.g. Sunday,Tuesday)</label>
                  <input type="text" id="setting-ref-days" placeholder="Leave blank to allow any day of week">
                </div>
                <div class="fg" style="display:flex;gap:10px;">
                  <div style="flex:1;"><label>Start Time</label><input type="time" id="setting-ref-start"></div>
                  <div style="flex:1;"><label>End Time</label><input type="time" id="setting-ref-end"></div>
                </div>
              </div>
            </div>
            
            <button style="margin-top:15px;background:var(--card);border:1px solid var(--border);color:var(--text);font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.88rem;padding:12px 26px;border-radius:8px;cursor:pointer;letter-spacing:0.04em;text-transform:uppercase;" onmouseover="this.style.borderColor='var(--fire)'" onmouseout="this.style.borderColor='var(--border)'" onclick="saveAdvancedSettings()">Update Withdrawal Rules</button>
          </div>
`;

// Insert after the min withdrawal block
const targetStr = `onclick="saveMinWd('referral')">Update Referral Minimum</button>
          </div>
        </div>`;
content = content.replace(targetStr, targetStr + extraSettingsHtml);

// 4. Add the saveAdvancedSettings function and patch fetchSettings to load them
if (!content.includes('async function saveAdvancedSettings')) {
    const fnAdv = `
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
`;
    content = content.replace('// ===== STATS =====', fnAdv + '\n// ===== STATS =====');
}

// 5. Update fetchSettings to load the new fields
const fetchSettingsRegex = /if\(document\.getElementById\('setting-act-display'\)\).*?;/g;
if (content.match(fetchSettingsRegex)) {
    // we just need to append some assignments inside fetchSettings
    const assignments = `
      if(document.getElementById('setWelcomeMsg')) document.getElementById('setWelcomeMsg').value = s.welcomeMessage || '';
      if(document.getElementById('setting-act-dates')) document.getElementById('setting-act-dates').value = s.activityWithdrawDates || '';
      if(document.getElementById('setting-act-days')) document.getElementById('setting-act-days').value = s.activityWithdrawDays || '';
      if(document.getElementById('setting-act-start')) document.getElementById('setting-act-start').value = s.activityWithdrawStartTime || '';
      if(document.getElementById('setting-act-end')) document.getElementById('setting-act-end').value = s.activityWithdrawEndTime || '';
      if(document.getElementById('setting-ref-dates')) document.getElementById('setting-ref-dates').value = s.referralWithdrawDates || '';
      if(document.getElementById('setting-ref-days')) document.getElementById('setting-ref-days').value = s.referralWithdrawDays || '';
      if(document.getElementById('setting-ref-start')) document.getElementById('setting-ref-start').value = s.referralWithdrawStartTime || '';
      if(document.getElementById('setting-ref-end')) document.getElementById('setting-ref-end').value = s.referralWithdrawEndTime || '';
    `;
    const block = `if(document.getElementById('setting-act-display')) document.getElementById('setting-act-display').innerText = ','+s.minWithdrawal;`;
    content = content.replace(block, block + assignments);
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully rebuilt missing features");
