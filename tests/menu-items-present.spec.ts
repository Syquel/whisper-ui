import { test, expect } from '@playwright/test';

// Simple test for the expected menu items
test('test menu items are present', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('list').getByRole('link', { name: 'Send' })).toBeVisible();
  await expect(page.getByRole('list').getByRole('link', { name: 'Receive' })).toBeVisible();
  await expect(page.getByRole('list').getByRole('link', { name: 'You' })).toBeVisible();
  await expect(page.getByRole('list').getByRole('link', { name: 'Info' })).toBeVisible();
  await expect(page.getByRole('list').getByRole('link', { name: 'to GitHub' })).toBeVisible();
});