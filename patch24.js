const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

// 1. Add nodemailer and randomstring
if (!server.includes("const nodemailer")) {
    server = `const nodemailer = require('nodemailer');\n` + server;
}
if (!server.includes("const crypto = require('crypto');")) {
    server = `const crypto = require('crypto');\n` + server;
}

// 2. Add properties to /api/settings/public
server = server.replace(
    /popupMessage: row.popupMessage \|\| '',\n\s*welcomeMessage: row.welcomeMessage \|\| ''/g,
    `popupMessage: row.popupMessage || '',\n            welcomeMessage: row.welcomeMessage || '',\n            emailVerificationEnabled: row.emailVerificationEnabled === 1 || row.emailVerificationEnabled === true`
);

// 3. Add properties to /api/admin/settings GET
server = server.replace(
    /popupMessage: settings.popupMessage,\n\s*welcomeMessage: settings.welcomeMessage\n\s*}\);/g,
    `popupMessage: settings.popupMessage,\n            welcomeMessage: settings.welcomeMessage,\n            emailVerificationEnabled: settings.emailVerificationEnabled,\n            smtpHost: settings.smtpHost,\n            smtpPort: settings.smtpPort,\n            smtpUser: settings.smtpUser,\n            smtpPass: settings.smtpPass\n        });`
);

// 4. Update /api/admin/settings PUT
server = server.replace(
    /popupMessage, welcomeMessage } = req\.body;/g,
    `popupMessage, welcomeMessage, emailVerificationEnabled, smtpHost, smtpPort, smtpUser, smtpPass } = req.body;`
);

server = server.replace(
    /if \(welcomeMessage !== undefined\) { updates\.push\('welcomeMessage = \?'\); params\.push\(welcomeMessage\); }/g,
    `if (welcomeMessage !== undefined) { updates.push('welcomeMessage = ?'); params.push(welcomeMessage); }
    if (emailVerificationEnabled !== undefined) { updates.push('emailVerificationEnabled = ?'); params.push(emailVerificationEnabled ? 1 : 0); }
    if (smtpHost !== undefined) { updates.push('smtpHost = ?'); params.push(smtpHost); }
    if (smtpPort !== undefined) { updates.push('smtpPort = ?'); params.push(smtpPort); }
    if (smtpUser !== undefined) { updates.push('smtpUser = ?'); params.push(smtpUser); }
    if (smtpPass !== undefined) { updates.push('smtpPass = ?'); params.push(smtpPass); }`
);

// 5. Add /api/auth/send-verification endpoint
const sendVerificationCode = `
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
                    from: \`"BlazeEarn" <\${settings.smtpUser}>\`,
                    to: email,
                    subject: 'Your BlazeEarn Verification Code',
                    text: \`Your verification code is: \${code}. It will expire in 10 minutes.\`,
                    html: \`<p>Your verification code is: <strong>\${code}</strong></p><p>It will expire in 10 minutes.</p>\`
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
                console.log(\`[MOCK EMAIL] To: \${email}, Code: \${code}\`);
                return res.status(200).json({success: true, message: 'Verification code generated (Mock mode - Check console)'});
            }
        });
    });
});
`;

if (!server.includes("/api/auth/send-verification")) {
    server = server.replace(/app\.post\('\/api\/auth\/register', async \(req, res\) => {/g, sendVerificationCode + "\n\napp.post('/api/auth/register', async (req, res) => {");
}

// 6. Add validation to register endpoint
server = server.replace(
    /const password = req\.body\.password;\n\s*const coupon_code = req\.body\.coupon_code \|\| req\.body\.couponCode;/g,
    `const password = req.body.password;\n    const coupon_code = req.body.coupon_code || req.body.couponCode;\n    const verification_code = req.body.verification_code;`
);

const validationCheck = `
        // Check email verification if enabled
        db.get('SELECT * FROM settings WHERE id = 1', [], (err, settings) => {
            if(err) return res.status(500).json({ error: 'Database error' });
            
            if(settings && (settings.emailVerificationEnabled === 1 || settings.emailVerificationEnabled === true)) {
                if(!verification_code) {
                    return res.status(400).json({ error: 'Email verification code is required.' });
                }
                
                db.get('SELECT * FROM email_verifications WHERE email = ? ORDER BY id DESC LIMIT 1', [email], (err, record) => {
                    if(err) return res.status(500).json({ error: 'Database error checking verification' });
                    
                    if(!record || record.code !== verification_code) {
                        return res.status(400).json({ error: 'Invalid verification code.' });
                    }
                    if(new Date(record.expiresAt) < new Date()) {
                        return res.status(400).json({ error: 'Verification code expired.' });
                    }
                    
                    // Code is valid, proceed with registration
                    continueRegistration(res, req.body, full_name, firstName, lastName, username, email, phone, password, coupon_code, referred_by);
                });
            } else {
                continueRegistration(res, req.body, full_name, firstName, lastName, username, email, phone, password, coupon_code, referred_by);
            }
        });
        
        function continueRegistration(res, body, full_name, firstName, lastName, username, email, phone, password, coupon_code, referred_by) {
`;

server = server.replace(
    /\/\/ Check if User Exists/g,
    validationCheck + "\n        // Check if User Exists"
);

// Close the continueRegistration function
server = server.replace(
    /res\.status\(201\)\.json\(\{ success: true, message: 'Registration successful!' \}\);\n\s*\}\);\n\s*\}\);\n\s*\}\);\n\s*\}\);/g,
    `res.status(201).json({ success: true, message: 'Registration successful!' });\n                        });\n                    });\n                });\n            });\n        }`
);


fs.writeFileSync('server.js', server);
console.log("Patched server.js for Email Verification");
