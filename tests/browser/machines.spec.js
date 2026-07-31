import { expect, test } from '@playwright/test';

/* The stage elements, in the order the chapter lays them out. */
const STAGES = '.machine-stage';

/* Bring each machine into view so its deferred mount fires, then wait
   for the api the viewer parks on the stage.

   Three things fight a plain scroll here. Landing on a hash makes the
   page re-apply scrollIntoView on a timer ladder for several seconds;
   the chapter re-applies it once more when its lazy module finishes;
   and `html` carries scroll-behavior: smooth, so each of those animates
   rather than jumping — a stage further down never holds still long
   enough for its mount observer to fire. So wait for the chapter to
   report itself loaded, which is what the last of those scrolls waits
   on too, then spend one wheel tick, which is the page's own cancel for
   the ladder. Instant scrolls after that stay where they are put.

   The sweep itself runs inside the page. Once a viewer or two is up,
   their render loops saturate the main thread, and a short wait driven
   from the test side can time out while the thing it is waiting for is
   already in the DOM. One in-page pass per sweep sidesteps that. */
async function mountAll(page) {
  test.setTimeout(180000);
  await page.goto('/#macchine');
  const stages = page.locator(STAGES);
  await expect(stages).toHaveCount(3);
  await expect(page.locator('#macchine')).toHaveAttribute('data-load-state', 'ready', {
    timeout: 60000,
  });
  await page.mouse.wheel(0, 1);

  const mounted = (selector) =>
    [...document.querySelectorAll(selector)].every((s) => s._machineApi);

  for (let sweep = 0; sweep < 8; sweep++) {
    await page.evaluate(async (selector) => {
      for (const stage of document.querySelectorAll(selector)) {
        stage.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }, STAGES);
    if (await page.evaluate(mounted, STAGES)) break;
  }

  await page.waitForFunction(
    (selector) => [...document.querySelectorAll(selector)].every((s) => s._machineApi),
    STAGES,
    { timeout: 15000 }
  );
}

test('every machine renders solid geometry within its draw-call budget', async ({ page }) => {
  await mountAll(page);
  const stats = await page.evaluate((selector) =>
    [...document.querySelectorAll(selector)].map((stage) => ({
      triangles: stage._machineApi.renderer.info.render.triangles,
      calls: stage._machineApi.renderer.info.render.calls,
    })), STAGES);

  expect(stats).toHaveLength(3);
  for (const { triangles, calls } of stats) {
    expect(triangles).toBeGreaterThan(20000);
    expect(calls).toBeLessThan(40);
  }
});

test('every machine is lit by a shadow-casting key and a hemisphere fill', async ({ page }) => {
  await mountAll(page);
  const lights = await page.evaluate((selector) =>
    [...document.querySelectorAll(selector)].map((stage) => {
      let casting = 0;
      let hemi = 0;
      stage._machineApi.scene.traverse((node) => {
        if (node.isDirectionalLight && node.castShadow) casting++;
        if (node.isHemisphereLight) hemi++;
      });
      return { casting, hemi };
    }), STAGES);

  for (const { casting, hemi } of lights) {
    expect(casting).toBe(1);
    expect(hemi).toBe(1);
  }
});

test('reduced motion still gives a still, lit frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mountAll(page);
  const state = await page.evaluate((selector) =>
    [...document.querySelectorAll(selector)].map((stage) => ({
      triangles: stage._machineApi.renderer.info.render.triangles,
      autoRotate: stage._machineApi.controls.autoRotate,
      running: stage._machineApi.running,
    })), STAGES);

  for (const { triangles, autoRotate, running } of state) {
    expect(triangles).toBeGreaterThan(20000);
    expect(autoRotate).toBe(false);
    expect(running).toBe(false);
  }
});
