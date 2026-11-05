import { test, expect } from '@playwright/test';

// Exercise the real VD Design application, not the component gallery.
// Browser storage is local to Playwright; never activate push notifications.
for (const mode of ['light', 'dark']) {
  test(`full VD Design: DS 1.1 ${mode} mode and original views`, async ({ page }) => {
    await page.addInitScript(mode => {
      localStorage.setItem('designStyle', 'ds11');
      localStorage.setItem('appearanceMode', mode);
    }, mode);
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveAttribute('data-design', 'ds11');
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
    await expect(page.locator('body')).toHaveClass(/ds-app/);
    await expect(page.locator('.card').first()).toHaveClass(/ds-card/);
    await expect(page.locator('#calendar')).toBeAttached();
    await expect(page.locator('#dateInput')).toBeAttached();
    await expect(page.locator('#greetingEmojiPanel')).toBeAttached();
    const theme = await page.locator('body').evaluate(el => {
      const style = getComputedStyle(el);
      return {
        text: style.getPropertyValue('--ds-text').trim(),
        primary: style.getPropertyValue('--ds-primary').trim(),
        bg: style.getPropertyValue('--ds-page-bg').trim(),
      };
    });
    expect(theme.text).not.toBe('');
    expect(theme.primary).not.toBe('');
    expect(theme.bg).not.toBe('');
  });
}

test('full VD Design: original D3 does not inherit DS 1.1 classes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'nature-d3');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-design', 'nature-d3');
  await expect(page.locator('body')).not.toHaveClass(/ds-app/);
  await expect(page.locator('.card').first()).not.toHaveClass(/ds-card/);
});

test('full VD Design: DS 1.1 fits iPhone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'ds11');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  await expect(page.locator('body')).toHaveClass(/ds-app/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});
