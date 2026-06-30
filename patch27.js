const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

// Add global axios if not present (since we need to make an HTTP request to Raven)
if (!server.includes("const axios = require('axios');")) {
    server = `const axios = require('axios');\n` + server;
}

// 1. Add fields to GET /api/admin/settings
server = server.replace(
    /smtpPass: settings\.smtpPass/g,
    `smtpPass: settings.smtpPass,\n            autoPaymentEnabled: settings.autoPaymentEnabled,\n            gatewaySecretKey: settings.gatewaySecretKey`
);

// 2. Add fields to PUT /api/admin/settings
server = server.replace(
    /smtpUser, smtpPass } = req\.body;/g,
    `smtpUser, smtpPass, autoPaymentEnabled, gatewaySecretKey } = req.body;`
);

server = server.replace(
    /if \(smtpPass !== undefined\) \{ updates\.push\('smtpPass = \?'\); params\.push\(smtpPass\); \}/g,
    `if (smtpPass !== undefined) { updates.push('smtpPass = ?'); params.push(smtpPass); }
    if (autoPaymentEnabled !== undefined) { updates.push('autoPaymentEnabled = ?'); params.push(autoPaymentEnabled ? 1 : 0); }
    if (gatewaySecretKey !== undefined) { updates.push('gatewaySecretKey = ?'); params.push(gatewaySecretKey); }`
);

// 3. Rewrite PUT /api/admin/withdrawals/:id/approve
const approveWithdrawalOriginal = `app.put('/api/admin/withdrawals/:id/approve', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== 'Bearer admin123') return res.status(401).json({ error: 'Unauthorized' });

    db.run("UPDATE withdrawals SET status = 'successful' WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.status(200).json({ success: true, message: 'Withdrawal successful.' });
    });
});`;

const newApproveLogic = `
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
`;

if (!server.includes("const ravenBankCodes = {")) {
    // Escape string for regex match (or just replace the string directly)
    server = server.split(approveWithdrawalOriginal).join(newApproveLogic);
}

fs.writeFileSync('server.js', server);
console.log("Patched server.js for Raven Auto Payment");
