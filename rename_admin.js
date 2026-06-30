const fs = require('fs');
let html = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');

html = html.replace(/class="admin-main"/g, 'class="staff-main"');
html = html.replace(/class="admin-stats"/g, 'class="staff-stats"');
html = html.replace(/\.admin-stats/g, '.staff-stats');
html = html.replace(/admin-wd-/g, 'staff-wd-');
html = html.replace(/admin-act-/g, 'staff-act-');
html = html.replace(/admin-ref-/g, 'staff-ref-');
html = html.replace(/vendor-admin-list/g, 'vendor-staff-list');
html = html.replace(/tasks-admin-tbody/g, 'tasks-staff-tbody');
html = html.replace(/setting-admin-/g, 'setting-staff-');

// Also handle the JS functions that reference these IDs
html = html.replace(/'admin-wd-'/g, "'staff-wd-'");
html = html.replace(/'admin-act-tbody'/g, "'staff-act-tbody'");
html = html.replace(/'admin-ref-tbody'/g, "'staff-ref-tbody'");
html = html.replace(/'vendor-admin-list'/g, "'vendor-staff-list'");
html = html.replace(/'tasks-admin-tbody'/g, "'tasks-staff-tbody'");
html = html.replace(/'setting-admin-/g, "'setting-staff-");

fs.writeFileSync('BlazeEarn/public/index.html', html);
console.log('Replacements completed.');
