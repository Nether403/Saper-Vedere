import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EYES_POINT, MOUTH_POINT, FOVEA_RADIUS, FOVEA_FEATHER,
  pointerToUV, lerpPoint, easeToward, maskParams,
} from '../../src/js/foveal.js';

/* ---- landmarks ------------------------------------------------ */

test('EYES_POINT is within the upper half of the painting', () => {
  assert.ok(EYES_POINT.x > 0.3 && EYES_POINT.x < 0.7, `x=${EYES_POINT.x}`);
  assert.ok(EYES_POINT.y > 0.15 && EYES_POINT.y < 0.45, `y=${EYES_POINT.y}`);
});

test('MOUTH_POINT is below the eyes and roughly centred', () => {
  assert.ok(MOUTH_POINT.x > 0.3 && MOUTH_POINT.x < 0.7, `x=${MOUTH_POINT.x}`);
  assert.ok(MOUTH_POINT.y > EYES_POINT.y, 'mouth should be below the eyes');
  assert.ok(MOUTH_POINT.y < 0.55, `y=${MOUTH_POINT.y}`);
});

test('fovea constants are reasonable fractions', () => {
  assert.ok(FOVEA_RADIUS > 0.03 && FOVEA_RADIUS < 0.2);
  assert.ok(FOVEA_FEATHER > 0.05 && FOVEA_FEATHER < 0.3);
});

/* ---- pointerToUV ---------------------------------------------- */

test('center of a matching-aspect stage maps to center of image', () => {
  // Stage and image both 2:3 (portrait)
  const uv = pointerToUV(150, 225, 300, 450, 200, 300);
  assert.ok(Math.abs(uv.x - 0.5) < 1e-6, `x=${uv.x}`);
  assert.ok(Math.abs(uv.y - 0.5) < 1e-6, `y=${uv.y}`);
});

test('top-left of stage maps to top-left of visible region', () => {
  // Same aspect, so no crop
  const uv = pointerToUV(0, 0, 400, 600, 200, 300);
  assert.ok(Math.abs(uv.x) < 1e-6, `x=${uv.x}`);
  assert.ok(Math.abs(uv.y) < 1e-6, `y=${uv.y}`);
});

test('bottom-right of stage maps to bottom-right of visible region', () => {
  const uv = pointerToUV(400, 600, 400, 600, 200, 300);
  assert.ok(Math.abs(uv.x - 1) < 1e-6, `x=${uv.x}`);
  assert.ok(Math.abs(uv.y - 1) < 1e-6, `y=${uv.y}`);
});

test('wider image than stage: horizontal crop, full height', () => {
  // Stage 1:1 (400x400), image 2:1 (800x400)
  // Cover shows full height, crops width: only central 50% of image width visible
  const center = pointerToUV(200, 200, 400, 400, 800, 400);
  assert.ok(Math.abs(center.x - 0.5) < 1e-6, `center x=${center.x}`);
  assert.ok(Math.abs(center.y - 0.5) < 1e-6, `center y=${center.y}`);

  // Left edge of stage = left edge of visible region = 25% into the image
  const left = pointerToUV(0, 200, 400, 400, 800, 400);
  assert.ok(Math.abs(left.x - 0.25) < 1e-6, `left x=${left.x}`);
});

test('taller image than stage: vertical crop, full width', () => {
  // Stage 1:1 (400x400), image 1:2 (400x800)
  // Cover shows full width, crops height: only central 50% of image height visible
  const center = pointerToUV(200, 200, 400, 400, 400, 800);
  assert.ok(Math.abs(center.x - 0.5) < 1e-6, `center x=${center.x}`);
  assert.ok(Math.abs(center.y - 0.5) < 1e-6, `center y=${center.y}`);

  // Top edge of stage = top edge of visible region = 25% into the image
  const top = pointerToUV(200, 0, 400, 400, 400, 800);
  assert.ok(Math.abs(top.y - 0.25) < 1e-6, `top y=${top.y}`);
});

test('pointer outside stage clamps to [0,1]', () => {
  const uv = pointerToUV(-100, -100, 400, 400, 400, 400);
  assert.ok(uv.x >= 0 && uv.x <= 1);
  assert.ok(uv.y >= 0 && uv.y <= 1);

  const uv2 = pointerToUV(900, 900, 400, 400, 400, 400);
  assert.ok(uv2.x >= 0 && uv2.x <= 1);
  assert.ok(uv2.y >= 0 && uv2.y <= 1);
});

test('degenerate inputs return center', () => {
  const uv = pointerToUV(100, 100, 0, 0, 100, 100);
  assert.equal(uv.x, 0.5);
  assert.equal(uv.y, 0.5);
});

/* ---- lerpPoint ------------------------------------------------ */

test('lerpPoint at t=0 returns a, at t=1 returns b', () => {
  const a = { x: 0.2, y: 0.3 };
  const b = { x: 0.8, y: 0.9 };
  const p0 = lerpPoint(a, b, 0);
  assert.ok(Math.abs(p0.x - 0.2) < 1e-9);
  assert.ok(Math.abs(p0.y - 0.3) < 1e-9);
  const p1 = lerpPoint(a, b, 1);
  assert.ok(Math.abs(p1.x - 0.8) < 1e-9);
  assert.ok(Math.abs(p1.y - 0.9) < 1e-9);
});

test('lerpPoint at t=0.5 returns midpoint', () => {
  const p = lerpPoint({ x: 0, y: 0 }, { x: 1, y: 1 }, 0.5);
  assert.ok(Math.abs(p.x - 0.5) < 1e-9);
  assert.ok(Math.abs(p.y - 0.5) < 1e-9);
});

/* ---- easeToward ----------------------------------------------- */

test('easeToward moves current toward target', () => {
  const c = { x: 0, y: 0 };
  const t = { x: 1, y: 1 };
  const next = easeToward(c, t, 0.016);
  assert.ok(next.x > 0 && next.x < 1, `x=${next.x}`);
  assert.ok(next.y > 0 && next.y < 1, `y=${next.y}`);
});

test('easeToward converges to target over many steps', () => {
  let c = { x: 0, y: 0 };
  const t = { x: 1, y: 1 };
  for (let i = 0; i < 500; i++) c = easeToward(c, t, 0.016);
  assert.ok(Math.abs(c.x - 1) < 0.001, `x=${c.x}`);
  assert.ok(Math.abs(c.y - 1) < 0.001, `y=${c.y}`);
});

test('easeToward with dt=0 does not move', () => {
  const c = { x: 0.3, y: 0.7 };
  const next = easeToward(c, { x: 1, y: 1 }, 0);
  assert.ok(Math.abs(next.x - 0.3) < 1e-9);
  assert.ok(Math.abs(next.y - 0.7) < 1e-9);
});

/* ---- maskParams ----------------------------------------------- */

test('maskParams converts a point to percentage values', () => {
  const p = maskParams({ x: 0.5, y: 0.3 });
  assert.ok(Math.abs(p.cx - 50) < 1e-9);
  assert.ok(Math.abs(p.cy - 30) < 1e-9);
  assert.ok(p.radius > 0);
  assert.ok(p.feather > p.radius);
});

test('maskParams at origin gives 0% center', () => {
  const p = maskParams({ x: 0, y: 0 });
  assert.ok(Math.abs(p.cx) < 1e-9);
  assert.ok(Math.abs(p.cy) < 1e-9);
});
