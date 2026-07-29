import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('core editorial content is visible before it enters the viewport', async ({ page }) => {
  await page.goto('/');

  const offscreenSheet = page.locator('.sheet').last();
  await expect(offscreenSheet).toBeAttached();
  await expect(offscreenSheet).toHaveCSS('opacity', '1');
});

test('painting thumbnails keep a stable compact aspect ratio', async ({ page }) => {
  await page.goto('/#opere');

  const index = page.locator('.opere-index');
  await expect(index.locator('li')).toHaveCount(15);

  const boxes = await index.locator('img').evaluateAll((images) =>
    images.map((image) => {
      const rect = image.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    })
  );

  for (const box of boxes) {
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeLessThanOrEqual(box.width * 1.05);
    expect(box.height).toBeGreaterThanOrEqual(box.width * 0.95);
  }
});

test('direct chapter navigation does not leave the target chapter empty', async ({ page }) => {
  await page.goto('/#macchine');

  await expect(page.locator('.machine')).toHaveCount(3);
  await expect(page.locator('.machine').first()).toHaveCSS('opacity', '1');
  await expect(page.locator('#macchine')).toBeInViewport();
});

test('a slow painting request cannot overwrite a newer selection', async ({ page }) => {
  const image = await readFile(new URL('../../tmp/mona.jpg', import.meta.url));
  await page.route('https://upload.wikimedia.org/**', async (route) => {
    const url = route.request().url();
    if (url.includes('The_Last_Supper')) await new Promise((resolve) => setTimeout(resolve, 800));
    if (url.includes('Lady_with_an_Ermine')) await new Promise((resolve) => setTimeout(resolve, 25));
    await route.fulfill({ status: 200, contentType: 'image/jpeg', body: image });
  });
  await page.goto('/#opere');

  const works = page.locator('.opere-index button');
  await expect(works).toHaveCount(15);
  await works.evaluateAll((buttons) => {
    buttons.find((button) => button.textContent.includes('The Last Supper')).click();
    buttons.find((button) => button.textContent.includes('Lady with an Ermine')).click();
  });

  await expect(page.locator('.work-meta h3')).toHaveText('Lady with an Ermine');
  await expect(page.locator('.plate-img')).toHaveAttribute('alt', /Lady with an Ermine/);
  await page.waitForTimeout(900);
  await expect(page.locator('.plate-img')).toHaveAttribute('alt', /Lady with an Ermine/);
});

test('critical JavaScript is served from the local build', async ({ page }) => {
  await page.goto('/#macchine');
  await expect(page.locator('.machine')).toHaveCount(3);

  const externalScripts = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((url) => /(?:unpkg|cdnjs\.cloudflare)\.com/.test(url))
  );
  expect(externalScripts).toEqual([]);
});

test('the editorial codex remains available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('.principle')).toHaveCount(8);
  await expect(page.locator('.sheet')).toHaveCount(17);
  await expect(page.locator('.sources li')).toHaveCount(6);
  await expect(page.locator('.caveats li')).toHaveCount(4);
  await context.close();
});

test('saved works persist in the local fieldbook', async ({ page }) => {
  await page.goto('/#opere');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('.opere-index button').filter({ hasText: 'Lady with an Ermine' }).click();
  await expect(page.locator('[data-save-work]')).toHaveText(/Save to fieldbook/);
  await page.locator('[data-save-work]').click();
  await expect(page.locator('[data-fieldbook-count]')).toHaveText('1');

  await page.reload();
  await expect(page.locator('[data-fieldbook-count]')).toHaveText('1');
  await page.locator('[data-fieldbook-open]').click();
  await expect(page.locator('[data-fieldbook-items]')).toContainText('Lady with an Ermine');
  await page.locator('[data-fieldbook-items] a').click();
  await expect(page.locator('.work-meta h3')).toHaveText('Lady with an Ermine');
});
