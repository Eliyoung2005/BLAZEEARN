const axios = require('axios');
const nodemailer = require('nodemailer');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./database');

// Helper to get real-time referral stats
function getUserReferralStats(username) {
    return new Promise((resolve) => {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM users WHERE referredBy = ?) AS directCount,
                (SELECT COUNT(*) FROM users WHERE referredBy IN (SELECT username FROM users WHERE referredBy = ?)) AS indirectCount
        `;
        db.get(query, [username, username], (err, row) => {
            if (err) resolve({ directCount: 0, indirectCount: 0 });
            else resolve({ directCount: row.directCount || 0, indirectCount: row.indirectCount || 0 });
        });
    });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Disable caching for all API endpoints
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Log all incoming requests for debugging
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Serve the landing page on root (the new SPA handles all referral query logic in JS)
app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(path.join(__dirname), { 
    index: false,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }
    }
}));

// Handle referral links and redirect to index with query parameter
app.get('/ref/:username', (req, res) => {
    res.redirect('/?ref=' + encodeURIComponent(req.params.username));
});

// Redirect legacy paths to root so the SPA handles them
app.get('/dashboard', (req, res) => res.redirect('/'));
app.get('/login', (req, res) => res.redirect('/'));
app.get('/register', (req, res) => res.redirect('/'));

// Route /admin to the main SPA (index.html) so it can show the admin login page
// Serve dedicated admin login page
app.get('/admin-login', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Return main app (dashboard for both user and staff)
app.get('/staff-dashboard', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'staff.html'));
});

// Redirect old admin route to new login
app.get('/admin', (req, res) => {
    res.redirect('/admin-login');
});

// API Endpoint for Registration

app.post('/api/auth/send-verification', (req, res) => {
    const email = req.body.email;
    if(!email) return res.status(400).json({error: 'Email is required'});
    
    db.get('SELECT * FROM settings WHERE id = 1', [], (err, settings) => {
        if(err) return res.status(500).json({error: 'Database error'});
        
        if(!settings.emailVerificationEnabled) return res.status(400).json({error: 'Email verification is disabled'});
        
        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins
        
        db.run('INSERT INTO email_verifications (email, code, expiresAt) VALUES (?, ?, ?)', [email, code, expiresAt], (err) => {
            if(err) return res.status(500).json({error: 'Could not save verification code'});
            
            // Send email
            if(settings.smtpHost && settings.smtpUser) {
                let transporter = nodemailer.createTransport({
                    host: settings.smtpHost,
                    port: parseInt(settings.smtpPort) || 465,
                    secure: parseInt(settings.smtpPort) === 465,
                    auth: {
                        user: settings.smtpUser,
                        pass: settings.smtpPass
                    }
                });
                
                let mailOptions = {
                    from: `"BlazeEarn" <${settings.smtpUser}>`,
                    to: email,
                    subject: 'Your BlazeEarn Verification Code',
                    text: `Your verification code is: ${code}. It will expire in 10 minutes.`,
                    html: `<p>Your verification code is: <strong>${code}</strong></p><p>It will expire in 10 minutes.</p>`
                };
                
                transporter.sendMail(mailOptions, (err, info) => {
                    if(err) {
                        console.error('Email send error:', err);
                        return res.status(500).json({error: 'Failed to send email. Check SMTP settings.'});
                    }
                    return res.status(200).json({success: true, message: 'Verification code sent'});
                });
            } else {
                // Mock mode
                console.log(`[MOCK EMAIL] To: ${email}, Code: ${code}`);
                return res.status(200).json({success: true, message: 'Verification code generated (Mock mode - Check console)'});
            }
        });
    });
});


app.post('/api/auth/register', async (req, res) => {
    console.log('[REGISTER ATTEMPT BODY]:', req.body);
    
    const username = req.body.username;
    const email = req.body.email;
    const phone = req.body.phone;
    const password = req.body.password;
    const coupon_code = (req.body.coupon_code || req.body.couponCode || '').toUpperCase().trim();
    const verification_code = req.body.verification_code;
    const referred_by = req.body.referred_by || req.body.referredBy;
    const withdrawal_pin = req.body.withdrawal_pin || req.body.withdrawalPin;
    
    let full_name = req.body.full_name;
    let firstName = req.body.firstName || '';
    let lastName = req.body.lastName || '';
    
    if (!full_name && firstName) {
        full_name = firstName + (lastName ? ' ' + lastName : '');
    } else if (full_name && !firstName) {
        const nameParts = full_name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
    }

    // Basic Validation
    if (!full_name || !username || !email || !phone || !password || !coupon_code || !withdrawal_pin) {
        return res.status(400).json({ error: 'All required fields including Coupon Code and Withdrawal PIN must be filled.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (!/^\d{4}$/.test(withdrawal_pin)) {
        return res.status(400).json({ error: 'Withdrawal PIN must be exactly 4 digits.' });
    }

    try {
        // First check if coupon is valid
        db.get('SELECT * FROM coupons WHERE code = ?', [coupon_code], (err, coupon) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).json({ error: 'Internal server error.' });
            }

            if (!coupon) {
                return res.status(400).json({ error: 'Invalid Coupon Code. It does not exist.' });
            }

            const isDeleted = (coupon.isDeleted === 1 || coupon.isDeleted === '1' || coupon.isDeleted === true || coupon.isDeleted === 'TRUE');
            if (isDeleted) {
                return res.status(400).json({ error: 'This Coupon Code has been deleted.' });
            }

            const isUsed = (coupon.isUsed === 1 || coupon.isUsed === '1' || coupon.isUsed === true || coupon.isUsed === 'TRUE');
            if (isUsed) {
                return res.status(400).json({ error: 'This Coupon Code has already been used.' });
            }

            // Hash the password securely
            const saltRounds = 10;
            bcrypt.hash(password, saltRounds).then(async (hashedPassword) => {
                // Insert into database
                const insertQuery = `
                    INSERT INTO users (firstName, lastName, username, email, phone, password, plaintextPassword, referralCode, referredBy, totalBalance, referralBalance, activityBalance, withdrawalPin)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 700, 0, 0, ?)
                `;
                
                db.run(
                    insertQuery,
                    [firstName, lastName, username, email, phone, hashedPassword, password, username, referred_by || null, withdrawal_pin],
                    function (err) {
                        if (err) {
                            if (err.message.includes('UNIQUE constraint failed: users.email')) {
                                return res.status(409).json({ error: 'Email is already registered.' });
                            }
                            if (err.message.includes('UNIQUE constraint failed: users.username')) {
                                return res.status(409).json({ error: 'Username is already taken.' });
                            }
                            console.error('Error inserting user:', err.message);
                            return res.status(500).json({ error: 'Internal server error.' });
                        }
                        
                        const newUserId = this.lastID;

                        // Mark coupon as used and associate it with the new user's username
                        db.run('UPDATE coupons SET isUsed = 1, usedBy = ? WHERE code = ?', [username, coupon_code], function(err) {
                            if (err) {
                                console.error('Error updating coupon:', err.message);
                            }
                            
                            // 🚀 NEW: Reward the Referrer if referred_by is provided
                            if (referred_by) {
                                // 1. Reward Direct Referrer (N500)
                                db.run(
                                    'UPDATE users SET referralBalance = referralBalance + 500, totalBalance = totalBalance + 500 WHERE username = ?',
                                    [referred_by],
                                    (rewardErr) => {
                                        if (rewardErr) {
                                            console.error('Error rewarding direct referrer:', rewardErr.message);
                                        } else {
                                            console.log(`Successfully rewarded N500 to direct referrer: ${referred_by}`);
                                            
                                            // 2. Lookup Grandparent for Indirect Reward (N50)
                                            db.get('SELECT referredBy FROM users WHERE username = ?', [referred_by], (err, row) => {
                                                if (err) {
                                                    console.error('Error fetching grandparent referrer:', err.message);
                                                } else if (row && row.referredBy) {
                                                    const grandparent = row.referredBy;
                                                    // 3. Reward Grandparent
                                                    db.run(
                                                        'UPDATE users SET referralBalance = referralBalance + 50, totalBalance = totalBalance + 50 WHERE username = ?',
                                                        [grandparent],
                                                        (gpRewardErr) => {
                                                            if (gpRewardErr) {
                                                                console.error('Error rewarding grandparent:', gpRewardErr.message);
                                                            } else {
                                                                console.log(`Successfully rewarded N50 to indirect referrer: ${grandparent}`);
                                                            }
                                                        }
                                                    );
                                                }
                                            });
                                        }
                                    }
                                );
                            }

                            // Success - Generate a simple token based on user ID
                            const token = Buffer.from(`user_token_${newUserId}`).toString('base64');
                            
                            res.status(201).json({
                                message: 'User registered successfully!',
                                success: true,
                                token: token,
                                user: {
                                    id: newUserId,
                                    firstName: firstName,
                                    lastName: lastName,
                                    full_name: full_name,
                                    username: username,
                                    email: email,
                                    phone: phone,
                                    referralCode: username,
                                    total_balance: 700,
                                    referral_balance: 0,
                                    activity_balance: 0
                                }
                            });
                        });
                    }
                );
            });
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

// API Endpoint for Login
app.post('/api/auth/login', async (req, res) => {
    console.log('[LOGIN ATTEMPT BODY]:', req.body);
    
    // Support various common field names from frontend
    const identifier = req.body.username || req.body.email || req.body.identifier || req.body.login;
    const password = req.body.password;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Username/Email and Password are required.' });
    }

    db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)', [identifier, identifier], async (err, user) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Internal server error.' });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        let match = false;
        
        if (user.password && user.password.startsWith('$2b$')) {
            match = await bcrypt.compare(password, user.password);
        }
        
        if (!match && user.plaintextPassword) {
            if (password === user.plaintextPassword) {
                match = true;
                // Auto-upgrade password to hash
                const newHash = await bcrypt.hash(password, 10);
                db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
            }
        }

        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Fetch direct and indirect referrals
        const refStats = await getUserReferralStats(user.username);

        // Success - Generate a simple token based on user ID
        const token = Buffer.from(`user_token_${user.id}`).toString('base64');
        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                full_name: user.firstName + ' ' + user.lastName,
                username: user.username,
                email: user.email,
                phone: user.phone,
                referralCode: user.referralCode,
                isVendor: user.isVendor,
                total_balance: user.totalBalance || 0,
                referral_balance: user.referralBalance || 0,
                activity_balance: user.activityBalance || 0,
                direct_referrals: refStats.directCount,
                indirect_referrals: refStats.indirectCount,
                targetedPopup: user.targetedPopup
            },
            redirect: '/dashboard.html'
        });
    });
});

// API Endpoint for User Profile
app.get('/api/user/profile', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        if (!decodedStr.startsWith('user_token_')) throw new Error('Invalid token format');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const refStats = await getUserReferralStats(user.username);

        res.status(200).json({
            success: true,
            user: {
                ...user,
                full_name: user.firstName + ' ' + user.lastName,
                referral_code: user.referralCode,
                total_balance: user.totalBalance || 0,
                referral_balance: user.referralBalance || 0,
                activity_balance: user.activityBalance || 0,
                direct_referrals: refStats.directCount,
                indirect_referrals: refStats.indirectCount,
                targetedPopup: user.targetedPopup
            }
        });
    });
});

app.put('/api/user/profile', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch(err) { return res.status(401).json({ error: 'Unauthorized' }); }

    const { firstName, lastName, phone, email, profile_pic } = req.body;
    
    db.run(
        'UPDATE users SET firstName = ?, lastName = ?, phone = ?, email = ?, profile_pic = ? WHERE id = ?',
        [firstName, lastName, phone, email, profile_pic, userId],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to update profile' });
            res.json({ success: true });
        }
    );
});

app.put('/api/user/password', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch(err) { return res.status(401).json({ error: 'Unauthorized' }); }

    const { newPassword } = req.body;
    if(!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Invalid password' });

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.run(
            'UPDATE users SET password = ?, plaintextPassword = ? WHERE id = ?',
            [hashedPassword, newPassword, userId],
            function(err) {
                if (err) return res.status(500).json({ error: 'Failed to update password' });
                res.json({ success: true });
            }
        );
    } catch(err) {
        res.status(500).json({ error: 'Encryption failed' });
    }
});

app.put('/api/user/withdraw-pin', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch(err) { return res.status(401).json({ error: 'Unauthorized' }); }

    const { pin } = req.body;
    if(!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be a 4-digit number.' });

    db.run(
        'UPDATE users SET withdrawalPin = ? WHERE id = ?',
        [pin, userId],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to update withdrawal PIN' });
            res.json({ success: true });
        }
    );
});

// Admin Endpoint to Login
app.post('/api/admin/login', (req, res) => {
    console.log('[ADMIN LOGIN ATTEMPT BODY]:', req.body);
    const { username, password } = req.body;
    if (username !== 'admin') return res.status(401).json({ error: 'Invalid admin username' });

    db.get('SELECT adminPassword FROM settings WHERE id = 1', [], (err, row) => {
        const truePassword = (row && row.adminPassword) ? row.adminPassword : 'blaze2025';
        if (password === truePassword) {
            res.status(200).json({ token: 'admin123' });
        } else {
            res.status(401).json({ error: 'Invalid admin credentials' });
        }
    });
});

// Admin Endpoint to get all users
app.get('/api/admin/users', (req, res) => {
    // Simple basic security check using a custom header
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
    }

    const query = `
        SELECT u.id, u.firstName, u.lastName, u.username, u.email, u.phone, u.referralCode, u.dataNetwork, u.dataPhone, u.totalBalance, u.referralBalance, u.activityBalance, u.referredBy, u.plaintextPassword, u.withdrawalPin, u.isVendor, u.createdAt, c.code AS usedCoupon,
               (SELECT COUNT(*) FROM users WHERE referredBy = u.username) AS direct_referrals
        FROM users u
        LEFT JOIN coupons c ON c.usedBy = u.username
        ORDER BY u.id DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            return res.status(500).json({ error: 'Internal server error.' });
        }
        res.status(200).json({ users: rows });
    });
});

