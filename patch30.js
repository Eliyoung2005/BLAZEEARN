const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

// 1. Modify GET /api/vendor/dashboard to include customMessage
const vendorDashboardMatch = /res\.status\(200\)\.json\(\{\n\s*stats: \{ total, active, used \},\n\s*coupons: coupons\n\s*\}\);\n\s*\}\);\n\s*\}\);/g;

const vendorDashboardReplacement = `db.get('SELECT customMessage FROM vendors WHERE linkedUsername = ?', [user.username], (err, vendorRow) => {
                res.status(200).json({
                    stats: { total, active, used },
                    coupons: coupons,
                    customMessage: vendorRow ? (vendorRow.customMessage || '') : ''
                });
            });
        });
    });`;

server = server.replace(vendorDashboardMatch, vendorDashboardReplacement);

// 2. Add PUT /api/vendor/custom-message
const updateCustomMessageEndpoint = `
// Vendor: Update Custom WhatsApp Message
app.put('/api/vendor/custom-message', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch(err) { return res.status(401).json({ error: 'Unauthorized' }); }

    db.get('SELECT username, isVendor FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user || !user.isVendor) return res.status(403).json({ error: 'Forbidden' });
        
        const { customMessage } = req.body;
        db.run('UPDATE vendors SET customMessage = ? WHERE linkedUsername = ?', [customMessage || '', user.username], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.status(200).json({ success: true, message: 'Custom message updated successfully' });
        });
    });
});
`;

if (!server.includes("app.put('/api/vendor/custom-message'")) {
    server = server.replace(/\/\/ --- VENDORS API ---/g, "// --- VENDORS API ---\n" + updateCustomMessageEndpoint);
}

fs.writeFileSync('server.js', server);
console.log("Patched server.js for Vendor Custom Message UI");
