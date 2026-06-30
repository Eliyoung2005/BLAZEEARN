const db = require('./database');
const crypto = require('crypto');

const newCode = 'TEST-' + crypto.randomBytes(4).toString('hex').toUpperCase();

db.serialize(() => {
    db.run('INSERT INTO coupons (code) VALUES (?)', [newCode], function(err) {
        if (err) {
            console.error('Error:', err.message);
        } else {
            console.log('Successfully generated test coupon code:', newCode);
        }
    });
});
