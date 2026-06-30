const fs = require('fs');
const path = require('path');
const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Replace the HTML for the Vendors Panel
const oldVendorForm = `<div class="a-form">
          <h4>Add New Vendor</h4>
          <div class="a-form-row">
            <div class="fg" style="margin-bottom:0;"><label>Vendor Name</label><input type="text" id="v-name" placeholder="e.g. Chidi Vendors"></div>
            <div class="fg" style="margin-bottom:0;"><label>WhatsApp Number</label><input type="text" id="v-contact" placeholder="e.g. 08012345678"></div>
          </div>
          <div class="a-form-row" style="margin-top:12px;">
            <div class="fg" style="margin-bottom:0;"><label>Profile Picture URL (optional)</label><input type="text" id="v-pic" placeholder="https://...image.jpg"></div>
            <div class="fg" style="margin-bottom:0;"><label>Location / State</label><input type="text" id="v-location" placeholder="e.g. Lagos"></div>
          </div>
          <br><button class="btn btn-blaze" onclick="addVendor()">Add Vendor</button>
        </div>`;

const newVendorForm = `<div class="a-form">
          <h4>Add New Vendor</h4>
          <div class="fg" style="margin-bottom:15px;">
            <label>Select User to Make Vendor</label>
            <select id="v-user-select" class="input" style="width:100%; padding:12px; background:var(--bg-lighter); color:var(--text); border:1px solid var(--border); border-radius:8px;">
              <option value="">Loading eligible users...</option>
            </select>
          </div>
          <button class="btn btn-blaze" onclick="addVendorFromDropdown()">Promote to Vendor</button>
        </div>`;

if(html.includes('id="v-name"')) {
    html = html.replace(oldVendorForm, newVendorForm);
}

// 2. Add the populate script to showAdminPanel
const populateScript = `
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
`;
html = html.replace("if(target) target.classList.add('active');", "if(target) target.classList.add('active');\n" + populateScript);

// 3. Add the addVendorFromDropdown logic
const logicScript = `
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
`;
if(!html.includes('function addVendorFromDropdown')) {
    html = html.replace('async function addVendor(){', logicScript + '\nasync function addVendor(){');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated Vendor Admin UI.');
