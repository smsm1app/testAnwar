import { test, expect } from '@playwright/test';

test.describe('Products Module QA', () => {
  test('Should load products and open add product modal', async ({ page }) => {
    await page.goto('/');
    await page.click('text=المنتجات والأسعار');
    await expect(page.locator('h1').filter({ hasText: 'إدارة المخزون والمنتجات' })).toBeVisible();

    const addButton = page.locator('button').filter({ hasText: 'إدراج منتج' });
    await addButton.click();

    await expect(page.locator('h3').filter({ hasText: 'إضافة منتج أو قطعة للمخزن' })).toBeVisible();
    await page.locator('.fixed button:has(svg.lucide-x)').last().click();
  });
});

test.describe('Invoices Module QA', () => {
  test('Should load invoices and test print drawer', async ({ page }) => {
    await page.goto('/');
    await page.click('text=الفواتير');
    await expect(page.locator('h1').filter({ hasText: 'أرشيف المبيعات وفواتير العملاء' })).toBeVisible();

    // Find the first invoice's "معاينة الفاتورة" button
    const viewButton = page.locator('button').filter({ hasText: 'معاينة الفاتورة' }).first();
    
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await expect(page.locator('text=طباعة المستند')).toBeVisible();
      await page.locator('button:has(svg.lucide-x)').first().click();
    }
  });
});
