const fs = require('fs');
let html = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');
html = html.replace(
  "var isAdminPage = document.getElementById('staff-board').classList.contains('active');",
  "var isAdminPage = window.location.pathname === '/staff-dashboard' || document.getElementById('staff-board').classList.contains('active');"
);
fs.writeFileSync('BlazeEarn/public/index.html', html);
