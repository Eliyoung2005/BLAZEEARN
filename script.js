document.addEventListener('DOMContentLoaded', () => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    
    // Auto-fill referral code if present
    const referralInput = document.getElementById('referralCode');
    const referralHint = document.getElementById('referralHint');
    
    if (referralCode && referralInput) {
        referralInput.value = referralCode;
        // Make it visually distinct that it was auto-filled
        referralInput.style.borderColor = 'var(--accent-foreground)';
        referralInput.style.background = 'rgba(43, 11, 82, 0.2)';
        referralHint.textContent = `Referral code "${referralCode}" applied automatically.`;
        referralHint.style.color = 'var(--accent-foreground)';
    }

    // Basic form validation and submission
    const form = document.getElementById('registerForm');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Example validation
        const password = document.getElementById('password').value;
        if (password.length < 8) {
            alert('Password must be at least 8 characters long.');
            return;
        }

        // Gather data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const payload = {
            full_name: data.firstName + ' ' + data.lastName,
            username: data.username,
            email: data.email,
            phone: data.phone,
            password: data.password,
            coupon_code: data.couponCode,
            referred_by: data.referralCode
        };
        
        console.log('Registration Data:', payload);
        
        // Animate button to show loading state
        const submitBtn = form.querySelector('.submit-btn');
        const originalContent = submitBtn.innerHTML;
        
        submitBtn.innerHTML = `
            <svg class="spinner" viewBox="0 0 50 50" style="animation: spin 1s linear infinite; width: 16px; height: 16px;">
                <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="80" stroke-dashoffset="60"></circle>
            </svg>
            <span>Creating Account...</span>
        `;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.8';
        submitBtn.style.cursor = 'not-allowed';

        // Send API call to backend
        fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true'
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.text().then(text => {
            try {
                return { status: response.status, body: JSON.parse(text) };
            } catch(e) {
                console.error("Tunnel error or bad response:", text);
                return { status: 500, body: { error: "Network connection issue (tunnel warning). Please try again." } };
            }
        }))
        .then(result => {
            if (result.status === 201) {
                // Hide form, show success screen
                document.getElementById('registerForm').style.display = 'none';
                document.querySelector('.auth-header').style.display = 'none';
                document.getElementById('authFooter').style.display = 'none';
                
                const successScreen = document.getElementById('successScreen');
                successScreen.style.display = 'block';
                
                // Populate referral link
                const refLink = `http://localhost:3000/?ref=${result.body.referralCode}`;
                document.getElementById('myReferralLink').value = refLink;
                
            } else {
                alert('Error: ' + (result.body.error || 'Failed to register'));
            }
        })
        .catch(err => {
            console.error(err);
            alert('An error occurred connecting to the server.');
        })
        .finally(() => {
            submitBtn.innerHTML = originalContent;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        });
    });
});

// Function to copy referral link
function copyReferralLink() {
    const linkInput = document.getElementById('myReferralLink');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(linkInput.value).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        const originalText = copyBtn.innerText;
        copyBtn.innerText = 'Copied!';
        copyBtn.style.background = '#22c55e'; // Green
        
        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style.background = 'var(--accent)';
        }, 2000);
    });
}
