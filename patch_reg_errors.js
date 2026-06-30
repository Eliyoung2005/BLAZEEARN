const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

const regexHandleRegister = /if\(!n \|\| !u \|\| !p \|\| !e \|\| !c \|\| !pw\) \{\s*showToast\('All fields \(except referral\) are required', '#FFAA00'\);\s*return;\s*\}/;

const specificErrors = `
    if(!n) { showToast('Full Name is required', '#FFAA00'); return; }
    if(!u) { showToast('Username is required', '#FFAA00'); return; }
    if(!p) { showToast('Phone Number is required', '#FFAA00'); return; }
    if(!e) { showToast('Email Address is required', '#FFAA00'); return; }
    if(!c) { showToast('Coupon Code is required', '#FFAA00'); return; }
    if(!pw) { showToast('Password is required', '#FFAA00'); return; }
`;

content = content.replace(regexHandleRegister, specificErrors);

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully patched registration specific errors.");
