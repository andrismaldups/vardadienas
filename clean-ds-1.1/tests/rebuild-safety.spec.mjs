import { test, expect } from '@playwright/test';

// Regression guards for rebuilding index.html. Never trigger destructive actions
// or register/subscribe for push in these tests.
test('VD Design isolation guard rejects the old TEST origin', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const isolated = window.DESIGN_TEST_ISOLATED === true;
    let rejected = false;
    let message = '';
    try {
      await fetch('https://vardadienas-test.pages.dev/__design_rebuild_probe__');
    } catch (error) {
      rejected = true;
      message = String(error?.message ?? error);
    }
    return { isolated, rejected, message };
  });
  expect(result.isolated).toBe(true);
  expect(result.rejected).toBe(true);
  expect(result.message).toContain('DESIGN TEST');
});

test('VD Design push activation stays locked without subscribing', async ({ page }) => {
  await page.goto('/index.html');
  const button = page.locator('#activatePushButton');
  await expect(button).toBeDisabled();
  await expect(button).toHaveText('Paziņojumi DESIGN TEST nav pieejami');
  await expect(page.locator('#pushActivationStatus')).toContainText('atspējoti');
});

test('VD Design preserves main view contracts and storage keys', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'ds11');
    localStorage.setItem('appearanceMode', 'light');
    localStorage.setItem('favorites', '[]');
    localStorage.setItem('birthdays', '[]');
  });
  await page.goto('/index.html');
  for (const selector of [
    '#calendar', '#nameInput', '#dateInput', '#settingsView',
    '#favoritesView', '#birthdaysView', '#greetingEmojiPanel',
    '#deleteMyDataButton'
  ]) {
    await expect(page.locator(selector)).toBeAttached();
  }
  const values = await page.evaluate(() => ({
    favorites: localStorage.getItem('favorites'),
    birthdays: localStorage.getItem('birthdays'),
    theme: localStorage.getItem('designStyle'),
  }));
  expect(values).toEqual({ favorites: '[]', birthdays: '[]', theme: 'ds11' });
});

test('VD Design retains safe theme bootstrap and iPhone-sized layout', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'ds11');
    localStorage.setItem('appearanceMode', 'dark');
  });
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-design', 'ds11');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveClass(/ds-app/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
