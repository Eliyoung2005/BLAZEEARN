const fs = require('fs');
const lines = fs.readFileSync('BlazeEarn/public/index.html', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes("'admin'") || l.includes('"admin"')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
