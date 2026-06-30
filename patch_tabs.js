const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Add showAdminPanel function
const showAdminPanelFn = `
  function showAdminPanel(panelId, el) {
    var panels = document.querySelectorAll('.admin-main .panel');
    panels.forEach(function(p){ p.classList.remove('active'); });
    var target = document.getElementById('apanel-' + panelId);
    if(target) target.classList.add('active');
    
    if(el && el.classList.contains('sb-item')) {
      var items = document.querySelectorAll('.admin-sidebar .sb-item');
      items.forEach(function(i){ i.classList.remove('active'); });
      el.classList.add('active');
    }
    window.scrollTo(0,0);
  }
`;
content = content.replace("function showPanel(panelId, el) {", showAdminPanelFn + "\n  function showPanel(panelId, el) {");

// 2. Add Notifications Tab to Sidebar
content = content.replace(
    `<div class="sb-item" onclick="showAdminPanel('settings',this)">`,
    `<div class="sb-item" onclick="showAdminPanel('notifications',this)"><span class="sb-item-icon">🔔</span> Notifications</div>
        <div class="sb-item" onclick="showAdminPanel('settings',this)">`
);

// 3. Extract Welcome and Popup sections from Settings
const popupSectionRegex = /<!-- Global Popup Notification -->[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;
const popupSectionMatch = content.match(popupSectionRegex);
let popupSection = '';
if (popupSectionMatch) {
    popupSection = popupSectionMatch[0];
    content = content.replace(popupSectionMatch[0], ''); // Remove from settings
} else {
    console.log("Could not find popup section by regex");
}

const welcomeSectionRegex = /<!-- Welcome Message Settings -->[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;
const welcomeSectionMatch = content.match(welcomeSectionRegex);
let welcomeSection = '';
if (welcomeSectionMatch) {
    welcomeSection = welcomeSectionMatch[0];
    content = content.replace(welcomeSectionMatch[0], ''); // Remove from settings
} else {
    console.log("Could not find welcome section by regex");
}

// 4. Create Notifications Panel
const notificationsPanelHtml = `
    <!-- NOTIFICATIONS PANEL -->
    <div class="panel" id="apanel-notifications">
      <div class="pane-title">NOTIFICATIONS & MESSAGES</div>
      <div class="pane-sub">Manage alerts, popups, and welcome messages sent to users.</div>
      ${welcomeSection}
      ${popupSection}
    </div>
`;

// Insert notifications panel right before settings panel
content = content.replace(
    `<!-- SETTINGS PANEL -->`,
    `${notificationsPanelHtml}\n    <!-- SETTINGS PANEL -->`
);

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully added Notifications tab and fixed tabs.");