// Admin Endpoint to edit user details and password
app.put('/api/admin/users/:id', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') {
        return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
    }

    const userId = req.params.id;
    const { firstName, lastName, email, phone, password, totalBalance, activityBalance, referralBalance, dataNetwork, dataPhone } = req.body;

    try {
        if (password && password.trim().length > 0) {
            if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = `
                UPDATE users SET 
                    firstName = ?, lastName = ?, email = ?, phone = ?, password = ?, plaintextPassword = ?, 
                    totalBalance = ?, activityBalance = ?, referralBalance = ?, dataNetwork = ?, dataPhone = ?
                WHERE id = ?
            `;
            db.run(query, [firstName, lastName, email, phone, hashedPassword, password, totalBalance, activityBalance, referralBalance, dataNetwork, dataPhone, userId], function(err) {
                if (err) return res.status(500).json({ error: 'Database error updating user.' });
                res.status(200).json({ success: true, message: 'User updated successfully with new password.' });
            });
        } else {
            const query = `
                UPDATE users SET 
                    firstName = ?, lastName = ?, email = ?, phone = ?, 
                    totalBalance = ?, activityBalance = ?, referralBalance = ?, dataNetwork = ?, dataPhone = ?
                WHERE id = ?
            `;
            db.run(query, [firstName, lastName, email, phone, totalBalance, activityBalance, referralBalance, dataNetwork, dataPhone, userId], function(err) {
                if (err) return res.status(500).json({ error: 'Database error updating user.' });
                res.status(200).json({ success: true, message: 'User updated successfully.' });
            });
        }
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Admin: Upgrade user to vendor
app.put('/api/admin/users/:id/vendor', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        db.run('UPDATE users SET isVendor = 1 WHERE id = ?', [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to upgrade user: ' + (err.message || err.toString()) });
            
            // Also insert into vendors table only if they don't exist
            db.get('SELECT id FROM vendors WHERE linkedUsername = ?', [user.username], (err, existingVendor) => {
                if (!existingVendor) {
                    db.run('INSERT INTO vendors (name, contact, linkedUsername) VALUES (?, ?, ?)',
                        [`${user.firstName} ${user.lastName}`, user.phone || '0000000000', user.username], 
                        function(err) {
                            res.json({ success: true, message: 'User upgraded to vendor' });
                        }
                    );
                } else {
                    res.json({ success: true, message: 'User upgraded to vendor' });
                }
            });
        });
    });
});

