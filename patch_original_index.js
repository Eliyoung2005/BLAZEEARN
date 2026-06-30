const fs = require('fs');
let ci = fs.readFileSync('index.html', 'utf8');

// 1. Task tracking fix
let rT = `<a href="'+t.link+'" target="_blank" class="btn-link">🔗 Open Task Link</a>`;
let rTFix = `<a href="'+t.link+'" target="_blank" class="btn-link" onclick="sessionStorage.setItem('task_opened_'+t.id, 'true')">🔗 Open Task Link</a>`;
if (ci.includes(rT)) ci = ci.replace(rT, rTFix);

let cT = `if(!task||!currentUser)return;
  btn.disabled=true; btn.textContent='Verifying...';`;
let cTFix = `if(!task||!currentUser)return;
  if (!sessionStorage.getItem('task_opened_' + task.id)) {
      return showToast('You must open the task link before completing it!', '#FF3B3B');
  }
  btn.disabled=true; btn.textContent='Verifying...';`;
if (ci.includes(cT)) ci = ci.replace(cT, cTFix);

let cT2 = `showToast('+₦'+task.reward+' activity earnings added!','#00FF88');`;
let cT2Fix = `sessionStorage.removeItem('task_opened_' + task.id);
    showToast('+₦'+task.reward+' activity earnings added!','#00FF88');`;
if (ci.includes(cT2)) ci = ci.replace(cT2, cT2Fix);

fs.writeFileSync('index.html', ci);
console.log('Patched original index.html');
