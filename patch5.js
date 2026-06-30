const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    let regex = /\/\/ Check if we already showed it this session\s*if \(\!sessionStorage\.getItem\('global_popup_shown'\)\) \{\s*document\.getElementById\('global-popup-content'\)\.innerText = currentMsg;\s*document\.getElementById\('global-popup-modal'\)\.classList\.add\('active'\);\s*sessionStorage\.setItem\('global_popup_shown', 'true'\);\s*\}/;
    
    let replacement = `// Check if we already showed THIS SPECIFIC MESSAGE this session
                if (sessionStorage.getItem('global_popup_shown') !== currentMsg) {
                    document.getElementById('global-popup-content').innerText = currentMsg;
                    document.getElementById('global-popup-modal').classList.add('active');
                    sessionStorage.setItem('global_popup_shown', currentMsg);
                }`;

    if (regex.test(code)) {
        code = code.replace(regex, replacement);
        fs.writeFileSync(file, code);
        console.log("Patched popup message logic in " + file);
    } else {
        console.log("Failed to find popup message regex in " + file);
    }
}

patchFile('index.html');
