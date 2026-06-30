const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');

// 1. Hamburger menu CSS
ci = ci.replace('.sidebar{width:var(--sidebar);', '.sidebar{\n  transform: translateX(-100%);\n  transition: transform 0.3s ease;\n  display: flex !important;\n  position: fixed;\n  top: 0;\n  left: 0;\n  height: 100vh;\n  z-index: 2000;\n  width: 250px;\n  background:var(--card);border-right:1px solid var(--border);flex-direction:column;overflow-y:auto;}\n.sidebar.open {\n  transform: translateX(0);\n}\n.sidebar-overlay {\n  display: none;\n  position: fixed;\n  top: 0; left: 0; right: 0; bottom: 0;\n  background: rgba(0,0,0,0.5);\n  z-index: 1500;\n  backdrop-filter: blur(4px);\n}\n.sidebar-overlay.open {\n  display: block;\n}\n.dash-top-nav {\n  position: fixed; top: 0; left: 0; right: 0; height: 60px;\n  background: var(--card); border-bottom: 1px solid var(--border);\n  display: flex; align-items: center; justify-content: space-between;\n  padding: 0 20px; z-index: 1000;\n}\n#dashboard.active{display:block !important;min-height:100vh;}\n.dash-main{\n  margin-left:0 !important;\n  padding:80px 16px 40px 16px !important;\n  max-width:1200px !important;\n  width:100% !important;\n  margin: 0 auto !important;\n}');

// Hide bottom nav
ci = ci.replace('.bottom-nav{', '.bottom-nav{\n  display:none !important;');

// Insert hamburger HTML
ci = ci.replace('<div id="dashboard" class="page">\n    <!-- SIDEBAR -->\n    <div class="sidebar">', `<div id="dashboard" class="page">
    <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
    <div class="dash-top-nav">
      <div style="font-weight:700;font-size:1.2rem;display:flex;align-items:center;">
        <img src="logo.png" alt="Blaze Earn" style="height:32px;margin-right:8px;vertical-align:middle;">BlazeEarn
      </div>
      <button onclick="toggleSidebar()" style="background:transparent;border:none;color:var(--text);font-size:1.8rem;cursor:pointer;">☰</button>
    </div>
    <!-- SIDEBAR -->
    <div class="sidebar">`);

// Add toggleSidebar function
if (!ci.includes('function toggleSidebar')) {
  ci = ci.replace('function showPanel(panelId', 'function toggleSidebar() {\n  document.querySelector(".sidebar").classList.toggle("open");\n  document.querySelector(".sidebar-overlay").classList.toggle("open");\n}\n\nfunction showPanel(panelId');
}

// Remove emojis from sidebar
ci = ci.replace(/<span class="sb-item-icon">[^<]+<\/span>\s*/g, '');

// Auto-close sidebar on click
ci = ci.replace(/onclick="showPanel\(/g, 'onclick="document.querySelector(\'.sidebar\').classList.remove(\'open\'); document.querySelector(\'.sidebar-overlay\').classList.remove(\'open\'); showPanel(');


// 2. Global Popup check (currentUser)
let gpop = `  // Fetch global popup
  api('GET', '/api/public/settings').then(data => {
    if (data && data.success && data.settings && data.settings.globalPopup) {
      document.getElementById('global-popup-modal').style.display = 'flex';
      document.getElementById('global-popup-text').innerHTML = data.settings.globalPopup.replace(/\\n/g, '<br>');
    }
  });`;
let gpopFix = `  // Fetch global popup (only show if logged in!)
  api('GET', '/api/public/settings').then(data => {
    if (currentUser && data && data.success && data.settings && data.settings.globalPopup) {
      document.getElementById('global-popup-modal').style.display = 'flex';
      document.getElementById('global-popup-text').innerHTML = data.settings.globalPopup.replace(/\\n/g, '<br>');
    }
  });`;
ci = ci.replace(gpop, gpopFix);

// 3. Complete Task logic
const t2 = "currentUser.activity_balance += parseInt(amount, 10);";
const r2 = `currentUser.activity_balance += parseInt(amount, 10);\n            sessionStorage.removeItem('task_opened_' + taskId);`;
ci = ci.replace(t2, r2);

const t3 = "function openTaskLink(taskId, url) {";
const r3 = `function openTaskLink(taskId, url) {\n    sessionStorage.setItem('task_opened_' + taskId, 'true');`;
ci = ci.replace(t3, r3);

const t4 = "if(!currentUser) return showToast('Please login first', '#FFAA00');";
const r4 = `if(!currentUser) return showToast('Please login first', '#FFAA00');\n    if (!sessionStorage.getItem('task_opened_' + taskId)) {\n        return showToast('You must open the task link before completing it!', '#FF3B3B');\n    }`;
ci = ci.replace(t4, r4);

// 4. Update Balance Display logic
const target = "var eRb = document.getElementById('bal-ref'); if(eRb) eRb.textContent = 'â‚¦' + rb.toLocaleString() + '.00';";
const repl = "var eRb = document.getElementById('bal-ref'); if(eRb) eRb.textContent = 'â‚¦' + rb.toLocaleString() + '.00'; var rsD = document.getElementById('rs-direct'); if(rsD) rsD.textContent = dr; var rsI = document.getElementById('rs-indirect'); if(rsI) rsI.textContent = ir; var rsE = document.getElementById('rs-earn'); if(rsE) rsE.textContent = 'â‚¦' + rb.toLocaleString() + '.00'; var wAb = document.getElementById('wd-act-bal-card'); if(wAb) wAb.textContent = 'â‚¦' + ab.toLocaleString() + '.00'; var wRb = document.getElementById('wd-ref-bal-card'); if(wRb) wRb.textContent = 'â‚¦' + rb.toLocaleString() + '.00';";
ci = ci.replace(target, repl);

fs.writeFileSync('index.html', ci);
console.log('Done!');
