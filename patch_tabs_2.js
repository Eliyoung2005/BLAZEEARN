const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Move Global Popup from Settings to Notifications
const popupRegex = /<!-- Popup Message -->[\s\S]*?(?=<!-- Admin Credentials -->)/;
const popupMatch = content.match(popupRegex);

if (popupMatch) {
    const popupHtml = popupMatch[0];
    // Remove it from settings
    content = content.replace(popupHtml, '');
    
    // Inject it into notifications panel
    content = content.replace('</div>\n    <!-- SETTINGS PANEL -->', `\n      ${popupHtml}\n    </div>\n    <!-- SETTINGS PANEL -->`);
} else {
    console.log("Could not find Popup Message block");
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully moved Popup Message.");
