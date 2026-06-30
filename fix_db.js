const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting:', err.message);
        return;
    }
    
    db.run("UPDATE users SET referralCode = username WHERE referralCode IS NULL;", function(err) {
        if (err) {
            console.error('Update failed:', err.message);
        } else {
            console.log(`Updated ${this.changes} rows.`);
        }
        db.close();
    });
});
