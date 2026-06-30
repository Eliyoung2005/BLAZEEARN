const fs = require('fs');
const path = require('path');
const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

const brokenBlock = `  // Fill form fields
  var pName = document.getElementById('profile-name');
    document.getElementById('profile-avatar-big').textContent = initials;
  }`;

const fixedBlock = `  // Fill form fields
  var pName = document.getElementById('profile-name');
  if(pName) pName.value=name;
  document.getElementById('profile-username').value=username;
  document.getElementById('profile-phone').value=phone;
  document.getElementById('profile-email').value=email;

  // Update profile card display
  var initials = 'U';
  if (name && typeof name === 'string') {
    initials=name.split(' ').filter(Boolean).map(function(n){return n[0];}).join('').toUpperCase().slice(0,2)||'U';
  }
  
  // Update referral links dynamically
  var refUrl = window.location.origin + '/ref/' + (username || '');
  var homeRefEl = document.getElementById('home-ref-link');
  var refLinkEl = document.getElementById('ref-link-display');
  if (homeRefEl) homeRefEl.textContent = refUrl;
  if (refLinkEl) refLinkEl.textContent = refUrl;

  if (currentUser.profile_pic) {
    document.getElementById('profile-avatar-big').style.backgroundImage = 'url(' + currentUser.profile_pic + ')';
    document.getElementById('profile-avatar-big').textContent = '';
  } else {
    document.getElementById('profile-avatar-big').style.backgroundImage = 'linear-gradient(135deg,var(--fire),var(--gold))';
    document.getElementById('profile-avatar-big').textContent = initials;
  }`;

content = content.replace(brokenBlock, fixedBlock);
fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully fixed profile logic and injected dynamic ref URL.");
