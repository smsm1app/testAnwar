import { test, expect } from '@playwright/test';

test.describe('Contracts & Maintenance QA', () => {
  test('Should load contracts and check term visibility', async ({ page }) => {
    await page.goto('/');
    await page.click('text=العقود');
    await expect(page.locator('h1').filter({ hasText: 'العقود القانونية والمواثيق' })).toBeVisible();
    
    // Check if the specific AC cable term exists in the form
    // Open a new contract form
    await page.locator('button').filter({ hasText: 'صياغة عقد جديد' }).click();

    await expect(page.locator('h2').filter({ hasText: 'إنشاء عقد جديد' })).toBeVisible();
    
    // Open preview to see the contract text
    await page.locator('button').filter({ hasText: 'معاينة الطباعة' }).click();
    await expect(page.locator('div').filter({ hasText: 'تكلفة تجهيز كيبل AC' }).first()).toBeVisible();
    
    // Cancel to close view (the X icon in preview)
    await page.locator('button:has(svg.lucide-x)').last().click();
  });

  test('Should load maintenance and open request form', async ({ page }) => {
    await page.goto('/');
    await page.click('text=الصيانة والأعطال');
    await expect(page.locator('h1').filter({ hasText: 'الصيانة والدعم الفني' })).toBeVisible();

    await page.locator('button').filter({ hasText: 'صيانة وقائية' }).click();
    await expect(page.locator('h3').filter({ hasText: 'طلب صيانة وقائية لفاتورة' })).toBeVisible();
    await page.locator('.fixed button:has(svg.lucide-x)').last().click();
  });
});
