const fs = require('fs');
const path = require('path');

// 1. Patch server.js
const serverPath = path.join(__dirname, 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

serverContent = serverContent.replace(
    'popupMessage: settings.popupMessage || ""',
    'popupMessage: settings.popupMessage || "",\n                    welcomeMessage: settings.welcomeMessage || ""'
);

serverContent = serverContent.replace(
    'dataClaimReferralsRequired, popupMessage } = req.body;',
    'dataClaimReferralsRequired, popupMessage, welcomeMessage } = req.body;'
);

serverContent = serverContent.replace(
    "if (popupMessage !== undefined) { updates.push('popupMessage = ?'); params.push(popupMessage); }",
    "if (popupMessage !== undefined) { updates.push('popupMessage = ?'); params.push(popupMessage); }\n    if (welcomeMessage !== undefined) { updates.push('welcomeMessage = ?'); params.push(welcomeMessage); }"
);

fs.writeFileSync(serverPath, serverContent, 'utf8');


// 2. Patch index.html
const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// A. HTML Admin Panel - Add welcome message textarea
const adminWelcomeHtml = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:26px;margin-bottom:20px;">
        <h4 style="margin-top:0;color:var(--green);"><i class='bx bx-message-rounded-check'></i> New User Welcome Message</h4>
        <p style="font-size:0.75rem;color:var(--muted);margin-bottom:14px;">Displays only once immediately after a user successfully registers.</p>
        <div class="fg">
          <textarea id="setWelcomeMsg" placeholder="Type welcome message here... (leave blank to disable)" style="width:100%;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:12px;color:var(--text);resize:vertical;min-height:80px;"></textarea>
        </div>
        <button class="btn btn-blaze" onclick="saveWelcomeMsg()" style="margin-top:4px;">Update Welcome</button>
      </div>
`;
indexContent = indexContent.replace(
    /<!-- Withdrawal Settings -->/,
    `<!-- Welcome Message Settings -->\n${adminWelcomeHtml}\n      <!-- Withdrawal Settings -->`
);

// B. HTML Modal for Welcome Message
const welcomeModalHtml = `
  <!-- Welcome Message Modal -->
  <div class="modal-overlay" id="welcome-modal">
    <div class="modal-box" style="text-align:center;">
      <button class="modal-close" onclick="document.getElementById('welcome-modal').classList.remove('active')">&times;</button>
      <div style="font-size:3rem;margin-bottom:10px;">🎉</div>
      <h3 style="margin-bottom:12px;font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--green);">Welcome to BlazeEarn!</h3>
      <div id="welcome-msg-text" style="color:var(--muted);font-size:0.9rem;margin-bottom:20px;line-height:1.6;white-space:pre-wrap;"></div>
      <button class="btn btn-blaze" style="width:100%;" onclick="document.getElementById('welcome-modal').classList.remove('active')">Let's Go!</button>
    </div>
  </div>
`;
indexContent = indexContent.replace('<!-- Global Popup Modal -->', welcomeModalHtml + '\n  <!-- Global Popup Modal -->');

// C. JS: update fetch public settings to populate admin panel
// index.html uses apanel-settings, it might fetch settings somewhere else, or the user just uses saveWelcomeMsg independently.
const saveWelcomeMsgJs = `
async function saveWelcomeMsg() {
    var msg = document.getElementById('setWelcomeMsg').value;
    try {
        await api('PUT', '/api/admin/settings', { welcomeMessage: msg }, true);
        showToast('Welcome message updated!', '#00FF88');
    } catch(err) {
        showToast(err.message, '#FF3B3B');
    }
}
`;
indexContent = indexContent.replace('async function saveAdminPassword()', saveWelcomeMsgJs + '\nasync function saveAdminPassword()');

// D. JS: handleRegister sets sessionStorage
indexContent = indexContent.replace(
    "showToast('Welcome to BlazeEarn!', '#00FF88');",
    "showToast('Welcome to BlazeEarn!', '#00FF88');\n    sessionStorage.setItem('just_registered', 'true');"
);

// E. JS: check sessionStorage on dashboard load
const welcomeLogic = `
    // Welcome message check for newly registered users
    if (sessionStorage.getItem('just_registered') === 'true') {
        sessionStorage.removeItem('just_registered');
        api('GET', '/api/settings/public').then(function(res) {
            if (res && res.data && res.data.welcomeMessage) {
                document.getElementById('welcome-msg-text').textContent = res.data.welcomeMessage;
                document.getElementById('welcome-modal').classList.add('active');
            }
        });
    }
`;
// Let's place it inside updateBalanceDisplay or loadProfile.
// I'll put it right after updateBalanceDisplay()
indexContent = indexContent.replace(
    "function updateBalanceDisplay() {",
    welcomeLogic + "\nfunction updateBalanceDisplay() {"
);

fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log("Successfully patched index.html and server.js for welcome message.");
