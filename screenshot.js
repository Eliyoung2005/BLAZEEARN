const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:/Users/PC/.cache/puppeteer/chrome/win64-150.0.7871.24/chrome-win64/chrome.exe'
  });
  const page = await browser.newPage();
  
  // Go to admin login
  await page.goto('http://localhost:3000/admin-login');
  
  // Fill in credentials
  await page.type('#username', 'admin');
  await page.type('#password', 'blaze2025');
  
  // Click login
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]')
  ]);
  
  // Wait a bit just in case
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot
  const screenshotPath = 'c:/Users/PC/Desktop/BlazeEarn/dashboard_screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  console.log('Screenshot saved to ' + screenshotPath);
  
  await browser.close();
})();
