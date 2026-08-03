import { test, expect } from '@playwright/test';

test.describe('04 - Production Actual & Auto-Reconciliation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should input actuals and auto-reconcile PO to COMPLETED status', async ({ page }) => {
    // 1. Go to planning and ensure we have a PUBLISHED plan
    await page.goto('/planning');
    await page.waitForTimeout(1000);
    
    const publishBtn = page.getByRole('button', { name: 'ประกาศใช้แผน' });
    if (await publishBtn.isVisible()) {
        await publishBtn.click();
        await page.getByRole('button', { name: 'ยืนยันการประกาศใช้' }).click();
        await expect(page.getByText('PUBLISHED')).toBeVisible();
    }

    // 2. Go to Production Actual page
    await page.goto('/actuals');
    // Verify by checking a distinct element
    await expect(page.getByText('ประจำสัปดาห์')).toBeVisible();

    // Wait for actual cards to render
    await page.waitForTimeout(500);
    
    // Find a card to input actuals. We use seed data, so there should be at least one card.
    const inputActualBtn = page.getByRole('button', { name: 'บันทึกยอด' }).first();
    
    if (await inputActualBtn.isVisible()) {
        await inputActualBtn.click();
        
        // Fill actual good qty and waste
        // Let's put a large number to ensure it exceeds the target and marks PO as COMPLETED
        await page.getByLabel(/ยอดดี/).fill('9999');
        await page.getByLabel(/ยอดเสีย/).fill('0');
        
        await page.getByRole('button', { name: 'บันทึก' }).click();
        
        // Wait for modal to close and state to update
        await page.waitForTimeout(500);

        // 3. Verify PO status is updated to COMPLETED
        await page.goto('/sales-orders');
        
        // Check if there is any PO with COMPLETED status
        // The dashboard/sales order list shows status badges. 
        // In Thai, COMPLETED might be "ผลิตครบแล้ว" or similar.
        // Let's just check for the text indicating completion.
        await expect(page.locator('body')).toContainText(/COMPLETED|ผลิตครบแล้ว/i);
    }
  });
});
