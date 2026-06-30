const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    let regex = /if\(\!u \|\| \!p\) \{ showToast\('Enter username and password', '#FFAA00'\); return; \}/;
    
    let replacement = `if(!u || !p) { showToast('Enter username or email, and password', '#FFAA00'); return; }`;

    if (regex.test(code)) {
        code = code.replace(regex, replacement);
        fs.writeFileSync(file, code);
        console.log("Patched login toast message in " + file);
    } else {
        console.log("Failed to find login toast regex in " + file);
    }
}

patchFile('index.html');
