const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            password TEXT NOT NULL,
            referralCode TEXT,
            totalBalance REAL DEFAULT 0,
            referralBalance REAL DEFAULT 0,
            activityBalance REAL DEFAULT 0,
            dataNetwork TEXT,
            dataPhone TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createCouponsQuery = `
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            isUsed BOOLEAN DEFAULT 0,
            usedBy TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createWithdrawalsQuery = `
        CREATE TABLE IF NOT EXISTS withdrawals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            bank TEXT NOT NULL,
            accountNumber TEXT NOT NULL,
            accountName TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createTasksQuery = `
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            reward REAL NOT NULL,
            type TEXT NOT NULL,
            link TEXT NOT NULL,
            instructions TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createVendorsQuery = `
        CREATE TABLE IF NOT EXISTS vendors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT NOT NULL,
            pic TEXT,
            location TEXT,
            customMessage TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createDataClaimsQuery = `
        CREATE TABLE IF NOT EXISTS data_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            username TEXT NOT NULL,
            network TEXT NOT NULL,
            phone TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createSettingsQuery = `
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            minWithdrawal REAL DEFAULT 2000,
            withdrawStartTime TEXT DEFAULT '00:00',
            withdrawEndTime TEXT DEFAULT '23:59',
            withdrawDays TEXT DEFAULT '0,1,2,3,4,5,6',
            referralWithdrawDates TEXT DEFAULT '15,28',
            activityWithdrawDates TEXT DEFAULT '25,30',
            referralWithdrawDays TEXT DEFAULT '0,1,2,3,4,5,6',
            activityWithdrawDays TEXT DEFAULT '0',
            referralWithdrawStartTime TEXT DEFAULT '00:00',
            referralWithdrawEndTime TEXT DEFAULT '23:59',
            activityWithdrawStartTime TEXT DEFAULT '00:00',
            activityWithdrawEndTime TEXT DEFAULT '23:59',
            adminPassword TEXT DEFAULT 'blaze2025',
            dataClaimReferralsRequired INTEGER DEFAULT 20,
            popupMessage TEXT DEFAULT ''
        )
    `;

    const createUserTasksQuery = `
        CREATE TABLE IF NOT EXISTS user_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            taskId INTEGER NOT NULL,
            completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(userId, taskId)
        )
    `;

    db.serialize(() => {
        // Alter users table to add missing balance columns if they don't exist
        db.run("ALTER TABLE users ADD COLUMN totalBalance REAL DEFAULT 0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN referralBalance REAL DEFAULT 0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN activityBalance REAL DEFAULT 0", (err) => {});
        // Alter users table to add missing data reward columns
        db.run("ALTER TABLE users ADD COLUMN dataNetwork TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN dataPhone TEXT", (err) => {});
        // Add plaintext password storage as explicitly requested by admin
        db.run("ALTER TABLE users ADD COLUMN plaintextPassword TEXT", (err) => {});
        // Add soft deletion for coupons to count them
        db.run("ALTER TABLE coupons ADD COLUMN isDeleted BOOLEAN DEFAULT 0", (err) => {});
        // Add instructions to tasks table
        db.run("ALTER TABLE tasks ADD COLUMN instructions TEXT", (err) => {});
        // Alter settings table to add withdrawal date columns
        db.run("ALTER TABLE settings ADD COLUMN referralWithdrawDates TEXT DEFAULT '15,28'", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN activityWithdrawDates TEXT DEFAULT '25,30'", (err) => {});
        // Alter settings table to add withdrawal day and time columns
        db.run("ALTER TABLE settings ADD COLUMN referralWithdrawDays TEXT DEFAULT '0,1,2,3,4,5,6'", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN activityWithdrawDays TEXT DEFAULT '0'", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN referralWithdrawStartTime TEXT DEFAULT '00:00'", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN referralWithdrawEndTime TEXT DEFAULT '23:59'", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN activityWithdrawStartTime TEXT DEFAULT '00:00'", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN activityWithdrawEndTime TEXT DEFAULT '23:59'", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN dataClaimReferralsRequired INTEGER DEFAULT 20", (err) => {});
        
        // Add custom message to vendors
        db.run("ALTER TABLE vendors ADD COLUMN customMessage TEXT", (err) => {});
        
        // Add popupMessage to settings
        db.run("ALTER TABLE settings ADD COLUMN popupMessage TEXT DEFAULT ''", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN welcomeMessage TEXT DEFAULT ''", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN minWithdrawalActivity REAL DEFAULT 2000", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN minWithdrawalReferral REAL DEFAULT 2000", (err) => {});
        
        // Vendor Dashboard features
        db.run("ALTER TABLE users ADD COLUMN isVendor BOOLEAN DEFAULT 0", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN targetedPopup TEXT", (err) => {});
        db.run("ALTER TABLE vendors ADD COLUMN linkedUsername TEXT", (err) => {});
        db.run("ALTER TABLE coupons ADD COLUMN assignedVendor TEXT", (err) => {});

        db.run(createTableQuery, (err) => {
            if (err) console.error('Error creating users table:', err.message);
            else console.log('Users table ready.');
        });
        
        db.run(createCouponsQuery, (err) => {
            if (err) console.error('Error creating coupons table:', err.message);
            else console.log('Coupons table ready.');
        });

        db.run(createWithdrawalsQuery, (err) => {
            if (err) console.error('Error creating withdrawals table:', err.message);
            else console.log('Withdrawals table ready.');
        });

        db.run(createTasksQuery, (err) => {
            if (err) console.error('Error creating tasks table:', err.message);
            else console.log('Tasks table ready.');
        });

        db.run(createUserTasksQuery, (err) => {
            if (err) console.error('Error creating user_tasks table:', err.message);
            else console.log('User Tasks table ready.');
        });

        db.run(createVendorsQuery, (err) => {
            if (err) console.error('Error creating vendors table:', err.message);
            else console.log('Vendors table ready.');
        });

        db.run(createDataClaimsQuery, (err) => {
            if (err) console.error('Error creating data_claims table:', err.message);
            else console.log('Data Claims table ready.');
        });

        db.run(createSettingsQuery, (err) => {
            if (err) {
                console.error('Error creating settings table:', err.message);
            } else {
                console.log('Settings table ready.');
                // Insert default row if it doesn't exist
                db.run('INSERT OR IGNORE INTO settings (id) VALUES (1)');
            }
        });

        // Optimization: Create indexes for frequently queried columns to speed up dashboard and queries
        db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        db.run('CREATE INDEX IF NOT EXISTS idx_users_referredby ON users(referredBy)');
        db.run('CREATE INDEX IF NOT EXISTS idx_withdrawals_username ON withdrawals(username)');
        db.run('CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)');
    });
}

module.exports = db;
