import { test, expect } from '@playwright/test';

// Design switches must never change application data, DOM contracts, or disable TEST isolation.
test('K1, S1 and DS11 share the same functional DOM and stored data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('favorites', JSON.stringify(['Anna']));
    localStorage.setItem('birthdays', JSON.stringify([]));
    localStorage.setItem('appearanceMode', 'light');
    localStorage.setItem('designStyle', 'classic');
  });
  await page.goto('/index.html');
  const snapshot = () => page.evaluate(() => ({
    ids: [...document.querySelectorAll('[id]')].map(el => el.id).sort(),
    favorites: localStorage.getItem('favorites'),
    birthdays: localStorage.getItem('birthdays'),
    isolated: window.DESIGN_TEST_ISOLATED === true
  }));
  const baseline = await snapshot();
  expect(baseline.ids.length).toBeGreaterThan(25);
  expect(baseline.isolated).toBe(true);
  for (const theme of ['festive-s1', 'ds11', 'classic']) {
    await page.locator('input[name="designStyle"][value="' + theme + '"]').check();
    await expect(page.locator('html')).toHaveAttribute('data-design', theme);
    expect(await snapshot()).toEqual(baseline);
  }
});

test('appearance modes preserve DOM contracts and favorites', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('favorites', JSON.stringify(['Anna']));
    localStorage.setItem('designStyle', 'classic');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  const before = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('[id]')].map(el => el.id).sort(),
    favorites: localStorage.getItem('favorites')
  }));
  for (const mode of ['dark', 'light']) {
    await page.locator('input[name="appearanceMode"][value="' + mode + '"]').check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
    const after = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('[id]')].map(el => el.id).sort(),
      favorites: localStorage.getItem('favorites')
    }));
    expect(after).toEqual(before);
  }
});

test('theme switch does not replace core DOM nodes or their event handlers', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'classic');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  const selectors = ['#calendar', '#dateInput', '#nameInput', '#activatePushButton'];
  const before = await page.evaluate(selectors => {
    window.__themeContractNodes = selectors.map(s => document.querySelector(s));
    return window.__themeContractNodes.map(Boolean);
  }, selectors);
  expect(before.every(Boolean)).toBe(true);
  for (const theme of ['festive-s1', 'ds11', 'classic']) {
    await page.locator('input[name="designStyle"][value="' + theme + '"]').check();
    const identical = await page.evaluate(() =>
      window.__themeContractNodes.every(node => node && node.isConnected && document.getElementById(node.id) === node)
    );
    expect(identical).toBe(true);
  }
});

test('theme switch changes visual palette without changing functional inputs', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'classic');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  const input = page.locator('#nameInput');
  await input.fill('Anna');
  const first = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  await page.locator('input[name="designStyle"][value="festive-s1"]').check();
  await expect(input).toHaveValue('Anna');
  const second = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(second).not.toBe(first);
  await page.locator('input[name="designStyle"][value="classic"]').check();
  await expect(input).toHaveValue('Anna');
});
