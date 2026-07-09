const db = require('sqlite3').verbose();
const d = new db.Database('users.db');

d.all('SELECT username FROM users WHERE username NOT IN (SELECT usedBy FROM coupons WHERE usedBy IS NOT NULL)', (err, users) => {
    if (users && users.length > 0) {
        d.all('SELECT code FROM coupons WHERE isUsed = 0 OR isUsed = FALSE OR isUsed IS NULL LIMIT ?', [users.length], (e, coupons) => {
            if (coupons) {
                users.forEach((u, i) => {
                    if (coupons[i]) {
                        d.run('UPDATE coupons SET isUsed = TRUE, usedBy = ? WHERE code = ?', [u.username, coupons[i].code], (err2) => {
                            console.log('Fixed coupon for', u.username, 'using code', coupons[i].code);
                        });
                    }
                });
            }
        });
    } else {
        console.log('No users found missing a coupon.');
    }
});
