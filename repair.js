const fs = require('fs');
let html = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');

// The exact string in index.html right now based on Get-Content
// Use regex to allow variable whitespace/newlines between them
const regex = /var pName = document\.getElementById\('profile-name'\);\s*document\.getElementById\('profile-avatar-big'\)\.textContent = initials;\s*\}/g;

const replacement = `  var pName = document.getElementById('profile-name');
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

if(regex.test(html)) {
    html = html.replace(regex, replacement);
    fs.writeFileSync('BlazeEarn/public/index.html', html, 'utf8');
    console.log('Fixed index.html syntax and restored profile logic.');
} else {
    console.log('Regex did not match!');
}
