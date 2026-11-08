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
    await page.locator('input[name="designStyle"][value="' + theme + '"]').evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
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
    await page.locator('input[name="appearanceMode"][value="' + mode + '"]').evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
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
    await page.locator('input[name="designStyle"][value="' + theme + '"]').evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
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
  await page.locator('input[name="designStyle"][value="festive-s1"]').evaluate(el => { el.checked = true; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await expect(input).toHaveValue('Anna');
  const second = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(second).not.toBe(first);
  await page.locator('input[name="designStyle"][value="classic"]').evaluate(el => { el.checked = true; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await expect(input).toHaveValue('Anna');
});

test('static cards have stable semantic identity across all themes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('designStyle', 'classic'));
  await page.goto('/index.html');
  const count = await page.locator('[data-ui-component="card"]').count();
  expect(count).toBeGreaterThanOrEqual(10);
  const original = await page.evaluate(() => {
    window.__stableCards = [...document.querySelectorAll('[data-ui-component="card"]')];
    return window.__stableCards.length;
  });
  expect(original).toBe(count);
  for (const theme of ['festive-s1', 'ds11', 'classic']) {
    await page.locator('input[name="designStyle"][value="' + theme + '"]').evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    const same = await page.evaluate(() =>
      window.__stableCards.every(node => node.isConnected && node.dataset.uiComponent === 'card')
    );
    expect(same).toBe(true);
  }
});

test('primary actions retain semantic identity and click handlers on theme switch', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('designStyle', 'classic'));
  await page.goto('/index.html');
  const actions = page.locator('[data-ui-component="primary-action"]');
  expect(await actions.count()).toBeGreaterThanOrEqual(8);
  const ids = await actions.evaluateAll(nodes => nodes.map(node => node.id));
  expect(ids.every(Boolean)).toBe(true);
  await page.evaluate(() => { window.__primaryNodes = [...document.querySelectorAll('[data-ui-component="primary-action"]')]; });
  for (const theme of ['festive-s1', 'ds11', 'classic']) {
    await page.locator('input[name="designStyle"][value="' + theme + '"]').evaluate(el => {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(await page.evaluate(() => window.__primaryNodes.every(node =>
      node.isConnected && node.dataset.uiComponent === 'primary-action' &&
      document.getElementById(node.id) === node
    ))).toBe(true);
  }
});

test('switching designs never adds or removes visual component classes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('designStyle', 'classic'));
  await page.goto('/index.html');
  const baseline = await page.evaluate(() => ({
    cards: [...document.querySelectorAll('[data-ui-component="card"]')].map(el => el.className),
    actions: [...document.querySelectorAll('[data-ui-component="primary-action"]')].map(el => el.className)
  }));
  for (const design of ['festive-s1', 'ds11', 'classic']) {
    await page.locator('input[name="designStyle"][value="' + design + '"]').evaluate(el => {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(await page.evaluate(() => ({
      cards: [...document.querySelectorAll('[data-ui-component="card"]')].map(el => el.className),
      actions: [...document.querySelectorAll('[data-ui-component="primary-action"]')].map(el => el.className)
    }))).toEqual(baseline);
  }
});

test('DS11 primary action uses semantic tokens in both appearance modes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'ds11');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  const button = page.locator('[data-ui-component="primary-action"]').first();
  const card = page.locator('[data-ui-component="card"]').first();
  for (const mode of ['light', 'dark']) {
    await page.locator('input[name="appearanceMode"][value="' + mode + '"]').evaluate(el => {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
    const values = await button.evaluate(el => {
      const style = getComputedStyle(el);
      const root = getComputedStyle(document.body);
      return { bg: style.backgroundColor, token: root.getPropertyValue('--ds-primary').trim() };
    });
    expect(values.token).not.toBe('');
    expect(values.bg).not.toBe('rgba(0, 0, 0, 0)');
    await expect(card).toHaveAttribute('data-ui-component', 'card');
  }
});
