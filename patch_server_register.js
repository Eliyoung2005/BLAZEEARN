const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

const oldLogic = `      const { full_name, username, email, phone, password, coupon_code, referred_by } = req.body;
  
      // Basic Validation
      if (!full_name || !username || !email || !phone || !password || !coupon_code) {
          return res.status(400).json({ error: 'All required fields including Coupon Code must be filled.' });
      }`;

const newLogic = `      // Accept both payload styles to prevent caching issues
      const username = req.body.username;
      const email = req.body.email;
      const phone = req.body.phone;
      const password = req.body.password;
      const coupon_code = req.body.coupon_code || req.body.couponCode;
      const referred_by = req.body.referred_by || req.body.referredBy;
      
      let full_name = req.body.full_name;
      if (!full_name && req.body.firstName) {
          full_name = req.body.firstName + (req.body.lastName ? ' ' + req.body.lastName : '');
      }

      // Basic Validation
      if (!full_name || !username || !email || !phone || !password || !coupon_code) {
          return res.status(400).json({ error: 'All required fields including Coupon Code must be filled.' });
      }`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync(serverPath, content, 'utf8');
console.log("Successfully patched server.js registration payload logic.");
