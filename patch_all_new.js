const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');

// 1. Hamburger logic (from patch_hamburger.js)
let oldSidebar = `<div id="dashboard" class="page">
  <!-- SIDEBAR -->
  <div class="sidebar">`;
let newSidebar = `<div id="dashboard" class="page">
  <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
  <!-- SIDEBAR -->
  <div class="sidebar" id="mobile-sidebar">
    <div style="text-align:right; margin-bottom:10px; display:none;" class="mobile-close-btn">
      <button onclick="toggleSidebar()" style="background:none;border:none;color:var(--text);font-size:24px;cursor:pointer;">&times;</button>
    </div>`;
if (ci.includes(oldSidebar)) ci = ci.replace(oldSidebar, newSidebar);

let oldNav = `<div class="dash-head">`;
let newNav = `<div class="dash-head">
      <!-- HAMBURGER MENU BUTTON -->
      <button class="hamburger-btn" onclick="toggleSidebar()">
        <div style="width:24px; height:3px; background:var(--text); margin:5px 0; border-radius:3px;"></div>
        <div style="width:24px; height:3px; background:var(--text); margin:5px 0; border-radius:3px;"></div>
        <div style="width:24px; height:3px; background:var(--text); margin:5px 0; border-radius:3px;"></div>
      </button>`;
if (ci.includes(oldNav)) ci = ci.replace(oldNav, newNav);

let oldCss = `.sidebar{display:none !important;}`;
let newCss = `.sidebar {
  display: flex !important;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 10000;
  background: var(--card);
}
.sidebar.active { transform: translateX(0); }
.hamburger-btn { display: inline-block; background: none; border: none; cursor: pointer; margin-right: 15px; }
.sidebar-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: none; }
.sidebar-overlay.active { display: block; }
@media(min-width: 769px) {
  .sidebar { transform: translateX(0) !important; position: fixed !important; z-index: 100; }
  .hamburger-btn { display: none !important; }
  .sidebar-overlay { display: none !important; }
}
@media(max-width: 768px) {
  .mobile-close-btn { display: block !important; }
}`;
if (ci.includes(oldCss)) ci = ci.replace(oldCss, newCss);

if (!ci.includes('function toggleSidebar()')) {
    ci += `\n<script>\nfunction toggleSidebar() {\n  document.getElementById('mobile-sidebar').classList.toggle('active');\n  document.querySelector('.sidebar-overlay').classList.toggle('active');\n}\n</script>\n`;
}

// 2. Task button fixes
let rtOld = `'<a href="'+t.link+'" target="_blank" class="btn-link">🔗 Open Task Link</a>'+`;
let rtNew = `'<a href="'+t.link+'" target="_blank" class="btn-link" onclick="sessionStorage.setItem(\\'task_opened_\\'+'+t.id+', \\'true\\')">🔗 Open Task Link</a>'+`;
if (ci.includes(rtOld)) ci = ci.replace(rtOld, rtNew);

let ctOld = `if(!task||!currentUser)return;
  btn.disabled=true; btn.textContent='Verifying...';`;
let ctNew = `if(!task||!currentUser)return;
  if (!sessionStorage.getItem('task_opened_' + task.id)) {
      return showToast('You must open the task link before completing it!', '#FF3B3B');
  }
  btn.disabled=true; btn.textContent='Verifying...';`;
if (ci.includes(ctOld)) ci = ci.replace(ctOld, ctNew);

let ctOld2 = `showToast('+₦'+task.reward+' activity earnings added!','#00FF88');`;
let ctNew2 = `sessionStorage.removeItem('task_opened_' + task.id);
    showToast('+₦'+task.reward+' activity earnings added!','#00FF88');`;
if (ci.includes(ctOld2)) ci = ci.replace(ctOld2, ctNew2);

// 3. Popup message fixes
let pOld = `// Show popup if available
            if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {
                const currentMsg = appSettings.popupMessage.trim();
                document.getElementById('global-popup-content').innerText = currentMsg;
                document.getElementById('global-popup-modal').classList.add('active');
            }`;
let pNew = `// Show popup if available (only once per session until logout)
            if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {
                const currentMsg = appSettings.popupMessage.trim();
                if (!sessionStorage.getItem('global_popup_shown')) {
                    document.getElementById('global-popup-content').innerText = currentMsg;
                    document.getElementById('global-popup-modal').classList.add('active');
                    sessionStorage.setItem('global_popup_shown', 'true');
                }
            }`;
if (ci.includes(pOld)) ci = ci.replace(pOld, pNew);

fs.writeFileSync('index.html', ci);
console.log('Applied patches to index.html!');
