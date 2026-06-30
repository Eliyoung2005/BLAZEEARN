const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');
let m = ci.split('</script>');
fs.writeFileSync('temp_script.js', m[1].split('<script>')[1] || m[1]);
console.log('Script extracted!');
