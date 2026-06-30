const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('users.db');

db.serialize(() => {
    db.all("PRAGMA table_info(vendors)", (err, columns) => {
        if (err) {
            console.error("Error reading vendors schema:", err);
            return;
        }
        console.log("Vendors columns:");
        columns.forEach(col => console.log(`  ${col.name} (${col.type})`));
        
        db.all("SELECT * FROM vendors", (err, rows) => {
            if (err) {
                console.error("Error reading vendors data:", err);
                return;
            }
            console.log("Vendors row count:", rows.length);
            console.log("Vendors data:", rows);
            db.close();
        });
    });
});
