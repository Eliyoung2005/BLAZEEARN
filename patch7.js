const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    let regex = /db\.get\('SELECT \* FROM users WHERE email = \? OR username = \?', \[identifier, identifier\], async \(err, user\) => \{/;
    
    let replacement = `db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)', [identifier, identifier], async (err, user) => {`;

    if (regex.test(code)) {
        code = code.replace(regex, replacement);
        fs.writeFileSync(file, code);
        console.log("Patched login query in " + file);
    } else {
        console.log("Failed to find login query regex in " + file);
    }
}

patchFile('server.js');
