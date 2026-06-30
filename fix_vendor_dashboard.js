const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');

// Replace the buggy api call for vendor dashboard
ci = ci.replace("api('GET', '/api/vendor/dashboard', null, true)", "api('GET', '/api/vendor/dashboard')");

fs.writeFileSync('index.html', ci);
console.log('Fixed loadVendorDashboard api call!');
