const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const customMsgUI = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:26px;margin-bottom:20px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:0.04em;margin-bottom:6px;">CUSTOM WHATSAPP MESSAGE</div>
        <div style="font-size:0.82rem;color:var(--muted);margin-bottom:22px;">Set the default message users send when they click your WhatsApp button.</div>
        <div class="fg" style="margin-bottom:15px;">
            <input type="text" id="vendor-custom-msg" placeholder="e.g. Hello! I want to buy a BlazeEarn coupon code..." class="input">
        </div>
        <button class="btn btn-blaze" style="width:100%;" onclick="updateVendorMessage()">Update Message</button>
      </div>
`;

// Insert the UI into the Vendor Dashboard just before the table box
html = html.replace(/<div class="tbox">\s*<div class="tbox-head"><h4>My Coupon Codes<\/h4><\/div>/, customMsgUI + '\n      <div class="tbox">\n        <div class="tbox-head"><h4>My Coupon Codes</h4></div>');

// Add JavaScript function
const jsLogic = `
async function updateVendorMessage() {
    var msg = document.getElementById('vendor-custom-msg').value.trim();
    showToast('Updating message...', '#4488FF');
    try {
        var res = await api('PUT', '/api/vendor/custom-message', { customMessage: msg }, true);
        showToast(res.message || 'Custom message updated!', '#00FF88');
    } catch(err) {
        showToast(err.message, '#FF3B3B');
    }
}
`;

html = html.replace(/<script>/, `<script>\n${jsLogic}`);

// Modify loadVendorDashboard to apply the custom message
const applyCustomMsg = `
        if (res.customMessage !== undefined && document.getElementById('vendor-custom-msg')) {
            document.getElementById('vendor-custom-msg').value = res.customMessage;
        }
`;
html = html.replace(
    /document\.getElementById\('vend-used'\)\.innerText = res\.stats\.used;/g,
    `document.getElementById('vend-used').innerText = res.stats.used;\n${applyCustomMsg}`
);

fs.writeFileSync('index.html', html);
console.log("Patched index.html for Vendor Custom Message UI");
