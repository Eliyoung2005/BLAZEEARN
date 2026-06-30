const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const oldCSS = `#login {
    position: relative;
    z-index: 1;
    overflow: hidden;
}
#login::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), #08080a url('login_bg.jpg') no-repeat center center;
    background-size: contain;
    filter: blur(3px);
    z-index: -1;
    transform: scale(1.05);
}`;

const newCSS = `#login, #register {
    position: relative;
    z-index: 1;
    overflow: hidden;
}
#login::before, #register::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), #08080a url('login_bg.jpg') no-repeat center center;
    background-size: contain;
    filter: blur(3px);
    z-index: -1;
    transform: scale(1.05);
}`;

html = html.replace(oldCSS, newCSS);

fs.writeFileSync('index.html', html);
console.log("Patched index.html - applied same background to register page");
