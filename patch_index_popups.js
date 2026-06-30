const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');

// 1. Redesign Global Popup Modal
let globalModalOld = `<div class="modal-overlay" id="global-popup-modal">
    <div class="modal" style="max-width:400px; text-align:center;">
      <div class="modal-head">
        <h3 style="color:var(--gold);">ðŸ”” Notification</h3>
      <button class="modal-close" onclick="document.getElementById('global-popup-modal').classList.remove('active')">&times;</button>
      </div>
      <div style="padding: 20px; color: var(--text); font-size: 1rem; line-height: 1.5;" id="global-popup-content">
      </div>
      <div style="padding: 0 20px 20px;">
        <button class="btn btn-blaze" style="width:100%;" onclick="document.getElementById('global-popup-modal').classList.remove('active')">Close</button>
      </div>
    </div>
  </div>`;
let globalModalNew = `<div class="modal-overlay" id="global-popup-modal" style="backdrop-filter: blur(8px);">
    <div class="modal" style="max-width:400px; text-align:center; background: rgba(30, 30, 35, 0.85); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(10px); animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
      <div class="modal-head" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 20px;">
        <h3 style="color:var(--gold); font-size:1.4rem; display:flex; align-items:center; justify-content:center; gap:10px;"><span style="font-size:1.8rem">🔔</span> Notification</h3>
      <button class="modal-close" style="top:15px; right:15px;" onclick="document.getElementById('global-popup-modal').classList.remove('active')">&times;</button>
      </div>
      <div style="padding: 25px 20px; color: var(--text); font-size: 1.05rem; line-height: 1.6;" id="global-popup-content">
      </div>
      <div style="padding: 0 20px 25px;">
        <button class="btn btn-blaze" style="width:100%; font-size:1.1rem; padding:12px; border-radius:10px; background:linear-gradient(135deg, var(--fire), var(--gold));" onclick="document.getElementById('global-popup-modal').classList.remove('active')">Got it!</button>
      </div>
    </div>
  </div>`;
if (ci.includes(globalModalOld)) ci = ci.replace(globalModalOld, globalModalNew);

// 2. Redesign Welcome Modal
let welcomeModalOld = `<div class="modal-overlay" id="welcome-modal">
    <div class="modal" style="max-width:400px; text-align:center;">
      <div class="modal-head">
        <h3 style="color:var(--fire);">🎉 Welcome to Blaze Earn!</h3>
      <button class="modal-close" onclick="document.getElementById('welcome-modal').classList.remove('active')">&times;</button>
      </div>
      <div style="padding: 20px; color: var(--text); font-size: 1rem; line-height: 1.5;" id="welcome-msg-text">
      </div>
      <div style="padding: 0 20px 20px;">
        <button class="btn btn-blaze" style="width:100%;" onclick="document.getElementById('welcome-modal').classList.remove('active')">Let's Go!</button>
      </div>
    </div>
  </div>`;
let welcomeModalNew = `<div class="modal-overlay" id="welcome-modal" style="backdrop-filter: blur(8px);">
    <div class="modal" style="max-width:400px; text-align:center; background: rgba(30, 30, 35, 0.85); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(10px); animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
      <div class="modal-head" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 20px;">
        <h3 style="color:var(--fire); font-size:1.4rem; display:flex; align-items:center; justify-content:center; gap:10px;"><span style="font-size:1.8rem">🎉</span> Welcome!</h3>
      <button class="modal-close" style="top:15px; right:15px;" onclick="document.getElementById('welcome-modal').classList.remove('active')">&times;</button>
      </div>
      <div style="padding: 25px 20px; color: var(--text); font-size: 1.05rem; line-height: 1.6;" id="welcome-msg-text">
      </div>
      <div style="padding: 0 20px 25px;">
        <button class="btn btn-blaze" style="width:100%; font-size:1.1rem; padding:12px; border-radius:10px; background:linear-gradient(135deg, var(--fire), var(--gold));" onclick="document.getElementById('welcome-modal').classList.remove('active')">Let's Go!</button>
      </div>
    </div>
  </div>`;
if (ci.includes(welcomeModalOld)) ci = ci.replace(welcomeModalOld, welcomeModalNew);

// 3. Targeted Popup HTML
let targetedModal = `
  <!-- Targeted Popup Modal -->
  <div class="modal-overlay" id="targeted-popup-modal" style="backdrop-filter: blur(8px); z-index: 10001;">
    <div class="modal" style="max-width:400px; text-align:center; background: rgba(30, 30, 35, 0.95); border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 10px 40px rgba(0,0,0,0.6); backdrop-filter: blur(15px); animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
      <div class="modal-head" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 20px;">
        <h3 style="color:var(--gold); font-size:1.4rem; display:flex; align-items:center; justify-content:center; gap:10px;" id="targeted-popup-title">📬 Message</h3>
        <button class="modal-close" style="top:15px; right:15px;" onclick="closeTargetedPopup()">&times;</button>
      </div>
      <div style="padding: 25px 20px; color: var(--text); font-size: 1.05rem; line-height: 1.6;" id="targeted-popup-content"></div>
      <div style="padding: 0 20px 25px;">
        <button class="btn btn-blaze" style="width:100%; font-size:1.1rem; padding:12px; border-radius:10px; background:var(--card2); border:1px solid var(--border);" onclick="closeTargetedPopup()">Mark as Read</button>
      </div>
    </div>
  </div>
  <style>
    @keyframes modalScaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  </style>
`;
if (!ci.includes('targeted-popup-modal')) {
    ci = ci.replace('<!-- Global Popup Modal -->', targetedModal + '\n  <!-- Global Popup Modal -->');
}

