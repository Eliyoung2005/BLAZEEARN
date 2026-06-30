const fs = require('fs');

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

let html = fs.readFileSync('index.html', 'utf-8');

if (!html.includes('async function sendTargetedNotification')) {
    html += "\n<script>\n" + functionsToAdd + "\n</script>\n";
    fs.writeFileSync('index.html', html);
    console.log("Appended missing functions to index.html");
} else {
    console.log("Functions already exist.");
}
