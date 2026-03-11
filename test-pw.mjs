import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5176');
  await page.waitForTimeout(1000);
  
  // Click High energy
  await page.click('button:has-text("High")');
  
  // Click 4 hours
  await page.click('button:has-text("4")');
  
  // Click clear blockers
  await page.click('button:has-text("Clear")');
  
  // Click Generate Plan
  await page.click('button:has-text("Generate Today\'s Plan")');
  
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/Users/ahmedzayed/Downloads/WarRoom/ss_step2_coach_response.png', fullPage: true });
  
  await browser.close();
})();
