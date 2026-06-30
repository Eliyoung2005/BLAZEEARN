const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const autoPayUI = `
      <!-- Auto Payment Settings -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:26px;margin-bottom:20px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:0.04em;margin-bottom:6px;">AUTO PAYMENT (RAVEN)</div>
        <div style="font-size:0.82rem;color:var(--muted);margin-bottom:22px;">Automatically disburse funds when you click "Approve" on a pending withdrawal.</div>
        
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; margin-bottom:20px; background:rgba(0,0,0,0.2); padding:15px; border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
            <input type="checkbox" id="set-auto-payment" style="width:20px; height:20px; accent-color:var(--gold);">
            <div>
                <span style="font-weight:bold; color:var(--text);">Enable Auto Payment</span>
                <div style="font-size:0.75rem; color:var(--muted); margin-top:2px;">Transfers will be made instantly using your Raven Bank account balance.</div>
            </div>
        </label>
        
        <div class="fg" style="margin-bottom:20px;">
            <label>Raven Secret Key</label>
            <input type="password" id="set-raven-key" placeholder="e.g. raven-secret-key-..." class="input">
        </div>
        
        <button class="btn btn-blaze" style="width:100%;" onclick="saveAutoPaySettings()">Save Auto Payment Settings</button>
      </div>

      <!-- Email Verification & SMTP Settings -->
`;

// Insert the Auto Pay UI before Email settings
html = html.replace(/<!-- Email Verification & SMTP Settings -->/g, autoPayUI);

// Add the JS logic
const scriptChanges = `
async function saveAutoPaySettings() {
    var enabled = document.getElementById('set-auto-payment').checked;
    var key = document.getElementById('set-raven-key').value.trim();
    
    showToast('Saving auto payment settings...', '#4488FF');
    try {
        var res = await api('PUT', '/api/admin/settings', {
            autoPaymentEnabled: enabled,
            gatewaySecretKey: key
        }, true);
        showToast(res.message || 'Saved successfully', '#00FF88');
    } catch(err) {
        showToast(err.message, '#FF3B3B');
    }
}
`;

html = html.replace(/<script>/, `<script>\n${scriptChanges}`);

// Add to loadAdminSMTPSettings so it populates on load
const populateAutoPay = `
            if (document.getElementById('set-auto-payment')) document.getElementById('set-auto-payment').checked = res.autoPaymentEnabled || false;
            if (document.getElementById('set-raven-key')) document.getElementById('set-raven-key').value = res.gatewaySecretKey || '';
`;
html = html.replace(
    /if \(document\.getElementById\('set-email-verification'\)\)/,
    `${populateAutoPay}\n            if (document.getElementById('set-email-verification'))`
);

fs.writeFileSync('index.html', html);
console.log("Patched index.html for Auto Payment UI");
