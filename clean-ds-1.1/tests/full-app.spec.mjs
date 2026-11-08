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
    await expect(page.locator('body')).not.toHaveClass(/ds-app/);
    await expect(page.locator('[data-ui-component="card"]').first()).toBeAttached();
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

test('full VD Design: classic does not inherit DS 1.1 classes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'classic');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-design', 'classic');
  await expect(page.locator('body')).not.toHaveClass(/ds-app/);
  await expect(page.locator('[data-ui-component="card"]').first()).toBeAttached();
});

test('full VD Design: DS 1.1 fits iPhone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'ds11');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  await expect(page.locator('body')).not.toHaveClass(/ds-app/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});


test('full VD Design: switch themes and light/dark modes in real settings', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'classic');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  await page.locator('.menu-btn').click();
  await page.locator('#sideMenu').getByRole('button', { name: 'Iestatījumi' }).click();
  await expect(page.locator('#settingsView')).toBeVisible();

  await page.locator('input[name="designStyle"][value="ds11"]').check();
  await expect(page.locator('html')).toHaveAttribute('data-design', 'ds11');
  await expect(page.locator('body')).not.toHaveClass(/ds-app/);
  await expect(page.locator('[data-ui-component="card"]').first()).toBeAttached();

  await page.locator('input[name="appearanceMode"][value="dark"]').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'dark');

  await page.locator('input[name="designStyle"][value="classic"]').check();
  await expect(page.locator('html')).toHaveAttribute('data-design', 'classic');
  await expect(page.locator('body')).not.toHaveClass(/ds-app/);
  await expect(page.locator('[data-ui-component="card"]').first()).toBeAttached();
  await expect(page.locator('#calendar')).toBeAttached();
});


for (const mode of ['light', 'dark']) {
  test(`full VD Design: delete-my-data trigger uses neutral C17 palette in ${mode}`, async ({ page }) => {
    await page.addInitScript(selectedMode => {
      localStorage.setItem('designStyle', 'ds11');
      localStorage.setItem('appearanceMode', selectedMode);
    }, mode);
    await page.goto('/index.html');
    const button = page.locator('#deleteMyDataButton');
    await expect(button).toBeAttached();
    const styles = await button.evaluate(el => {
      const computed = getComputedStyle(el);
      const root = getComputedStyle(document.documentElement);
      const toComputed = token => {
        const sample = document.createElement('div');
        sample.style.color = root.getPropertyValue(token).trim();
        document.body.append(sample);
        const result = getComputedStyle(sample).color;
        sample.remove();
        return result;
      };
      return {
        background: computed.backgroundColor,
        text: computed.color,
        border: computed.borderTopColor,
        expectedBackground: toComputed('--ds-secondary-bg'),
        expectedText: toComputed('--ds-secondary-text'),
        expectedBorder: toComputed('--ds-secondary-border'),
      };
    });
    expect(styles.background).toBe(styles.expectedBackground);
    expect(styles.text).toBe(styles.expectedText);
    expect(styles.border).toBe(styles.expectedBorder);
  });
}

for (const retired of ["lavender", "nature-d3", "water-j1"]) {
  test(`retired design ${retired} falls back to classic`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("designStyle", value), retired);
    await page.goto("/index.html");
    await expect(page.locator("html")).toHaveAttribute("data-design", "classic");
    await expect(page.locator('input[name="designStyle"][value="classic"]')).toBeChecked();
    await expect(page.locator(`input[name="designStyle"][value="${retired}"]`)).toHaveCount(0);
  });
}

test("retired Sea theme stylesheet is not loaded", async ({ page }) => {
  await page.goto("/index.html");
  const sheets = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(n => n.getAttribute("href")));
  expect(sheets).not.toContain("design-water-j1.css");
});

test("shared controls survive retirement of Z3 decorations", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator("html")).toHaveAttribute("data-design", /classic|festive-s1|ds11/);
  await expect(page.locator('input[name="designStyle"]')).toHaveCount(3);
});
