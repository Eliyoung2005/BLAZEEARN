const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');

let pOld = 'function showPanel(panelId, el) {';
let pNew = `function showPanel(panelId, el) {
    if (window.innerWidth <= 768) {
        let sb = document.getElementById('mobile-sidebar');
        let ov = document.querySelector('.sidebar-overlay');
        if (sb) sb.classList.remove('active');
        if (ov) ov.classList.remove('active');
    }`;
ci = ci.replace(pOld, pNew);

fs.writeFileSync('index.html', ci);
console.log('Sidebar auto-close added.');
