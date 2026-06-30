const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('users.db');

db.serialize(() => {
    db.all("SELECT * FROM settings", (err, rows) => {
        if (err) {
            console.error("Error reading settings:", err);
            return;
        }
        console.log("Settings rows:");
        console.log(rows);
        db.close();
    });
});
