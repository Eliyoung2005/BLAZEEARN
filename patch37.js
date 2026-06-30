const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace the data-banner-icon line with nothing (remove it entirely)
html = html.replace(/<div class="data-banner-icon">📶<\/div>\s*/g, '');

// Remove the 🎉 emoji from the data-banner-title
html = html.replace(/🎉 YOU'VE BEEN REWARDED WITH 3GB DATA!/g, "YOU'VE BEEN REWARDED WITH 3GB DATA!");

fs.writeFileSync('index.html', html);
console.log("Patched index.html - removed icons from data reward banner");
