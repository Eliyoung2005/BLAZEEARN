const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');
    
    // Rename global-popup to site-announcement
    code = code.replace(/global-popup/g, 'site-announcement');
    
    // Add loadSettings to savePopupMessage
    code = code.replace(/showToast\('Popup settings updated!','#00FF88'\);/g, "showToast('Popup settings updated!','#00FF88');\n      if(typeof loadSettings === 'function') loadSettings();");
    
    fs.writeFileSync(file, code);
    console.log("Patched index.html for adblocker bypass and instant update preview");
}

patchFile('index.html');
