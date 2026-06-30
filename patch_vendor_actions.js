const fs = require('fs');
const path = require('path');

// 1. Update index.html to add Toggle Vendor button
const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

const userRowOriginal = `return '<tr><td style="color:var(--muted);">'+(i+1)+'</td><td>'+u.firstName+' '+u.lastName+'</td><td style="color:var(--gold);">@'+u.username+'</td><td>'+u.phone+'</td><td style="color:var(--muted);">'+u.email+'</td><td>'+pass+'</td><td><button class="btn btn-ghost btn-sm" onclick="viewUserReferrals(\\''+u.username+'\\', \\''+(u.referralCode||u.username)+'\\')">Referrals ('+(u.direct_referrals||0)+')</button> <button class="btn btn-ghost btn-sm" onclick="openEditUserModal('+u.id+')">Edit</button> <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="deleteUser('+u.id+')">Delete</button></td></tr>';`;

const userRowNew = `var vendorBtn = u.isVendor ? '<button class="btn btn-ghost btn-sm" style="color:var(--fire);" onclick="toggleVendor('+u.id+', false)">Demote Vendor</button>' : '<button class="btn btn-ghost btn-sm" style="color:var(--green);" onclick="toggleVendor('+u.id+', true)">Make Vendor</button>';
      return '<tr><td style="color:var(--muted);">'+(i+1)+'</td><td>'+u.firstName+' '+u.lastName+'</td><td style="color:var(--gold);">@'+u.username+'</td><td>'+u.phone+'</td><td style="color:var(--muted);">'+u.email+'</td><td>'+pass+'</td><td style="display:flex;gap:4px;flex-wrap:wrap;"><button class="btn btn-ghost btn-sm" onclick="viewUserReferrals(\\''+u.username+'\\', \\''+(u.referralCode||u.username)+'\\')">Referrals ('+(u.direct_referrals||0)+')</button> <button class="btn btn-ghost btn-sm" onclick="openEditUserModal('+u.id+')">Edit</button> ' + vendorBtn + ' <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="deleteUser('+u.id+')">Delete</button></td></tr>';`;

indexContent = indexContent.replace(userRowOriginal, userRowNew);

const toggleVendorScript = `
async function toggleVendor(id, makeVendor) {
    if(!confirm(makeVendor ? "Upgrade this user to a Vendor?" : "Remove Vendor status from this user?")) return;
    try {
        var endpoint = makeVendor ? '/api/admin/users/' + id + '/vendor' : '/api/admin/users/' + id + '/remove-vendor';
        var res = await api('PUT', endpoint, null, true);
        if(res.success) {
            showToast(makeVendor ? 'User upgraded to Vendor!' : 'User demoted from Vendor!', '#00FF88');
            refreshUsersTable();
        }
    } catch(err) {
        showToast(err.message, '#FF3B3B');
    }
}
`;

if (!indexContent.includes('toggleVendor(')) {
    indexContent = indexContent.replace('async function refreshUsersTable(){', toggleVendorScript + '\nasync function refreshUsersTable(){');
}

fs.writeFileSync(indexPath, indexContent, 'utf8');


// 2. Update server.js to add remove-vendor endpoint
const serverPath = path.join(__dirname, 'BlazeEarn/server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

const removeVendorEndpoint = `
// Admin: Demote vendor to user
app.put('/api/admin/users/:id/remove-vendor', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        db.run('UPDATE users SET isVendor = 0 WHERE id = ?', [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to demote user' });
            
            // Also delete from vendors table
            db.run('DELETE FROM vendors WHERE linkedUsername = ?', [user.username], function(err) {
                res.json({ success: true, message: 'User demoted from vendor' });
            });
        });
    });
});
`;

if (!serverContent.includes('/api/admin/users/:id/remove-vendor')) {
    serverContent = serverContent.replace('// Admin: Delete user', removeVendorEndpoint + '\n// Admin: Delete user');
}

fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log('Successfully patched admin UI and server for vendor toggling.');
