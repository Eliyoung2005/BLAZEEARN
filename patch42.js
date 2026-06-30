const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const loginCSS = `
#login {
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
    background: linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url('login_bg.jpg') no-repeat center center;
    background-size: cover;
    filter: blur(5px);
    z-index: -1;
    transform: scale(1.05);
}
`;

// Insert the CSS into the style tag in index.html
html = html.replace(/<\/style>/, `${loginCSS}\n</style>`);

fs.writeFileSync('index.html', html);
console.log("Patched index.html with login page background style");
