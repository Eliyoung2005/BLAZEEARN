const fs = require('fs');

function patchFile(file, regex, replacement, logMsg) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log(logMsg);
}

patchFile('index.html', 
    /if \(userToken && appSettings\.popupMessage && appSettings\.popupMessage\.trim\(\) !== ''\) \{/, 
    "if (appSettings.popupMessage && appSettings.popupMessage.trim() !== '') {", 
    "Removed userToken check for global popup"
);
