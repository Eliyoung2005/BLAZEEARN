const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');

const target = "var eRb = document.getElementById('bal-ref'); if(eRb) eRb.textContent = 'N' + rb.toLocaleString() + '.00';";
const repl = "var eRb = document.getElementById('bal-ref'); if(eRb) eRb.textContent = 'N' + rb.toLocaleString() + '.00'; var rsD = document.getElementById('rs-direct'); if(rsD) rsD.textContent = dr; var rsI = document.getElementById('rs-indirect'); if(rsI) rsI.textContent = ir; var rsE = document.getElementById('rs-earn'); if(rsE) rsE.textContent = 'N' + rb.toLocaleString() + '.00'; var wAb = document.getElementById('wd-act-bal-card'); if(wAb) wAb.textContent = 'N' + ab.toLocaleString() + '.00'; var wRb = document.getElementById('wd-ref-bal-card'); if(wRb) wRb.textContent = 'N' + rb.toLocaleString() + '.00';";

if (ci.includes(target) && !ci.includes("rsD.textContent = dr")) {
    ci = ci.replace(target, repl);
    fs.writeFileSync('index.html', ci);
    console.log("Patched balance");
}

const t2 = "currentUser.activity_balance += parseInt(amount, 10);";
const r2 = `currentUser.activity_balance += parseInt(amount, 10);
            sessionStorage.removeItem('task_opened_' + taskId);`;
if (ci.includes(t2)) {
    ci = ci.replace(t2, r2);
    fs.writeFileSync('index.html', ci);
    console.log("Patched task complete clear");
}

const t3 = "function openTaskLink(taskId, url) {";
const r3 = `function openTaskLink(taskId, url) {
    sessionStorage.setItem('task_opened_' + taskId, 'true');`;
if (ci.includes(t3)) {
    ci = ci.replace(t3, r3);
    fs.writeFileSync('index.html', ci);
    console.log("Patched task open track");
}

const t4 = "if(!currentUser) return showToast('Please login first', '#FFAA00');";
const r4 = `if(!currentUser) return showToast('Please login first', '#FFAA00');
    if (!sessionStorage.getItem('task_opened_' + taskId)) {
        return showToast('You must open the task link before completing it!', '#FF3B3B');
    }`;

if (ci.includes(t4)) {
    ci = ci.replace(t4, r4);
    fs.writeFileSync('index.html', ci);
    console.log("Patched task complete track");
}
