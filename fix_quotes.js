const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');
ci = ci.replace(/onclick="sessionStorage\.setItem\('task_opened_'\+t\.id, 'true'\)"/g, 'onclick="sessionStorage.setItem(\\\'task_opened_\\\' + t.id, \\\'true\\\')"');
fs.writeFileSync('index.html', ci);
console.log('Fixed quotes!');
