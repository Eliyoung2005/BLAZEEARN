
function toggleSidebar() {
  let isAdmin = document.getElementById('admin').classList.contains('active');
  let sb = document.querySelector(isAdmin ? '.admin-sidebar' : '.sidebar');
  if(sb) sb.classList.toggle('active');
  let ov = document.querySelector('.sidebar-overlay');
  if(ov) ov.classList.toggle('active');
}
