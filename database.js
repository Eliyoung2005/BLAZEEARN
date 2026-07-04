const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const usePostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.STORAGE_URL);

let db = null;
let importError = null;

function sqliteToPgSql(sql) {
    if (!sql) return sql;
    let translated = sql
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        .replace(/BOOLEAN DEFAULT 0/gi, 'BOOLEAN DEFAULT FALSE')
        .replace(/BOOLEAN DEFAULT 1/gi, 'BOOLEAN DEFAULT TRUE')
        .replace(/MAX\(/gi, 'GREATEST(');
    
    if (sql.includes('INSERT OR IGNORE INTO settings')) {
        translated = 'INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING';
    }
    
    // Auto-append RETURNING id to INSERT queries
    if (/^\s*INSERT/i.test(translated) && !/RETURNING/i.test(translated)) {
        translated += ' RETURNING id';
    }
    
    // Translate placeholders ? to $1, $2, etc.
    let index = 1;
    translated = translated.replace(/\?/g, () => `$${index++}`);
    return translated;
}

const camelCaseMap = {
    totalearned: 'totalEarned',
    directcount: 'directCount',
    indirectcount: 'indirectCount',
    firstname: 'firstName',
    lastname: 'lastName',
    referralcode: 'referralCode',
    referredby: 'referredBy',
    totalbalance: 'totalBalance',
    referralbalance: 'referralBalance',
    activitybalance: 'activityBalance',
    datanetwork: 'dataNetwork',
    dataphone: 'dataPhone',
    plaintextpassword: 'plaintextPassword',
    isvendor: 'isVendor',
    targetedpopup: 'targetedPopup',
    createdat: 'createdAt',
    usedcoupon: 'usedCoupon',
    welcomemessage: 'welcomeMessage',
    minwithdrawal: 'minWithdrawal',
    withdrawstarttime: 'withdrawStartTime',
    withdrawendtime: 'withdrawEndTime',
    withdrawdays: 'withdrawDays',
    referralwithdrawdates: 'referralWithdrawDates',
    activitywithdrawdates: 'activityWithdrawDates',
    referralwithdrawdays: 'referralWithdrawDays',
    activitywithdrawdays: 'activityWithdrawDays',
    referralwithdrawstarttime: 'referralWithdrawStartTime',
    referralwithdrawendtime: 'referralWithdrawEndTime',
    referralwithdrawenabled: 'referralWithdrawEnabled',
    activitywithdrawenabled: 'activityWithdrawEnabled',
    activitywithdrawstarttime: 'activityWithdrawStartTime',
    activitywithdrawendtime: 'activityWithdrawEndTime',
    adminpassword: 'adminPassword',
    dataclaimreferralsrequired: 'dataClaimReferralsRequired',
    popupmessage: 'popupMessage',
    minwithdrawalactivity: 'minWithdrawalActivity',
    minwithdrawalreferral: 'minWithdrawalReferral',
    emailverificationenabled: 'emailVerificationEnabled',
    smtphost: 'smtpHost',
    smtpport: 'smtpPort',
    smtpuser: 'smtpUser',
    smtppass: 'smtpPass',
    autopaymentenabled: 'autoPaymentEnabled',
    paymentgateway: 'paymentGateway',
    gatewaysecretkey: 'gatewaySecretKey',
    completedat: 'completedAt',
    accountnumber: 'accountNumber',
    accountname: 'accountName',
    usedby: 'usedBy',
    assignedvendor: 'assignedVendor',
    isused: 'isUsed',
    isdeleted: 'isDeleted',
    custommessage: 'customMessage',
    linkedusername: 'linkedUsername',
    withdrawalpin: 'withdrawalPin'
};

function normalizeRow(row) {
    if (!row) return row;
    const normalized = {};
    for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
            const mappedKey = camelCaseMap[key.toLowerCase()] || key;
            normalized[mappedKey] = row[key];
        }
    }
    return normalized;
}

