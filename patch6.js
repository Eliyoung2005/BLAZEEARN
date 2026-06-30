const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    // 1. Update .admin-sidebar CSS
    code = code.replace(
        /\.admin-sidebar\{width:220px;background:var\(--card\);border-right:1px solid var\(--border\);position:fixed;top:0;left:0;height:100vh;display:flex;flex-direction:column;z-index:50;\}/,
        `.admin-sidebar{width:260px;background:var(--card);border-right:1px solid var(--border);position:fixed;top:0;left:0;height:100vh;display:flex;flex-direction:column;z-index:10000;transform:translateX(-100%);transition:transform 0.3s ease;}\n.admin-sidebar.active{transform:translateX(0);}`
    );

    // 2. Remove mobile overrides for .admin-sidebar
    code = code.replace(/  \.admin-sidebar\{\s*width:100%;height:auto;\s*position:relative;\s*flex-direction:column;\s*border-right:none;\s*border-bottom:1px solid var\(--border\);\s*\}\s*\.admin-sidebar \.sb-nav\{\s*display:flex;flex-direction:row;\s*flex-wrap:nowrap;overflow-x:auto;\s*padding:6px 8px;gap:4px;\s*-webkit-overflow-scrolling:touch;\s*\}\s*\.admin-sidebar \.sb-nav::-webkit-scrollbar\{display:none;\}\s*\.admin-sidebar \.sb-item\{\s*border-left:none;border-bottom:2px solid transparent;\s*padding:8px 12px;font-size:0\.75rem;white-space:nowrap;flex-shrink:0;\s*\}\s*\.admin-sidebar \.sb-item\.active\{border-left:none;border-bottom-color:var\(--fire\);\}\s*\.admin-sidebar \.sb-logo,\.admin-sidebar \.sb-logout\{display:none;\}/, '');

    // 3. Add close button in admin sidebar HTML
    code = code.replace(
        /<div class="admin-sb-logo">/,
        `<div class="admin-sb-logo" style="position:relative; padding-right:40px;">\n      <button onclick="toggleSidebar()" style="background:none;border:none;color:var(--text);font-size:2rem;cursor:pointer;position:absolute;right:15px;top:20px;">&times;</button>`
    );

    // 4. Update toggleSidebar logic to toggle the correct sidebar
    code = code.replace(
        /function toggleSidebar\(\) \{\s*let sb = document\.querySelector\('\.sidebar'\);\s*if\(\!sb\) sb = document\.querySelector\('\.admin-sidebar'\);\s*if\(sb\) sb\.classList\.toggle\('active'\);\s*let ov = document\.querySelector\('\.sidebar-overlay'\);\s*if\(ov\) ov\.classList\.toggle\('active'\);\s*\}/,
        `function toggleSidebar() {
  let isAdmin = document.getElementById('admin').classList.contains('active');
  let sb = document.querySelector(isAdmin ? '.admin-sidebar' : '.sidebar');
  if(sb) sb.classList.toggle('active');
  let ov = document.querySelector('.sidebar-overlay');
  if(ov) ov.classList.toggle('active');
}`
    );

    fs.writeFileSync(file, code);
    console.log("Patched admin sidebar in " + file);
}

patchFile('index.html');
