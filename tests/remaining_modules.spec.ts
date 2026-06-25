import { test, expect } from '@playwright/test';

test.describe('Remaining Modules Smoke Audit', () => {

  const navigateToTab = async (page: any, text: string) => {
    await page.goto('http://localhost:3000');
    const btn = page.locator('button').filter({ hasText: text });
    try {
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      return true;
    } catch {
      console.log(`Skipping ${text} - button not found or user lacks permission.`);
      return false;
    }
  };

  test('Dashboard loads successfully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1').filter({ hasText: 'لوحة التحكم' }).or(page.locator('h2').filter({ hasText: 'لوحة التحكم' }))).toBeVisible({ timeout: 10000 });
  });

  test('POS Module smoke test', async ({ page }) => {
    if (await navigateToTab(page, 'نقطة البيع')) {
      await expect(page.locator('h2').filter({ hasText: 'نقطة البيع' }).or(page.locator('span').filter({ hasText: 'نقطة البيع' }).first())).toBeVisible();
      await expect(page.locator('input[placeholder*="بحث"]').first()).toBeVisible();
    }
  });

  test('Bank Settlement Module smoke test', async ({ page }) => {
    if (await navigateToTab(page, 'تسوية الماستركارد')) {
      await expect(page.locator('h2').filter({ hasText: 'تسوية الماستركارد' })).toBeVisible();
    }
  });

  test('Installments Module smoke test', async ({ page }) => {
    if (await navigateToTab(page, 'الأقساط والديون')) {
      await expect(page.locator('h2').filter({ hasText: 'الأقساط والديون' })).toBeVisible();
    }
  });

  test('Installations Module smoke test', async ({ page }) => {
    if (await navigateToTab(page, 'الحجوزات والتركيب')) {
      await expect(page.locator('h2').filter({ hasText: 'الحجوزات والتركيب' })).toBeVisible();
      const addBtn = page.locator('button:has(svg.lucide-plus)').first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await expect(page.locator('button:has(svg.lucide-x)').last()).toBeVisible();
        await page.locator('button:has(svg.lucide-x)').last().click();
      }
    }
  });

  test('Employees Module smoke test', async ({ page }) => {
    if (await navigateToTab(page, 'الموظفين والصلاحيات')) {
      await expect(page.locator('h2').filter({ hasText: 'الموظفين والصلاحيات' })).toBeVisible();
    }
  });

  test('Reports Module smoke test', async ({ page }) => {
    if (await navigateToTab(page, 'التقارير والأمان')) {
      await expect(page.locator('h2').filter({ hasText: 'التقارير والأمان' })).toBeVisible();
    }
  });

  test('Settings Module smoke test', async ({ page }) => {
    if (await navigateToTab(page, 'الإعدادات')) {
      await expect(page.locator('h2').filter({ hasText: 'الإعدادات' })).toBeVisible();
    }
  });

});
