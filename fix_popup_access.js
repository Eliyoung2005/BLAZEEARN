const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');

// Replace global popup condition
ci = ci.replace("if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {", "if (userToken && appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {");

fs.writeFileSync('index.html', ci);
console.log('Fixed popup access logic');
