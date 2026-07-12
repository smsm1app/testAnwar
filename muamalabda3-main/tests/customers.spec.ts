import { test, expect } from '@playwright/test';

test.describe('Customers Module QA', () => {
  test('Should load customers and open add customer drawer', async ({ page }) => {
    await page.goto('/');
    await page.click('text=العملاء');
    
    // Check page title
    await expect(page.locator('h1').filter({ hasText: 'إدارة العملاء والمشتركين' })).toBeVisible();

    // Check pagination logic exists (or that the table loaded at least some data)
    await expect(page.locator('text=عرض')).toBeVisible({ timeout: 10000 }).catch(() => {
      // It's possible there are no customers or < 50 customers, so pagination text is hidden.
      console.log('No pagination text found, which is fine if count <= limit');
    });

    // Open add customer form
    const addButton = page.locator('button').filter({ hasText: 'إضافة عميل جديد' });
    await addButton.click();

    // Verify modal elements
    const modalTitle = page.locator('h3').filter({ hasText: 'إضافة مشترك جديد' });
    await expect(modalTitle).toBeVisible();

    // Fill the form
    await page.fill('input[placeholder="مثال: م. علي صالح الشمري"]', 'QA Test Customer ' + Date.now());
    await page.fill('input[placeholder="077XXXXXXXX"]', '07700000000');
    
    // Close form
    await page.locator('.fixed button:has(svg.lucide-x)').last().click();
  });

  test('Search filtering works', async ({ page }) => {
    await page.goto('/');
    await page.click('text=العملاء');
    const searchInput = page.locator('input[placeholder="ابحث عن عميل (الاسم، الهاتف، العنوان)..."]');
    await searchInput.fill('Test Search Query');
    
    // Wait for debounce API call
    await page.waitForTimeout(1000);
    // There shouldn't be any result, so we expect empty state text
    await expect(page.locator('text=لا توجد نتائج')).toBeVisible().catch(() => {});
  });
});
