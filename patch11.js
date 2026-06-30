const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    let regex = /\/\/ Check if we already showed THIS SPECIFIC MESSAGE this session\s*if \(sessionStorage\.getItem\('global_popup_shown'\) !== currentMsg\) \{\s*document\.getElementById\('global-popup-content'\)\.innerText = currentMsg;\s*document\.getElementById\('global-popup-modal'\)\.classList\.add\('active'\);\s*sessionStorage\.setItem\('global_popup_shown', currentMsg\);\s*\}/;
    
    let replacement = `// Show popup every time (restriction removed per request)
                document.getElementById('global-popup-content').innerText = currentMsg;
                document.getElementById('global-popup-modal').classList.add('active');`;
                
    code = code.replace(regex, replacement);

    fs.writeFileSync(file, code);
    console.log("Applied patch 11 (popup restriction removed)");
}

patchFile('index.html');
