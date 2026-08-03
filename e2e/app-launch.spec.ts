import { test, expect } from '@playwright/test';

test.describe('Weekly Production Planner App Launch & Viewport Tests', () => {
  test('should load application homepage in 1366x768 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');

    // Expand sidebar if collapsed
    const expandBtn = page.getByRole('button', { name: 'ขยายเมนู' });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    await expect(page).toHaveTitle(/ระบบวางแผนการผลิตรายสัปดาห์/);
    await expect(page.getByRole('link', { name: 'ภาพรวม', exact: true })).toBeVisible();
  });

  test('should navigate to Showcase route and display components', async ({ page }) => {
    await page.goto('/showcase');

    await expect(page.getByText('Shared Foundation Showcase')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Primary Action' })).toBeVisible();
  });
});
