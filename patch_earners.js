const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'BlazeEarn/public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Add Sidebar item
const sbItem = `<div class="sb-item" onclick="showPanel('earners',this)"><span class="sb-item-icon">🏆</span> Top Earners</div>`;
content = content.replace(`<div class="sb-item" onclick="showPanel('profile',this)"><span class="sb-item-icon">👤</span> My Profile</div>`, `<div class="sb-item" onclick="showPanel('profile',this)"><span class="sb-item-icon">👤</span> My Profile</div>\n      ${sbItem}`);

// 2. Add Bottom Nav item
const bnItem = `
    <div class="bn-item" id="bn-earners" onclick="showPanel('earners',this);syncBottomNav('earners')">
      <div class="bn-icon">🏆</div>
      <div>Earners</div>
    </div>`;
content = content.replace(`<div class="bn-item" id="bn-profile" onclick="showPanel('profile',this);syncBottomNav('profile')">`, `${bnItem}\n    <div class="bn-item" id="bn-profile" onclick="showPanel('profile',this);syncBottomNav('profile')">`);

// 3. Add Panel
const earnersPanel = `
    <!-- TOP EARNERS PANEL -->
    <div class="panel" id="panel-earners">
      <!-- Mini profile header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:22px;padding:14px 18px;background:var(--card);border:1px solid var(--border);border-radius:12px;">
        <div class="sb-av" id="ph-av-earners" style="width:38px;height:38px;font-size:0.9rem;">U</div>
        <div style="flex:1;">
          <div id="ph-name-earners" style="font-weight:700;font-size:0.9rem;">Loading...</div>
          <div id="ph-uname-earners" style="font-size:0.72rem;color:var(--muted);">@username</div>
        </div>
        <button onclick="toggleTheme()" style="background:transparent;border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:7px;cursor:pointer;font-size:0.9rem;" title="Toggle theme" id="theme-btn-earners">🌙</button>
      </div>
      <div class="pane-title">TOP EARNERS</div>
      <div class="pane-sub">See who is leading the pack with the highest all-time referral earnings!</div>
      
      <div class="top-earners-list" id="dashboard-top-earners">
        <div style="text-align:center;padding:40px;color:var(--muted);">Loading top earners...</div>
      </div>
    </div>
`;
content = content.replace(`<!-- PROFILE PANEL -->`, `${earnersPanel}\n    <!-- PROFILE PANEL -->`);

// 4. Update loadProfile array for ph-name
content = content.replace(`var phIds = ['ph-name-tasks', 'ph-name-data', 'ph-name-withdraw', 'ph-name-referral', 'ph-name-profile'];`, `var phIds = ['ph-name-tasks', 'ph-name-data', 'ph-name-withdraw', 'ph-name-referral', 'ph-name-profile', 'ph-name-earners'];`);

// 5. Add JS to fetch and display dashboard earners
const earnersJs = `
async function loadDashboardTopEarners() {
    var container = document.getElementById('dashboard-top-earners');
    if(!container) return;
    try {
        var res = await fetch('/api/public/top-earners');
        var data = await res.json();
        if(data.success && data.earners) {
            container.innerHTML = '';
            data.earners.forEach((earner, idx) => {
                const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                const rankColor = idx < 3 ? colors[idx] : 'var(--muted)';
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
                
                const card = document.createElement('div');
                card.className = 'top-earner-card';
                card.innerHTML = \`
                    <div class="top-earner-left">
                        <div class="top-earner-rank" style="color:\${rankColor}">#\${idx+1}</div>
                        <div>
                            <div style="font-weight:700;font-size:1rem;">\${earner.username} \${medal}</div>
                        </div>
                    </div>
                    <div class="top-earner-right" style="text-align:right;">
                        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:var(--gold);">₦\${earner.totalReferralEarnings.toLocaleString()}</div>
                    </div>
                \`;
                container.appendChild(card);
            });
            if(data.earners.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No earners yet.</div>';
            }
        }
    } catch(err) {
        console.error('Failed to load dashboard top earners:', err);
    }
}
`;

content = content.replace('async function fetchUser() {', `${earnersJs}\n\nasync function fetchUser() {`);

// 6. Call loadDashboardTopEarners() inside the DOMContentLoaded
content = content.replace(`if(typeof fetchUser === 'function') fetchUser();`, `if(typeof fetchUser === 'function') fetchUser();\n                  if(typeof loadDashboardTopEarners === 'function') loadDashboardTopEarners();`);


fs.writeFileSync(indexPath, content, 'utf8');
console.log("Successfully added Top Earners tab to User Dashboard.");
