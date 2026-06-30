const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Replace the inline display:none; with display:flex; in the close button inline styles
const oldCloseBtn = `<button class="dash-sidebar-close" onclick="toggleSidebar()" aria-label="Close sidebar" style="background:transparent; border:1px solid var(--border); color:var(--text); padding:6px; border-radius:7px; cursor:pointer; display:none; align-items:center; justify-content:center; width:34px; height:34px;">`;
const newCloseBtn = `<button class="dash-sidebar-close" onclick="toggleSidebar()" aria-label="Close sidebar" style="background:transparent; border:1px solid var(--border); color:var(--text); padding:6px; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; width:34px; height:34px;">`;

if (html.includes(oldCloseBtn)) {
    html = html.replace(oldCloseBtn, newCloseBtn);
    fs.writeFileSync('index.html', html);
    console.log("Successfully set dash-sidebar-close inline style to display:flex;");
} else {
    console.log("Error: Old close button HTML pattern not found!");
}
