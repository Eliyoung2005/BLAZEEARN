const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const oldBG = `background: linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url('login_bg.jpg') no-repeat center center;
    background-size: cover;
    filter: blur(5px);`;

const newBG = `background: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), #08080a url('login_bg.jpg') no-repeat center center;
    background-size: contain;
    filter: blur(3px);`;

html = html.replace(oldBG, newBG);

fs.writeFileSync('index.html', html);
console.log("Patched index.html - made login page background contain/fitted");
