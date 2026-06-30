const fs = require('fs');
let serverCode = fs.readFileSync('server.js', 'utf8');

const popupEndpoints = `

// --- POPUPS & NOTIFICATIONS ENDPOINTS ---

// Admin: Send a targeted notification
app.post('/api/admin/notifications', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user || !user.isAdmin) return res.status(403).json({ error: 'Forbidden' });

        const { targetUsername, message, type } = req.body;
        if (!targetUsername || !message) {
            return res.status(400).json({ error: 'Username and message are required.' });
        }

        db.get('SELECT id FROM users WHERE username = ?', [targetUsername.toLowerCase()], (err, targetUser) => {
            if (err) return res.status(500).json({ error: 'Database error.' });
            if (!targetUser) return res.status(404).json({ error: 'User not found.' });

            db.run('INSERT INTO user_notifications (user_id, message, type) VALUES (?, ?, ?)', 
                [targetUser.id, message, type || 'info'], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to create notification.' });
                res.status(200).json({ success: true, message: 'Notification sent successfully.' });
            });
        });
    });
});

// User: Get unread notifications
app.get('/api/user/notifications', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.all('SELECT * FROM user_notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at ASC', [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.status(200).json({ notifications: rows || [] });
    });
});

// User: Mark notification as read
app.put('/api/user/notifications/:id/read', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const notifId = req.params.id;
    db.run('UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notifId, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.status(200).json({ success: true });
    });
});
`;

if (!serverCode.includes('/api/admin/notifications')) {
    serverCode = serverCode.replace('// --- API ENDPOINTS ---', '// --- API ENDPOINTS ---' + popupEndpoints);
    fs.writeFileSync('server.js', serverCode);
    console.log('Endpoints added to server.js');
} else {
    console.log('Endpoints already exist.');
}
