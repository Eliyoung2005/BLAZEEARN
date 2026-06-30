const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database('./users.db'); 
const query = `
    SELECT u.username, 
           (COALESCE(direct.cnt, 0) * 300) + (COALESCE(indirect.cnt, 0) * 50) AS totalEarned 
    FROM users u 
    LEFT JOIN ( 
        SELECT referredBy, COUNT(*) as cnt FROM users WHERE referredBy IS NOT NULL GROUP BY referredBy 
    ) direct ON u.username = direct.referredBy 
    LEFT JOIN ( 
        SELECT p.referredBy as grandparent, COUNT(*) as cnt 
        FROM users c 
        JOIN users p ON c.referredBy = p.username 
        WHERE p.referredBy IS NOT NULL 
        GROUP BY p.referredBy 
    ) indirect ON u.username = indirect.grandparent 
    WHERE (COALESCE(direct.cnt, 0) * 300) + (COALESCE(indirect.cnt, 0) * 50) > 0 
    ORDER BY totalEarned DESC 
    LIMIT 5`; 
db.all(query, [], (err, rows) => { 
    if(err) console.error(err); 
    else console.log(rows); 
});
