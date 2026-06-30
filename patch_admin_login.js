const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

const target = `    localStorage.setItem('blaze_admin_token', adminToken);
    updateAdminStats();refreshCouponsTable();refreshVendorAdminList();`;

const replacement = `    localStorage.setItem('blaze_admin_token', adminToken);
    showPage('admin');
    updateAdminStats();refreshCouponsTable();refreshVendorAdminList();`;

content = content.replace(target, replacement);

// And we can remove the old showPage('admin'); below
const target2 = `}refreshUsersTable();refreshVendorDropdown();refreshTasksAdminTable();refreshDataClaimsTable();refreshWithdrawalTables();
    showPage('admin');
    showToast('Admin access granted','#4488FF');`;

const replacement2 = `}refreshUsersTable();refreshVendorDropdown();refreshTasksAdminTable();refreshDataClaimsTable();refreshWithdrawalTables();
    showToast('Admin access granted','#4488FF');`;

content = content.replace(target2, replacement2);

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully fixed login logout issue");
