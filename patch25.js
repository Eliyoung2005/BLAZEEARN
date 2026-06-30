const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add verification field to register form
const verifField = `
    <div class="fg"><label>Email Address</label><input type="email" id="reg-email" placeholder="your@email.com"></div>
    <div class="fg" id="reg-verification-container" style="display:none;">
      <label>Email Verification Code</label>
      <div style="display:flex; gap:10px;">
        <input type="text" id="reg-verification-code" placeholder="Enter 6-digit code" style="flex:1; text-transform:uppercase;">
        <button type="button" class="btn btn-blaze" style="padding:0 15px; flex-shrink:0;" onclick="sendVerificationCode()" id="btn-send-code">Send Code</button>
      </div>
      <div class="hint" style="margin-top:5px; color:var(--muted); font-size:0.75rem;" id="verification-hint">Click 'Send Code' to receive your verification code.</div>
    </div>
`;
html = html.replace(/<div class="fg"><label>Email Address<\/label><input type="email" id="reg-email" placeholder="your@email\.com"><\/div>/g, verifField);

// 2. Add SMTP settings UI
const smtpSettingsUI = `
      <!-- Email Verification & SMTP Settings -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:26px;margin-bottom:20px;">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:0.04em;margin-bottom:6px;">EMAIL VERIFICATION & SMTP</div>
        <div style="font-size:0.82rem;color:var(--muted);margin-bottom:22px;">Configure email delivery for user registration verification.</div>
        
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; margin-bottom:20px; background:rgba(0,0,0,0.2); padding:15px; border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
            <input type="checkbox" id="set-email-verification" style="width:20px; height:20px; accent-color:var(--gold);">
            <div>
                <span style="font-weight:bold; color:var(--text);">Enable Email Verification</span>
                <div style="font-size:0.75rem; color:var(--muted); margin-top:2px;">Require users to verify their email before they can register.</div>
            </div>
        </label>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
            <div class="fg">
                <label>SMTP Host</label>
                <input type="text" id="set-smtp-host" placeholder="e.g. smtp.gmail.com" class="input">
            </div>
            <div class="fg">
                <label>SMTP Port</label>
                <input type="text" id="set-smtp-port" placeholder="e.g. 465" class="input">
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
            <div class="fg">
                <label>SMTP Username / Email</label>
                <input type="text" id="set-smtp-user" placeholder="e.g. your_email@gmail.com" class="input">
            </div>
            <div class="fg">
                <label>SMTP Password / App Password</label>
                <input type="password" id="set-smtp-pass" placeholder="Your SMTP password" class="input">
            </div>
        </div>
        
        <button class="btn btn-blaze" style="width:100%;" onclick="saveSMTPSettings()">Save Email Settings</button>
      </div>

      <!-- Withdrawal Settings -->
`;
html = html.replace(/<!-- Withdrawal Settings -->/g, smtpSettingsUI);

// 3. Add saveSMTPSettings, sendVerificationCode and modify loadSettings and handleRegister
const scriptChanges = `
async function saveSMTPSettings() {
    var enabled = document.getElementById('set-email-verification').checked;
    var host = document.getElementById('set-smtp-host').value.trim();
    var port = document.getElementById('set-smtp-port').value.trim();
    var user = document.getElementById('set-smtp-user').value.trim();
    var pass = document.getElementById('set-smtp-pass').value.trim();
    
    showToast('Saving email settings...', '#4488FF');
    try {
        var res = await api('PUT', '/api/admin/settings', {
            emailVerificationEnabled: enabled,
            smtpHost: host,
            smtpPort: port,
            smtpUser: user,
            smtpPass: pass
        }, true);
        showToast(res.message || 'Saved successfully', '#00FF88');
    } catch(err) {
        showToast(err.message, '#FF3B3B');
    }
}

async function sendVerificationCode() {
    var email = document.getElementById('reg-email').value.trim();
    if(!email) { showToast('Please enter your email address first', '#FFAA00'); return; }
    if(!email.includes('@')) { showToast('Invalid email address', '#FFAA00'); return; }
    
    var btn = document.getElementById('btn-send-code');
    btn.innerText = 'Sending...';
    btn.disabled = true;
    
    try {
        var res = await fetch(API_BASE_URL + '/api/auth/send-verification', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: email })
        });
        var data = await res.json();
        if(!res.ok) throw new Error(data.error || 'Failed to send code');
        
        showToast(data.message || 'Code sent to your email!', '#00FF88');
        document.getElementById('verification-hint').innerText = 'Code sent! Check your inbox (and spam folder).';
        
        // Cooldown
        var cd = 60;
        var int = setInterval(() => {
            btn.innerText = 'Resend in ' + cd + 's';
            cd--;
            if(cd < 0) {
                clearInterval(int);
                btn.innerText = 'Send Code';
                btn.disabled = false;
            }
        }, 1000);
    } catch(err) {
        btn.innerText = 'Send Code';
        btn.disabled = false;
        showToast(err.message, '#FF3B3B');
    }
}
`;

