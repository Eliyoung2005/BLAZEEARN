const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(
    /indirect_referrals: refStats.indirectCount\s*\n\s*}/g,
    "indirect_referrals: refStats.indirectCount,\n                targetedPopup: user.targetedPopup\n            }"
);

fs.writeFileSync('server.js', code);
console.log("Fixed missing targetedPopup in login response");
