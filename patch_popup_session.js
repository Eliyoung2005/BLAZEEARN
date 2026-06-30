const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Find the global popup logic and add sessionStorage check
const oldPopupLogic = `// Show popup if available
            if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {
                const currentMsg = appSettings.popupMessage.trim();
                document.getElementById('global-popup-content').innerText = currentMsg;
                document.getElementById('global-popup-modal').classList.add('active');
            }`;

const newPopupLogic = `// Show popup if available (only once per session until logout)
            if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {
                const currentMsg = appSettings.popupMessage.trim();
                // Check if we already showed it this session
                if (!sessionStorage.getItem('global_popup_shown')) {
                    document.getElementById('global-popup-content').innerText = currentMsg;
                    document.getElementById('global-popup-modal').classList.add('active');
                    sessionStorage.setItem('global_popup_shown', 'true');
                }
            }`;

content = content.replace(oldPopupLogic, newPopupLogic);

// 2. Clear sessionStorage when logging out
const oldLogout = `function handleLogout(){
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');`;

const newLogout = `function handleLogout(){
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    sessionStorage.removeItem('global_popup_shown');`;

content = content.replace(oldLogout, newLogout);

// Also need to clear it in admin logout if there is one, but they share handleLogout
fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully updated popup session logic.");
