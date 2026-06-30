const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

const forgotPasswordEndpoints = `
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
                        from: \`"BlazeEarn" <\${settings.smtpUser}>\`,
                        to: email,
                        subject: 'Your BlazeEarn Password Reset Code',
                        text: \`Your password reset code is: \${code}. It will expire in 10 minutes.\`,
                        html: \`<p>Your password reset code is: <strong>\${code}</strong></p><p>It will expire in 10 minutes.</p>\`
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
                    console.log(\`[MOCK PASSWORD RESET EMAIL] To: \${email}, Code: \${code}\`);
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
`;

server = server.replace(/\/\/ --- PASSWORD RECOVERY ---/g, ''); // Clean up previous modifications if any
server = server.replace(/\/\/ --- TARGETED POPUP ---/g, forgotPasswordEndpoints + '\n// --- TARGETED POPUP ---');

fs.writeFileSync('server.js', server);
console.log("Patched server.js with forgot/reset password endpoints");
