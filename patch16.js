const fs = require('fs');

function patchIndex() {
    let html = fs.readFileSync('index.html', 'utf-8');
    
    // 1. Re-add userToken to global popup
    html = html.replace(
        /if \(appSettings\.popupMessage && appSettings\.popupMessage\.trim\(\) !== ''\) \{/g,
        "if (userToken && appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {"
    );
    
    // 2. Add sendTargetedNotification & closeTargetedPopup & checkTargetedPopup
    if (!html.includes('sendTargetedNotification')) {
        console.log("WARNING: sendTargetedNotification not injected correctly");
    }
    
    const functionsToAdd = `
async function sendTargetedNotification() {
    var u = document.getElementById('target-notif-user').value.trim();
    var t = document.getElementById('target-notif-type').value;
    var m = document.getElementById('target-notif-msg').value.trim();
    if(!u || !m) { showToast('Username and message required', '#FFAA00'); return; }
    try {
        var res = await api('POST', '/api/admin/targeted-popup', { username: u, type: t, message: m }, true);
        showToast(res.message || 'Sent!', '#00FF88');
        document.getElementById('target-notif-user').value = '';
        document.getElementById('target-notif-msg').value = '';
    } catch(err) {
        showToast(err.message, '#FF3B3B');
    }
}

async function closeTargetedPopup() {
    document.getElementById('targeted-popup-modal').classList.remove('active');
    try {
        await api('POST', '/api/user/clear-targeted-popup');
        if(currentUser) currentUser.targetedPopup = null;
        localStorage.setItem('blaze_user', JSON.stringify(currentUser));
    } catch(e) {}
}

function checkTargetedPopup() {
    if (currentUser && currentUser.targetedPopup) {
        try {
            var data = JSON.parse(currentUser.targetedPopup);
            if(data && data.message) {
                var colors = { 'info': '#4488FF', 'success': '#00FF88', 'warning': '#FFAA00' };
                var icons = { 'info': 'ℹ️', 'success': '✅', 'warning': '⚠️' };
                var titleEl = document.getElementById('targeted-popup-title');
                if(titleEl) {
                    titleEl.innerHTML = (icons[data.type] || 'ℹ️') + ' Message';
                    titleEl.style.color = colors[data.type] || '#4488FF';
                }
                document.getElementById('targeted-popup-content').innerHTML = data.message;
                document.getElementById('targeted-popup-modal').classList.add('active');
            }
        } catch(e) {}
    }
}
`;

    // Inject before the end of the script block
    html = html.replace('</script>\n</body>', functionsToAdd + '\n</script>\n</body>');
    
    // 3. Inject checkTargetedPopup into loadProfile
    if(!html.includes('checkTargetedPopup();')) {
        html = html.replace(/function loadProfile\(\) \{/, "function loadProfile() {\n    if(typeof checkTargetedPopup === 'function') checkTargetedPopup();");
    }

    // 4. Also add .targeted-popup-modal.active missing CSS if needed (actually it uses standard .active now)
    // Wait, .modal-overlay.active already has display:flex !important, so targeted-popup-modal will work!
    
    fs.writeFileSync('index.html', html);
    console.log("Patched index.html");
}

function patchServer() {
    let server = fs.readFileSync('server.js', 'utf-8');
    
    const endpointsToAdd = `
// --- TARGETED POPUP ---
app.post('/api/admin/targeted-popup', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const { username, type, message } = req.body;
    if (!username || !message) return res.status(400).json({ error: 'Username and message required' });

    const payload = JSON.stringify({ type, message });
    db.run('UPDATE users SET targetedPopup = ? WHERE username = ?', [payload, username], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ success: true, message: 'Targeted notification sent!' });
    });
});

app.post('/api/user/clear-targeted-popup', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    db.run('UPDATE users SET targetedPopup = NULL WHERE id = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(200).json({ success: true });
    });
});
`;
    
    if(!server.includes('/api/admin/targeted-popup')) {
        server = server.replace("app.post('/api/admin/users', async (req, res) => {", endpointsToAdd + "\napp.post('/api/admin/users', async (req, res) => {");
        fs.writeFileSync('server.js', server);
        console.log("Patched server.js");
    }
}

function patchDatabase() {
    let dbFile = fs.readFileSync('database.js', 'utf-8');
    if(!dbFile.includes('targetedPopup TEXT')) {
        dbFile = dbFile.replace(
            'db.run("ALTER TABLE users ADD COLUMN isVendor BOOLEAN DEFAULT 0", (err) => {});',
            'db.run("ALTER TABLE users ADD COLUMN isVendor BOOLEAN DEFAULT 0", (err) => {});\n        db.run("ALTER TABLE users ADD COLUMN targetedPopup TEXT", (err) => {});'
        );
        fs.writeFileSync('database.js', dbFile);
        console.log("Patched database.js");
    }
}

patchIndex();
patchServer();
patchDatabase();
