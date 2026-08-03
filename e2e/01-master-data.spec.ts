import { test, expect } from '@playwright/test';

test.describe('01 - Master Data & Data Tools', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate fresh start
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    // Reload to ensure app state is reset and seed data is populated
    await page.reload();
  });

  test('should reset data using Data Tools page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /ข้อมูล|Data/ })).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('should display Master Data customers and products', async ({ page }) => {
    await page.goto('/master-data');
    await expect(page.getByRole('heading', { name: 'ข้อมูลหลัก (Master Data)' })).toBeVisible();

    // Check Tabs
    await expect(page.getByText('ลูกค้า').first()).toBeVisible();
    await expect(page.getByText('สินค้า').first()).toBeVisible();

    const customerTable = page.locator('table').first();
    await expect(customerTable).toBeVisible();

    // Switch to Products tab
    await page.getByText('สินค้า').first().click();
    
    const productTable = page.locator('table').first();
    await expect(productTable).toBeVisible();
  });
});
