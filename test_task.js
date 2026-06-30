const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');

const userId = 1;
const taskId = "9"; // From req.params.id

db.serialize(() => {
    db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
        if (err || !task) return console.log("Task not found", err, task);

        db.get('SELECT * FROM user_tasks WHERE userId = ? AND taskId = ?', [userId, taskId], (err, row) => {
            if (err) return console.log('Database error.', err);
            if (row) return console.log('Task already completed.');

            db.run('INSERT INTO user_tasks (userId, taskId) VALUES (?, ?)', [userId, taskId], function(err) {
                if (err) return console.log('Failed to record task completion.', err);
                
                db.run('UPDATE users SET activityBalance = activityBalance + ?, totalBalance = totalBalance + ? WHERE id = ?', [task.reward, task.reward, userId], function(err) {
                    if (err) return console.log('Failed to update balance.', err);
                    console.log('Task completed successfully!');
                });
            });
        });
    });
});
