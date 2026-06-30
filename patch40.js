const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Correct the typo in saveProfile(): checkTargetedNotifications() -> checkTargetedPopup()
html = html.replace(
    /checkTargetedNotifications\(\); \/\/ Refresh user data/g,
    'checkTargetedPopup(); // Refresh user data'
);

// 2. Make the Username input readonly on the profile page
html = html.replace(
    /<input type="text" id="profile-username" placeholder="Your username">/g,
    '<input type="text" id="profile-username" placeholder="Your username" readonly style="background:rgba(255,255,255,0.05); color:var(--muted); cursor:not-allowed;" title="Username cannot be changed to protect your referral links.">'
);

// 3. Update loadProfile() to also set the actual username in the sub-headers instead of leaving them as '@username'
const findUnameCode = `  var phIds = ['ph-name-tasks', 'ph-name-data', 'ph-name-withdraw', 'ph-name-referral', 'ph-name-profile', 'ph-name-earners', 'ph-name-vendor-area'];
  phIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.textContent = 'Hi, ' + (name.split(' ')[0] || username);
  });`;

const replacementUnameCode = `  var phIds = ['ph-name-tasks', 'ph-name-data', 'ph-name-withdraw', 'ph-name-referral', 'ph-name-profile', 'ph-name-earners', 'ph-name-vendor-area'];
  phIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.textContent = 'Hi, ' + (name.split(' ')[0] || username);
  });
  
  var phUnameIds = ['ph-uname-tasks', 'ph-uname-data', 'ph-uname-withdraw', 'ph-uname-referral', 'ph-uname-profile', 'ph-uname-earners', 'ph-uname-vendor-area'];
  phUnameIds.forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.textContent = '@' + username;
  });`;

html = html.replace(findUnameCode, replacementUnameCode);

fs.writeFileSync('index.html', html);
console.log("Patched index.html - fixed profile save crash, username input readonly, and header usernames");
