const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove the entire <div class="task-ico"> element from renderTasks
html = html.replace(
    /'<div class="task-ico">' \+ ico \+ '<\/div>' \+/g,
    ''
);

// 2. Remove the 📌 emoji from the instructions line
html = html.replace(
    /📌 Instructions:/g,
    'Instructions:'
);

fs.writeFileSync('index.html', html);
console.log("Patched index.html - removed task card icons");
