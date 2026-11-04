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

test('state colors come from semantic tokens in both modes', async ({ page }) => {
  for (const mode of ['light', 'dark']) {
    await page.locator('#mode').selectOption(mode);
    const values = await page.evaluate(() => {
      const app = document.querySelector('#app');
      const style = getComputedStyle(app);
      const token = name => style.getPropertyValue('--ds-' + name).trim();
      const computed = selector => getComputedStyle(document.querySelector(selector));
      return {
        primary: computed('.ds-button--primary').backgroundColor,
        primaryToken: token('primary'),
        primaryText: computed('.ds-button--primary').color,
        onPrimary: token('on-primary'),
        popup: computed('.ds-popup').backgroundColor,
        popupToken: token('popup-bg'),
        inputCaret: computed('.ds-input').caretColor,
        caretToken: token('caret'),
        disabled: computed('.ds-button--primary:disabled').backgroundColor,
        disabledToken: token('disabled-bg'),
      };
    });
    const rgb = hex => {
      const h = hex.slice(1);
      const full = h.length === 3 ? [...h].map(c => c + c).join('') : h;
      return 'rgb(' + [0,2,4].map(i => parseInt(full.slice(i,i+2),16)).join(', ') + ')';
    };
    expect(values.primary).toBe(rgb(values.primaryToken));
    expect(values.primaryText).toBe(rgb(values.onPrimary));
    expect(values.popup).toBe(rgb(values.popupToken));
    expect(values.inputCaret).toBe(rgb(values.caretToken));
    expect(values.disabled).toBe(rgb(values.disabledToken));
  }
});

test('popup is opaque, and hidden panels cannot intercept input', async ({ page }) => {
  const panel = page.locator('#emojiPopup');
  await expect(panel).toBeVisible();
  const bg = await panel.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).toMatch(/^rgb\(/);
  await page.locator('#emojiToggle').click();
  await expect(panel).toBeHidden();
  await page.locator('#emojiToggle').click();
  await expect(panel).toBeVisible();
});

test('iPhone-sized viewport: interactive controls remain inside viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const mode of ['light', 'dark']) {
    await page.locator('#mode').selectOption(mode);
    const offscreen = await page.locator('.ds-card button, .ds-card input, .ds-card textarea').evaluateAll(els =>
      els.filter(el => {
        const r = el.getBoundingClientRect();
        return r.left < -1 || r.right > window.innerWidth + 1;
      }).map(el => el.outerHTML.slice(0, 100))
    );
    expect(offscreen).toEqual([]);
  }
});

test('modal blocks only background, not the dialog', async ({ page }) => {
  await page.locator('#openModal').click();
  await expect(page.locator('.lab-grid')).toHaveAttribute('inert', '');
  await expect(page.locator('.lab-head')).toHaveAttribute('inert', '');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#closeModal')).toBeEnabled();
  await page.locator('#closeModal').click();
  await expect(page.locator('.lab-grid')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#openModal')).toBeFocused();
});

test('capture light and dark C01-C18 gallery screenshots', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const mode of ['light', 'dark']) {
    await page.locator('#mode').selectOption(mode);
    await expect(page.locator('#validation')).toContainText('Definēti visi');
    await page.screenshot({
      path: testInfo.outputPath('ds11-' + mode + '-' + testInfo.project.name + '.png'),
      fullPage: true,
      animations: 'disabled',
    });
  }
});
