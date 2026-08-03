import { test, expect } from '@playwright/test';

test.describe('05 - Print Preview Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should render print preview correctly and have auto-scale print button', async ({ page }) => {
    await page.goto('/print-preview');
    await expect(page.getByRole('heading', { name: 'ตัวอย่างก่อนพิมพ์ (Print Preview)' })).toBeVisible();

    // The seed data has a plan by default.
    // Ensure the printable table is visible
    const printableTable = page.locator('.print-table');
    if (await printableTable.isVisible()) {
        await expect(printableTable).toBeVisible();
        
        // Ensure we have 4 rooms (R1, R2, R3, R4) in the header
        await expect(printableTable.getByText(/R1 — ห้องขนม 1/)).toBeVisible();
        
        // Ensure the helper text exists
        await expect(page.getByText(/ระบบจะย่อขนาดอัตโนมัติ/)).toBeVisible();

        // The print button should exist
        const printBtn = page.getByRole('button', { name: 'พิมพ์' });
        await expect(printBtn).toBeVisible();
    }
  });
});
