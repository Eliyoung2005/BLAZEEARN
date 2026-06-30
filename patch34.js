const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

const oldDelete = `app.delete('/api/admin/users/:id', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(200).json({ success: true, message: 'User deleted.' });
    });
});`;

const newDelete = `app.delete('/api/admin/users/:id', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const userIdToDelete = req.params.id;

    db.get('SELECT username, referredBy FROM users WHERE id = ?', [userIdToDelete], (err, userToDelete) => {
        if (err || !userToDelete) return res.status(404).json({ error: 'User not found' });
        
        const username = userToDelete.username;
        const referrer = userToDelete.referredBy;

        db.get('SELECT referralBonus FROM settings WHERE id = 1', [], (err, settingRow) => {
            const refBonus = (settingRow && settingRow.referralBonus !== undefined) ? settingRow.referralBonus : 1500;

            if (referrer) {
                // Deduct the referral bonus from the referrer's balance. Use MAX(0, ...) so it doesn't go negative.
                db.run('UPDATE users SET referralBalance = MAX(0, referralBalance - ?) WHERE username = ?', [refBonus, referrer], (err) => {
                    if (err) console.error("Failed to deduct from referrer", err);
                });
            }

            db.serialize(() => {
                db.run('DELETE FROM user_tasks WHERE username = ?', [username]);
                db.run('DELETE FROM data_claims WHERE userId = ?', [userIdToDelete]);
                db.run('DELETE FROM withdrawals WHERE userId = ?', [userIdToDelete]);
                
                db.run('DELETE FROM users WHERE id = ?', [userIdToDelete], function(err) {
                    if (err) return res.status(500).json({ error: 'Database error while deleting user' });
                    res.status(200).json({ success: true, message: 'User and all related data deleted. Referral earnings deducted from referrer.' });
                });
            });
        });
    });
});`;

server = server.replace(oldDelete, newDelete);

fs.writeFileSync('server.js', server);
console.log("Patched server.js for cascading delete");
