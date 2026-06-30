const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');

db.serialize(() => {
    db.all("SELECT * FROM tasks", (err, tasks) => {
        console.log("TASKS:", tasks);
    });
    db.all("SELECT * FROM user_tasks", (err, utasks) => {
        console.log("USER_TASKS:", utasks);
    });
    db.all("SELECT id, username, totalBalance, activityBalance FROM users", (err, users) => {
        console.log("USERS:", users);
    });
});
