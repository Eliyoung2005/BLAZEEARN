const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

const regexMakeVendor = /await api\('POST', '\/api\/vendors'/g;
content = content.replace(regexMakeVendor, "await api('POST', '/api/admin/vendors'");

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully patched API route for make vendor.");
