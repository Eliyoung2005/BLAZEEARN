const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    
    db.serialize(() => {
        const columns = [
            'ALTER TABLE users ADD COLUMN referredBy TEXT;',
            'ALTER TABLE users ADD COLUMN referralBalance REAL DEFAULT 0;',
            'ALTER TABLE users ADD COLUMN activityBalance REAL DEFAULT 0;',
            'ALTER TABLE users ADD COLUMN totalBalance REAL DEFAULT 200;'
        ];
        
        columns.forEach((query) => {
            db.run(query, (err) => {
                if (err) {
                    if (err.message.includes('duplicate column name')) {
                        console.log(`Column already exists. Skipping...`);
                    } else {
                        console.error('Error altering table:', err.message);
                    }
                } else {
                    console.log(`Successfully executed: ${query}`);
                }
            });
        });
    });
});
