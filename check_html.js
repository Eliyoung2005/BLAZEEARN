const fs = require('fs');
const html = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');
const idx = html.indexOf('<div id="staff-board"');
console.log(html.substring(idx, idx + 200));
