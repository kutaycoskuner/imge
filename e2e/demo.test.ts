import { expect, test } from '@playwright/test';

test('home page is the graph editor', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.world .node').first()).toBeVisible();
});

test('matrix addition page shows its calculator', async ({ page }) => {
	await page.goto('/matrix_addition');
	await expect(page.locator('.math-box')).toBeVisible();
});

test('old /graph_editor address forwards to the home page', async ({ page }) => {
	await page.goto('/graph_editor');
	await expect(page).toHaveURL(/\/$/);
	await expect(page.locator('.world .node').first()).toBeVisible();
});