// Admin: Demote vendor to user
app.put('/api/admin/users/:id/remove-vendor', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        db.run('UPDATE users SET isVendor = 0 WHERE id = ?', [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to demote user' });
            
            // Also delete from vendors table
            db.run('DELETE FROM vendors WHERE linkedUsername = ?', [user.username], function(err) {
                res.json({ success: true, message: 'User demoted from vendor' });
            });
        });
    });
});

// Admin Endpoint to manually delete a user
app.delete('/api/admin/users/:id', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const userIdToDelete = req.params.id;

    db.get('SELECT username, referredBy FROM users WHERE id = ?', [userIdToDelete], (err, userToDelete) => {
        if (err || !userToDelete) return res.status(404).json({ error: 'User not found' });
        
        const username = userToDelete.username;
        const referrer = userToDelete.referredBy;

        // Perform balance deductions first
        if (referrer) {
            // Deduct 500 (direct referral bonus) from referrer's balances
            db.run('UPDATE users SET referralBalance = MAX(0, referralBalance - 500), totalBalance = MAX(0, totalBalance - 500) WHERE username = ?', [referrer], (err) => {
                if (err) console.error("Failed to deduct direct bonus from referrer:", err);
            });

            // Find grandparent (referrer of referrer) and deduct 50 (indirect referral bonus)
            db.get('SELECT referredBy FROM users WHERE username = ?', [referrer], (err, parentRow) => {
                if (!err && parentRow && parentRow.referredBy) {
                    const grandparent = parentRow.referredBy;
                    db.run('UPDATE users SET referralBalance = MAX(0, referralBalance - 50), totalBalance = MAX(0, totalBalance - 50) WHERE username = ?', [grandparent], (err) => {
                        if (err) console.error("Failed to deduct indirect bonus from grandparent:", err);
                    });
                }
            });
        }

        db.serialize(() => {
            db.run('DELETE FROM user_tasks WHERE userId = ?', [userIdToDelete]);
            db.run('DELETE FROM data_claims WHERE userId = ?', [userIdToDelete]);
            db.run('DELETE FROM withdrawals WHERE username = ?', [username]);
            db.run('DELETE FROM vendors WHERE linkedUsername = ?', [username]);
            db.run('UPDATE coupons SET assignedVendor = NULL WHERE assignedVendor = ?', [username]);
            db.run('DELETE FROM coupons WHERE usedBy = ?', [username]);
            
            db.run('DELETE FROM users WHERE id = ?', [userIdToDelete], function(err) {
                if (err) return res.status(500).json({ error: 'Database error while deleting user' });
                res.status(200).json({ success: true, message: 'User and all related data deleted. Referral earnings deducted from referrers.' });
            });
        });
    });
});

// Admin Endpoint to manually add a user (bypassing coupon logic)


