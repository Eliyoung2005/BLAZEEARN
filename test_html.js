const fs = require('fs');
const server = fs.readFileSync('c:/Users/PC/Desktop/BlazeEarn/server.js', 'utf8');
const idx = server.indexOf('app.get(\'/staff-dashboard');
console.log(server.substring(idx, idx+400));
