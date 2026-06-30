const fs = require('fs');
let html = fs.readFileSync('c:/Users/PC/Desktop/BlazeEarn/BlazeEarn/public/index.html', 'utf8');

const staffBoardHtml = `
<style>
#staff-board { display: none; background: #0f0f0f; color: #fff; padding: 20px; font-family: 'Inter', sans-serif; min-height: 100vh; }
#staff-board.active { display: block; }
.staff-header { border-bottom: 1px solid #333; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
.staff-header h2 { margin: 0; color: #FFAA00; }
.staff-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
.stat-card { background: #1a1a1a; padding: 15px; border-radius: 10px; border: 1px solid #333; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
.stat-card h4 { margin: 0 0 10px 0; font-size: 0.9rem; color: #888; text-transform: uppercase; }
.stat-card div { font-size: 1.8rem; font-weight: bold; color: #fff; }
.staff-section { background: #1a1a1a; padding: 20px; border-radius: 10px; border: 1px solid #333; margin-bottom: 30px; overflow-x: auto; }
.staff-section h3 { margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; color: #FFAA00; }
table { width: 100%; border-collapse: collapse; min-width: 600px; }
th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #333; }
th { background: #111; color: #888; font-weight: 600; text-transform: uppercase; font-size: 0.8rem; }
tr:hover td { background: #222; }
.btn-action { background: #FFAA00; color: #000; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; }
.btn-red { background: #ff4444; color: #fff; }
.badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
.b-active { background: rgba(0, 255, 136, 0.2); color: #00FF88; }
.b-used { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
</style>
<div id="staff-board" class="page">
  <div class="staff-header">
    <h2>BlazeEarn Admin Dashboard</h2>
    <button onclick="logout()" class="btn-action btn-red">Logout</button>
  </div>
  <div class="staff-stats">
    <div class="stat-card"><h4>Total Coupons</h4><div id="st-coupons">0</div></div>
    <div class="stat-card"><h4>Active Coupons</h4><div id="st-active">0</div></div>
    <div class="stat-card"><h4>Used Coupons</h4><div id="st-used">0</div></div>
    <div class="stat-card"><h4>Deleted Coupons</h4><div id="st-deleted">0</div></div>
    <div class="stat-card"><h4>Total Users</h4><div id="st-users">0</div></div>
    <div class="stat-card"><h4>Active Users</h4><div id="st-active-users">0</div></div>
    <div class="stat-card"><h4>Vendors</h4><div id="st-vendors">0</div></div>
    <div class="stat-card"><h4>Pending Withdrawals</h4><div id="st-wds">0</div></div>
  </div>
  <div class="staff-section">
    <h3>Coupons</h3>
    <table><thead><tr><th>#</th><th>Code</th><th>Status</th><th>Vendor</th><th>Used By</th></tr></thead><tbody id="coupons-tbody"></tbody></table>
  </div>
  <div class="staff-section">
    <h3>Users</h3>
    <table><thead><tr><th>#</th><th>Name</th><th>Username</th><th>Phone</th><th>Email</th><th>Balance</th><th>Referred By</th></tr></thead><tbody id="users-tbody"></tbody></table>
  </div>
  <div class="staff-section">
    <h3>Vendors</h3>
    <div id="vendor-list" style="display: flex; gap: 15px; flex-wrap: wrap;"></div>
  </div>
  <div class="staff-section">
    <h3>Tasks</h3>
    <table><thead><tr><th>#</th><th>Title</th><th>Type</th><th>Reward</th><th>Link</th><th>Stats</th><th>Actions</th></tr></thead><tbody id="tasks-tbody"></tbody></table>
  </div>
  <div class="staff-section">
    <h3>Data Claims</h3>
    <table><thead><tr><th>#</th><th>Username</th><th>Name</th><th>Phone</th><th>Network</th><th>Data Phone</th></tr></thead><tbody id="data-claims-tbody"></tbody></table>
  </div>
  <div class="staff-section">
    <h3>Activity Withdrawals</h3>
    <table><thead><tr><th>#</th><th>User</th><th>Amount</th><th>Bank</th><th>Account No</th><th>Name</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody id="act-wd-tbody"></tbody></table>
  </div>
  <div class="staff-section">
    <h3>Referral Withdrawals</h3>
    <table><thead><tr><th>#</th><th>User</th><th>Amount</th><th>Bank</th><th>Account No</th><th>Name</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody id="ref-wd-tbody"></tbody></table>
  </div>
</div>
`;

if (!html.includes('id="staff-board"')) {
    html = html.replace('<script>', staffBoardHtml + '\n<script>');
    fs.writeFileSync('c:/Users/PC/Desktop/BlazeEarn/BlazeEarn/public/index.html', html, 'utf8');
    console.log("Successfully injected staff-board HTML");
} else {
    console.log("staff-board already exists");
}