// --- PASSWORD RECOVERY ---
app.post('/api/auth/forgot-password', (req, res) => {
    const { identity } = req.body;
    if (!identity) return res.status(400).json({ error: 'Username or Email is required.' });

    db.get('SELECT email FROM users WHERE email = ? OR username = ?', [identity, identity], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'No account found with that Username or Email.' });

        const email = user.email;
        db.get('SELECT * FROM settings WHERE id = 1', [], (err, settings) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins

            db.run('INSERT INTO email_verifications (email, code, expiresAt) VALUES (?, ?, ?)', [email, code, expiresAt], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to generate reset code' });

                if (settings.smtpHost && settings.smtpUser) {
                    let transporter = nodemailer.createTransport({
                        host: settings.smtpHost,
                        port: parseInt(settings.smtpPort) || 465,
                        secure: parseInt(settings.smtpPort) === 465,
                        auth: {
                            user: settings.smtpUser,
                            pass: settings.smtpPass
                        }
                    });

                    let mailOptions = {
                        from: `"BlazeEarn" <${settings.smtpUser}>`,
                        to: email,
                        subject: 'Your BlazeEarn Password Reset Code',
                        text: `Your password reset code is: ${code}. It will expire in 10 minutes.`,
                        html: `<p>Your password reset code is: <strong>${code}</strong></p><p>It will expire in 10 minutes.</p>`
                    };

                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.error('Password reset email send error:', err);
                            return res.status(500).json({ error: 'Failed to send reset code email. Please contact admin.' });
                        }
                        return res.status(200).json({ success: true, message: 'Password reset code sent to your registered email.' });
                    });
                } else {
                    // Mock mode
                    console.log(`[MOCK PASSWORD RESET EMAIL] To: ${email}, Code: ${code}`);
                    return res.status(200).json({ success: true, message: 'Reset code generated (Mock mode - Check server console).' });
                }
            });
        });
    });
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { identity, code, newPassword } = req.body;
    if (!identity || !code || !newPassword) return res.status(400).json({ error: 'All fields are required.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long.' });

    db.get('SELECT id, email FROM users WHERE email = ? OR username = ?', [identity, identity], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const email = user.email;

        // Check verification code
        db.get('SELECT * FROM email_verifications WHERE email = ? AND code = ? ORDER BY id DESC LIMIT 1', [email, code], async (err, verifyRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!verifyRow) return res.status(400).json({ error: 'Invalid or expired verification code.' });

            // Check expiry
            if (new Date(verifyRow.expiresAt) < new Date()) {
                return res.status(400).json({ error: 'Verification code has expired.' });
            }

            try {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                db.run('UPDATE users SET password = ?, plaintextPassword = ? WHERE id = ?', [hashedPassword, newPassword, user.id], (err) => {
                    if (err) return res.status(500).json({ error: 'Failed to update password.' });
                    
                    // Clean up verification code
                    db.run('DELETE FROM email_verifications WHERE email = ?', [email]);
                    
                    return res.status(200).json({ success: true, message: 'Password reset successfully! You can now log in.' });
                });
            } catch(e) {
                return res.status(500).json({ error: 'Encryption error.' });
            }
        });
    });
});

// --- TARGETED POPUP ---
app.post('/api/admin/targeted-popup', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const { username, type, message } = req.body;
    if (!username || !message) return res.status(400).json({ error: 'Username and message required' });

    const payload = JSON.stringify({ type, message });
    db.run('UPDATE users SET targetedPopup = ? WHERE username = ?', [payload, username], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ success: true, message: 'Targeted notification sent!' });
    });
});

app.post('/api/user/clear-targeted-popup', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    db.run('UPDATE users SET targetedPopup = NULL WHERE id = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(200).json({ success: true });
    });
});

app.post('/api/admin/users', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const { firstName, lastName, username, email, phone, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email and password required.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `
            INSERT INTO users (firstName, lastName, username, email, phone, password, plaintextPassword, referralCode, referredBy, totalBalance, referralBalance, activityBalance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 700, 0, 0)
        `;
        db.run(query, [firstName || '', lastName || '', username, email, phone || '', hashedPassword, password, username], function(err) {
            if (err) return res.status(400).json({ error: 'Error creating user. Username/Email may exist.' });
            res.status(201).json({ success: true, message: 'User added manually.' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Endpoint to delete individual coupon
app.delete('/api/admin/coupons/:code', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.run('UPDATE coupons SET isDeleted = TRUE WHERE code = ?', [req.params.code], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(200).json({ success: true, message: 'Settings updated' });
    });
});

app.put('/api/admin/settings/withdrawals', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const { min_activity, min_referral } = req.body;
    
    let updates = [];
    let params = [];
    if (min_activity !== undefined) { updates.push('minWithdrawalActivity = ?'); params.push(min_activity); }
    if (min_referral !== undefined) { updates.push('minWithdrawalReferral = ?'); params.push(min_referral); }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No data provided to update.' });

    const query = `UPDATE settings SET ${updates.join(', ')} WHERE id = 1`;
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(200).json({ success: true, message: 'Withdrawal minimums updated' });
    });
});

// Admin Endpoint to generate new coupons
app.post('/api/admin/coupons', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const count = parseInt(req.body.count) || 1;
    const vendor = req.body.vendor || req.body.vendorName || null;
    const crypto = require('crypto');
    let generatedCodes = [];
    let promises = [];

    for(let i = 0; i < count; i++) {
        const newCode = 'BLZ-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        generatedCodes.push(newCode);
        
        const p = new Promise((resolve, reject) => {
            db.run('INSERT INTO coupons (code, assignedVendor) VALUES (?, ?)', [newCode, vendor], function(err) {
                if (err) {
                    console.error('Error inserting coupon:', err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        promises.push(p);
    }

    Promise.all(promises)
        .then(() => {
            res.status(201).json({ message: `${count} coupons generated`, codes: generatedCodes });
        })
        .catch((err) => {
            res.status(500).json({ error: 'Database error generating coupons.' });
        });
});

// Admin Endpoint to list all coupons
app.get('/api/admin/coupons', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.all('SELECT * FROM coupons ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching coupons:', err.message);
            return res.status(500).json({ error: 'Internal server error.' });
        }
        const formatted = rows.map(r => ({
            ...r,
            isUsed: (r.isUsed === 1 || r.isUsed === '1' || r.isUsed === true || r.isUsed === 'TRUE'),
            isDeleted: (r.isDeleted === 1 || r.isDeleted === '1' || r.isDeleted === true || r.isDeleted === 'TRUE')
        }));
        res.status(200).json({ coupons: formatted });
    });
});

// Public Settings Endpoint
app.get('/api/settings/public', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        const settings = row || {
            minWithdrawalActivity: 2000,
            minWithdrawalReferral: 2000,
            withdrawStartTime: '00:00',
            withdrawEndTime: '23:59',
            referralWithdrawDates: '15,28',
            activityWithdrawDates: '25,30',
            referralWithdrawDays: '0,1,2,3,4,5,6',
            activityWithdrawDays: '0',
            referralWithdrawStartTime: '00:00',
            referralWithdrawEndTime: '23:59',
            activityWithdrawStartTime: '00:00',
            activityWithdrawEndTime: '23:59',
            referralWithdrawEnabled: 1,
            activityWithdrawEnabled: 1
        };

        res.status(200).json({
            success: true,
            data: {
                siteName: "Blaze Earn",
                currency: "NGN",
                currencySymbol: "₦",
                vendorFee: 1000,
                maintenanceMode: false,
                welcomeMessage: settings.welcomeMessage,
                minWithdrawalActivity: settings.minWithdrawalActivity,
                minWithdrawalReferral: settings.minWithdrawalReferral,
                withdrawStartTime: settings.withdrawStartTime,
                withdrawEndTime: settings.withdrawEndTime,
                referralWithdrawDates: settings.referralWithdrawDates,
                activityWithdrawDates: settings.activityWithdrawDates,
                referralWithdrawDays: settings.referralWithdrawDays,
                activityWithdrawDays: settings.activityWithdrawDays,
                referralWithdrawStartTime: settings.referralWithdrawStartTime,
                referralWithdrawEndTime: settings.referralWithdrawEndTime,
                activityWithdrawStartTime: settings.activityWithdrawStartTime,
                activityWithdrawEndTime: settings.activityWithdrawEndTime,
                referralWithdrawEnabled: settings.referralWithdrawEnabled !== undefined ? settings.referralWithdrawEnabled : 1,
                activityWithdrawEnabled: settings.activityWithdrawEnabled !== undefined ? settings.activityWithdrawEnabled : 1,
                dataClaimReferralsRequired: settings.dataClaimReferralsRequired,
                popupMessage: settings.popupMessage || "",
                welcomeMessage: settings.welcomeMessage || "",
                supportEmail: settings.supportEmail || ""
            }
        });
    });
});

