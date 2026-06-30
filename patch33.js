const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const oldFooterText = `&copy; 2025 BlazeEarn. All rights reserved. Nigeria's No.1 Earn and Reward Platform.`;
const newFooterText = `<p>&copy; 2026 BlazeEarn. All rights reserved.<br><strong><a href="https://wa.link/5npl0x" target="_blank" rel="noopener"><span style="color: #10b981;">Developed by Abazceboi</span></a></strong></p>`;

html = html.replace(oldFooterText, newFooterText);

fs.writeFileSync('index.html', html);
console.log("Patched index.html footer");
