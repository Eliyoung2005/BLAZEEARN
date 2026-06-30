const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    // 1. Remove the forcing of sidebar on desktop
    code = code.replace(/@media\(min-width:\s*769px\)\s*\{\s*\.sidebar\s*\{\s*transform:\s*translateX\(0\)\s*!important;\s*position:\s*fixed\s*!important;\s*z-index:\s*100;\s*\}\s*\.hamburger-btn\s*\{\s*display:\s*none\s*!important;\s*\}\s*\.sidebar-overlay\s*\{\s*display:\s*none\s*!important;\s*\}\s*\}/g, '/* @media removed so sidebar is always toggleable */');
    
    // Also remove the corresponding block for admin-sidebar if it exists
    code = code.replace(/@media\(min-width:\s*769px\)\s*\{\s*\.admin-sidebar\s*\{\s*transform:\s*translateX\(0\)\s*!important;\s*position:\s*fixed\s*!important;\s*z-index:\s*100;\s*\}\s*\.hamburger-btn\s*\{\s*display:\s*none\s*!important;\s*\}\s*\.sidebar-overlay\s*\{\s*display:\s*none\s*!important;\s*\}\s*\}/g, '/* @media removed so admin-sidebar is always toggleable */');

    // 2. Insert sidebar-overlay if not exists
    if(!code.includes('class="sidebar-overlay"')) {
        code = code.replace(/<div class="sidebar">/g, '<div class="sidebar-overlay" onclick="toggleSidebar()"></div>\n  <div class="sidebar">');
        code = code.replace(/<div class="admin-sidebar">/g, '<div class="sidebar-overlay" onclick="toggleSidebar()"></div>\n  <div class="admin-sidebar">');
    } else {
        // ensure it has onclick
        code = code.replace(/<div class="sidebar-overlay">/g, '<div class="sidebar-overlay" onclick="toggleSidebar()"></div>');
    }

    // 3. Update toggleSidebar function
    code = code.replace(/function toggleSidebar\(\)\s*\{[\s\S]*?\}/, `function toggleSidebar() {
  let sb = document.querySelector('.sidebar');
  if(!sb) sb = document.querySelector('.admin-sidebar');
  if(sb) sb.classList.toggle('active');
  let ov = document.querySelector('.sidebar-overlay');
  if(ov) ov.classList.toggle('active');
}`);

    // 4. Add a floating hamburger button for the dashboard if it doesn't exist
    let dashMainHeader = `
    <!-- Persistent Dashboard Header for Hamburger -->
    <div style="display:flex; align-items:center; padding-bottom: 20px;">
      <button class="hamburger-btn" onclick="toggleSidebar()" style="font-size:2rem; background:none; border:none; color:var(--text); cursor:pointer; padding:0; margin-right:15px; z-index:90;">☰</button>
      <h2 style="font-family:'Bebas Neue', sans-serif; font-size:1.8rem; letter-spacing:0.05em; margin:0; background:linear-gradient(90deg,var(--fire),var(--gold)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">BLAZEEARN</h2>
    </div>
    `;
    
    if(!code.includes('Persistent Dashboard Header')) {
        code = code.replace(/<div class="dash-main">/g, `<div class="dash-main">\n${dashMainHeader}`);
        code = code.replace(/<div class="admin-main">/g, `<div class="admin-main">\n${dashMainHeader}`);
    }

    // 5. Landing page hamburger button is already there in <nav class="land-nav">, but we need to ensure the drawer opens correctly.
    if(!code.includes('function openDrawer()')) {
        code = code.replace('</body>', `
<script>
function openDrawer() {
  var d = document.getElementById('side-drawer');
  var o = document.getElementById('drawer-overlay');
  if(d) d.classList.add('open');
  if(o) o.classList.add('open');
}
function closeDrawer() {
  var d = document.getElementById('side-drawer');
  var o = document.getElementById('drawer-overlay');
  if(d) d.classList.remove('open');
  if(o) o.classList.remove('open');
}
</script>
</body>`);
    }

    // 6. Fix CSS for dash-main margin
    code = code.replace(/\.dash-main\{margin-left:var\(--sidebar\);/g, '.dash-main{margin-left:0;');
    code = code.replace(/\.admin-main\{margin-left:220px;/g, '.admin-main{margin-left:0;');
    
    // Also max-width
    code = code.replace(/max-width:calc\(100% - var\(--sidebar\)\)/g, 'max-width:100%');

    // Make sure we have CSS for sidebar overlay display!
    // .sidebar-overlay { display: none; }
    // .sidebar-overlay.active { display: block; }
    // Wait, the index.html ALREADY has it at line 309, 310

    fs.writeFileSync(file, code);
    console.log("Patched " + file);
}

patchFile('index.html');
patchFile('test_clean.html');
patchFile('staff.html');