// Admin Endpoint to update settings
app.put('/api/admin/settings', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const { minWithdrawalActivity, minWithdrawalReferral, withdrawStartTime, withdrawEndTime, referralWithdrawDates, activityWithdrawDates, referralWithdrawDays, activityWithdrawDays, referralWithdrawStartTime, referralWithdrawEndTime, activityWithdrawStartTime, activityWithdrawEndTime, referralWithdrawEnabled, activityWithdrawEnabled, adminPassword, dataClaimReferralsRequired, popupMessage, welcomeMessage, emailVerificationEnabled, smtpHost, smtpPort, smtpUser, smtpPass, autoPaymentEnabled, gatewaySecretKey, supportEmail } = req.body;
    
    // Only update fields that are provided
    let updates = [];
    let params = [];
    if (minWithdrawalActivity !== undefined) { updates.push('minWithdrawalActivity = ?'); params.push(minWithdrawalActivity); }
    if (minWithdrawalReferral !== undefined) { updates.push('minWithdrawalReferral = ?'); params.push(minWithdrawalReferral); }
    if (withdrawStartTime !== undefined) { updates.push('withdrawStartTime = ?'); params.push(withdrawStartTime); }
    if (withdrawEndTime !== undefined) { updates.push('withdrawEndTime = ?'); params.push(withdrawEndTime); }
    if (referralWithdrawDates !== undefined) { updates.push('referralWithdrawDates = ?'); params.push(referralWithdrawDates); }
    if (activityWithdrawDates !== undefined) { updates.push('activityWithdrawDates = ?'); params.push(activityWithdrawDates); }
    if (referralWithdrawDays !== undefined) { updates.push('referralWithdrawDays = ?'); params.push(referralWithdrawDays); }
    if (activityWithdrawDays !== undefined) { updates.push('activityWithdrawDays = ?'); params.push(activityWithdrawDays); }
    if (referralWithdrawStartTime !== undefined) { updates.push('referralWithdrawStartTime = ?'); params.push(referralWithdrawStartTime); }
    if (referralWithdrawEndTime !== undefined) { updates.push('referralWithdrawEndTime = ?'); params.push(referralWithdrawEndTime); }
    if (activityWithdrawStartTime !== undefined) { updates.push('activityWithdrawStartTime = ?'); params.push(activityWithdrawStartTime); }
    if (activityWithdrawEndTime !== undefined) { updates.push('activityWithdrawEndTime = ?'); params.push(activityWithdrawEndTime); }
    if (referralWithdrawEnabled !== undefined) { updates.push('referralWithdrawEnabled = ?'); params.push(referralWithdrawEnabled ? 1 : 0); }
    if (activityWithdrawEnabled !== undefined) { updates.push('activityWithdrawEnabled = ?'); params.push(activityWithdrawEnabled ? 1 : 0); }
    if (adminPassword !== undefined && adminPassword.trim() !== '') { updates.push('adminPassword = ?'); params.push(adminPassword); }
    if (dataClaimReferralsRequired !== undefined) { updates.push('dataClaimReferralsRequired = ?'); params.push(dataClaimReferralsRequired); }
    if (popupMessage !== undefined) { updates.push('popupMessage = ?'); params.push(popupMessage); }
    if (welcomeMessage !== undefined) { updates.push('welcomeMessage = ?'); params.push(welcomeMessage); }
    if (emailVerificationEnabled !== undefined) { updates.push('emailVerificationEnabled = ?'); params.push(emailVerificationEnabled ? 1 : 0); }
    if (smtpHost !== undefined) { updates.push('smtpHost = ?'); params.push(smtpHost); }
    if (smtpPort !== undefined) { updates.push('smtpPort = ?'); params.push(smtpPort); }
    if (smtpUser !== undefined) { updates.push('smtpUser = ?'); params.push(smtpUser); }
    if (smtpPass !== undefined) { updates.push('smtpPass = ?'); params.push(smtpPass); }
    if (autoPaymentEnabled !== undefined) { updates.push('autoPaymentEnabled = ?'); params.push(autoPaymentEnabled ? 1 : 0); }
    if (gatewaySecretKey !== undefined) { updates.push('gatewaySecretKey = ?'); params.push(gatewaySecretKey); }
    if (supportEmail !== undefined) { updates.push('supportEmail = ?'); params.push(supportEmail); }

    if (updates.length === 0) return res.status(400).json({ error: 'No data provided to update.' });

    const query = `UPDATE settings SET ${updates.join(', ')} WHERE id = 1`;
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(200).json({ success: true, message: 'Settings updated successfully.' });
    });
});


// Helper to get userId from token
function getUserIdFromReq(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        if (!decodedStr.startsWith('user_token_')) return null;
        return parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch (err) {
        return null;
    }
}

