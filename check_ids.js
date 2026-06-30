const fs = require('fs');
const content = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');
const ids = ['reg-name', 'reg-username', 'reg-phone', 'reg-email', 'reg-coupon', 'reg-pass', 'reg-ref'];
ids.forEach(id => {
  const matches = content.match(new RegExp('id=[\"\\']' + id + '[\"\\']', 'gi'));
  console.log(id + ': ' + (matches ? matches.length : 0));
});
