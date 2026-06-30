const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// The new perfect HTML for Notifications and Settings panels
const newPanels = `
    <!-- NOTIFICATIONS PANEL -->
    <div class="panel" id="apanel-notifications">
      <div class="pane-title">NOTIFICATIONS & MESSAGES</div>
      <div class="pane-sub">Manage alerts, popups, and welcome messages sent to users.</div>
      
      <!-- Welcome Message Settings -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:26px;margin-bottom:20px;">
        <h4 style="margin-top:0;color:var(--green);"><i class='bx bx-message-rounded-check'></i> New User Welcome Message</h4>
        <p style="font-size:0.75rem;color:var(--muted);margin-bottom:14px;">Displays only once immediately after a user successfully registers.</p>
        <div class="fg">
          <textarea id="setWelcomeMsg" placeholder="Type welcome message here... (leave blank to disable)" style="width:100%;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:12px;color:var(--text);resize:vertical;min-height:80px;"></textarea>
        </div>
        <button class="btn btn-blaze" onclick="saveWelcomeMsg()" style="margin-top:4px;">Update Welcome</button>
      </div>

      <!-- Popup Message -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:26px;margin-bottom:20px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:0.04em;margin-bottom:6px;">GLOBAL POPUP NOTIFICATION</div>
        <div style="font-size:0.82rem;color:var(--muted);margin-bottom:22px;">Set a message that will pop up for all users when they open the site.</div>
        <div class="fg">
          <label>Message Content</label>
          <textarea id="setting-popup-msg" rows="3" placeholder="Type notification here..."></textarea>
        </div>
        <div class="fg" style="margin-top:15px; margin-bottom:15px; display:flex; align-items:center; gap:10px;">
          <input type="checkbox" id="setting-popup-enable" style="width:18px; height:18px; accent-color:var(--fire);">
          <label for="setting-popup-enable" style="margin:0; font-weight:600; cursor:pointer;">Enable Global Popup</label>
        </div>
        <button style="background:var(--card2);border:1px solid var(--border);color:var(--text);font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.88rem;padding:12px 26px;border-radius:8px;cursor:pointer;letter-spacing:0.04em;text-transform:uppercase;transition:0.2s;" onmouseover="this.style.borderColor='var(--fire)'" onmouseout="this.style.borderColor='var(--border)'" onclick="savePopupMessage()">Update Notification</button>
      </div>
    </div>

    <!-- SETTINGS PANEL -->
    <div class="panel" id="apanel-settings">
      <div class="pane-title">SETTINGS</div>
      <div class="pane-sub">Adjust platform settings including withdrawal minimums.</div>

      <!-- Withdrawal Settings -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:26px;margin-bottom:20px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:0.04em;margin-bottom:6px;">WITHDRAWAL SETTINGS</div>
        <div style="font-size:0.82rem;color:var(--muted);margin-bottom:22px;">Set the minimum amount users can withdraw for each earnings type.</div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px;">
          <div style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Activity Withdrawal Minimum</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;background:linear-gradient(90deg,var(--fire),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:14px;" id="setting-act-display">N100</div>
            <div class="fg" style="margin-bottom:10px;"><label>New Minimum (N)</label><input type="number" id="setting-act-min" placeholder="e.g. 100" min="50"></div>
            <button style="background:linear-gradient(135deg,var(--fire),var(--gold));color:#000;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.8rem;padding:10px 20px;border-radius:7px;border:none;cursor:pointer;letter-spacing:0.04em;text-transform:uppercase;width:100%;" onclick="saveMinWd('activity')">Update Activity Minimum</button>
          </div>

          <div style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Referral Withdrawal Minimum</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;background:linear-gradient(90deg,var(--fire),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:14px;" id="setting-ref-display">N900</div>
            <div class="fg" style="margin-bottom:10px;"><label>New Minimum (N)</label><input type="number" id="setting-ref-min" placeholder="e.g. 900" min="100"></div>
            <button style="background:linear-gradient(135deg,var(--fire),var(--gold));color:#000;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.8rem;padding:10px 20px;border-radius:7px;border:none;cursor:pointer;letter-spacing:0.04em;text-transform:uppercase;width:100%;" onclick="saveMinWd('referral')">Update Referral Minimum</button>
          </div>
        </div>

        <div style="background:rgba(255,170,0,0.06);border:1px solid rgba(255,170,0,0.15);border-radius:10px;padding:14px 18px;font-size:0.82rem;color:var(--muted);display:flex;align-items:flex-start;gap:10px;">
          <span style="font-size:1.2rem;">💡</span>
          <span>Changes take effect immediately. Users will see the updated minimum when they next open the withdrawal page.</span>
        </div>
      </div>

      <!-- Admin Credentials -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:26px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:0.04em;margin-bottom:6px;">ADMIN CREDENTIALS</div>
        <div style="font-size:0.82rem;color:var(--muted);margin-bottom:22px;">Update your admin username and password.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="fg"><label>New Admin Username</label><input type="text" id="setting-admin-user" placeholder="New username"></div>
          <div class="fg"><label>New Admin Password</label><input type="password" id="setting-admin-pass" placeholder="New password (min 6 chars)"></div>
        </div>
        <button style="margin-top:8px;background:var(--card2);border:1px solid var(--border);color:var(--text);font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.88rem;padding:12px 26px;border-radius:8px;border:1px solid var(--border);cursor:pointer;letter-spacing:0.04em;text-transform:uppercase;transition:0.2s;" onmouseover="this.style.borderColor='var(--fire)'" onmouseout="this.style.borderColor='var(--border)'" onclick="saveAdminCreds()">Update Credentials</button>
      </div>
    </div>`;

// Replace from <!-- NOTIFICATIONS PANEL --> to the end of <!-- Admin Credentials -->
const startMarker = "<!-- NOTIFICATIONS PANEL -->";
const endMarker = "</div><!-- end admin-main -->";
const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newPanels + "\n\n  " + content.substring(endIndex);
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log("Successfully rebuilt Notifications and Settings panels.");
} else {
  console.log("Error finding start or end markers.");
}
