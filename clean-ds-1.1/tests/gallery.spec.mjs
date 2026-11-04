import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/clean-ds-1.1/gallery.html');
});

for (const mode of ['light', 'dark']) {
  test(`${mode}: all C01–C18 sections and token contract`, async ({ page }) => {
    await page.locator('#mode').selectOption(mode);
    await expect(page.locator('#app')).toHaveAttribute('data-mode', mode);
    await expect(page.locator('.lab-section')).toHaveCount(18);
    await expect(page.locator('#validation')).toContainText('Definēti visi');
    const tokenCheck = await page.locator('#app').evaluate(el => {
      const style = getComputedStyle(el);
      return ['--ds-primary', '--ds-text', '--ds-popup-bg', '--ds-selected-bg']
        .every(token => style.getPropertyValue(token).trim() !== '');
    });
    expect(tokenCheck).toBe(true);
  });

  test(`${mode}: inputs and focus states`, async ({ page }) => {
    await page.locator('#mode').selectOption(mode);
    const input = page.getByPlaceholder('Ievadi vārdu');
    await input.focus();
    await expect(input).toBeFocused();
    await expect(page.locator('.ds-input[aria-invalid="true"]')).toHaveCSS('border-top-color', /rgb\(/);
    await expect(page.locator('.ds-input[readonly]')).toHaveAttribute('readonly', '');
  });

  test(`${mode}: selection, emoji popup and modal do not delete data`, async ({ page }) => {
    await page.locator('#mode').selectOption(mode);
    const alphabetic = page.getByRole('button', { name: 'Alfabētiski' });
    await alphabetic.click();
    await expect(alphabetic).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Pēc datuma' })).toHaveAttribute('aria-pressed', 'false');

    const toggle = page.locator('#emojiToggle');
    await toggle.click();
    await expect(page.locator('#emojiPopup')).toBeHidden();
    await toggle.click();
    await expect(page.locator('#emojiPopup')).toBeVisible();
    const firstEmoji = page.locator('.ds-emoji-grid button').first();
    await firstEmoji.click();
    await expect(firstEmoji).toHaveAttribute('aria-pressed', 'true');

    await page.locator('#openModal').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#modalBackdrop')).toHaveCSS('background-color', /rgba?\(/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#openModal')).toBeFocused();
  });
}

test('mobile viewport: no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('keyboard: modal focus stays inside dialog', async ({ page }) => {
  await page.locator('#openModal').click();
  await expect(page.locator('#closeModal')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#modalConfirm')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#closeModal')).toBeFocused();
});
