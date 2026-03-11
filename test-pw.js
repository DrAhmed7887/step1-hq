const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5176');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'ss_step1.png' });
  await browser.close();
})();
