const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf-8');

html = html.replace(/target-notif-usernamename/g, 'target-notif-username');

fs.writeFileSync('index.html', html);
console.log("Fixed the double name typo!");
