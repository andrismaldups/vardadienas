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
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'classic');
    localStorage.setItem('appearanceMode', 'light');
  });
  await page.goto('/index.html');
  await page.locator('.menu-btn').click();
  await page.locator('#sideMenu').getByRole('button', { name: 'Iestatījumi' }).click();
  await expect(page.locator('#settingsView')).toBeVisible();

  const card = page.locator('#settingsView .settings-card').first();
  const palette = () => card.evaluate(element => getComputedStyle(element).backgroundColor);
  for (const design of ['classic', 'festive-s1', 'ds11', 'sea-mist']) {
    await page.locator(`input[name="designStyle"][value="${design}"]`).check();
    await expect(page.locator('html')).toHaveAttribute('data-design', design);
    await expect(page.locator('body')).not.toHaveClass(/ds-app/);
    const backgrounds = [];
    for (const mode of ['light', 'dark']) {
      await page.locator(`input[name="appearanceMode"][value="${mode}"]`).check();
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      await expect(page.locator('#settingsView')).toBeVisible();
      backgrounds.push(await palette());
      if (design === 'sea-mist') {
        await expect(page.locator('html')).toHaveAttribute('data-theme-system', 'shared');
        const backgrounds = await page.locator('#mainView > .card:first-child, #mainView > .grid > .card, #mainView > .grid > .side > .card').evaluateAll(cards =>
          cards.map(card => getComputedStyle(card).backgroundColor)
        );
        expect(backgrounds.length).toBeGreaterThanOrEqual(3);
        for (const background of backgrounds) expect(background).toMatch(/, 0\.17\)$/);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => window.innerWidth + 1)
      );
    }
    expect(backgrounds[0]).not.toBe(backgrounds[1]);
  }
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
  await expect(page.locator("html")).toHaveAttribute("data-design", /classic|festive-s1|ds11|sea-mist/);
  await expect(page.locator('input[name="designStyle"]')).toHaveCount(4);
});

test('system appearance tracks the device until an explicit mode is selected', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.locator('.menu-btn').click();
  await page.locator('#sideMenu').getByRole('button', { name: 'Iestatījumi' }).click();
  await page.locator('input[name="appearanceMode"][value="dark"]').check();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('VD Design reloads offline with the saved theme and local data', async ({ page, context }) => {
  // Playwright can reliably emulate service worker network failure in Chromium.
  test.skip(test.info().project.name !== 'chromium', 'Offline service worker emulation uses Chromium');

  await page.goto('/index.html');
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.evaluate(() => {
    localStorage.setItem('designStyle', 'sea-mist');
    localStorage.setItem('appearanceMode', 'dark');
    localStorage.setItem('favorites', JSON.stringify(['Anna']));
  });

  await context.setOffline(true);
  expect(await page.evaluate(async () => (await fetch("/assets/gold-ornaments.svg?v=20261103-upper-glow14")).ok)).toBe(true);
  expect(await page.evaluate(async () => (await fetch("/assets/sea-mist-currents.svg")).ok)).toBe(true);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-design', 'sea-mist');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#calendar .day').first()).toBeVisible();
  await page.locator('#nameInput').fill('Anna');
  await page.locator('#nameBtn').click();
  await expect(page.locator('#nameInput')).toHaveValue('Anna');
  expect(await page.evaluate(() => localStorage.getItem('favorites'))).toBe('["Anna"]');
});

test('shared themes color navigation, birthday artwork and today from their palette', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('.menu-btn').click();
  await page.locator('#sideMenu').getByRole('button', { name: 'Iestatījumi' }).click();

  for (const design of ['sea-mist', 'ds11']) {
    await page.locator(`input[name="designStyle"][value="${design}"]`).check();
    for (const mode of ['light', 'dark']) {
      await page.locator(`input[name="appearanceMode"][value="${mode}"]`).check();
      const mismatches = await page.evaluate(() => {
        const sample = document.createElement('span');
        document.body.append(sample);
        const matches = (element, property, expected) => {
          sample.style.color = expected;
          return getComputedStyle(element)[property] === getComputedStyle(sample).color;
        };
        const errors = [];
        for (const bar of document.querySelectorAll('.settings-back-bar')) {
          const button = bar.querySelector('.back-btn');
          if (!matches(bar, 'backgroundColor', 'var(--ds-surface-elevated)') ||
              !matches(button, 'backgroundColor', 'var(--ds-secondary-bg)') ||
              !matches(button, 'borderTopColor', 'var(--ds-secondary-border)') ||
              !matches(button, 'color', 'var(--ds-secondary-text)')) errors.push(bar.parentElement.id);
        }
        // WebKit needs the calendar rendered to resolve its computed colors.
        const mainView = document.getElementById('mainView');
        mainView.hidden = false;
        const today = document.querySelector('#calendar .day.today');
        const wasSelected = today.classList.contains('sel');
        today.classList.remove('sel');
        if (!matches(today, 'color', 'var(--ds-text)') ||
            !matches(today, 'outlineColor', 'var(--ds-calendar-today-border)')) errors.push('today');
        today.classList.add('sel');
        if (!matches(today, 'color', 'var(--ds-on-primary)')) errors.push('selected today');
        const gift = document.querySelector('.birthday-gift-icon rect');
        if (!matches(gift, 'fill', 'var(--ds-gift-box,var(--ds-selected-bg))')) errors.push('gift');
        if (!matches(document.querySelector('.birthday-chevron'), 'color', 'var(--ds-icon)')) errors.push('chevron');
        today.classList.toggle('sel', wasSelected);
        mainView.hidden = true;
        sample.remove();
        return errors;
      });
      expect(mismatches).toEqual([]);
    }
  }
});

test('birthday date fields and favorite rows fit a narrow mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => {
    localStorage.setItem('designStyle', 'sea-mist');
    localStorage.setItem('favorites', JSON.stringify(['Anna', 'Teodors']));
  });
  await page.goto('/index.html');
  await page.locator('#birthdaysOpen').click();
  await page.locator('#birthdayAddOpen').click();

  const tops = await page.locator('.birthday-date-fields input').evaluateAll(inputs =>
    inputs.map(input => input.getBoundingClientRect().top)
  );
  expect(tops).toHaveLength(3);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);

  await page.locator('#birthdaysBack').click();
  await page.locator('.menu-btn').click();
  await page.locator('#sideMenu').getByRole('button', { name: 'Mani vārdi' }).click();
  const rows = page.locator('#favoritesList .favorite-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toHaveCSS('border-top-width', '1px');
  const target = await rows.first().locator('.remove-favorite').boundingBox();
  expect(target.width).toBeGreaterThanOrEqual(44);
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
