const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf-8');

if (!html.includes("if(typeof checkTargetedPopup === 'function') checkTargetedPopup();")) {
    html = html.replace(
        "function loadProfile(){",
        "function loadProfile(){\n  if(typeof checkTargetedPopup === 'function') checkTargetedPopup();"
    );
    fs.writeFileSync('index.html', html);
    console.log("Injected checkTargetedPopup call into loadProfile");
} else {
    console.log("Call already injected.");
}
