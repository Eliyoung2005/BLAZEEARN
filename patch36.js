const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace the party popper emoji 🎉 with a check mark emoji ✅
html = html.replace(
    /<div style="font-size:3rem;margin-bottom:8px;">🎉<\/div>/g,
    `<div style="font-size:3rem;margin-bottom:8px;color:var(--green);">✅</div>`
);

fs.writeFileSync('index.html', html);
console.log("Patched index.html with check mark for data award");
