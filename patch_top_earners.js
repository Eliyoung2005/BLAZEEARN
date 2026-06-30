const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    // Fix loadTopEarners()
    code = code.replace(/var earners = await res\.json\(\);\s*if\(earners\.length === 0\) \{/g, 
        `var data = await res.json();\n        var earners = data.earners || [];\n        if(earners.length === 0) {`);
    
    // Fix e.referralBalance inside loadTopEarners()
    // It's mapped inside container.innerHTML = earners.map(... return '... ₦' + e.referralBalance.toLocaleString() ... )
    code = code.replace(/e\.referralBalance/g, 'e.totalReferralEarnings');

    // Let's check loadDashboardTopEarners() if there's any typo.
    // It says: if(data.success && data.earners)
    // and loops through data.earners
    // and uses earner.totalReferralEarnings
    // So loadDashboardTopEarners looks perfectly fine!
    
    // BUT what if there are no top earners?
    // In server.js, the query is:
    // WHERE (COALESCE(direct.cnt, 0) * 500) + (COALESCE(indirect.cnt, 0) * 50) > 0
    // If the database has NO users with referrals, it returns an empty array.
    // Does loadDashboardTopEarners handle empty array correctly?
    // It does:
    // if(data.earners.length === 0) { container.innerHTML = '... No earners yet... ' }

    fs.writeFileSync(file, code);
    console.log("Patched " + file);
}

patchFile('index.html');
