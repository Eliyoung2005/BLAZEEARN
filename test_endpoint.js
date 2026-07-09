const http = require('http');
const server = require('./server.js'); // Assuming server.js exports the app or starts it
// Wait for server to start, then test
setTimeout(() => {
  const req = http.request('http://localhost:8080/api/admin/users/1/vendor', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer admin123' }
  }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('BODY:', data);
      process.exit(0);
    });
  });
  req.on('error', e => console.error(e));
  req.end();
}, 2000);
