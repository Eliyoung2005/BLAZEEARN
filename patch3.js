const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    code = code.replace(/app\.get\('\/', \(req, res\) => \{\s*res\.sendFile\(path\.join\(__dirname, 'index\.html'\)\);\s*\}\);/,
`app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(__dirname, 'index.html'));
});`);

    fs.writeFileSync(file, code);
    console.log("Patched " + file);
}

patchFile('server.js');
