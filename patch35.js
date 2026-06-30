const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

const oldDeleteBlock = `    db.get('SELECT username, referredBy FROM users WHERE id = ?', [userIdToDelete], (err, userToDelete) => {
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
    });`;

const newDeleteBlock = `    db.get('SELECT username, referredBy FROM users WHERE id = ?', [userIdToDelete], (err, userToDelete) => {
        if (err || !userToDelete) return res.status(404).json({ error: 'User not found' });
        
        const username = userToDelete.username;
        const referrer = userToDelete.referredBy;

        // Perform balance deductions first
        if (referrer) {
            // Deduct 500 (direct referral bonus) from referrer's balances
            db.run('UPDATE users SET referralBalance = MAX(0, referralBalance - 500), totalBalance = MAX(0, totalBalance - 500) WHERE username = ?', [referrer], (err) => {
                if (err) console.error("Failed to deduct direct bonus from referrer:", err);
            });

            // Find grandparent (referrer of referrer) and deduct 50 (indirect referral bonus)
            db.get('SELECT referredBy FROM users WHERE username = ?', [referrer], (err, parentRow) => {
                if (!err && parentRow && parentRow.referredBy) {
                    const grandparent = parentRow.referredBy;
                    db.run('UPDATE users SET referralBalance = MAX(0, referralBalance - 50), totalBalance = MAX(0, totalBalance - 50) WHERE username = ?', [grandparent], (err) => {
                        if (err) console.error("Failed to deduct indirect bonus from grandparent:", err);
                    });
                }
            });
        }

        db.serialize(() => {
            db.run('DELETE FROM user_tasks WHERE username = ?', [username]);
            db.run('DELETE FROM data_claims WHERE userId = ?', [userIdToDelete]);
            db.run('DELETE FROM withdrawals WHERE userId = ?', [userIdToDelete]);
            
            db.run('DELETE FROM users WHERE id = ?', [userIdToDelete], function(err) {
                if (err) return res.status(500).json({ error: 'Database error while deleting user' });
                res.status(200).json({ success: true, message: 'User and all related data deleted. Referral earnings deducted from referrers.' });
            });
        });
    });`;

server = server.replace(oldDeleteBlock, newDeleteBlock);

fs.writeFileSync('server.js', server);
console.log("Patched server.js with correct referral balance deduction on user deletion");
