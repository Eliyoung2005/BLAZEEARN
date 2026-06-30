const fs = require('fs');

function patchFile(file) {
    if(!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf-8');

    // 1. Modify showPanel to call loadUserTasks()
    code = code.replace(
        /if\(panelId === 'earners' && typeof loadDashboardTopEarners === 'function'\) loadDashboardTopEarners\(\);/,
        `if(panelId === 'earners' && typeof loadDashboardTopEarners === 'function') loadDashboardTopEarners();\n    if(panelId === 'tasks' && typeof loadUserTasks === 'function') loadUserTasks();`
    );

    // 2. Add loadUserTasks function near renderTasks
    code = code.replace(
        /function renderTasks\(\)\{/,
        `window.tasks = [];\nasync function loadUserTasks() {\n  try {\n    var res = await api('GET', '/api/tasks');\n    window.tasks = res.tasks || [];\n    renderTasks();\n  } catch(e) {\n    console.error(e);\n  }\n}\n\nfunction renderTasks(){`
    );

    fs.writeFileSync(file, code);
    console.log("Patched user tasks in " + file);
}

patchFile('index.html');
