const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace the clipboard icon in Activity Earnings card
html = html.replace(/<div style="font-size:2.4rem;margin-bottom:12px;">📋<\/div>/g, '');

// Replace the people icon in Referral Earnings card
html = html.replace(/<div style="font-size:2.4rem;margin-bottom:12px;">👥<\/div>/g, '');

fs.writeFileSync('index.html', html);
console.log("Patched index.html - removed selection icons from withdrawal page");
