const { JSDOM } = require('jsdom');
const fs = require('fs');
let html = fs.readFileSync('BlazeEarn/public/index.html', 'utf8');
html = html.replace("var adminToken = localStorage.getItem('blaze_admin_token') || null;", "var adminToken = 'fake_token';");
const dom = new JSDOM(html, { url: 'http://localhost/admin-dashboard', runScripts: 'dangerously' });
dom.window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve('{}'), json: () => Promise.resolve({}) });
dom.window.document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    try {
      console.log('Landing before:', dom.window.document.getElementById('landing').className);
      console.log('Staff-board before:', dom.window.document.getElementById('staff-board').className);
      dom.window.loadAdminDashboard();
      console.log('Landing after:', dom.window.document.getElementById('landing').className);
      console.log('Staff-board after:', dom.window.document.getElementById('staff-board').className);
    } catch (e) {
      console.error('CAUGHT ERROR IN loadAdminDashboard:', e);
    }
  }, 1000);
});
