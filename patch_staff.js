const fs = require('fs');
let code = fs.readFileSync('c:/Users/PC/Desktop/BlazeEarn/server.js', 'utf8');
code = code.replace("app.get('/staff-dashboard', (req, res) => {\r\n    res.sendFile(path.join(__dirname, 'BlazeEarn', 'public', 'index.html'));\r\n});", "app.get('/staff-dashboard', (req, res) => {\r\n    res.sendFile(path.join(__dirname, 'BlazeEarn', 'public', 'staff.html'));\r\n});");
code = code.replace("app.get('/staff-dashboard', (req, res) => {\n    res.sendFile(path.join(__dirname, 'BlazeEarn', 'public', 'index.html'));\n});", "app.get('/staff-dashboard', (req, res) => {\n    res.sendFile(path.join(__dirname, 'BlazeEarn', 'public', 'staff.html'));\n});");
fs.writeFileSync('c:/Users/PC/Desktop/BlazeEarn/server.js', code, 'utf8');
console.log('Patched server.js to use staff.html');
