const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');

db.serialize(() => {
    // Add autoPayment columns to settings
    const autoPayCols = [
        "autoPaymentEnabled BOOLEAN DEFAULT 0",
        "paymentGateway TEXT DEFAULT 'raven'",
        "gatewaySecretKey TEXT DEFAULT ''"
    ];
    
    autoPayCols.forEach(colDef => {
        db.run(`ALTER TABLE settings ADD COLUMN ${colDef}`, (err) => {
            if (err && !err.message.includes("duplicate column name")) {
                console.error(`Error adding column ${colDef}:`, err.message);
            }
        });
    });
    console.log("Added Auto Payment columns to settings.");
});

setTimeout(() => db.close(), 1000);