// 4. Update the logic for global popup in temp_script
let pOld = `// Show popup if available (only once per session until logout)
            if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {
                const currentMsg = appSettings.popupMessage.trim();
                if (!sessionStorage.getItem('global_popup_shown')) {
                    document.getElementById('global-popup-content').innerText = currentMsg;
                    document.getElementById('global-popup-modal').classList.add('active');
                    sessionStorage.setItem('global_popup_shown', 'true');
                }
            }`;
let pNew = `// Show popup if available
            if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {
                const currentMsg = appSettings.popupMessage.trim();
                // Show on refresh, use innerHTML for rich text
                document.getElementById('global-popup-content').innerHTML = currentMsg;
                document.getElementById('global-popup-modal').classList.add('active');
            }`;
if (ci.includes(pOld)) ci = ci.replace(pOld, pNew);

// Fallback logic replace (if it was original)
let pOld2 = `// Show popup if available
            if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {
                const currentMsg = appSettings.popupMessage.trim();
                document.getElementById('global-popup-content').innerText = currentMsg;
                document.getElementById('global-popup-modal').classList.add('active');
            }`;
if (ci.includes(pOld2)) ci = ci.replace(pOld2, pNew);

// Make welcome message support HTML too
ci = ci.replace("document.getElementById('welcome-msg-text').textContent = res.data.welcomeMessage;", "document.getElementById('welcome-msg-text').innerHTML = res.data.welcomeMessage;");

// 5. Admin targeted popup UI
let targetedUI = `
      <!-- Targeted Notifications -->
      <div style="background:var(--card); border:1px solid var(--border); border-radius:12px; padding:20px; margin-top:20px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:0.04em;margin-bottom:6px;">TARGETED NOTIFICATION</div>
        <div style="color:var(--muted); font-size:0.85rem; margin-bottom:15px;">Send a one-time direct message to a specific user. Supports HTML.</div>
        
        <input type="text" id="target-notif-username" class="input" placeholder="Username to target..." style="margin-bottom:10px;">
        <select id="target-notif-type" class="input" style="margin-bottom:10px;">
            <option value="info">📬 Info</option>
            <option value="success">✅ Success</option>
            <option value="warning">⚠️ Warning</option>
        </select>
        <textarea id="target-notif-msg" rows="3" class="input" placeholder="Type notification HTML here..."></textarea>
        <button style="margin-top:10px; background:linear-gradient(135deg, var(--fire), var(--gold)); border:none; color:white; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; font-size:0.88rem; padding:12px 26px; border-radius:8px; cursor:pointer; letter-spacing:0.04em; text-transform:uppercase;" onclick="sendTargetedNotification()">Send Targeted Popup</button>
      </div>
`;
if (!ci.includes('TARGETED NOTIFICATION')) {
    ci = ci.replace('<!-- Popup Message -->', targetedUI + '\n      <!-- Popup Message -->');
}

// 6. Targeted Popup JS logic
let jsAdditions = `
// Targeted Notifications Logic
let targetedQueue = [];
let currentTargetId = null;

async function checkTargetedNotifications() {
    if (!currentUser) return;
    try {
        var res = await api('GET', '/api/user/notifications');
        if (res.notifications && res.notifications.length > 0) {
            targetedQueue = res.notifications;
            showNextTargetedPopup();
        }
    } catch(err) {
        console.error('Error fetching targeted popups', err);
    }
}

function showNextTargetedPopup() {
    if (targetedQueue.length === 0) return;
    let n = targetedQueue[0];
    currentTargetId = n.id;
    let title = '📬 Message';
    if (n.type === 'success') title = '✅ Success';
    if (n.type === 'warning') title = '⚠️ Warning';
    
    document.getElementById('targeted-popup-title').innerHTML = title;
    document.getElementById('targeted-popup-content').innerHTML = n.message;
    document.getElementById('targeted-popup-modal').classList.add('active');
}

async function closeTargetedPopup() {
    document.getElementById('targeted-popup-modal').classList.remove('active');
    if (currentTargetId) {
        try {
            await api('PUT', '/api/user/notifications/' + currentTargetId + '/read');
        } catch(err) { console.error('Failed to mark read', err); }
    }
    targetedQueue.shift(); // remove first
    if (targetedQueue.length > 0) {
        setTimeout(showNextTargetedPopup, 500);
    }
}

async function sendTargetedNotification() {
    var un = document.getElementById('target-notif-username').value.trim();
    var msg = document.getElementById('target-notif-msg').value.trim();
    var type = document.getElementById('target-notif-type').value;
    if (!un || !msg) return showToast('Please enter username and message', '#FFB800');
    
    try {
        await api('POST', '/api/admin/notifications', { targetUsername: un, message: msg, type: type }, true);
        showToast('Notification sent successfully!', '#00FF88');
        document.getElementById('target-notif-username').value = '';
        document.getElementById('target-notif-msg').value = '';
    } catch(err) {
        showToast(err.message || 'Failed to send notification', '#FF3B3B');
    }
}
`;

if (!ci.includes('checkTargetedNotifications()')) {
    ci = ci.replace('</script>\n</body>', jsAdditions + '\n</script>\n</body>');
    ci = ci.replace('fetchUser();', 'fetchUser();\n      checkTargetedNotifications();');
}

fs.writeFileSync('index.html', ci);
console.log('index.html fully patched with new popup system!');
