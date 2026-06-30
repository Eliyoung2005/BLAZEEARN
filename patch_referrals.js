const fs = require('fs');
const path = require('path');

// 1. Patch server.js to handle /ref/:username
const serverPath = path.join(__dirname, 'BlazeEarn/server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

if (!serverContent.includes("app.get('/ref/:username'")) {
    const refRoute = `
// Handle referral links and redirect to index with query parameter
app.get('/ref/:username', (req, res) => {
    res.redirect('/?ref=' + encodeURIComponent(req.params.username));
});
`;
    // Insert before the generic catch-all or after static files
    serverContent = serverContent.replace(
        "app.use(express.static(path.join(__dirname, 'public')));",
        "app.use(express.static(path.join(__dirname, 'public')));\n" + refRoute
    );
    fs.writeFileSync(serverPath, serverContent, 'utf8');
}

// 2. Patch index.html to dynamically set referral links
const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

const dynamicRefLogic = `
    // Update profile card display
    var initials = 'U';
    if (name && typeof name === 'string') {
      initials=name.split(' ').filter(Boolean).map(function(n){return n[0];}).join('').toUpperCase().slice(0,2)||'U';
    }
    
    // Update referral links dynamically
    var refUrl = window.location.origin + '/ref/' + username;
    var homeRefEl = document.getElementById('home-ref-link');
    var refLinkEl = document.getElementById('ref-link-display');
    if (homeRefEl) homeRefEl.textContent = refUrl;
    if (refLinkEl) refLinkEl.textContent = refUrl;
`;

indexContent = indexContent.replace(
    `    // Update profile card display
    var initials = 'U';
    if (name && typeof name === 'string') {
      initials=name.split(' ').filter(Boolean).map(function(n){return n[0];}).join('').toUpperCase().slice(0,2)||'U';
    }`,
    dynamicRefLogic
);

fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log("Successfully patched referral routing and dynamic UI links.");
