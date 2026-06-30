const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// 1. Update GET /api/user/profile to return isVendor
content = content.replace(
    "res.json({ success: true, user: row });",
    "res.json({ success: true, user: { ...row, isVendor: !!row.isVendor } });"
);

// 2. Update POST /api/admin/coupons to accept vendor
content = content.replace(
    "const count = parseInt(req.body.count) || 1;",
    "const count = parseInt(req.body.count) || 1;\n    const vendor = req.body.vendor || null;"
);
content = content.replace(
    "const stmt = db.prepare('INSERT INTO coupons (code) VALUES (?)');",
    "const stmt = db.prepare('INSERT INTO coupons (code, assignedVendor) VALUES (?, ?)');"
);
content = content.replace(
    "stmt.run(newCode, function(err) {",
    "stmt.run(newCode, vendor, function(err) {"
);

// 3. Add PUT /api/admin/users/:id/vendor
const upgradeVendorEndpoint = `
// Admin: Upgrade user to vendor
app.put('/api/admin/users/:id/vendor', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        db.run('UPDATE users SET isVendor = 1 WHERE id = ?', [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to upgrade user' });
            
            // Also insert into vendors table
            db.run('INSERT INTO vendors (name, contact, linkedUsername) VALUES (?, ?, ?)',
                [\`\${user.firstName} \${user.lastName}\`, user.phone || '', user.username], 
                function(err) {
                    res.json({ success: true, message: 'User upgraded to vendor' });
                }
            );
        });
    });
});
`;
content = content.replace('// Admin: Delete user', upgradeVendorEndpoint + '\n// Admin: Delete user');

// 4. Update GET /api/admin/vendors
const getVendorsRegex = /app\.get\('\/api\/admin\/vendors', \(req, res\) => \{[\s\S]*?\}\);/;
const newGetVendors = `app.get('/api/admin/vendors', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const query = \`
        SELECT v.*, 
            (SELECT COUNT(*) FROM coupons WHERE assignedVendor = v.linkedUsername) as totalCoupons,
            (SELECT COUNT(*) FROM coupons WHERE assignedVendor = v.linkedUsername AND isUsed = 0 AND isDeleted = 0) as activeCoupons,
            (SELECT COUNT(*) FROM coupons WHERE assignedVendor = v.linkedUsername AND isUsed = 1) as usedCoupons
        FROM vendors v
        ORDER BY v.createdAt DESC
    \`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch vendors.' });
        res.json({ success: true, vendors: rows });
    });
});`;
content = content.replace(getVendorsRegex, newGetVendors);

// 5. Add GET /api/vendor/stats
const vendorStatsEndpoint = `
// Vendor: Get Dashboard Stats
app.get('/api/vendor/dashboard', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    db.get('SELECT * FROM users WHERE token = ?', [token], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid token' });
        if (!user.isVendor) return res.status(403).json({ error: 'Not a vendor' });
        
        db.all('SELECT * FROM coupons WHERE assignedVendor = ? ORDER BY createdAt DESC', [user.username], (err, coupons) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            const stats = {
                total: coupons.length,
                active: coupons.filter(c => !c.isUsed && !c.isDeleted).length,
                used: coupons.filter(c => c.isUsed).length
            };
            
            res.json({ success: true, stats, coupons });
        });
    });
});
`;
content = content.replace('// Get active tasks (Public)', vendorStatsEndpoint + '\n// Get active tasks (Public)');

fs.writeFileSync(serverPath, content, 'utf8');
console.log("Successfully patched server.js for vendor functionality.");
