const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
    /currentWaVendor = \{ contact: contact, message: customMessage \|\| '' \};/,
    `currentWaVendor = { contact: contact, message: customMessage || 'Hello! I am messaging you from BlazeEarn to purchase a coupon code.' };`
);

fs.writeFileSync('index.html', html);
console.log("Patched index.html for WhatsApp default custom message");
