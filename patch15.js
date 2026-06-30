const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');
    
    // Check if the rule is already there to avoid duplicates
    if (!code.includes('.modal-overlay.active')) {
        code = code.replace(
            /\.modal-overlay \{ position:fixed;/,
            ".modal-overlay.active { display: flex !important; }\n  .modal-overlay { position:fixed;"
        );
        fs.writeFileSync(file, code);
        console.log("Patched index.html with missing CSS rule");
    } else {
        console.log("CSS rule already exists");
    }
}

patchFile('index.html');
