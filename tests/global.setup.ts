import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  // Try to login to generate state
  await page.goto('http://localhost:3000/login');
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));
  
  await page.waitForSelector('input[placeholder="أدخل اسم الحساب..."]', { timeout: 10000 });
  
  // Fill credentials
  await page.fill('input[placeholder="أدخل اسم الحساب..."]', 'admin');
  await page.fill('input[placeholder="••••••••••••"]', 'admin');
  
  await page.click('button[type="submit"]');
  
  // Wait for the login form to disappear indicating successful login
  await page.waitForSelector('input[placeholder="أدخل اسم الحساب..."]', { state: 'hidden', timeout: 15000 });

  // Save storage state into the file.
  await page.context().storageState({ path: 'tests/playwright/.auth/user.json' });
});
