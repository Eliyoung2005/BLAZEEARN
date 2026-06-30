const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    // Replace the one-line function updateBalanceDisplay() with the new expanded version
    let regex = /function updateBalanceDisplay\(\) \{ if\(!currentUser\) return; var tb = currentUser\.total_balance \|\| 0; .*? \}/;
    
    let replacement = `function updateBalanceDisplay() {
    if(!currentUser) return;
    var tb = currentUser.total_balance || 0;
    var ab = currentUser.activity_balance || 0;
    var rb = currentUser.referral_balance || 0;
    var dr = currentUser.direct_referrals || 0;
    var ir = currentUser.indirect_referrals || 0;
    var totalRefs = dr + ir;
    var refTotalEarned = (dr * 500) + (ir * 50);

    var eTb = document.getElementById('bal-total'); if(eTb) eTb.textContent = 'N' + tb.toLocaleString() + '.00';
    var eAb = document.getElementById('bal-activity'); if(eAb) eAb.textContent = 'N' + ab.toLocaleString() + '.00';
    var eRb = document.getElementById('bal-ref'); if(eRb) eRb.textContent = 'N' + rb.toLocaleString() + '.00';
    var eRefs = document.getElementById('bal-refs'); if(eRefs) eRefs.textContent = totalRefs;

    // Home tab bottom section updates
    var rsDirect = document.getElementById('rs-direct'); if(rsDirect) rsDirect.textContent = dr;
    var rsIndirect = document.getElementById('rs-indirect'); if(rsIndirect) rsIndirect.textContent = ir;
    var rsEarn = document.getElementById('rs-earn'); if(rsEarn) rsEarn.textContent = 'N' + refTotalEarned.toLocaleString();

    // Referral tab updates
    var refDirect = document.getElementById('ref-direct-count'); if(refDirect) refDirect.textContent = dr;
    var refIndirect = document.getElementById('ref-indirect-count'); if(refIndirect) refIndirect.textContent = ir;
    var refTotal = document.getElementById('ref-total-earn'); if(refTotal) refTotal.textContent = 'N' + refTotalEarned.toLocaleString();

    // Withdraw tab updates
    var wdAct = document.getElementById('wd-act-bal-card'); if(wdAct) wdAct.textContent = 'N' + ab.toLocaleString() + '.00';
    var wdRef = document.getElementById('wd-ref-bal-card'); if(wdRef) wdRef.textContent = 'N' + rb.toLocaleString() + '.00';
}`;

    if (regex.test(code)) {
        code = code.replace(regex, replacement);
        fs.writeFileSync(file, code);
        console.log("Patched " + file);
    } else {
        console.log("Failed to find updateBalanceDisplay regex in " + file);
    }
}

patchFile('index.html');
