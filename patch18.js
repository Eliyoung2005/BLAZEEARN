const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf-8');

if (!html.includes('checkTargetedPopup()')) {
    html = html.replace(
        "function loadProfile(){",
        "function loadProfile(){\n  if(typeof checkTargetedPopup === 'function') checkTargetedPopup();"
    );
    fs.writeFileSync('index.html', html);
    console.log("Injected checkTargetedPopup into loadProfile");
} else {
    console.log("Already injected.");
}