html = html.replace(/<script>/, `<script>\n${scriptChanges}`);

// Modify handleRegister to pass verification_code
html = html.replace(
    /var pw = document\.getElementById\('reg-pass'\)\.value\.trim\(\);\n\s*var ref = document\.getElementById\('reg-ref'\)\.value\.trim\(\) \|\| undefined;/g,
    `var pw = document.getElementById('reg-pass').value.trim();\n    var ref = document.getElementById('reg-ref').value.trim() || undefined;\n    var vcode = document.getElementById('reg-verification-code') ? document.getElementById('reg-verification-code').value.trim() : '';`
);

html = html.replace(
    /var res = await api\('POST', '\/api\/auth\/register', \{/,
    `var res = await api('POST', '/api/auth/register', { verification_code: vcode, `
);

html = html.replace(
    /if\(!pw\) \{ showToast\('Password is required', '#FFAA00'\); return; \}/g,
    `if(!pw) { showToast('Password is required', '#FFAA00'); return; }\n    if(appSettings && appSettings.emailVerificationEnabled && !vcode) { showToast('Email verification code is required', '#FFAA00'); return; }`
);

// Modify loadSettings to apply values
const applySettings = `
            if(appSettings.emailVerificationEnabled) {
                if(document.getElementById('reg-verification-container')) {
                    document.getElementById('reg-verification-container').style.display = 'block';
                }
            }
`;
html = html.replace(
    /document\.getElementById\('site-announcement-content'\)\.innerText = currentMsg;/,
    `document.getElementById('site-announcement-content').innerText = currentMsg;\n            ${applySettings}`
);

// We also need to populate Admin SMTP settings in loadAdminSettings or loadSettings?
// Currently loadSettings does it for Admin!
const populateAdminSMTP = `
            if (document.getElementById('set-email-verification')) document.getElementById('set-email-verification').checked = appSettings.emailVerificationEnabled || false;
            if (document.getElementById('set-smtp-host')) document.getElementById('set-smtp-host').value = appSettings.smtpHost || '';
            if (document.getElementById('set-smtp-port')) document.getElementById('set-smtp-port').value = appSettings.smtpPort || '';
            if (document.getElementById('set-smtp-user')) document.getElementById('set-smtp-user').value = appSettings.smtpUser || '';
            if (document.getElementById('set-smtp-pass')) document.getElementById('set-smtp-pass').value = appSettings.smtpPass || '';
`;
html = html.replace(
    /const popupEnable = document\.getElementById\('setting-popup-enable'\);/g,
    `${populateAdminSMTP}\n            const popupEnable = document.getElementById('setting-popup-enable');`
);

// Oh wait, loadSettings uses /api/settings/public, which DOES NOT return smtp settings.
// Only /api/admin/settings returns smtp settings!
// Let's check how /api/admin/settings is called. Admin actually loads them separately.
// Admin loads them in loadSettings()? Wait, no, let me just add it to loadAdminSettings() if it exists.
// Actually, earlier I made /api/admin/settings GET.
// Let's modify the html patch to fetch from /api/admin/settings when admin dashboard opens.
// In the current codebase, Admin Settings are populated by /api/settings/public. Let's fix that!
const fixAdminSettings = `
async function loadAdminSMTPSettings() {
    try {
        var res = await api('GET', '/api/admin/settings', null, true);
        if(res) {
            if (document.getElementById('set-email-verification')) document.getElementById('set-email-verification').checked = res.emailVerificationEnabled || false;
            if (document.getElementById('set-smtp-host')) document.getElementById('set-smtp-host').value = res.smtpHost || '';
            if (document.getElementById('set-smtp-port')) document.getElementById('set-smtp-port').value = res.smtpPort || '';
            if (document.getElementById('set-smtp-user')) document.getElementById('set-smtp-user').value = res.smtpUser || '';
            if (document.getElementById('set-smtp-pass')) document.getElementById('set-smtp-pass').value = res.smtpPass || '';
        }
    } catch(err) {
        console.error('Error loading admin SMTP settings', err);
    }
}
`;
html = html.replace(/<script>/, `<script>\n${fixAdminSettings}`);
// Call it when admin dashboard is shown
html = html.replace(
    /showPanel\('apanel-dashboard'\);/g,
    `showPanel('apanel-dashboard');\n  loadAdminSMTPSettings();`
);

fs.writeFileSync('index.html', html);
console.log("Patched index.html for Email Verification UI");