if (usePostgres) {
    console.log('Using PostgreSQL database client...');
    try {
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.STORAGE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        db = {
            run: function(sql, params, callback) {
                const cb = typeof params === 'function' ? params : callback;
                const actualParams = typeof params === 'function' ? [] : params;
                const pgSql = sqliteToPgSql(sql);
                pool.query(pgSql, actualParams, function(err, res) {
                    if (err) {
                        // Map PostgreSQL duplicate key constraint message to SQLite format
                        if (err.code === '23505' || err.message.includes('unique constraint')) {
                            if (err.message.includes('email') || (err.detail && err.detail.includes('email'))) {
                                err.message = 'UNIQUE constraint failed: users.email';
                            } else if (err.message.includes('username') || (err.detail && err.detail.includes('username'))) {
                                err.message = 'UNIQUE constraint failed: users.username';
                            }
                        }
                        if (cb) cb(err);
                        return;
                    }
                    if (cb) {
                        const context = {
                            lastID: (res.rows && res.rows[0] && (res.rows[0].id || res.rows[0].lastid)) || null,
                            changes: res.rowCount
                        };
                        cb.call(context, null);
                    }
                });
                return this;
            },
            get: function(sql, params, callback) {
                const cb = typeof params === 'function' ? params : callback;
                const actualParams = typeof params === 'function' ? [] : params;
                const pgSql = sqliteToPgSql(sql);
                pool.query(pgSql, actualParams, (err, res) => {
                    if (err) {
                        if (cb) cb(err);
                        return;
                    }
                    if (cb) {
                        const row = res.rows[0] ? normalizeRow(res.rows[0]) : null;
                        cb(null, row);
                    }
                });
                return this;
            },
            all: function(sql, params, callback) {
                const cb = typeof params === 'function' ? params : callback;
                const actualParams = typeof params === 'function' ? [] : params;
                const pgSql = sqliteToPgSql(sql);
                pool.query(pgSql, actualParams, (err, res) => {
                    if (err) {
                        if (cb) cb(err);
                        return;
                    }
                    if (cb) {
                        const rows = (res.rows || []).map(normalizeRow);
                        cb(null, rows);
                    }
                });
                return this;
            },
            serialize: function(callback) {
                if (callback) callback();
                return this;
            },
            prepare: function(sql) {
                // Mock prepare statement for completeness
                return {
                    run: (params, callback) => {
                        this.run(sql, params, callback);
                    },
                    finalize: () => {}
                };
            }
        };

        // Initialize the database tables on Postgres startup
        setTimeout(() => {
            initializeDatabase();
        }, 100);

    } catch (e) {
        importError = e;
        console.error('Failed to initialize PostgreSQL client:', e);
    }
} else {
    // Falls back to SQLite
    console.log('Using SQLite database client...');
    let sqlite3;
    try {
        sqlite3 = require('sqlite3').verbose();
    } catch (e) {
        importError = e;
        console.error('Failed to import sqlite3:', e.message);
    }

    let dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'users.db');

    if (isVercel) {
        const tempDbPath = path.join('/tmp', 'users.db');
        if (!fs.existsSync(tempDbPath)) {
            try {
                if (fs.existsSync(dbPath)) {
                    fs.copyFileSync(dbPath, tempDbPath);
                    console.log('Copied database to /tmp');
                } else {
                    console.log('Template database users.db not found, creating a new one.');
                }
            } catch (e) {
                console.error('Failed to copy database to /tmp:', e);
            }
        }
        dbPath = tempDbPath;
    } else {
        // Ensure the directory for the database exists (especially important for custom volume paths)
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            try {
                fs.mkdirSync(dbDir, { recursive: true });
                console.log('Created database directory:', dbDir);
            } catch (e) {
                console.error('Failed to create database directory:', e);
            }
        }
    }

    if (sqlite3) {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error connecting to SQLite database:', err.message);
            } else {
                console.log('Connected to the SQLite database.');
                initializeDatabase();
            }
        });
    } else {
        console.warn('Database initialization skipped: sqlite3 is not loaded.');
        db = {
            run: function(sql, params, callback) {
                const cb = typeof params === 'function' ? params : callback;
                if (cb) cb(new Error('Database not available: ' + (importError ? importError.message : 'Unknown error')));
                return this;
            },
            get: function(sql, params, callback) {
                const cb = typeof params === 'function' ? params : callback;
                if (cb) cb(new Error('Database not available: ' + (importError ? importError.message : 'Unknown error')));
                return this;
            },
            all: function(sql, params, callback) {
                const cb = typeof params === 'function' ? params : callback;
                if (cb) cb(new Error('Database not available: ' + (importError ? importError.message : 'Unknown error')));
                return this;
            },
            serialize: function(callback) {
                if (callback) callback();
                return this;
            }
        };
    }
}

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
            plaintextPassword TEXT,
            referralCode TEXT,
            referredBy TEXT,
            profile_pic TEXT,
            totalBalance REAL DEFAULT 0,
            referralBalance REAL DEFAULT 0,
            activityBalance REAL DEFAULT 0,
            dataNetwork TEXT,
            dataPhone TEXT,
            isVendor BOOLEAN DEFAULT 0,
            targetedPopup TEXT,
            withdrawalPin TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createCouponsQuery = `
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            isUsed BOOLEAN DEFAULT 0,
            usedBy TEXT,
            isDeleted BOOLEAN DEFAULT 0,
            assignedVendor TEXT,
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
            linkedUsername TEXT,
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
            referralWithdrawEnabled BOOLEAN DEFAULT 1,
            activityWithdrawEnabled BOOLEAN DEFAULT 1,
            adminPassword TEXT DEFAULT 'blaze2025',
            dataClaimReferralsRequired INTEGER DEFAULT 20,
            popupMessage TEXT DEFAULT '',
            welcomeMessage TEXT DEFAULT '',
            minWithdrawalActivity REAL DEFAULT 2000,
            minWithdrawalReferral REAL DEFAULT 2000,
            emailVerificationEnabled BOOLEAN DEFAULT 0,
            smtpHost TEXT,
            smtpPort TEXT,
            smtpUser TEXT,
            smtpPass TEXT,
            autoPaymentEnabled BOOLEAN DEFAULT 0,
            paymentGateway TEXT DEFAULT 'raven',
            gatewaySecretKey TEXT
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

    const createEmailVerificationsQuery = `
        CREATE TABLE IF NOT EXISTS email_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            expiresAt DATETIME NOT NULL
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
        // Add referredBy to user schema if not present
        db.run("ALTER TABLE users ADD COLUMN referredBy TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN profile_pic TEXT", (err) => {});
        db.run("ALTER TABLE users ADD COLUMN withdrawalPin TEXT", (err) => {});
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
        db.run("ALTER TABLE settings ADD COLUMN referralWithdrawEnabled BOOLEAN DEFAULT 1", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN activityWithdrawEnabled BOOLEAN DEFAULT 1", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN dataClaimReferralsRequired INTEGER DEFAULT 20", (err) => {});
        
        // Add custom message to vendors
        db.run("ALTER TABLE vendors ADD COLUMN customMessage TEXT", (err) => {});
        
        // Add popupMessage to settings
        db.run("ALTER TABLE settings ADD COLUMN popupMessage TEXT DEFAULT ''", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN welcomeMessage TEXT DEFAULT ''", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN minWithdrawalActivity REAL DEFAULT 2000", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN minWithdrawalReferral REAL DEFAULT 2000", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN emailVerificationEnabled BOOLEAN DEFAULT 0", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN smtpHost TEXT", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN smtpPort TEXT", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN smtpUser TEXT", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN smtpPass TEXT", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN autoPaymentEnabled BOOLEAN DEFAULT 0", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN paymentGateway TEXT DEFAULT 'raven'", (err) => {});
        db.run("ALTER TABLE settings ADD COLUMN gatewaySecretKey TEXT", (err) => {});
        
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

        db.run(createEmailVerificationsQuery, (err) => {
            if (err) console.error('Error creating email_verifications table:', err.message);
            else console.log('Email Verifications table ready.');
        });

        // Optimization: Create indexes for frequently queried columns to speed up dashboard and queries
        db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        db.run('CREATE INDEX IF NOT EXISTS idx_users_referredby ON users(referredBy)');
        db.run('CREATE INDEX IF NOT EXISTS idx_withdrawals_username ON withdrawals(username)');
        db.run('CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)');
    });
}

db.importError = importError;
module.exports = db;
