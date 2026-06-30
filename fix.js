const fs = require('fs');
const file = 'c:/Users/PC/Desktop/BlazeEarn/BlazeEarn/public/index.html';
let data = fs.readFileSync(file, 'utf8');

const target = '  </div>\n</div>\n\n      headers: {';
const target2 = '  </div>\r\n</div>\r\n\r\n      headers: {';
const replacement = `  </div>
</div>

<script>
// ===== API CONFIG =====
// Change this URL to your deployed backend URL when you go live
// Dynamically route API traffic so mobile devices don't try to connect to their own 'localhost'
var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.match(/^(192|10)\\./);
var API_BASE_URL = isLocal ? window.location.protocol + '//' + window.location.hostname + ':3000' : '';

function loadAdminDashboard() {
  updateAdminStats();
  refreshCouponsTable();
  refreshVendorAdminList();
  refreshUsersTable();
  refreshVendorDropdown();
  refreshTasksAdminTable();
  refreshDataClaimsTable();
  refreshWithdrawalTables();
  showPage('staff-board');
}

window.addEventListener('DOMContentLoaded', async function(){
  loadVendors();
  if (window.location.pathname === '/staff-dashboard') {
    if (adminToken) {
      loadAdminDashboard();
    } else {
      window.location.href = '/admin-login';
    }
  } else {
    // Check for Referral/Coupon Link in URL
    var urlParams = new URLSearchParams(window.location.search);
    var refParam = urlParams.get('ref');
    var couponParam = urlParams.get('coupon');
    if(refParam || couponParam) {
      // Switch to Register Form automatically
      showPage('register');
      
      var refInput = document.getElementById('reg-ref');
      if(refInput && refParam) {
        refInput.value = refParam;
        refInput.readOnly = true; // Lock it if it came from the link
        refInput.style.backgroundColor = 'rgba(255,170,0,0.1)';
        refInput.style.borderColor = 'var(--gold)';
        refInput.style.color = 'var(--gold)';
      }
      
      var couponInput = document.getElementById('reg-coupon');
      if(couponInput && couponParam) {
        couponInput.value = couponParam;
        couponInput.readOnly = true;
        couponInput.style.backgroundColor = 'rgba(255,170,0,0.1)';
        couponInput.style.borderColor = 'var(--gold)';
        couponInput.style.color = 'var(--gold)';
      }
    }
  }
});

var userToken = localStorage.getItem('blaze_token') || null;
var adminToken = localStorage.getItem('blaze_admin_token') || null;

// API helper function
async function api(method, endpoint, data=null, isAdmin=false) {
  var token = isAdmin ? adminToken : userToken;
  try {
    var opts = {
      method: method,
      headers: {`;

if (data.includes(target)) {
    fs.writeFileSync(file, data.replace(target, replacement));
    console.log("Fixed LF");
} else if (data.includes(target2)) {
    fs.writeFileSync(file, data.replace(target2, replacement));
    console.log("Fixed CRLF");
} else {
    console.log("Target not found!");
}