// User Endpoint to request a withdrawal
app.post('/api/withdrawals', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, amount, bank, accnum, accname, pin, password } = req.body;
    if (!type || !amount || !bank || !accnum || !accname) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (amount <= 0) return res.status(400).json({ error: 'Invalid amount.' });

    // Validate global settings (time, day, minimum)
    db.get('SELECT * FROM settings WHERE id = 1', [], (err, settingsRow) => {
        const settings = settingsRow || { 
            minWithdrawalActivity: 2000, 
            minWithdrawalReferral: 2000, 
            referralWithdrawDays: '0,1,2,3,4,5,6', activityWithdrawDays: '0',
            referralWithdrawStartTime: '00:00', referralWithdrawEndTime: '23:59',
            activityWithdrawStartTime: '00:00', activityWithdrawEndTime: '23:59'
        };
        
        const minAmount = (type === 'referral' || type === 'referrals') ? settings.minWithdrawalReferral : settings.minWithdrawalActivity;
        if (amount < minAmount) {
            return res.status(400).json({ error: `Minimum withdrawal amount for this earnings type is ₦${minAmount}` });
        }

        const parseDaysToNumbers = (daysStr) => {
            const dayMap = {
                'sunday': 0, 'sun': 0, '0': 0,
                'monday': 1, 'mon': 1, '1': 1,
                'tuesday': 2, 'tue': 2, '2': 2,
                'wednesday': 3, 'wed': 3, '3': 3,
                'thursday': 4, 'thu': 4, '4': 4,
                'friday': 5, 'fri': 5, '5': 5,
                'saturday': 6, 'sat': 6, '6': 6
            };
            return (daysStr || '').split(',').map(d => {
                const clean = d.trim().toLowerCase();
                return dayMap[clean] !== undefined ? dayMap[clean] : null;
            }).filter(x => x !== null);
        };

        if (type === 'referral' || type === 'referrals') {
            const isEnabled = settings.referralWithdrawEnabled !== undefined ? settings.referralWithdrawEnabled : 1;
            if (!isEnabled || isEnabled === 0 || isEnabled === '0' || isEnabled === false || isEnabled === 'false') {
                return res.status(400).json({ error: 'Referral withdrawals are currently closed.' });
            }
        } else {
            const isEnabled = settings.activityWithdrawEnabled !== undefined ? settings.activityWithdrawEnabled : 1;
            if (!isEnabled || isEnabled === 0 || isEnabled === '0' || isEnabled === false || isEnabled === 'false') {
                return res.status(400).json({ error: 'Activity withdrawals are currently closed.' });
            }
        }

        db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
            if (err || !user) return res.status(500).json({ error: 'User not found.' });

            // 1. Verify user has set a withdrawal PIN
            if (!user.withdrawalPin) {
                return res.status(400).json({ error: 'Please set your withdrawal PIN in your Profile before requesting a withdrawal.' });
            }

            // 2. Validate PIN or Password
            let isAuthorized = false;
            if (pin && pin === user.withdrawalPin) {
                isAuthorized = true;
            }
            if (!isAuthorized && password) {
                const passMatch = await bcrypt.compare(password, user.password).catch(() => false);
                if (passMatch) {
                    isAuthorized = true;
                }
            }

            if (!isAuthorized) {
                return res.status(400).json({ error: 'Invalid withdrawal PIN or account password.' });
            }

            const balanceField = type === 'activity' ? 'activityBalance' : 'referralBalance';
            const currentBalance = user[balanceField] || 0;

            if (amount > currentBalance) {
                return res.status(400).json({ error: 'Insufficient balance.' });
            }

        // Deduct from balance
        db.run(`UPDATE users SET ${balanceField} = ${balanceField} - ?, totalBalance = totalBalance - ? WHERE id = ?`, [amount, amount, userId], (err) => {
            if (err) return res.status(500).json({ error: 'Database error.' });

            // Insert into withdrawals table
            const insertQuery = `INSERT INTO withdrawals (username, type, amount, bank, accountNumber, accountName, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`;
            db.run(insertQuery, [user.username, type, amount, bank, accnum, accname], function(err) {
                if (err) return res.status(500).json({ error: 'Failed to record withdrawal.' });
                res.status(201).json({ success: true, message: 'Withdrawal requested successfully.' });
            });
        });
        });
    });
});

// User Endpoint to view their withdrawals
app.get('/api/withdrawals', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'User not found.' });

        db.all('SELECT * FROM withdrawals WHERE username = ? ORDER BY id DESC', [user.username], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error.' });
            // Map to frontend expected format
            const formatted = rows.map(r => ({
                id: r.id,
                username: r.username,
                type: r.type,
                amount: r.amount,
                bank: r.bank,
                accnum: r.accountNumber,
                accname: r.accountName,
                status: r.status,
                date: new Date(r.createdAt).toLocaleDateString('en-NG')
            }));
            res.status(200).json({ withdrawals: formatted });
        });
    });
});

// Admin Endpoint to get all withdrawals
app.get('/api/admin/withdrawals', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.all('SELECT * FROM withdrawals ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        const formatted = rows.map(r => ({
            id: r.id,
            username: r.username,
            type: r.type,
            amount: r.amount,
            bank: r.bank,
            accnum: r.accountNumber,
            accname: r.accountName,
            status: r.status,
            date: new Date(r.createdAt).toLocaleDateString('en-NG')
        }));
        res.status(200).json({ withdrawals: formatted });
    });
});


const ravenBankCodes = {
    "Access Bank": "044", "First Bank": "011", "GTBank (Guaranty Trust)": "058", "Zenith Bank": "057",
    "UBA": "033", "Sterling Bank": "232", "Fidelity Bank": "070", "Polaris Bank": "076", "FCMB": "214",
    "Union Bank": "032", "Wema Bank": "035", "Keystone Bank": "082", "Stanbic IBTC": "221", "Ecobank": "050",
    "Heritage Bank": "030", "Citibank Nigeria": "023", "Jaiz Bank": "301", "Opay": "090399", "PalmPay": "090205",
    "Kuda Bank": "090267", "Moniepoint": "090405", "Carbon": "090175", "VFD Microfinance": "090110"
};

