const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');

ci = ci.replace('<div id="dashboard" class="page">\n  <!-- SIDEBAR -->\n  <div class="sidebar">', `<div id="dashboard" class="page">
  <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
  <div class="dash-top-nav">
    <div style="font-weight:700;font-size:1.2rem;display:flex;align-items:center;">
      <img src="logo.png" alt="Blaze Earn" style="height:32px;margin-right:8px;vertical-align:middle;">BlazeEarn
    </div>
    <button onclick="toggleSidebar()" style="background:transparent;border:none;color:var(--text);font-size:1.8rem;cursor:pointer;">☰</button>
  </div>
  <!-- SIDEBAR -->
  <div class="sidebar">`);

ci = ci.replace('.bottom-nav{', '.bottom-nav{\n  display:none !important;');

fs.writeFileSync('index.html', ci);
