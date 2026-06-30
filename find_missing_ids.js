const fs = require('fs');
const html = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');
const lines = html.split('\n');

const ids = [];
const idRegex = /id="([a-zA-Z0-9_-]+)"/g;
let match;
while ((match = idRegex.exec(html)) !== null) {
  ids.push(match[1]);
}

const getElementRegex = /getElementById\('([a-zA-Z0-9_-]+)'\)/;
lines.forEach((l, i) => {
  const m = l.match(getElementRegex);
  if (m) {
    const id = m[1];
    if (!ids.includes(id)) {
      console.log('Missing ID used in getElementById on line', i+1, id);
    }
  }
});
