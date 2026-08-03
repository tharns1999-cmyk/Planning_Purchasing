import { test, expect } from '@playwright/test';

test.describe('06 - Dashboard & Safe Parsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    // Reload to populate seed data
    await page.reload();
  });

  test('should display dashboard KPIs correctly and handle malformed string completedQty gracefully', async ({ page }) => {
    // Inject a malformed completedQty string into LocalStorage to test safe parsing
    await page.evaluate(() => {
      const soDataStr = localStorage.getItem('database_salesOrders');
      if (soDataStr) {
        try {
          const soData = JSON.parse(soDataStr);
          if (soData && soData.length > 0 && soData[0].items && soData[0].items.length > 0) {
            // Force a string value to test safe parsing logic
            soData[0].items[0].completedQty = '✅'; 
            localStorage.setItem('database_salesOrders', JSON.stringify(soData));
          }
        } catch (e) {
          console.error('Failed to inject malformed data', e);
        }
      }
    });

    // Reload page to apply the injected data
    await page.goto('/');
    
    // Check Dashboard heading to ensure it didn't crash
    // Since Dashboard route is '/dashboard', let's navigate there explicitly
    await page.goto('/dashboard');
    // Verify KPI cards are visible (means no crash in parsing)
    await expect(page.getByText('Total POs (ใบสั่งซื้อทั้งหมด)')).toBeVisible();
    await expect(page.getByText('Completed (เสร็จสิ้นครบถ้วน)')).toBeVisible();
    
    // Check if the KPI values are numbers and not NaN
    // We expect it to safely parse '✅' as 0 or 100% depending on implementation, but NOT crash.
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('NaN');
  });
});
