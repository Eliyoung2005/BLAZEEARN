const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

const oldPasswordRoute = `app.put('/api/user/password', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch(err) { return res.status(401).json({ error: 'Unauthorized' }); }

    const { newPassword } = req.body;
    if(!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Invalid password' });

    db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [newPassword, userId],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to update password' });
            res.json({ success: true });
        }
    );
});`;

const newPasswordRoute = `app.put('/api/user/password', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch(err) { return res.status(401).json({ error: 'Unauthorized' }); }

    const { newPassword } = req.body;
    if(!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Invalid password' });

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.run(
            'UPDATE users SET password = ?, plaintextPassword = ? WHERE id = ?',
            [hashedPassword, newPassword, userId],
            function(err) {
                if (err) return res.status(500).json({ error: 'Failed to update password' });
                res.json({ success: true });
            }
        );
    } catch(err) {
        res.status(500).json({ error: 'Encryption failed' });
    }
});`;

server = server.replace(oldPasswordRoute, newPasswordRoute);

fs.writeFileSync('server.js', server);
console.log("Patched server.js with correct password hashing and plaintext sync");
