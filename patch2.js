const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    // 1. Fix showPanel to load data
    let showPanelRegex = /function showPanel\(panelId, el\) \{/;
    code = code.replace(showPanelRegex, 
`function showPanel(panelId, el) {
    if(panelId === 'referral' && typeof loadUserReferrals === 'function') loadUserReferrals();
    if(panelId === 'earners' && typeof loadDashboardTopEarners === 'function') loadDashboardTopEarners();
`);

    // 2. Call loadSettings() after login
    let loginSuccessRegex = /showPage\('dashboard'\);\s*showPanel\('home'\);\s*showToast\('Login successful!', '#00FF88'\);/g;
    code = code.replace(loginSuccessRegex, 
`showPage('dashboard');
    showPanel('home');
    if(typeof loadSettings === 'function') loadSettings();
    showToast('Login successful!', '#00FF88');`);

    // 3. Call loadSettings() after register
    let registerSuccessRegex = /showPage\('dashboard'\);\s*showPanel\('home'\);\s*showToast\('Welcome to BlazeEarn!', '#00FF88'\);/g;
    code = code.replace(registerSuccessRegex, 
`showPage('dashboard');
    showPanel('home');
    if(typeof loadSettings === 'function') loadSettings();
    showToast('Welcome to BlazeEarn!', '#00FF88');`);

    fs.writeFileSync(file, code);
    console.log("Patched " + file);
}

patchFile('index.html');
