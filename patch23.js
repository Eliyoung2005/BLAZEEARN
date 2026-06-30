const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');

db.serialize(() => {
    // 1. Add email verification toggle to settings
    db.run("ALTER TABLE settings ADD COLUMN emailVerificationEnabled BOOLEAN DEFAULT 0", (err) => {
        if (err && !err.message.includes("duplicate column name")) {
            console.error("Error adding emailVerificationEnabled:", err.message);
        } else {
            console.log("Added emailVerificationEnabled column (or it already exists).");
        }
    });

    // 2. Add SMTP settings
    const smtpCols = [
        "smtpHost TEXT DEFAULT ''",
        "smtpPort TEXT DEFAULT '465'",
        "smtpUser TEXT DEFAULT ''",
        "smtpPass TEXT DEFAULT ''"
    ];
    
    smtpCols.forEach(colDef => {
        db.run(`ALTER TABLE settings ADD COLUMN ${colDef}`, (err) => {
            if (err && !err.message.includes("duplicate column name")) {
                console.error(`Error adding column ${colDef}:`, err.message);
            }
        });
    });
    console.log("Added SMTP columns to settings.");

    // 3. Create email_verifications table
    db.run(`CREATE TABLE IF NOT EXISTS email_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expiresAt DATETIME NOT NULL
    )`, (err) => {
        if (err) console.error("Error creating email_verifications table:", err.message);
        else console.log("email_verifications table ready.");
    });
});

setTimeout(() => db.close(), 1000);
