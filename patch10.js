const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    // 1. Fix renderTasks
    let renderTasksRegex = /function renderTasks\(\)\{[\s\S]*?\}\s*\n/m;
    let newRenderTasks = `function renderTasks() {
  var container = document.getElementById('tasks-container');
  if (!window.tasks || !window.tasks.length) {
    container.innerHTML = '<div style="color:var(--muted);text-align:center;padding:48px 0;"><div style="font-size:2.5rem;margin-bottom:12px;">📝</div><div>No tasks available yet. Check back soon.</div></div>';
    return;
  }
  container.innerHTML = window.tasks.map(function(t, i) {
    var ico = '📝';
    var done = t.completed;
    return '<div class="task-card">' +
      '<div class="task-head">' +
        '<div class="task-ico">' + ico + '</div>' +
        '<div class="task-info"><div class="task-title">' + t.title + '</div><div class="task-desc">' + t.type + '</div></div>' +
        '<div class="task-earn">+N' + t.reward + '</div>' +
      '</div>' +
      '<div class="task-body">' +
        '<div class="task-instructions">📌 Instructions: ' + t.instructions + '</div>' +
        '<div class="task-actions">' +
          '<a href="' + t.link + '" target="_blank" class="btn-link" onclick="sessionStorage.setItem(\\'task_opened_' + t.id + '\\', \\'true\\')">🌐 Open Task Link</a>' +
          (done ? '<button class="btn-done completed" disabled>✅ Completed</button>' :
            '<button class="btn-done" onclick="completeTask(' + i + ',this)">I\\'ve Done This - Earn N' + t.reward + '</button>') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}\n`;

    code = code.replace(renderTasksRegex, newRenderTasks);

    // 2. Remove icons from sidebar items
    code = code.replace(/<span class="sb-item-icon">.*?<\/span>\s*/g, '');

    // 3. Fix admin panel popup checkbox check
    let popupPopulateRegex = /const popupInput = document.getElementById\('setting-popup-msg'\);\s*if \(popupInput && appSettings.popupMessage !== undefined\) \{\s*popupInput.value = appSettings.popupMessage;\s*\}/m;
    let newPopupPopulate = `const popupInput = document.getElementById('setting-popup-msg');
            const popupEnable = document.getElementById('setting-popup-enable');
            if (popupInput && appSettings.popupMessage !== undefined) {
                popupInput.value = appSettings.popupMessage;
                if (popupEnable) {
                    popupEnable.checked = (appSettings.popupMessage.trim() !== '');
                }
            }`;
    code = code.replace(popupPopulateRegex, newPopupPopulate);

    fs.writeFileSync(file, code);
    console.log("Applied patch 10");
}

patchFile('index.html');
