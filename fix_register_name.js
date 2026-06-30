const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

const regexHandleRegister = /async function handleRegister\(\) \{[\s\S]*?var parts = n\.split\(' '\);[\s\S]*?var firstName = parts\[0\] \|\| '';[\s\S]*?var lastName = parts\.slice\(1\)\.join\(' '\) \|\| '';/;

const newHandleRegisterStr = `async function handleRegister() {
    var n = document.getElementById('reg-name').value.trim();
    var u = document.getElementById('reg-username').value.trim().toLowerCase();
    var p = document.getElementById('reg-phone').value.trim();
    var e = document.getElementById('reg-email').value.trim();
    var c = document.getElementById('reg-coupon').value.trim();
    var pw = document.getElementById('reg-pass').value.trim();
    var ref = document.getElementById('reg-ref').value.trim() || undefined;
  
    if(!n || !u || !p || !e || !c || !pw) {
      showToast('All fields (except referral) are required', '#FFAA00');
      return;
    }
    
    var parts = n.split(' ').filter(x => x.trim().length > 0);
    if(parts.length < 2) {
      showToast('Please enter both your First Name and Last Name', '#FFAA00');
      return;
    }
    var firstName = parts[0] || '';
    var lastName = parts.slice(1).join(' ') || '';`;

content = content.replace(regexHandleRegister, newHandleRegisterStr);

fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully fixed Full Name validation error.");