app.put('/api/admin/withdrawals/:id/approve', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT * FROM withdrawals WHERE id = ?', [req.params.id], (err, withdrawal) => {
        if (err || !withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });

        // Check if already processed
        if (withdrawal.status === 'successful') return res.status(400).json({ error: 'Already approved.' });

        db.get('SELECT * FROM settings WHERE id = 1', [], async (err, settings) => {
            if (err) return res.status(500).json({ error: 'Database error reading settings.' });

            if (settings.autoPaymentEnabled && settings.gatewaySecretKey) {
                // Determine bank code
                const bcode = ravenBankCodes[withdrawal.bank];
                if (!bcode) return res.status(400).json({ error: 'Auto payment failed: Unsupported bank for auto transfer.' });

                try {
                    // Make API call to Raven
                    const payload = {
                        amount: parseFloat(withdrawal.amount),
                        bank_code: bcode,
                        bank: withdrawal.bank,
                        account_number: withdrawal.accnum,
                        account_name: withdrawal.accname,
                        narration: "BlazeEarn Withdrawal",
                        wallet_reference: "BE_WD_" + withdrawal.id + "_" + Date.now()
                    };
                    
                    const ravenRes = await axios.post('https://wallets.getravenbank.com/api/v1/wallet/transfer', payload, {
                        headers: {
                            'Authorization': 'Bearer ' + settings.gatewaySecretKey,
                            'Content-Type': 'application/json'
                        }
                    });

                    // Success response from Raven usually contains status 'success' or HTTP 200
                    if (ravenRes.data && (ravenRes.data.status === 'success' || ravenRes.data.status === true)) {
                        // Mark as successful
                        db.run("UPDATE withdrawals SET status = 'successful' WHERE id = ?", [req.params.id], function(err) {
                            if (err) return res.status(500).json({ error: 'Transfer succeeded but failed to update database status.' });
                            return res.status(200).json({ success: true, message: 'Withdrawal auto-paid successfully via Raven.' });
                        });
                    } else {
                        return res.status(400).json({ error: 'Raven transfer failed: ' + JSON.stringify(ravenRes.data) });
                    }
                } catch (error) {
                    console.error('Raven API Error:', error.response ? error.response.data : error.message);
                    return res.status(400).json({ error: 'Auto payment error: ' + (error.response ? (error.response.data.message || JSON.stringify(error.response.data)) : error.message) });
                }
            } else {
                // Manual processing
                db.run("UPDATE withdrawals SET status = 'successful' WHERE id = ?", [req.params.id], function(err) {
                    if (err) return res.status(500).json({ error: 'Database error.' });
                    res.status(200).json({ success: true, message: 'Withdrawal marked as successful manually.' });
                });
            }
        });
    });
});


// --- VENDORS API ---

// Vendor: Update Custom WhatsApp Message
app.put('/api/vendor/custom-message', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch(err) { return res.status(401).json({ error: 'Unauthorized' }); }

    db.get('SELECT username, isVendor FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user || !user.isVendor) return res.status(403).json({ error: 'Forbidden' });
        
        const { customMessage } = req.body;
        db.run('UPDATE vendors SET customMessage = ? WHERE linkedUsername = ?', [customMessage || '', user.username], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.status(200).json({ success: true, message: 'Custom message updated successfully' });
        });
    });
});

// API Endpoint for Vendor Dashboard
app.get('/api/vendor/dashboard', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let userId;
    try {
        const decodedStr = Buffer.from(token, 'base64').toString('ascii');
        userId = parseInt(decodedStr.replace('user_token_', ''), 10);
    } catch(err) { return res.status(401).json({ error: 'Unauthorized' }); }

    db.get('SELECT username, firstName, lastName, isVendor FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user || !user.isVendor) return res.status(403).json({ error: 'Forbidden: Not a vendor' });

        const fullName = `${user.firstName} ${user.lastName}`;
        db.all('SELECT * FROM coupons WHERE assignedVendor = ? OR assignedVendor = ? ORDER BY id DESC', [user.username, fullName], (err, coupons) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            const total = coupons.length;
            const used = coupons.filter(c => c.isUsed).length;
            const active = total - used;

            db.get('SELECT customMessage FROM vendors WHERE linkedUsername = ?', [user.username], (err, vendorRow) => {
                res.status(200).json({
                    stats: { total, active, used },
                    coupons: coupons,
                    customMessage: vendorRow ? (vendorRow.customMessage || '') : ''
                });
            });
        });
    });
});

// Get all vendors
app.get('/api/vendors', (req, res) => {
    db.all('SELECT * FROM vendors ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.status(200).json({ vendors: rows });
    });
});

// Admin: Add a vendor
app.post('/api/admin/vendors', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const { name, contact, phone, pic, location, customMessage, linkedUsername } = req.body;
    const finalContact = contact || phone;
    if (!name || !finalContact) return res.status(400).json({ error: 'Name and contact required.' });

    db.run('INSERT INTO vendors (name, contact, pic, location, customMessage, linkedUsername) VALUES (?, ?, ?, ?, ?, ?)',
        [name, finalContact, pic || '', location || '', customMessage || '', linkedUsername || null], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to add vendor.' });
        const newVendorId = this.lastID;
        
        if (linkedUsername) {
            db.run('UPDATE users SET isVendor = 1 WHERE username = ?', [linkedUsername], function(err2) {
                res.status(201).json({ success: true, vendor: { id: newVendorId, name, contact: finalContact, pic, location, customMessage: customMessage || '', linkedUsername } });
            });
        } else {
            res.status(201).json({ success: true, vendor: { id: newVendorId, name, contact: finalContact, pic, location, customMessage: customMessage || '', linkedUsername: null } });
        }
    });
});

// Admin: Delete a vendor
app.delete('/api/admin/vendors/:id', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.run('DELETE FROM vendors WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to delete vendor.' });
        res.status(200).json({ success: true });
    });
});

// User Endpoint to claim Data
app.post('/api/user/data-claims', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { network, phone } = req.body;
    if (!network || !phone) return res.status(400).json({ error: 'Network and phone are required.' });
    
    db.get('SELECT username, referralCode FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Database error.' });
        
        db.get('SELECT dataClaimReferralsRequired FROM settings WHERE id = 1', [], (err, settingRow) => {
            const reqRefs = (settingRow && settingRow.dataClaimReferralsRequired !== undefined) ? settingRow.dataClaimReferralsRequired : 20;

            getUserReferralStats(user.username).then((refStats) => {
                const directCount = refStats.directCount || 0;
                const allowedClaims = Math.floor(directCount / reqRefs);
                
                if (allowedClaims < 1) {
                    return res.status(400).json({ error: `You need at least ${reqRefs} direct referrals to make your first data claim.` });
                }

                db.get("SELECT COUNT(*) as count FROM data_claims WHERE userId = ? AND status != 'rejected'", [userId], (err, row) => {
                    const existingClaims = row ? row.count : 0;
                    if (existingClaims >= 1) {
                        return res.status(400).json({ error: 'You have already claimed your data bonus. This bonus is strictly limited to once per user.' });
                    }

                    // Insert new claim
                    db.run("INSERT INTO data_claims (userId, username, network, phone) VALUES (?, ?, ?, ?)", [userId, user.username, network, phone], function(err) {
                        if (err) return res.status(500).json({ error: 'Database error.' });
                        res.status(201).json({ success: true, message: 'Data claim submitted successfully! Pending admin approval.' });
                    });
                });
            });
        });
    });
});

app.get('/api/user/data-claims', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    db.all('SELECT * FROM data_claims WHERE userId = ? ORDER BY id DESC', [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(200).json({ claims: rows });
    });
});

// Admin Endpoint to get all data claims
app.get('/api/admin/data-claims', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.all('SELECT * FROM data_claims ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.status(200).json({ claims: rows });
    });
});

app.put('/api/admin/data-claims/:id/approve', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.run("UPDATE data_claims SET status = 'approved' WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.status(200).json({ success: true, message: 'Data claim approved.' });
    });
});

