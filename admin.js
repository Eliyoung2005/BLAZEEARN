let currentToken = '';

function attemptLogin() {
    const password = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('loginError');
    
    // We expect the backend to accept 'Bearer admin123'
    currentToken = `Bearer ${password}`;
    
    fetch('/api/admin/users', {
        headers: {
            'Authorization': currentToken
        }
    })
    .then(res => {
        if (res.status === 401) {
            throw new Error('Unauthorized');
        }
        return res.json();
    })
    .then(data => {
        // Success
        document.getElementById('authOverlay').style.display = 'none';
        populateTable(data.users);
        fetchCoupons(); // Fetch coupons right after logging in
    })
    .catch(err => {
        errorMsg.style.display = 'block';
    });
}

// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabId + 'Tab').classList.add('active');
}

// Coupons Logic
function fetchCoupons() {
    fetch('/api/admin/coupons', {
        headers: { 'Authorization': currentToken }
    })
    .then(res => res.json())
    .then(data => populateCouponsTable(data.coupons))
    .catch(console.error);
}

function generateCoupon() {
    fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Authorization': currentToken }
    })
    .then(res => res.json())
    .then(data => {
        alert('Coupon generated: ' + (data.codes ? data.codes[0] : 'Error'));
        fetchCoupons(); // Refresh table
    })
    .catch(console.error);
}

function populateCouponsTable(coupons) {
    const tbody = document.getElementById('couponsTableBody');
    tbody.innerHTML = '';
    
    if (!coupons || coupons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No coupons found. Generate one!</td></tr>';
        return;
    }
    
    coupons.forEach(coupon => {
        const tr = document.createElement('tr');
        const date = new Date(coupon.createdAt).toLocaleDateString();
        const statusBadge = coupon.isUsed 
            ? `<span class="badge" style="background:var(--muted);color:var(--muted-foreground)">USED</span>` 
            : `<span class="badge" style="background:#22c55e">ACTIVE</span>`;
            
        const usedByDisplay = coupon.isUsed ? `@${coupon.usedBy}` : '-';
        
        tr.innerHTML = `
            <td>#${coupon.id}</td>
            <td style="font-family:monospace; color:var(--accent-foreground)">${coupon.code}</td>
            <td>${statusBadge}</td>
            <td>${usedByDisplay}</td>
            <td>${date}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function populateTable(users) {
    const tbody = document.getElementById('usersTableBody');
    const totalUsers = document.getElementById('totalUsers');
    
    tbody.innerHTML = '';
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No users found.</td></tr>';
        totalUsers.textContent = '0 Users';
        return;
    }
    
    totalUsers.textContent = `${users.length} User${users.length !== 1 ? 's' : ''}`;
    
    users.forEach(user => {
        const tr = document.createElement('tr');  
        const date = new Date(user.createdAt).toLocaleDateString();
        const ref = user.referralCode ? `<span class="badge">${user.referralCode}</span>` : '<span style="color:var(--muted-foreground)">None</span>';
        
        tr.innerHTML = `
            <td>#${user.id}</td>
            <td>${user.firstName} ${user.lastName}</td>
            <td>@${user.username}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${ref}</td>
            <td>${date}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Allow pressing Enter to submit password
document.getElementById('adminPassword').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        attemptLogin();
    }
});
