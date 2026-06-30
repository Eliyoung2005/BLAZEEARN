const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');
ci = ci.replace('<div class="bottom-nav" id="bottom-nav">', '<div class="bottom-nav" id="bottom-nav" style="display:none !important;">');
fs.writeFileSync('index.html', ci);
