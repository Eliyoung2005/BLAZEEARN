const fs = require('fs');
const html = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
const code = scripts[1].replace(/<script>|<\/script>/g, '');

let openBraces = 0;
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
    for (let char of lines[i]) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
    }
    if (openBraces < 0) {
        console.log("Unbalanced brace found at line " + (i + 1) + ": " + lines[i]);
        break;
    }
}
if (openBraces > 0) console.log("Missing closing braces: " + openBraces);
if (openBraces === 0) console.log("Braces are balanced.");
