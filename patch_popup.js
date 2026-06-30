const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Add "setting-popup-enable" toggle switch
const popupUpdateBtn = `<button style="margin-top:8px;background:var(--card2);border:1px solid var(--border);color:var(--text);font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.88rem;padding:12px 26px;border-radius:8px;cursor:pointer;letter-spacing:0.04em;text-transform:uppercase;transition:0.2s;" onmouseover="this.style.borderColor='var(--fire)'" onmouseout="this.style.borderColor='var(--border)'" onclick="savePopupMessage()">Update Notification</button>`;

const popupToggleHtml = `
          <div class="fg" style="margin-top:15px; margin-bottom:15px; display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="setting-popup-enable" style="width:18px; height:18px; accent-color:var(--fire);">
            <label for="setting-popup-enable" style="margin:0; font-weight:600; cursor:pointer;">Enable Global Popup</label>
          </div>
          <button style="margin-top:8px;background:var(--card2);border:1px solid var(--border);color:var(--text);font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.88rem;padding:12px 26px;border-radius:8px;cursor:pointer;letter-spacing:0.04em;text-transform:uppercase;transition:0.2s;" onmouseover="this.style.borderColor='var(--fire)'" onmouseout="this.style.borderColor='var(--border)'" onclick="savePopupMessage()">Update Notification</button>
`;
content = content.replace(popupUpdateBtn, popupToggleHtml);

// 2. Modify savePopupMessage function
const oldSavePopup = `
  async function savePopupMessage() {
    var msg = document.getElementById('setting-popup-msg').value;
    try {
      await api('PUT', '/api/admin/settings', { popupMessage: msg }, true);
      showToast('Popup message updated!','#00FF88');
    } catch(err) {
      showToast('Failed to update popup', '#FF3B3B');
    }
  }
`;

const newSavePopup = `
  async function savePopupMessage() {
    var msg = document.getElementById('setting-popup-msg').value;
    var enabled = document.getElementById('setting-popup-enable').checked;
    
    // If disabled, we save an empty string to turn it off in the backend
    var finalMsg = enabled ? msg.trim() : "";
    
    try {
      await api('PUT', '/api/admin/settings', { popupMessage: finalMsg }, true);
      showToast('Popup settings updated!','#00FF88');
    } catch(err) {
      showToast('Failed to update popup', '#FF3B3B');
    }
  }
`;
if (content.includes('async function savePopupMessage()')) {
    const rx = /async function savePopupMessage\(\) \{[\s\S]*?\}/;
    content = content.replace(rx, newSavePopup);
}

// 3. Load popup state when fetching settings
const oldPop = `if(document.getElementById('setting-popup-msg')) document.getElementById('setting-popup-msg').value = s.popupMessage || '';`;
const newPop = `if(document.getElementById('setting-popup-msg')) {
        document.getElementById('setting-popup-msg').value = s.popupMessage || '';
        document.getElementById('setting-popup-enable').checked = !!s.popupMessage;
      }`;
content = content.replace(oldPop, newPop);

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully patched index.html with popup toggle");
