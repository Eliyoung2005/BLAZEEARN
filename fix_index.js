const fs = require('fs');
let html = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');

const regex = /if\s*\(window\.location\.pathname\s*===\s*'\/admin-dashboard'\)\s*\{\s*if\s*\(adminToken\)\s*\{\s*loadAdminDashboard\(\);\s*\}\s*else\s*\{\s*window\.location\.href\s*=\s*'\/admin-login';\s*\}\s*\}/g;
html = html.replace(regex, "");

const regex2 = /if\s*\(window\.location\.pathname\s*===\s*'\/staff-dashboard'\)\s*\{\s*if\s*\(adminToken\)\s*\{\s*loadAdminDashboard\(\);\s*\}\s*else\s*\{\s*window\.location\.href\s*=\s*'\/admin-login';\s*\}\s*\}/g;
html = html.replace(regex2, "if (window.location.pathname === '/staff-dashboard') {\n    if (adminToken) {\n      loadAdminDashboard();\n    } else {\n      window.location.href = '/admin-login';\n    }\n  } else ");

fs.writeFileSync('BlazeEarn/public/index.html', html);
