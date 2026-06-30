const fs = require('fs');
let code = fs.readFileSync('c:/Users/PC/Desktop/BlazeEarn/server.js', 'utf8');
if (!code.includes('/api/debug')) {
    code = code.replace('app.get(\'/api/tasks\'', 'app.get(\'/api/debug\', (req, res) => { console.log(\'[FRONTEND ERROR]:\', req.query.err); res.sendStatus(200); });\napp.get(\'/api/tasks\'');
    fs.writeFileSync('c:/Users/PC/Desktop/BlazeEarn/server.js', code, 'utf8');
    console.log('Patched server.js');
}