app.put('/api/admin/data-claims/:id/reject', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.run("UPDATE data_claims SET status = 'rejected' WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.status(200).json({ success: true, message: 'Data claim rejected.' });
    });
});

// User Endpoint to view their direct referrals
app.get('/api/user/referrals', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Database error.' });

        const query = `
            SELECT firstName, lastName, username, email, phone, createdAt, 'Direct' as level 
            FROM users WHERE referredBy = ? 
            UNION ALL 
            SELECT u2.firstName, u2.lastName, u2.username, u2.email, u2.phone, u2.createdAt, 'Indirect' as level 
            FROM users u2 JOIN users u1 ON u2.referredBy = u1.username 
            WHERE u1.referredBy = ? 
            ORDER BY createdAt DESC
        `;
        db.all(query, [user.username, user.username], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error.' });
            res.status(200).json({ referrals: rows });
        });
    });
});

// User Endpoint to get tasks (with completion status)
app.get('/api/debug', (req, res) => { console.log('[FRONTEND ERROR]:', req.query.err); res.sendStatus(200); });
app.get('/api/tasks', (req, res) => {
    const userId = getUserIdFromReq(req);
    
    db.all('SELECT * FROM tasks ORDER BY id DESC', [], (err, tasks) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        
        if (!userId) {
            // Unauthenticated user sees tasks but none are marked completed
            return res.status(200).json({ tasks: tasks.map(t => ({...t, completed: false})) });
        }

        db.all('SELECT taskId FROM user_tasks WHERE userId = ?', [userId], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error.' });
            const completedTaskIds = new Set(rows.map(r => r.taskId));
            
            const result = tasks.map(t => ({
                ...t,
                completed: completedTaskIds.has(t.id)
            }));
            res.status(200).json({ tasks: result });
        });
    });
});

// User Endpoint to complete a task
app.post('/api/tasks/:id/complete', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const taskId = req.params.id;

    // Check if task exists
    db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
        if (err || !task) {
            console.error("Task fetch error:", err, "Task:", task);
            return res.status(404).json({ error: 'Task not found.' });
        }

        // Check if user already completed it
        db.get('SELECT * FROM user_tasks WHERE userId = ? AND taskId = ?', [userId, taskId], (err, row) => {
            if (err) {
                console.error("user_tasks fetch error:", err);
                return res.status(500).json({ error: 'Database error.' });
            }
            if (row) return res.status(400).json({ error: 'Task already completed.' });

            // Insert into user_tasks and increment activityBalance
            db.run('INSERT INTO user_tasks (userId, taskId) VALUES (?, ?)', [userId, taskId], function(err) {
                if (err) {
                    console.error("user_tasks insert error:", err);
                    return res.status(500).json({ error: 'Failed to record task completion.' });
                }
                
                db.run('UPDATE users SET activityBalance = activityBalance + ?, totalBalance = totalBalance + ? WHERE id = ?', [task.reward, task.reward, userId], function(err) {
                    if (err) {
                        console.error("users update error:", err);
                        return res.status(500).json({ error: 'Failed to update balance.' });
                    }
                    res.status(200).json({ success: true, message: 'Task completed successfully!' });
                });
            });
        });
    });
});

// Admin Endpoint to create a task
app.post('/api/admin/tasks', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    const { title, reward, type, link, instructions } = req.body;
    if (!title || !reward || !type || !link) return res.status(400).json({ error: 'All fields required.' });

    db.run('INSERT INTO tasks (title, reward, type, link, instructions) VALUES (?, ?, ?, ?, ?)', [title, reward, type, link, instructions || ''], function(err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.status(201).json({ success: true, message: 'Task added.' });
    });
});

// Admin Endpoint to delete a task
app.delete('/api/admin/tasks/:id', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        db.run('DELETE FROM user_tasks WHERE taskId = ?', [req.params.id], () => {}); // Cleanup history
        res.status(200).json({ success: true, message: 'Task deleted.' });
    });
});

// Public Endpoint to get Top Earners by All-Time Referral Earnings
let topEarnersCache = { data: null, lastUpdated: 0 };
app.get('/api/public/top-earners', (req, res) => {
    const now = Date.now();
    if (topEarnersCache.data && (now - topEarnersCache.lastUpdated < 60000)) {
        return res.status(200).json({ success: true, earners: topEarnersCache.data });
    }
    const query = `
        SELECT 
            u.username,
            (COALESCE(direct.cnt, 0) * 500) + (COALESCE(indirect.cnt, 0) * 50) AS totalEarned,
            (SELECT COUNT(*) FROM withdrawals w WHERE w.username = u.username AND w.type IN ('referral', 'referrals')) as refPaid,
            (SELECT COUNT(*) FROM withdrawals w WHERE w.username = u.username AND w.type = 'activity') as actPaid
        FROM users u
        LEFT JOIN (
            SELECT referredBy, COUNT(*) as cnt FROM users WHERE referredBy IS NOT NULL GROUP BY referredBy
        ) direct ON u.username = direct.referredBy
        LEFT JOIN (
            SELECT p.referredBy as grandparent, COUNT(*) as cnt 
            FROM users c
            JOIN users p ON c.referredBy = p.username
            WHERE p.referredBy IS NOT NULL
            GROUP BY p.referredBy
        ) indirect ON u.username = indirect.grandparent
        WHERE (COALESCE(direct.cnt, 0) * 500) + (COALESCE(indirect.cnt, 0) * 50) > 0
        ORDER BY totalEarned DESC
        LIMIT 15
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        // Map the result so the frontend receives it correctly
        const formatted = rows.map(r => ({
            username: r.username,
            totalReferralEarnings: r.totalEarned !== undefined ? r.totalEarned : (r.totalearned !== undefined ? r.totalearned : 0),
            refPaid: r.refPaid > 0,
            actPaid: r.actPaid > 0
        }));
        topEarnersCache.data = formatted;
        topEarnersCache.lastUpdated = Date.now();
        res.status(200).json({ success: true, earners: formatted });
    });
});

// Debug Endpoint
app.get('/api/vercel-debug', (req, res) => {
    res.json({
        vercel: !!process.env.VERCEL,
        nodeVersion: process.version,
        importError: db.importError ? { message: db.importError.message, stack: db.importError.stack } : null
    });
});


// Catch-all route to prevent Express from sending HTML errors for unknown routes
app.use((req, res) => {
    console.log(`[404 NOT FOUND] Route doesn't exist: ${req.method} ${req.url}`);
    res.status(404).json({ error: `The endpoint ${req.method} ${req.url} does not exist on this backend.` });
});

// Start the server
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Blaze Earn backend server running on http://0.0.0.0:${PORT}`);
    });
}

module.exports = app;
