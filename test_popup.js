const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Catch errors
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    console.log('Navigating to http://localhost:3000/');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'screenshot1.png' });
    
    const popupVisible = await page.evaluate(() => {
        const modal = document.getElementById('site-announcement-modal');
        if (!modal) return 'MODAL NOT FOUND';
        const style = window.getComputedStyle(modal);
        return {
            classes: modal.className,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            content: document.getElementById('site-announcement-content') ? document.getElementById('site-announcement-content').innerText : 'NO CONTENT'
        };
    });
    
    console.log('Popup State:', popupVisible);
    
    await browser.close();
})();
