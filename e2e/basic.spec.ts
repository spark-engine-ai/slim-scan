import { test, expect } from '@playwright/test';

test.describe('SlimScan Basic Functionality', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SlimScan/);
  });

  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check that main navigation items are present
    await expect(page.getByText('SlimScan')).toBeVisible();
    await expect(page.getByText('Scan')).toBeVisible();
    await expect(page.getByText('Backtest')).toBeVisible();
    await expect(page.getByText('Trading')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('should navigate to different pages', async ({ page }) => {
    await page.goto('/');
    
    // Click on Settings
    await page.getByText('Settings').click();
    await expect(page.getByText('Data Provider')).toBeVisible();
    
    // Click on Backtest
    await page.getByText('Backtest').click();
    await expect(page.getByText('Run Backtest')).toBeVisible();
    
    // Click on Trading
    await page.getByText('Trading').click();
    await expect(page.getByText('Paper Trading')).toBeVisible();
    
    // Back to Scan
    await page.getByText('Scan').click();
    await expect(page.getByText('Run Scan')).toBeVisible();
  });

  test('should show market status in topbar', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText(/Market (Open|Closed)/)).toBeVisible();
    await expect(page.getByText(/Provider: (POC|POLYGON|IEX)/)).toBeVisible();
  });
});