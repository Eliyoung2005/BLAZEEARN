const fs = require('fs');

function patchFile(file, regex, replacement, logMsg) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log(logMsg);
}

patchFile('index.html', 
    /var res = await api\('GET', '\/api\/settings\/public'\);/, 
    "var res = await api('GET', '/api/settings/public?_t=' + Date.now());", 
    "Patched index.html for cache busting"
);

patchFile('server.js',
    /app\.get\('\/api\/settings\/public', \(req, res\) => \{/,
    "app.get('/api/settings/public', (req, res) => {\n    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');",
    "Patched server.js for cache control"
);
