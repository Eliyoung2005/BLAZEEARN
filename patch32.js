const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

const oldLogic = `                db.get("SELECT COUNT(*) as count FROM data_claims WHERE userId = ? AND status != 'rejected'", [userId], (err, row) => {
                    const existingClaims = row ? row.count : 0;
                    if (existingClaims >= allowedClaims) {
                        return res.status(400).json({ error: \`You have made \${existingClaims} claims. You need \${ (existingClaims + 1) * reqRefs } direct referrals to make another claim.\` });
                    }`;

const newLogic = `                db.get("SELECT COUNT(*) as count FROM data_claims WHERE userId = ? AND status != 'rejected'", [userId], (err, row) => {
                    const existingClaims = row ? row.count : 0;
                    if (existingClaims >= 1) {
                        return res.status(400).json({ error: 'You have already claimed your data bonus. This bonus is strictly limited to once per user.' });
                    }`;

server = server.replace(oldLogic, newLogic);

fs.writeFileSync('server.js', server);
console.log("Patched server.js for data claim limit");
