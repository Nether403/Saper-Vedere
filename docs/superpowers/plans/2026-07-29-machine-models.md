# Chapter IV Machine Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the three machines of Chapter IV from wireframe line drawings into constructed objects — timber with joints and pegs, iron fittings, rope lashings, stitched canvas — lit as illuminated-manuscript illustration.

**Architecture:** `src/js/machines.js` splits into `src/js/machines/`. A shared carpentry kit (`kit.js`) supplies construction primitives that return raw `BufferGeometry` with no material opinion; `materials.js` supplies five shared materials whose textures are generated on a canvas at runtime; `lighting.js` supplies a three-light rig. The three builders are then rewritten in terms of the kit. Static geometry is merged by material within each independently-moving assembly, keeping draw calls low.

**Tech Stack:** Three.js 0.185.1, Vite 8.1.5, vanilla ES modules, Playwright 1.62.0 for browser tests, `node --test` for geometry unit tests.

**Spec:** [docs/superpowers/specs/2026-07-29-machine-models-design.md](../specs/2026-07-29-machine-models-design.md)

## Global Constraints

- Three.js is `0.185.1`, pinned. No new dependencies of any kind, including dev dependencies.
- No binary assets. Every texture is generated at runtime on a `<canvas>`; no image file enters the repository.
- Proportions are fixed. Every numeric constant in the current builders is a reading of a folio and must survive unchanged: screw `R=2.0, r0=0.16, H=2.3, TURNS=1.05`, base `bR=1.15`; ornithopter `L=1.5, W=0.34, SPAN=2.5, N=6`; cart `W=1.5, Lz=1.9`. Frame distances stay `5.2 / 5.6 / 6.4`.
- Animation rates are fixed: screw `dt*1.15` and base `-dt*0.42`; ornithopter beat `Math.sin(t*2.1)`, wings `±0.42` rad in z and `±0.05` in y, body bob `0.2 + Math.sin(t*2.1-0.6)*0.06`; cart escapement `Math.sin(t*7)*0.7`, steering `Math.sin(t*0.5)*0.22`, and every existing `spin` rate.
- Performance discipline is preserved verbatim: `powerPreference: 'low-power'`, `setPixelRatio(Math.min(devicePixelRatio, 2))`, `setClearAlpha(0)`, the mount-deferring `IntersectionObserver` at `rootMargin: '60% 0px'`, the render-gating `IntersectionObserver` at `threshold: 0.05`, `dt = Math.min(delta, 0.05)`, and `FogExp2(0x191207, 0.075)`.
- `REDUCED` (prefers-reduced-motion) threads through unchanged. Lighting is identical under reduced motion; only the shadow map shrinks.
- The DOM that `buildMachines` produces does not change. Class names, `role="img"`, the caption, the idle element, the run/pause button and its `aria-pressed`, the thumbnail figure and its licence credit all stay exactly as they are. Only the `aria-label` copy changes, in Task 12.
- Palette values come from `src/css/tokens.css` and are carried as hex literals, matching how `machines.js` and `scenes.js` already do it. No runtime dependency on CSS custom properties.
- Every task ends green: `npm test` passes and the page renders all three machines.
- Commits assume git is available. The repository was restored from a zip without its git data; if `git status` fails, stop and say so rather than running `git init`.

---

## File Structure

Created:

| File | Responsibility |
| --- | --- |
| `src/js/machines/kit.js` | Construction primitives. Returns raw `BufferGeometry` (or a `Group` for compound parts) with no material bound. Also holds the four surviving line primitives. |
| `src/js/machines/merge.js` | `mergeByMaterial(group)` — collapses same-material geometry within each moving assembly. Separate from `kit.js` because it walks a finished graph rather than producing geometry. |
| `src/js/machines/textures.js` | Canvas texture generators: grain, tarnish, fibre. Pure functions of a seed, cached. |
| `src/js/machines/materials.js` | The five shared materials, plus the surviving colour constants. |
| `src/js/machines/lighting.js` | `makeLightRig(frame)`. |
| `src/js/machines/screw.js` | `buildScrew()`. |
| `src/js/machines/ornithopter.js` | `buildOrnithopter()`. |
| `src/js/machines/cart.js` | `buildCart()`. |
| `src/js/machines/viewer.js` | `mountViewer(stage, id, reduced)` and the `BUILDERS` map. |
| `src/js/machines/index.js` | `buildMachines(...)` — the only public surface. |
| `tests/unit/kit.test.js` | Node-side geometry tests for the kit primitives. No browser, no WebGL. |
| `tests/browser/machines.spec.js` | Browser tests for geometry, lighting, and reduced motion. |

Deleted: `src/js/machines.js` (in Task 11, once every consumer has moved).

Modified: `src/js/main.js:464` (import path), `package.json` (a `test:unit` script), `README.md` (Chapter IV row).

Why `textures.js` is separate from `materials.js`: texture generation is the one part of this work that touches the DOM (`document.createElement('canvas')`), which makes it the one part that needs a fallback path when a `2d` context is unavailable. Keeping it separate keeps that fallback in one place and keeps `materials.js` a plain declaration of five materials.

---

## Task 1: Confirm WebGL2 in headless Chromium

The spec names this as the first step because it decides whether Tasks 10's browser tests can exist at all. A probe file already exists at `tests/browser/webgl-probe.spec.js` from planning; this task runs it and then removes it.

**Files:**
- Run then delete: `tests/browser/webgl-probe.spec.js`

**Interfaces:**
- Consumes: nothing.
- Produces: a decision recorded in this plan — whether Task 10 writes browser tests or falls back to unit tests only.

- [ ] **Step 1: Run the probe**

```bash
npx playwright test webgl-probe --project=desktop --reporter=line
```

Expected: PASS, with a console line like `WEBGL PROBE: {"webgl2":true,"maxTextureSize":16384,...}`.

The first run builds the site and starts a preview server, so allow up to two minutes.

- [ ] **Step 2: Record the outcome**

**Outcome, run 2026-07-30:** PASS. `WEBGL PROBE: {"webgl2":true,"maxTextureSize":8192,"renderer":"ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)","depthTexture":true}`. Software rasterisation via SwiftShader, but a real WebGL2 context with ample texture size, so **Task 12's three browser tests proceed as written** and `shadowBudget` will return the full 1024² map under test. Playwright's browsers were not installed in this environment; `npx playwright install chromium` was needed first.

Note: Steps 2 and 3 below say "Task 10" where they mean **Task 12** — the browser tests live in Task 12, and hand verification in Task 13. Read the task numbers as written in those tasks' own headings.

If it passed and `maxTextureSize >= 1024`, Task 10 proceeds as written.

If `webgl2` is false, or the test failed to acquire a context: Task 10's three browser tests are dropped. Note the failure in this file under Task 10, keep `tests/unit/kit.test.js` as the automated safety net, and verify the visual work by hand in Task 12. Do not attempt to force GPU flags into `playwright.config.js` — that changes the suite's environment for every other test.

- [ ] **Step 3: Delete the probe**

The probe asserts an environment fact, not a behaviour of this codebase. It does not belong in the committed suite.

```bash
rm tests/browser/webgl-probe.spec.js
```

- [ ] **Step 4: Confirm the suite is untouched**

```bash
npx playwright test --project=desktop --reporter=line
```

Expected: PASS — seven tests, the same seven as before this task.

- [ ] **Step 5: Commit**

Nothing was added, so there may be nothing to commit. If `git status` is clean, skip this step.

## Task 2: Unit test harness for geometry

The kit primitives are pure geometry functions — no DOM, no WebGL, no rendering. They can be tested in Node directly, which is far faster than a browser round-trip and gives the kit a real test cycle. Three.js geometry classes work fine under Node as long as nothing touches a canvas or a renderer.

**Files:**
- Create: `tests/unit/kit.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a `npm run test:unit` script; the assertion helpers `bounds(geometry)` and `expectFinite(geometry)` used by Tasks 3–5.

- [ ] **Step 1: Add the unit test script**

In `package.json`, add to `scripts`:

```json
"test:unit": "node --test tests/unit/"
```

Leave `test` as `playwright test`. The two suites stay separate: `test:unit` needs no browser and runs in under a second, while `test` builds and serves the site.

- [ ] **Step 2: Write the first failing test**

`tests/unit/kit.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { beam } from '../../src/js/machines/kit.js';

/* The bounding box of a geometry, as plain numbers. */
export function bounds(geometry) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  return { min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] };
}

/* No NaN or Infinity anywhere in the positions. A single bad vertex
   silently deletes a whole mesh on the GPU, so every primitive is
   checked for this. */
export function expectFinite(geometry) {
  const p = geometry.getAttribute('position').array;
  for (let i = 0; i < p.length; i++) {
    assert.ok(Number.isFinite(p[i]), `position[${i}] is ${p[i]}`);
  }
}

test('beam spans its length along z and is centred on x and y', () => {
  const g = beam(2, 0.2, 0.3);
  const b = bounds(g);
  assert.ok(Math.abs(b.min[2] - -1) < 1e-6, `min z was ${b.min[2]}`);
  assert.ok(Math.abs(b.max[2] - 1) < 1e-6, `max z was ${b.max[2]}`);
  assert.ok(Math.abs(b.max[0]) <= 0.1 + 1e-6);
  assert.ok(Math.abs(b.max[1]) <= 0.15 + 1e-6);
  expectFinite(g);
  assert.ok(g instanceof THREE.BufferGeometry);
});
```

The axis convention matters and is fixed here: **a beam runs along local z, centred at the origin.** Every kit primitive that has a length uses local z for it, so callers can aim a part with a single `lookAt` or quaternion rather than remembering per-primitive conventions.

- [ ] **Step 3: Run it to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — `Cannot find module '.../src/js/machines/kit.js'`.

- [ ] **Step 4: Commit the harness**

```bash
git add package.json tests/unit/kit.test.js && git commit -m "test: add node-side geometry test harness"
```

Committing a failing test is deliberate here — the harness is the deliverable, and Task 3 makes it pass.

---

## Task 3: Kit — beam, spar, ironStrap

The three timber-and-iron primitives. Each returns a single `BufferGeometry` so that many of them can merge into one mesh later.

**Files:**
- Create: `src/js/machines/kit.js`
- Test: `tests/unit/kit.test.js`

**Interfaces:**
- Consumes: `bounds`, `expectFinite` from Task 2.
- Produces:
  - `beam(length, width, depth, opts?) -> BufferGeometry` — `opts: { taper?: number = 0, chamfer?: number = 0.012 }`. Runs along local z, centred. `taper` shrinks the `+z` end's cross-section by that fraction.
  - `spar(length, r0, r1, opts?) -> BufferGeometry` — `opts: { swell?: number = 0.06, segments?: number = 12, radial?: number = 10 }`. Runs along local z, centred. Radius goes `r0` at `-z` to `r1` at `+z`, bulging by `swell` at midspan.
  - `ironStrap(path, width, thickness) -> BufferGeometry` — `path` is `Vector3[]`, at least two points. A flat band of `width` and `thickness` following the path.
  - `peg(radius, length) -> BufferGeometry` — a small round pin along local z with a slightly domed head. Used by joints throughout.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/kit.test.js`:

```js
import { ironStrap, peg, spar } from '../../src/js/machines/kit.js';

test('beam taper narrows the +z end only', () => {
  const g = beam(2, 0.2, 0.2, { taper: 0.5 });
  const p = g.getAttribute('position');
  let wideAtMinusZ = 0;
  let wideAtPlusZ = 0;
  for (let i = 0; i < p.count; i++) {
    const x = Math.abs(p.getX(i));
    if (p.getZ(i) < -0.9) wideAtMinusZ = Math.max(wideAtMinusZ, x);
    if (p.getZ(i) > 0.9) wideAtPlusZ = Math.max(wideAtPlusZ, x);
  }
  assert.ok(wideAtMinusZ > wideAtPlusZ, `${wideAtMinusZ} should exceed ${wideAtPlusZ}`);
  assert.ok(Math.abs(wideAtPlusZ - 0.05) < 1e-6, `tapered half-width was ${wideAtPlusZ}`);
  expectFinite(g);
});

test('beam chamfer keeps the corner off the exact box corner', () => {
  const g = beam(1, 0.4, 0.4, { chamfer: 0.05 });
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const atX = Math.abs(Math.abs(p.getX(i)) - 0.2) < 1e-6;
    const atY = Math.abs(Math.abs(p.getY(i)) - 0.2) < 1e-6;
    assert.ok(!(atX && atY), 'a vertex sits on a sharp arris');
  }
});

test('spar swells at midspan', () => {
  const g = spar(2, 0.1, 0.1, { swell: 0.5 });
  const p = g.getAttribute('position');
  let mid = 0;
  let end = 0;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    if (Math.abs(p.getZ(i)) < 0.05) mid = Math.max(mid, r);
    if (p.getZ(i) < -0.99) end = Math.max(end, r);
  }
  assert.ok(mid > end * 1.2, `mid ${mid} should exceed end ${end}`);
  expectFinite(g);
});

test('spar tapers from r0 to r1', () => {
  const g = spar(2, 0.2, 0.05, { swell: 0 });
  const p = g.getAttribute('position');
  let atStart = 0;
  let atEnd = 0;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    if (p.getZ(i) < -0.99) atStart = Math.max(atStart, r);
    if (p.getZ(i) > 0.99) atEnd = Math.max(atEnd, r);
  }
  assert.ok(Math.abs(atStart - 0.2) < 1e-3, `start radius ${atStart}`);
  assert.ok(Math.abs(atEnd - 0.05) < 1e-3, `end radius ${atEnd}`);
});

test('ironStrap follows its path', () => {
  const g = ironStrap(
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 1, 0)],
    0.1,
    0.02
  );
  const b = bounds(g);
  assert.ok(b.max[1] >= 0.99, `strap should reach y=1, got ${b.max[1]}`);
  assert.ok(b.max[0] >= 0.99, `strap should reach x=1, got ${b.max[0]}`);
  expectFinite(g);
});

test('ironStrap rejects a path too short to bend', () => {
  assert.throws(() => ironStrap([new THREE.Vector3()], 0.1, 0.02), /at least two/);
});

test('peg has a head wider than its shank', () => {
  const g = peg(0.02, 0.1);
  const p = g.getAttribute('position');
  let head = 0;
  let shank = 0;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    if (p.getZ(i) > 0.04) head = Math.max(head, r);
    else shank = Math.max(shank, r);
  }
  assert.ok(head > shank, `head ${head} should exceed shank ${shank}`);
  expectFinite(g);
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test:unit
```

Expected: FAIL — module not found, all eight tests failing.

- [ ] **Step 3: Implement kit.js**

```js
/* ============================================================
   Chapter IV — the carpentry kit
   Workshop stock. Every primitive returns geometry with no
   material bound; the caller chooses the timber. Anything with
   a length runs along local z, centred on the origin, so a part
   can be aimed with one quaternion.
   ============================================================ */

import * as THREE from 'three';

/* ---- timber and iron ---------------------------------------- */

/* A squared timber. Hand-hewn stock is never parallel-sided, so
   the +z end may taper; the arrises are chamfered, which is what
   lets an edge catch the key light instead of vanishing. */
export function beam(length, width, depth, { taper = 0, chamfer = 0.012 } = {}) {
  const hw = width / 2;
  const hd = depth / 2;
  const hl = length / 2;
  const c = Math.min(chamfer, hw * 0.6, hd * 0.6);

  // Cross-section as an octagon: four faces with the corners cut.
  const section = [
    [-hw + c, -hd], [hw - c, -hd],
    [hw, -hd + c], [hw, hd - c],
    [hw - c, hd], [-hw + c, hd],
    [-hw, hd - c], [-hw, -hd + c],
  ];

  const ends = [
    { z: -hl, k: 1 },
    { z: hl, k: 1 - taper },
  ];

  const pos = [];
  const idx = [];
  for (const { z, k } of ends) {
    for (const [x, y] of section) pos.push(x * k, y * k, z);
  }
  const n = section.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(i, n + i, j, n + i, n + j, j);
  }
  // Caps, as fans from the section centre.
  const capA = pos.length / 3;
  pos.push(0, 0, -hl);
  const capB = pos.length / 3;
  pos.push(0, 0, hl);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(capA, j, i);
    idx.push(capB, n + i, n + j);
  }

  return finish(pos, idx);
}

/* Lathed round stock: masts, axles, capstan bars. A turned spar
   swells a little at midspan; a true cylinder reads as pipe. */
export function spar(length, r0, r1, { swell = 0.06, segments = 12, radial = 10 } = {}) {
  const hl = length / 2;
  const pos = [];
  const idx = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = -hl + t * length;
    const r = (r0 + (r1 - r0) * t) * (1 + Math.sin(t * Math.PI) * swell);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(Math.cos(a) * r, Math.sin(a) * r, z);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return finish(pos, idx);
}

/* A flat band bent along a path: corner brackets, hinge plates,
   nave bands. Extruded by hand rather than through TubeGeometry,
   because a strap keeps a flat face and a tube does not. */
export function ironStrap(path, width, thickness) {
  if (!Array.isArray(path) || path.length < 2) {
    throw new Error('ironStrap needs a path of at least two points');
  }
  const hw = width / 2;
  const ht = thickness / 2;
  const up = new THREE.Vector3(0, 0, 1);
  const pos = [];
  const idx = [];

  for (let i = 0; i < path.length; i++) {
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(path.length - 1, i + 1)];
    const dir = next.clone().sub(prev);
    if (dir.lengthSq() < 1e-12) dir.set(0, 0, 1);
    dir.normalize();
    let side = new THREE.Vector3().crossVectors(dir, up);
    if (side.lengthSq() < 1e-8) side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    side.normalize();
    const face = new THREE.Vector3().crossVectors(side, dir).normalize();

    for (const s of [-hw, hw]) {
      for (const t of [-ht, ht]) {
        pos.push(
          path[i].x + side.x * s + face.x * t,
          path[i].y + side.y * s + face.y * t,
          path[i].z + side.z * s + face.z * t
        );
      }
    }
  }

  // Four corners per station, stitched into a closed loop.
  const ring = [0, 1, 3, 2];
  for (let i = 0; i < path.length - 1; i++) {
    const a = i * 4;
    const b = a + 4;
    for (let k = 0; k < 4; k++) {
      const p = ring[k];
      const q = ring[(k + 1) % 4];
      idx.push(a + p, b + p, a + q, b + p, b + q, a + q);
    }
  }
  return finish(pos, idx);
}

/* A pin with a domed head standing proud of the surface. The
   single strongest cue that a thing was built by hand. */
export function peg(radius, length) {
  const shank = spar(length, radius, radius, { swell: 0, radial: 8, segments: 2 });
  const head = new THREE.SphereGeometry(radius * 1.7, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
  head.rotateX(-Math.PI / 2);
  head.translate(0, 0, length / 2);
  return mergeGeometries([shank, head]);
}

/* ---- helpers ------------------------------------------------ */

function finish(pos, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* A local merge, so the kit does not depend on the addons build.
   Every geometry here is non-indexed-safe, position+normal only,
   which is all the machines need. */
export function mergeGeometries(list) {
  const pos = [];
  const nor = [];
  const idx = [];
  let offset = 0;
  for (const g of list) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n ? n.getX(i) : 0, n ? n.getY(i) : 1, n ? n.getZ(i) : 0);
    }
    const index = g.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i++) idx.push(index.getX(i) + offset);
    } else {
      for (let i = 0; i < p.count; i++) idx.push(i + offset);
    }
    offset += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}
```

`mergeGeometries` is written locally rather than imported from `three/addons/utils/BufferGeometryUtils.js` for one reason: the addon requires every input to carry an identical set of attributes, and the kit deliberately produces some geometry with UVs and some without. A local merge that normalises to position and normal is both simpler and less brittle here. UVs come from the material's texture repeat, not from the geometry.

- [ ] **Step 4: Run to verify they pass**

```bash
npm run test:unit
```

Expected: PASS — eight tests.

- [ ] **Step 5: Commit**

```bash
git add src/js/machines/kit.js tests/unit/kit.test.js && git commit -m "feat: add beam, spar, ironStrap and peg primitives"
```

## Task 4: Kit — rope and canvasPanel

The two flexible primitives. Both need UVs, unlike the timber: rope needs a lay twist so hemp fibre spirals, and canvas needs a panel-local coordinate for its weave.

**Files:**
- Modify: `src/js/machines/kit.js`
- Test: `tests/unit/kit.test.js`

**Interfaces:**
- Consumes: `finish`, `mergeGeometries` from Task 3.
- Produces:
  - `rope(points, radius, opts?) -> BufferGeometry` — `opts: { sag?: number = 0, segments?: number = 24, radial?: number = 6, lay?: number = 8 }`. `points` is `Vector3[]`, at least two. `sag` bows the curve downward in −y at midspan by that fraction of the chord length. `lay` is how many twists of fibre per unit length, written into the UVs.
  - `ropeLashing(at, dir, radius, turns) -> BufferGeometry` — a short helix wound around a joint. `at` is the centre, `dir` the axis it wraps.
  - `canvasPanel(grid, opts?) -> BufferGeometry` — `grid` is a `Vector3[][]` of rows by columns, already positioned in space by the caller. `opts: { slack?: number = 0, seams?: number = 0 }`. `slack` pushes interior vertices along the local surface normal to sag the cloth. Returns UVs spanning 0–1 across the grid.
  - `seamLines(grid, at) -> BufferGeometry` — the stitched seam geometry as a thin raised welt, at the given normalised row positions.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/kit.test.js`:

```js
import { canvasPanel, rope, ropeLashing, seamLines } from '../../src/js/machines/kit.js';

test('rope runs between its endpoints', () => {
  const g = rope([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0)], 0.05);
  const b = bounds(g);
  assert.ok(b.min[0] <= 0.06, `should start near x=0, got ${b.min[0]}`);
  assert.ok(b.max[0] >= 1.94, `should end near x=2, got ${b.max[0]}`);
  expectFinite(g);
});

test('rope sag pulls the middle below the chord', () => {
  const straight = rope([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0)], 0.05, { sag: 0 });
  const hung = rope([new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0)], 0.05, { sag: 0.25 });
  assert.ok(bounds(hung).min[1] < bounds(straight).min[1] - 0.2, 'sagged rope should hang lower');
  expectFinite(hung);
});

test('rope carries uvs that advance along its length', () => {
  const g = rope([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)], 0.05, { lay: 4 });
  const uv = g.getAttribute('uv');
  assert.ok(uv, 'rope needs uvs for the fibre twist');
  let max = 0;
  for (let i = 0; i < uv.count; i++) max = Math.max(max, uv.getY(i));
  assert.ok(max > 1, `lay should repeat the texture, max v was ${max}`);
});

test('rope rejects a single point', () => {
  assert.throws(() => rope([new THREE.Vector3()], 0.05), /at least two/);
});

test('ropeLashing wraps around its axis', () => {
  const g = ropeLashing(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 0.1, 3);
  const b = bounds(g);
  assert.ok(b.max[0] > 0.05, 'lashing should extend in x');
  assert.ok(b.max[2] > 0.05, 'lashing should extend in z');
  expectFinite(g);
});

/* A flat 3x3 grid in the xz plane, for the panel tests. */
function flatGrid(n = 3) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      row.push(new THREE.Vector3(j / (n - 1), 0, i / (n - 1)));
    }
    rows.push(row);
  }
  return rows;
}

test('canvasPanel spans its grid and carries full uvs', () => {
  const g = canvasPanel(flatGrid());
  const b = bounds(g);
  assert.ok(Math.abs(b.min[0]) < 1e-6 && Math.abs(b.max[0] - 1) < 1e-6);
  const uv = g.getAttribute('uv');
  assert.ok(uv, 'canvas needs uvs');
  let minU = 1;
  let maxU = 0;
  for (let i = 0; i < uv.count; i++) {
    minU = Math.min(minU, uv.getX(i));
    maxU = Math.max(maxU, uv.getX(i));
  }
  assert.ok(Math.abs(minU) < 1e-6 && Math.abs(maxU - 1) < 1e-6, `uv u spanned ${minU}..${maxU}`);
  expectFinite(g);
});

test('canvasPanel slack displaces the interior but pins the edges', () => {
  const g = canvasPanel(flatGrid(5), { slack: 0.2 });
  const p = g.getAttribute('position');
  let interiorMoved = false;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const onEdge = x < 1e-6 || x > 1 - 1e-6 || z < 1e-6 || z > 1 - 1e-6;
    if (onEdge) {
      assert.ok(Math.abs(p.getY(i)) < 1e-6, `edge vertex moved to y=${p.getY(i)}`);
    } else if (Math.abs(p.getY(i)) > 1e-6) {
      interiorMoved = true;
    }
  }
  assert.ok(interiorMoved, 'slack should displace interior vertices');
});

test('canvasPanel rejects a grid too small to triangulate', () => {
  assert.throws(() => canvasPanel([[new THREE.Vector3()]]), /at least two/);
});

test('seamLines produces geometry at each requested row', () => {
  const g = seamLines(flatGrid(5), [0.5]);
  assert.ok(g.getAttribute('position').count > 0, 'a seam should produce vertices');
  const b = bounds(g);
  assert.ok(b.min[2] < 0.55 && b.max[2] > 0.45, `seam should sit near z=0.5, got ${b.min[2]}..${b.max[2]}`);
  expectFinite(g);
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test:unit
```

Expected: FAIL — nine new failures, `rope is not a function` and similar. The eight tests from Task 3 still pass.

- [ ] **Step 3: Implement the flexible primitives**

Append to `src/js/machines/kit.js`:

```js
/* ---- rope and cloth ----------------------------------------- */

/* Rope, swept along a curve through the given points. A cord under
   its own weight hangs; `sag` bows it downward at midspan. The lay
   twist goes into the v coordinate so hemp fibre spirals correctly. */
export function rope(points, radius, { sag = 0, segments = 24, radial = 6, lay = 8 } = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('rope needs at least two points');
  }

  let control = points;
  if (sag > 0) {
    const first = points[0];
    const last = points[points.length - 1];
    const chord = first.distanceTo(last);
    control = points.map((p, i) => {
      const t = points.length === 1 ? 0 : i / (points.length - 1);
      const bow = Math.sin(t * Math.PI) * chord * sag;
      return new THREE.Vector3(p.x, p.y - bow, p.z);
    });
  }

  const curve = new THREE.CatmullRomCurve3(control, false, 'catmullrom', 0.5);
  const frames = curve.computeFrenetFrames(segments, false);
  const pos = [];
  const uv = [];
  const idx = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const centre = curve.getPointAt(t);
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const sin = Math.sin(a);
      const cos = Math.cos(a);
      pos.push(
        centre.x + radius * (cos * normal.x + sin * binormal.x),
        centre.y + radius * (cos * normal.y + sin * binormal.y),
        centre.z + radius * (cos * normal.z + sin * binormal.z)
      );
      uv.push(j / radial, t * lay);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return finish(pos, idx, uv);
}

/* A short helix wound over a joint, which is how a rib is actually
   fixed to a rim when there is no iron to spare. */
export function ropeLashing(at, dir, radius, turns) {
  const axis = dir.clone().normalize();
  const side = Math.abs(axis.y) > 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(axis, side).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u).normalize();

  const gauge = radius * 0.22;
  const span = gauge * 2.2 * turns;
  const steps = Math.max(8, Math.round(turns * 10));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    const along = (t - 0.5) * span;
    pts.push(
      at.clone()
        .addScaledVector(axis, along)
        .addScaledVector(u, Math.cos(a) * radius)
        .addScaledVector(v, Math.sin(a) * radius)
    );
  }
  return rope(pts, gauge, { segments: steps * 2, radial: 5, lay: turns * 3 });
}

/* Stretched cloth over a frame. The caller positions the grid; this
   adds the slack that makes it read as cloth rather than as sheet
   metal, and the uvs the weave needs. Edges stay pinned — that is
   where the cloth is roped to the frame. */
export function canvasPanel(grid, { slack = 0, seams = 0 } = {}) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows < 2 || cols < 2) {
    throw new Error('canvasPanel needs a grid of at least two rows and two columns');
  }

  const pos = [];
  const uv = [];
  const idx = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const p = grid[i][j].clone();
      if (slack > 0 && i > 0 && i < rows - 1 && j > 0 && j < cols - 1) {
        // Sag toward the surface normal, strongest at the centre of a bay.
        const n = gridNormal(grid, i, j);
        const fade = Math.sin((i / (rows - 1)) * Math.PI) * Math.sin((j / (cols - 1)) * Math.PI);
        p.addScaledVector(n, -slack * fade);
      }
      pos.push(p.x, p.y, p.z);
      uv.push(j / (cols - 1), i / (rows - 1));
    }
  }

  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + cols;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const g = finish(pos, idx, uv);
  if (seams > 0) g.userData.seams = seams;
  return g;
}

/* The welt a seam makes where two widths of cloth are stitched. */
export function seamLines(grid, at) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (rows < 2 || cols < 2) {
    throw new Error('seamLines needs a grid of at least two rows and two columns');
  }
  const parts = [];
  for (const t of at) {
    const row = Math.min(rows - 1, Math.max(0, Math.round(t * (rows - 1))));
    const pts = grid[row].map((p) => p.clone());
    parts.push(rope(pts, 0.008, { segments: cols * 2, radial: 4, lay: cols * 2 }));
  }
  return mergeGeometries(parts);
}

/* The surface normal at one interior grid node, from its neighbours. */
function gridNormal(grid, i, j) {
  const along = grid[i][j + 1].clone().sub(grid[i][j - 1]);
  const across = grid[i + 1][j].clone().sub(grid[i - 1][j]);
  const n = new THREE.Vector3().crossVectors(along, across);
  if (n.lengthSq() < 1e-12) return new THREE.Vector3(0, 1, 0);
  return n.normalize();
}
```

Then extend `finish` to accept optional UVs, replacing the version from Task 3:

```js
function finish(pos, idx, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
```

`mergeGeometries` drops UVs, which is correct for the timber but would break a merged canvas panel. Add a UV pass to it:

```js
export function mergeGeometries(list) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  let offset = 0;
  const anyUv = list.some((g) => g.getAttribute('uv'));
  for (const g of list) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const t = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n ? n.getX(i) : 0, n ? n.getY(i) : 1, n ? n.getZ(i) : 0);
      if (anyUv) uv.push(t ? t.getX(i) : 0, t ? t.getY(i) : 0);
    }
    const index = g.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i++) idx.push(index.getX(i) + offset);
    } else {
      for (let i = 0; i < p.count; i++) idx.push(i + offset);
    }
    offset += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (anyUv) out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
}
```

- [ ] **Step 4: Run to verify they pass**

```bash
npm run test:unit
```

Expected: PASS — seventeen tests.

- [ ] **Step 5: Commit**

```bash
git add src/js/machines/kit.js tests/unit/kit.test.js && git commit -m "feat: add rope, lashing and canvas panel primitives"
```

## Task 5: Kit — solidGear, and the surviving line primitives

The last kit primitive, plus the four line primitives moved across from the old file so that nothing else needs to import `machines.js`.

**Files:**
- Modify: `src/js/machines/kit.js`
- Test: `tests/unit/kit.test.js`

**Interfaces:**
- Consumes: `finish`, `mergeGeometries`, `spar` from Tasks 3–4.
- Produces:
  - `solidGear(radius, teeth, thickness, opts?) -> BufferGeometry` — `opts: { depth?: number = 0.08, hub?: number = 0.18, spokes?: number = 0 }`. Lies in the xz plane, extruded along y, centred. `depth` is tooth height, `hub` the hub radius as a fraction of `radius`, `spokes` how many (0 means a solid web).
  - `lineMat(color?, opacity?) -> LineBasicMaterial`
  - `polyline(points, material) -> Line`
  - `segments(pairs, material) -> LineSegments`
  - `circle(radius, segs, material, axis?) -> Line`

The old `gear()` is not carried across. `solidGear` replaces both its callers, and nothing else uses it.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/kit.test.js`:

```js
import { circle, lineMat, polyline, segments, solidGear } from '../../src/js/machines/kit.js';

test('solidGear teeth reach the outer radius and roots fall short', () => {
  const g = solidGear(1, 12, 0.1, { depth: 0.15 });
  const p = g.getAttribute('position');
  let outer = 0;
  let inner = Infinity;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i));
    if (r > 0.5) {
      outer = Math.max(outer, r);
      inner = Math.min(inner, r);
    }
  }
  assert.ok(Math.abs(outer - 1) < 1e-3, `tooth tip radius was ${outer}`);
  assert.ok(inner < 0.9, `root radius ${inner} should sit inside the tip`);
  expectFinite(g);
});

test('solidGear is extruded along y to its thickness', () => {
  const g = solidGear(1, 12, 0.2);
  const b = bounds(g);
  assert.ok(Math.abs(b.min[1] - -0.1) < 1e-6, `min y was ${b.min[1]}`);
  assert.ok(Math.abs(b.max[1] - 0.1) < 1e-6, `max y was ${b.max[1]}`);
});

test('solidGear tooth count is honoured', () => {
  const coarse = solidGear(1, 8, 0.1);
  const fine = solidGear(1, 32, 0.1);
  assert.ok(
    fine.getAttribute('position').count > coarse.getAttribute('position').count,
    'more teeth should mean more vertices'
  );
});

test('solidGear spokes leave gaps a solid web would fill', () => {
  const web = solidGear(1, 12, 0.1, { spokes: 0 });
  const spoked = solidGear(1, 12, 0.1, { spokes: 6 });
  assert.ok(
    spoked.getIndex().count !== web.getIndex().count,
    'a spoked wheel should not triangulate like a solid one'
  );
  expectFinite(spoked);
});

/* Every triangle's area, its unit normal's y component and the mean y
   of its corners. Enough to tell a flat face from a wall, and to tell
   which way the flat face looks. */
function triangles(geometry) {
  const p = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();
  const out = [];
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(p, index.getX(i));
    b.fromBufferAttribute(p, index.getX(i + 1));
    c.fromBufferAttribute(p, index.getX(i + 2));
    n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    const twice = n.length();
    if (twice < 1e-12) continue;
    out.push({ area: twice / 2, ny: n.y / twice, y: (a.y + b.y + c.y) / 3 });
  }
  return out;
}

test('solidGear with no spokes closes both flats with an annular web', () => {
  const radius = 1;
  const thickness = 0.1;
  const depth = 0.08;
  const hub = 0.18;
  const root = radius - depth;
  const hubR = radius * hub;
  const hy = thickness / 2;
  const g = solidGear(radius, 12, thickness, { spokes: 0 });
  const tris = triangles(g);

  // A web is two annular discs. Anything less and the wheel is a pair
  // of open tubes, which is what a mis-ordered emit loop produces.
  const ideal = Math.PI * (root ** 2 - hubR ** 2);
  let up = 0;
  let down = 0;
  for (const t of tris) {
    if (t.ny > 0.9) up += t.area;
    else if (t.ny < -0.9) down += t.area;
  }
  assert.ok(Math.abs(down - ideal) < ideal * 0.05, `-y web area was ${down}, wanted ~${ideal}`);
  assert.ok(Math.abs(up - ideal) < ideal * 0.05, `+y web area was ${up}, wanted ~${ideal}`);

  // Each flat must look away from the timber, or it renders black.
  for (const t of tris) {
    if (Math.abs(t.ny) < 0.9) continue;
    if (Math.abs(t.y + hy) < 1e-4) {
      assert.ok(t.ny < 0, `web face at y=-${hy} looks inward, ny was ${t.ny}`);
    } else if (Math.abs(t.y - hy) < 1e-4) {
      assert.ok(t.ny > 0, `web face at y=+${hy} looks inward, ny was ${t.ny}`);
    } else {
      assert.ok(false, `a flat face floats at y=${t.y}, off both faces of the wheel`);
    }
  }
  expectFinite(g);
});

test('solidGear spokes run radially and bridge hub to root', () => {
  const radius = 1;
  const thickness = 0.1;
  const spokes = 6;
  const depth = 0.08;
  const hub = 0.18;
  const root = radius - depth;
  const hubR = radius * hub;
  const g = solidGear(radius, 12, thickness, { spokes });
  const p = g.getAttribute('position');

  // Rim and hub walls sit exactly on the flats at |y| = thickness/2.
  // The spoke bars are thinner, so whatever lies strictly inside the
  // flats is spoke timber and nothing else.
  const bars = [];
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getY(i)) < thickness / 2 - 1e-4) {
      bars.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
    }
  }
  assert.ok(bars.length >= spokes * 8, `expected spoke vertices, found ${bars.length}`);

  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const along = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const across = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    let lo = Infinity;
    let hi = -Infinity;
    let count = 0;
    for (const v of bars) {
      // Only this spoke's own timber: the opposite spoke shares this
      // radius but on the far side, and a neighbour 60 degrees away is
      // more than a bar's half-width off it.
      if (v.dot(along) <= 0) continue;
      if (Math.abs(v.dot(across)) > thickness * 0.5) continue;
      lo = Math.min(lo, v.dot(along));
      hi = Math.max(hi, v.dot(along));
      count++;
    }
    assert.ok(count > 0, `spoke ${i} has no timber on its own radius`);
    assert.ok(Math.abs(lo - hubR) < 0.02, `spoke ${i} starts at r=${lo}, wanted ${hubR}`);
    assert.ok(Math.abs(hi - root) < 0.02, `spoke ${i} ends at r=${hi}, wanted ${root}`);
  }
  expectFinite(g);
});

test('line primitives still build', () => {
  const m = lineMat();
  const l = polyline([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)], m);
  assert.ok(l instanceof THREE.Line);
  const s = segments([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)], m);
  assert.ok(s instanceof THREE.LineSegments);
  const c = circle(1, 16, m, 'z');
  assert.ok(c instanceof THREE.Line);
  assert.ok(bounds(c.geometry).max[0] > 0.99);
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test:unit
```

Expected: FAIL — seven new failures.

- [ ] **Step 3: Implement**

Append to `src/js/machines/kit.js`:

```js
/* ---- gearing ------------------------------------------------ */

/* A toothed wheel with a real tooth profile, lying in the xz plane
   and extruded along y. The cart folio shows trapezoidal teeth with
   worn tips, which is what the four-point profile below draws. */
export function solidGear(radius, teeth, thickness, { depth = 0.08, hub = 0.18, spokes = 0 } = {}) {
  const hy = thickness / 2;
  const root = radius - depth;
  const hubR = radius * hub;

  // Each tooth contributes four rim stations: root, flank, flank, root.
  const rim = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    rim.push(
      { a: a0, r: root },
      { a: a0 + step * 0.22, r: radius },
      { a: a0 + step * 0.48, r: radius },
      { a: a0 + step * 0.7, r: root }
    );
  }

  const pos = [];
  const idx = [];

  // Rim: an outer wall, plus a top and bottom face reaching inward.
  const ringStart = pos.length / 3;
  for (const { a, r } of rim) {
    const c = Math.cos(a) * r;
    const s = Math.sin(a) * r;
    pos.push(c, -hy, s, c, hy, s);
  }
  const n = rim.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = ringStart + i * 2;
    const b = ringStart + j * 2;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }

  // Hub, as a short cylinder wall.
  const hubSegs = 20;
  const hubStart = pos.length / 3;
  for (let i = 0; i <= hubSegs; i++) {
    const a = (i / hubSegs) * Math.PI * 2;
    const c = Math.cos(a) * hubR;
    const s = Math.sin(a) * hubR;
    pos.push(c, -hy, s, c, hy, s);
  }
  for (let i = 0; i < hubSegs; i++) {
    const a = hubStart + i * 2;
    const b = a + 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }

  const parts = [finish(pos, idx)];

  if (spokes > 0) {
    // Bars from hub to root, each a flat beam lying in the plane.
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const bar = beam(root - hubR, thickness * 0.5, thickness * 0.8);
      bar.rotateY(Math.PI / 2 - a);
      const mid = (hubR + root) / 2;
      bar.translate(Math.cos(a) * mid, 0, Math.sin(a) * mid);
      parts.push(bar);
    }
    // Close the rim and hub with annular faces only where a spoke sits,
    // which the bars themselves already do; nothing more is needed.
  } else {
    // A solid web: two annular discs between hub and root.
    const webSegs = 24;
    const wpos = [];
    const widx = [];
    for (let i = 0; i <= webSegs; i++) {
      const a = (i / webSegs) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      for (const r of [hubR, root]) for (const y of [-hy, hy]) wpos.push(c * r, y, s * r);
    }
    for (let i = 0; i < webSegs; i++) {
      const a = i * 4;
      const b = a + 4;
      // bottom face
      widx.push(a, a + 2, b, a + 2, b + 2, b);
      // top face
      widx.push(a + 1, b + 1, a + 3, b + 1, b + 3, a + 3);
    }
    parts.push(finish(wpos, widx));
  }

  return mergeGeometries(parts);
}

/* ---- line work ----------------------------------------------
   Solids carry the form; lines still carry the annotation. These
   four come across from the original chapter unchanged. */

export const lineMat = (color, opacity = 0.9) =>
  new THREE.LineBasicMaterial({ color, transparent: true, opacity });

export function polyline(points, material) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(g, material);
}

export function segments(pairs, material) {
  const g = new THREE.BufferGeometry().setFromPoints(pairs);
  return new THREE.LineSegments(g, material);
}

export function circle(radius, segs, material, axis = 'y') {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a) * radius;
    const s = Math.sin(a) * radius;
    if (axis === 'y') pts.push(new THREE.Vector3(c, 0, s));
    else if (axis === 'z') pts.push(new THREE.Vector3(c, s, 0));
    else pts.push(new THREE.Vector3(0, c, s));
  }
  return polyline(pts, material);
}
```

`lineMat`'s default colour is dropped here rather than defaulting to `GOLD`. Colours now live in `materials.js`, and a geometry module importing a palette from a material module would be a cycle. Every caller passes a colour explicitly.

- [ ] **Step 4: Run to verify they pass**

```bash
npm run test:unit
```

Expected: PASS — twenty-two tests.

- [ ] **Step 5: Commit**

```bash
git add src/js/machines/kit.js tests/unit/kit.test.js && git commit -m "feat: add solidGear and carry the line primitives across"
```

---

## Task 6: Textures and materials

Canvas-generated grain, tarnish and fibre, and the five shared materials that use them. This is the one part of the work that touches the DOM, so it is also where the no-`2d`-context fallback lives.

**Files:**
- Create: `src/js/machines/textures.js`
- Create: `src/js/machines/materials.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `grainTexture(seed) -> Texture | null`, `tarnishTexture(seed) -> Texture | null`, `fibreTexture(seed) -> Texture | null` — each cached by seed, each returning `null` when no `2d` context is available.
  - `MATERIALS` — `{ oak, iron, linen, hemp, brass }`, all `MeshStandardMaterial` except `linen` which is `MeshPhysicalMaterial`.
  - `GOLD = 0xd4b463`, `GOLD_DIM = 0x8a6f38`, `SANGUINE = 0xc9705a`, `LINEN = 0xe8dcc2` — the colour constants, unchanged, for the line primitives.
  - `disposeMaterials()` — releases the shared textures. Not called by the page; present so a future teardown path has it.

- [ ] **Step 1: Write textures.js**

```js
/* ============================================================
   Chapter IV — surfaces
   Grain, tarnish and fibre, drawn onto a canvas at run time.
   Nothing is loaded: the chapter carries no binary payload of
   its own, which is the same promise the folio plates make.
   ============================================================ */

import * as THREE from 'three';

const SIZE = 512;
const cache = new Map();
let warned = false;

/* A canvas and its context, or null on a device that will not give
   us one. Every generator degrades to a flat colour in that case. */
function surface() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    return { canvas, ctx };
  } catch (err) {
    if (!warned) {
      console.warn('Machine textures unavailable; falling back to flat colour.', err);
      warned = true;
    }
    return null;
  }
}

/* Deterministic noise, so a seed always draws the same timber. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function wrap(canvas, repeat) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function cached(key, make) {
  if (cache.has(key)) return cache.get(key);
  const value = make();
  cache.set(key, value);
  return value;
}

/* Timber: long fibres pulled along one axis, with a few darker
   late-wood bands and the odd knot. */
export function grainTexture(seed = 1) {
  return cached(`grain:${seed}`, () => {
    const s = surface();
    if (!s) return null;
    const { canvas, ctx } = s;
    const rand = rng(seed * 2654435761);

    ctx.fillStyle = '#9c9c9c';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Fibres.
    for (let i = 0; i < 900; i++) {
      const y = rand() * SIZE;
      const v = 120 + rand() * 90;
      ctx.strokeStyle = `rgba(${v},${v},${v},0.5)`;
      ctx.lineWidth = 0.5 + rand() * 1.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= SIZE; x += 32) {
        ctx.lineTo(x, y + Math.sin((x / SIZE) * Math.PI * 2 + i) * 1.6);
      }
      ctx.stroke();
    }

    // Late-wood bands.
    for (let i = 0; i < 14; i++) {
      const y = rand() * SIZE;
      const h = 2 + rand() * 7;
      ctx.fillStyle = `rgba(70,70,70,${0.1 + rand() * 0.16})`;
      ctx.fillRect(0, y, SIZE, h);
    }

    // Knots.
    for (let i = 0; i < 3; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const r = 6 + rand() * 16;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(50,50,50,0.6)');
      g.addColorStop(1, 'rgba(150,150,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return wrap(canvas, [2, 1]);
  });
}

/* Iron that has been handled: blotched, uneven, never a mirror. */
export function tarnishTexture(seed = 2) {
  return cached(`tarnish:${seed}`, () => {
    const s = surface();
    if (!s) return null;
    const { canvas, ctx } = s;
    const rand = rng(seed * 40503);

    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 260; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const r = 4 + rand() * 46;
      const v = 60 + rand() * 150;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${v},${v},${v},0.4)`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return wrap(canvas, [1, 1]);
  });
}

/* Hemp: strands laid up on the diagonal. The rope primitive spirals
   its uvs, so a straight diagonal here reads as a twisted lay. */
export function fibreTexture(seed = 3) {
  return cached(`fibre:${seed}`, () => {
    const s = surface();
    if (!s) return null;
    const { canvas, ctx } = s;
    const rand = rng(seed * 22695477);

    ctx.fillStyle = '#8f8f8f';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.lineWidth = 5;
    for (let i = -SIZE; i < SIZE * 2; i += 11) {
      const v = 110 + rand() * 110;
      ctx.strokeStyle = `rgba(${v},${v},${v},0.75)`;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + SIZE, SIZE);
      ctx.stroke();
    }
    return wrap(canvas, [1, 1]);
  });
}

export function disposeTextures() {
  for (const tex of cache.values()) if (tex) tex.dispose();
  cache.clear();
}
```

Note `colorSpace = NoColorSpace`: these maps are all used as normal, roughness, or bump data, never as colour. Tagging them sRGB would put a gamma curve through data that has no business carrying one.

- [ ] **Step 2: Write materials.js**

```js
/* ============================================================
   Chapter IV — the timber, iron and cloth
   Five materials, shared by all three machines. Sharing is what
   lets a machine merge into a handful of draw calls, and what
   makes the three read as one workshop.
   ============================================================ */

import * as THREE from 'three';
import { fibreTexture, grainTexture, tarnishTexture } from './textures.js';

/* The palette, as the chapter has always carried it. Values follow
   src/css/tokens.css; the line work still uses these directly. */
export const GOLD = 0xd4b463;
export const GOLD_DIM = 0x8a6f38;
export const SANGUINE = 0xc9705a;
export const LINEN = 0xe8dcc2;

const grain = grainTexture(1);
const tarnish = tarnishTexture(2);
const fibre = fibreTexture(3);

export const MATERIALS = {
  /* Seasoned oak: the structural timber of all three machines. */
  oak: new THREE.MeshStandardMaterial({
    color: 0x9a7845,
    roughness: 0.78,
    metalness: 0.02,
    bumpMap: grain,
    bumpScale: 0.4,
    roughnessMap: grain,
  }),

  /* Wrought iron, handled and tarnished. */
  iron: new THREE.MeshStandardMaterial({
    color: 0x5a5148,
    roughness: 0.42,
    metalness: 0.75,
    roughnessMap: tarnish,
    metalnessMap: tarnish,
  }),

  /* Sailcloth. The one physical material: transmission is what makes
     it glow where the key light passes through, which is most of why
     the sail reads as cloth at all. */
  linen: new THREE.MeshPhysicalMaterial({
    color: LINEN,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    transmission: 0.35,
    thickness: 0.04,
    ior: 1.2,
  }),

  /* Hemp cordage. */
  hemp: new THREE.MeshStandardMaterial({
    color: 0xb59a6a,
    roughness: 0.95,
    metalness: 0,
    bumpMap: fibre,
    bumpScale: 0.5,
  }),

  /* Brass, for gear teeth and fittings. Takes --gold. */
  brass: new THREE.MeshStandardMaterial({
    color: 0xb08a3e,
    roughness: 0.3,
    metalness: 0.85,
    roughnessMap: tarnish,
  }),
};

export function disposeMaterials() {
  for (const m of Object.values(MATERIALS)) m.dispose();
}
```

`bumpMap` is used rather than `normalMap` deliberately: a bump map takes a single greyscale canvas, while a normal map would need the canvas encoded as a tangent-space vector field. The visual difference at this scale is negligible and the code is a third the size.

- [ ] **Step 3: Verify the modules load and the fallback holds**

There is no unit test here — both modules touch `document` and `THREE.CanvasTexture`, so they belong to the browser. Confirm by hand that the page still builds:

```bash
npm run build
```

Expected: PASS. Nothing imports these two modules yet, so the build only proves they parse.

- [ ] **Step 4: Commit**

```bash
git add src/js/machines/textures.js src/js/machines/materials.js && git commit -m "feat: add canvas-generated surfaces and the five shared materials"
```

## Task 7: Merge and lighting

The two shared services the viewer installs: the merge pass that keeps draw calls down, and the three-light rig.

**Files:**
- Create: `src/js/machines/merge.js`
- Create: `src/js/machines/lighting.js`
- Test: `tests/unit/merge.test.js`

**Interfaces:**
- Consumes: `mergeGeometries` from Task 3.
- Produces:
  - `mergeByMaterial(group) -> Group` — mutates and returns the group. Collapses same-material meshes within each assembly, never across a boundary marked `userData.dynamic === true`.
  - `makeLightRig(frame, { shadows = true } = {}) -> Group` — the group holds a key `DirectionalLight` (the only shadow caster), a `HemisphereLight`, and a rim `DirectionalLight`.

- [ ] **Step 1: Write the failing merge tests**

`tests/unit/merge.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { mergeByMaterial } from '../../src/js/machines/merge.js';

function boxMesh(material, x = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.x = x;
  return mesh;
}

test('same-material meshes in one group collapse to a single mesh', () => {
  const mat = new THREE.MeshStandardMaterial();
  const group = new THREE.Group();
  group.add(boxMesh(mat, 0), boxMesh(mat, 2), boxMesh(mat, 4));
  mergeByMaterial(group);
  const meshes = group.children.filter((c) => c.isMesh);
  assert.equal(meshes.length, 1);
});

test('different materials stay apart', () => {
  const group = new THREE.Group();
  group.add(boxMesh(new THREE.MeshStandardMaterial()), boxMesh(new THREE.MeshStandardMaterial(), 2));
  mergeByMaterial(group);
  assert.equal(group.children.filter((c) => c.isMesh).length, 2);
});

test('a merged mesh keeps each part where it stood', () => {
  const mat = new THREE.MeshStandardMaterial();
  const group = new THREE.Group();
  group.add(boxMesh(mat, 0), boxMesh(mat, 10));
  mergeByMaterial(group);
  const merged = group.children.find((c) => c.isMesh);
  merged.geometry.computeBoundingBox();
  const box = merged.geometry.boundingBox;
  assert.ok(box.min.x < -0.4, `left edge was ${box.min.x}`);
  assert.ok(box.max.x > 10.4, `right edge was ${box.max.x}`);
});

test('a dynamic group is not merged into its parent', () => {
  const mat = new THREE.MeshStandardMaterial();
  const root = new THREE.Group();
  const wheel = new THREE.Group();
  wheel.userData.dynamic = true;
  wheel.add(boxMesh(mat), boxMesh(mat, 1));
  root.add(boxMesh(mat, 5), wheel);
  mergeByMaterial(root);
  assert.ok(root.children.includes(wheel), 'the dynamic group must survive');
  assert.equal(wheel.children.filter((c) => c.isMesh).length, 1, 'its contents still merge');
  assert.equal(root.children.filter((c) => c.isMesh).length, 1, 'the static siblings merge separately');
});

test('a dynamic group keeps its own transform', () => {
  const mat = new THREE.MeshStandardMaterial();
  const root = new THREE.Group();
  const wheel = new THREE.Group();
  wheel.userData.dynamic = true;
  wheel.position.set(3, 0, 0);
  wheel.add(boxMesh(mat), boxMesh(mat, 1));
  root.add(wheel);
  mergeByMaterial(root);
  assert.equal(wheel.position.x, 3, 'the assembly transform must not be baked away');
});

test('lines and other non-meshes pass through untouched', () => {
  const mat = new THREE.MeshStandardMaterial();
  const group = new THREE.Group();
  const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
  group.add(boxMesh(mat), boxMesh(mat, 1), line);
  mergeByMaterial(group);
  assert.ok(group.children.includes(line));
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test:unit
```

Expected: FAIL — `Cannot find module '.../merge.js'`.

- [ ] **Step 3: Implement merge.js**

```js
/* ============================================================
   Chapter IV — the merge pass
   A built machine is hundreds of separate parts, and the GPU
   would rather have a handful. Same-material geometry collapses
   into one mesh — but only within an assembly that moves as one
   piece. Merge across that line and a wheel gets welded to the
   chassis.
   ============================================================ */

import * as THREE from 'three';
import { mergeGeometries } from './kit.js';

export function mergeByMaterial(group) {
  // Depth first: an assembly's own contents merge before it is
  // considered as a whole.
  for (const child of [...group.children]) {
    if (child.isGroup) mergeByMaterial(child);
  }

  const byMaterial = new Map();
  for (const child of group.children) {
    if (!child.isMesh || child.userData.dynamic) continue;
    const list = byMaterial.get(child.material) || [];
    list.push(child);
    byMaterial.set(child.material, list);
  }

  for (const [material, meshes] of byMaterial) {
    if (meshes.length < 2) continue;

    const baked = meshes.map((mesh) => {
      mesh.updateMatrix();
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrix);
      return geometry;
    });

    const merged = new THREE.Mesh(mergeGeometries(baked), material);
    merged.castShadow = meshes.some((m) => m.castShadow);
    merged.receiveShadow = meshes.some((m) => m.receiveShadow);

    for (const mesh of meshes) {
      group.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const geometry of baked) geometry.dispose();

    group.add(merged);
  }

  return group;
}
```

The clone-then-`applyMatrix4` is why this is safe: each part's own position and rotation are baked into its vertices before the merge, so a merged mesh sits at the group origin with every part still in place.

- [ ] **Step 4: Run to verify they pass**

```bash
npm run test:unit
```

Expected: PASS — twenty-eight tests.

- [ ] **Step 5: Implement lighting.js**

```js
/* ============================================================
   Chapter IV — the light
   One warm key from high on the left, a cool fill from the
   parchment overhead and the umber below, and a dim rim to cut
   the silhouette out of the fog. Leonardo held that the extremes
   do not occur in nature, so nothing here goes to black.
   ============================================================ */

import * as THREE from 'three';

export function makeLightRig(frame, { shadows = true, mapSize = 1024 } = {}) {
  const rig = new THREE.Group();
  rig.name = 'lightRig';

  /* The key: ochre, high and to the left at about 35°. The only
     light that casts, because one clear shadow reads better than
     three competing ones. */
  const key = new THREE.DirectionalLight(0xffd9a0, 2.2);
  key.position.set(-frame * 0.6, frame * 0.85, frame * 0.45);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(mapSize, mapSize);
    const extent = frame * 0.75;
    key.shadow.camera.left = -extent;
    key.shadow.camera.right = extent;
    key.shadow.camera.top = extent;
    key.shadow.camera.bottom = -extent;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = frame * 3;
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 3.5;
  }
  rig.add(key);

  /* The fill: parchment above, umber below. This is what keeps a
     shadowed beam legible instead of a black shape. */
  rig.add(new THREE.HemisphereLight(0xd8c9a4, 0x2b2016, 0.55));

  /* The rim: azurite, from behind and a little below. */
  const rim = new THREE.DirectionalLight(0x8ea6b2, 0.4);
  rim.position.set(frame * 0.5, -frame * 0.2, -frame * 0.7);
  rig.add(rim);

  return rig;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/js/machines/merge.js src/js/machines/lighting.js tests/unit/merge.test.js && git commit -m "feat: add the merge pass and the three-light rig"
```

---

## Task 8: The viewer

`mountViewer` moves into its own file and gains the light rig, tone mapping, shadows, the constrained-GPU fallback, and the test observation surface. The three builders do not exist yet, so this task keeps importing the old ones from `machines.js` — which means the page keeps working and this task is independently reviewable. Tasks 9 and 10 swap the builders one at a time.

**Files:**
- Create: `src/js/machines/viewer.js`
- Create: `src/js/machines/index.js`
- Modify: `src/js/main.js:464`

**Interfaces:**
- Consumes: `makeLightRig` from Task 7.
- Produces:
  - `mountViewer(stage, id, reduced) -> api | null` where `api` is `{ running, visible, raf, renderer, scene, controls }`.
  - `BUILDERS` — `{ vite, ornitottero, carro }`, keyed by the ids in `src/js/data.js`.
  - `buildMachines({ plateImg, rise, PLATES, REDUCED })` — the unchanged chapter assembly, re-exported from `index.js`.

- [ ] **Step 1: Write viewer.js**

Copy `mountViewer` from `src/js/machines.js:429-497` verbatim, then apply exactly these changes. Everything not listed stays byte-for-byte as it was.

```js
/* ============================================================
   Chapter IV — the viewer
   One renderer per machine, mounted only when the machine comes
   near, drawing frames only while it is on screen.
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLightRig } from './lighting.js';
import { mergeByMaterial } from './merge.js';
import { buildScrew } from './screw.js';
import { buildOrnithopter } from './ornithopter.js';
import { buildCart } from './cart.js';

export const BUILDERS = { vite: buildScrew, ornitottero: buildOrnithopter, carro: buildCart };

/* A 1024² depth map is modest, but not every device will give us
   one. Below that we light the machine flat rather than fail it. */
function shadowBudget(renderer) {
  const max = renderer.capabilities.maxTextureSize;
  if (max >= 2048) return 1024;
  if (max >= 1024) return 512;
  return 0;
}

export function mountViewer(stage, id, reduced) {
  const build = BUILDERS[id];
  if (!build) return null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // A still frame needs less shadow than a turning one.
  const mapSize = shadowBudget(renderer) * (reduced ? 0.5 : 1);
  const shadows = mapSize >= 512;
  renderer.shadowMap.enabled = shadows;
  if (shadows) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x191207, 0.075);

  const camera = new THREE.PerspectiveCamera(38, 1.618, 0.1, 200);

  const model = build();
  mergeByMaterial(model.root);
  scene.add(model.root);
  scene.add(makeLightRig(model.frame, { shadows, mapSize }));

  camera.position.set(model.frame * 0.72, model.frame * 0.42, model.frame * 0.78);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = model.frame * 0.55;
  controls.maxDistance = model.frame * 2.2;
  controls.maxPolarAngle = Math.PI * 0.9;
  controls.target.set(0, 0.1, 0);
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.5;

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(stage);
  controls.update();
  renderer.render(scene, camera);

  const timer = new THREE.Timer();
  timer.connect(document);
  // renderer, scene and controls are exposed for the browser tests;
  // nothing in the page reads them.
  const api = { running: !reduced, visible: false, raf: 0, renderer, scene, controls };

  function loop(time) {
    api.raf = 0;
    timer.update(time);
    if (!api.visible) return;
    const dt = Math.min(timer.getDelta(), 0.05);
    model.tick(timer.getElapsed(), dt, api.running);
    controls.autoRotate = api.running && !reduced;
    controls.update();
    renderer.render(scene, camera);
    api.raf = requestAnimationFrame(loop);
  }

  // Schedule frames only while the machine is actually on screen.
  new IntersectionObserver(
    (entries) => {
      api.visible = entries[0].isIntersecting;
      if (api.visible && !api.raf) api.raf = requestAnimationFrame(loop);
    },
    { threshold: 0.05 }
  ).observe(stage);

  return api;
}
```

The shadow-budget arithmetic deserves a note: `shadowBudget` returns 1024, 512, or 0, and reduced motion halves it. That gives 1024 normally, 512 under reduced motion, 512 on a mid device, 256 on a mid device under reduced motion — and 256 falls below the `>= 512` gate, so shadows switch off there. That is the intended behaviour: the devices that can barely allocate a map are the ones that least need a soft shadow.

- [ ] **Step 2: Write index.js with the three builders still stubbed**

At this point `screw.js`, `ornithopter.js` and `cart.js` do not exist. Create all three as thin re-exports of the current implementations so the page keeps working through this task:

`src/js/machines/screw.js`:

```js
export { buildScrew } from '../machines.js';
```

`src/js/machines/ornithopter.js`:

```js
export { buildOrnithopter } from '../machines.js';
```

`src/js/machines/cart.js`:

```js
export { buildCart } from '../machines.js';
```

For these to work, `src/js/machines.js` must export its three builders. Change three lines there from `function buildScrew()` to `export function buildScrew()`, and the same for the other two. Nothing else in that file changes yet.

These three files are temporary scaffolding, replaced in Tasks 9 and 10. They exist so that this task ends with a working page rather than a broken one.

`src/js/machines/index.js`:

```js
/* ============================================================
   Chapter IV — Le Macchine Vive
   Three devices built procedurally in three dimensions: timber,
   iron and canvas, computed from the proportions in the folios.
   Nothing is loaded from a model file.
   ============================================================ */

import { MACHINES } from '../data.js';
import { mountViewer } from './viewer.js';

export function buildMachines({ plateImg, rise, PLATES, REDUCED }) {
  // ... copied verbatim from src/js/machines.js:501-586
}
```

Copy the body of `buildMachines` across exactly as it stands, with one addition inside the `IntersectionObserver` callback, immediately after `idle.hidden = true;`:

```js
        // Exposed for the browser tests; the page does not read it.
        stage._machineApi = api;
```

The `aria-label` string is left alone in this task. Task 12 changes it, together with the README, so that all the copy changes land in one reviewable commit.

- [ ] **Step 3: Point main.js at the new module**

In `src/js/main.js:464`, change:

```js
    const m = await import('./machines.js');
```

to:

```js
    const m = await import('./machines/index.js');
```

- [ ] **Step 4: Verify the page still works**

```bash
npm test
```

Expected: PASS — seven tests. The machines are still the old line drawings, but they are now lit, tone-mapped, and merged, and they load through the new module. Look at the page and confirm three machines still appear:

```bash
npm run dev
```

Lines will look slightly different — tone mapping affects them — but nothing should be missing.

- [ ] **Step 5: Commit**

```bash
git add src/js/machines/ src/js/main.js src/js/machines.js && git commit -m "refactor: move the viewer into machines/ and install the light rig"
```

## Task 9: The aerial screw, built

The first machine rebuilt in terms of the kit. It is the simplest of the three and establishes the pattern the other two follow: a `dynamic` flag on each moving assembly, `castShadow`/`receiveShadow` set per part, and every folio proportion preserved.

**Files:**
- Rewrite: `src/js/machines/screw.js`
- Test: `tests/unit/machines.test.js`

**Interfaces:**
- Consumes: `beam`, `spar`, `rope`, `ropeLashing`, `canvasPanel`, `seamLines`, `peg`, `mergeGeometries` from Tasks 3–5; `MATERIALS` from Task 6.
- Produces: `buildScrew() -> { root: Group, tick(t, dt, running), frame: 5.2 }`. `root` contains exactly two `userData.dynamic` groups, named `screw` and `base`.

- [ ] **Step 1: Write the failing test**

`tests/unit/machines.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildScrew } from '../../src/js/machines/screw.js';

/* Every triangle in a machine, counted through the whole graph. */
export function triangleCount(object) {
  let total = 0;
  object.traverse((child) => {
    if (!child.isMesh) return;
    const index = child.geometry.getIndex();
    total += index ? index.count / 3 : child.geometry.getAttribute('position').count / 3;
  });
  return total;
}

export function findGroup(root, name) {
  let found = null;
  root.traverse((child) => {
    if (child.isGroup && child.name === name) found = child;
  });
  return found;
}

test('the screw keeps its folio proportions and frame', () => {
  const model = buildScrew();
  assert.equal(model.frame, 5.2);
  const box = new (await import('three')).Box3().setFromObject(model.root);
  assert.ok(box.max.x <= 2.3, `sail should not exceed R=2.0 by much, got ${box.max.x}`);
  assert.ok(box.max.x >= 1.9, `sail should reach nearly R=2.0, got ${box.max.x}`);
});

test('the screw is built, not drawn', () => {
  const model = buildScrew();
  assert.ok(triangleCount(model.root) > 20000, `only ${triangleCount(model.root)} triangles`);
});

test('the screw has exactly two moving assemblies', () => {
  const model = buildScrew();
  const dynamic = [];
  model.root.traverse((c) => { if (c.userData.dynamic) dynamic.push(c.name); });
  assert.deepEqual(dynamic.sort(), ['base', 'screw']);
});

test('the screw and its platform turn against each other', () => {
  const model = buildScrew();
  const screw = findGroup(model.root, 'screw');
  const base = findGroup(model.root, 'base');
  model.tick(0, 1, true);
  assert.ok(screw.rotation.y > 0, 'the screw turns one way');
  assert.ok(base.rotation.y < 0, 'nothing anchors the platform, so it turns the other');
  assert.ok(Math.abs(screw.rotation.y - 1.15) < 1e-9);
  assert.ok(Math.abs(base.rotation.y + 0.42) < 1e-9);
});

test('the screw holds still when paused', () => {
  const model = buildScrew();
  const screw = findGroup(model.root, 'screw');
  model.tick(0, 1, false);
  assert.equal(screw.rotation.y, 0);
});
```

The `await import` inside a non-async test will not run. Write the import at the top of the file instead:

```js
import * as THREE from 'three';
```

and use `new THREE.Box3()` in the first test.

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — the stub re-export from Task 8 returns the old line model, so the triangle-count test fails with a number in the low hundreds, and the `dynamic` test finds nothing.

- [ ] **Step 3: Rewrite screw.js**

```js
/* ============================================================
   I. the aerial screw
   A linen helicoid on a turned mast, its ribs pegged into a hub
   block and lashed to the rim rope, standing on a plank platform
   the crew would push around. Proportions from the folio:
   R 2.0, mast radius 0.16, rise 2.3 over 1.05 turns.
   ============================================================ */

import * as THREE from 'three';
import {
  beam, canvasPanel, mergeGeometries, peg, rope, ropeLashing, seamLines, spar,
} from './kit.js';
import { MATERIALS } from './materials.js';

const R = 2.0;      // outer radius of the sail
const r0 = 0.16;    // radius at the mast
const H = 2.3;      // rise of one full turn
const TURNS = 1.05;
const U = 96, V = 7;
const RIBS = 16;
const bR = 1.15;    // platform radius

/* The helicoid the whole machine is cut from. */
const at = (u, v) => {
  const a = u * Math.PI * 2 * TURNS;
  const rad = r0 + v * (R - r0);
  return new THREE.Vector3(Math.cos(a) * rad, u * H, Math.sin(a) * rad);
};

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/* Aim a part that runs along local z from one point to another. */
function place(geometry, from, to) {
  const dir = to.clone().sub(from);
  const length = dir.length();
  if (length < 1e-9) return geometry;
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    dir.clone().normalize()
  );
  const m = new THREE.Matrix4()
    .compose(from.clone().addScaledVector(dir, 0.5), q, new THREE.Vector3(1, 1, 1));
  return geometry.applyMatrix4(m);
}

export function buildScrew() {
  const root = new THREE.Group();

  /* ---- the screw itself ------------------------------------- */

  const screw = new THREE.Group();
  screw.name = 'screw';
  screw.userData.dynamic = true;

  // The mast: turned stock, stepped where it passes the bearing.
  screw.add(mesh(
    place(spar(H + 0.92, r0 * 0.9, r0 * 0.55, { swell: 0.08, segments: 16 }),
      new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, H + 0.42, 0)),
    MATERIALS.oak
  ));

  // The hub block the ribs are seated into.
  const hub = new THREE.Group();
  for (let i = 0; i <= RIBS; i++) {
    const u = i / RIBS;
    const inner = at(u, 0);
    const outer = at(u, 1);

    // A rib, deeper at the hub and thinner at the rim.
    hub.add(mesh(
      place(beam(inner.distanceTo(outer), 0.055, 0.11, { taper: 0.45 }), inner, outer),
      MATERIALS.oak
    ));

    // The peg that fixes it, standing proud of the hub.
    const pin = peg(0.014, 0.075);
    hub.add(mesh(place(pin, inner, inner.clone().lerp(outer, 0.06)), MATERIALS.iron));

    // And the lashing where it meets the rim rope.
    const along = outer.clone().sub(inner).normalize();
    hub.add(mesh(ropeLashing(outer, along, 0.05, 2.5), MATERIALS.hemp));
  }
  screw.add(hub);

  // The sail: four gores of linen, stitched along the seams the
  // folio shows, slack between the ribs.
  const grid = [];
  for (let i = 0; i <= U; i++) {
    const row = [];
    for (let j = 0; j <= V; j++) row.push(at(i / U, j / V));
    grid.push(row);
  }
  screw.add(mesh(canvasPanel(grid, { slack: 0.045 }), MATERIALS.linen, { cast: true, receive: true }));
  screw.add(mesh(seamLines(grid, [0.3, 0.62]), MATERIALS.hemp, { cast: false }));

  // The rim rope, and the hem it is sewn into.
  const rimPts = [];
  for (let i = 0; i <= 48; i++) rimPts.push(at(i / 48, 1));
  screw.add(mesh(rope(rimPts, 0.022, { segments: 160, radial: 6, lay: 40 }), MATERIALS.hemp));

  // Stays from the mast head, hanging under their own weight.
  const head = new THREE.Vector3(0, H + 0.42, 0);
  for (let i = 0; i < 8; i++) {
    const foot = at(i / 8, 1);
    screw.add(mesh(
      rope([head.clone(), head.clone().lerp(foot, 0.5), foot], 0.011, { sag: 0.04, segments: 20, radial: 5, lay: 24 }),
      MATERIALS.hemp,
      { cast: false }
    ));
  }

  root.add(screw);

  /* ---- the platform ---------------------------------------- */

  const base = new THREE.Group();
  base.name = 'base';
  base.userData.dynamic = true;

  // A plank deck: radial boards with the gaps a deck actually has.
  const BOARDS = 18;
  for (let i = 0; i < BOARDS; i++) {
    const a = (i / BOARDS) * Math.PI * 2;
    const inner = new THREE.Vector3(Math.cos(a) * bR * 0.26, 0, Math.sin(a) * bR * 0.26);
    const outer = new THREE.Vector3(Math.cos(a) * bR, 0, Math.sin(a) * bR);
    const width = (Math.PI * 2 * bR) / BOARDS * 0.82;
    const board = beam(inner.distanceTo(outer), width, 0.05, { taper: 0.28 });
    board.rotateZ(Math.PI / 2);
    base.add(mesh(place(board, inner, outer), MATERIALS.oak));
  }

  // The curb around the rim, in eight jointed segments.
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 0.94) / 8) * Math.PI * 2;
    const from = new THREE.Vector3(Math.cos(a0) * bR, 0.05, Math.sin(a0) * bR);
    const to = new THREE.Vector3(Math.cos(a1) * bR, 0.05, Math.sin(a1) * bR);
    base.add(mesh(place(beam(from.distanceTo(to), 0.07, 0.09), from, to), MATERIALS.oak));
  }

  // Four capstan bars, worn where hands went.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const from = new THREE.Vector3(0, 0.22, 0);
    const to = new THREE.Vector3(Math.cos(a) * bR * 1.25, 0.22, Math.sin(a) * bR * 1.25);
    base.add(mesh(
      place(spar(from.distanceTo(to), 0.045, 0.032, { swell: 0.05 }), from, to),
      MATERIALS.oak
    ));
  }

  // The iron collar the bars socket into.
  base.add(mesh(
    place(spar(0.3, 0.13, 0.13, { swell: 0 }), new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0, 0.38, 0)),
    MATERIALS.iron
  ));

  base.position.y = -0.5;
  root.add(base);

  root.position.y = -0.9;

  return {
    root,
    tick(t, dt, running) {
      if (!running) return;
      screw.rotation.y += dt * 1.15;
      // Nothing anchors the platform, so it turns the other way.
      base.rotation.y -= dt * 0.42;
    },
    frame: 5.2,
  };
}
```

`place()` and `mesh()` are duplicated into each of the three machine files rather than hoisted into the kit. They are five lines each, they are about assembling a machine rather than about producing stock, and a shared "helpers" module that only the three builders use would be a worse boundary than a little repetition. If a fourth machine ever appears, hoist then.

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:unit
```

Expected: PASS — thirty-three tests.

- [ ] **Step 5: Look at it**

```bash
npm run dev
```

Scroll to Chapter IV. The screw should read as linen on a timber frame, lit warm from the upper left, with the platform below it. Check the sail is not inside-out (the linen is `DoubleSide`, so it should read either way) and that the shadow falls on the deck.

- [ ] **Step 6: Commit**

```bash
git add src/js/machines/screw.js tests/unit/machines.test.js && git commit -m "feat: build the aerial screw as timber, linen and cordage"
```

## Task 10: The ornithopter, built

**Files:**
- Rewrite: `src/js/machines/ornithopter.js`
- Test: `tests/unit/machines.test.js`

**Interfaces:**
- Consumes: the same kit and materials as Task 9.
- Produces: `buildOrnithopter() -> { root, tick, frame: 5.6 }`. `root` contains three `userData.dynamic` groups, named `wingLeft`, `wingRight`, and `crank`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/machines.test.js`:

```js
import { buildOrnithopter } from '../../src/js/machines/ornithopter.js';

test('the ornithopter keeps its span and frame', () => {
  const model = buildOrnithopter();
  assert.equal(model.frame, 5.6);
  const box = new THREE.Box3().setFromObject(model.root);
  // 0.3 root offset + 2.5 span, plus a little for the spar's thickness.
  assert.ok(box.max.x >= 2.7, `right wing should reach past x=2.7, got ${box.max.x}`);
  assert.ok(box.min.x <= -2.7, `left wing should reach past x=-2.7, got ${box.min.x}`);
});

test('the ornithopter is built, not drawn', () => {
  const model = buildOrnithopter();
  assert.ok(triangleCount(model.root) > 20000, `only ${triangleCount(model.root)} triangles`);
});

test('the ornithopter has three moving assemblies', () => {
  const model = buildOrnithopter();
  const dynamic = [];
  model.root.traverse((c) => { if (c.userData.dynamic) dynamic.push(c.name); });
  assert.deepEqual(dynamic.sort(), ['crank', 'wingLeft', 'wingRight']);
});

test('the wings beat in opposition', () => {
  const model = buildOrnithopter();
  const left = findGroup(model.root, 'wingLeft');
  const right = findGroup(model.root, 'wingRight');
  // A quarter of the way through the beat: sin(t*2.1) is near its peak.
  model.tick(Math.PI / 2 / 2.1, 0.016, true);
  assert.ok(Math.abs(left.rotation.z + 0.42) < 1e-6, `left was ${left.rotation.z}`);
  assert.ok(Math.abs(right.rotation.z - 0.42) < 1e-6, `right was ${right.rotation.z}`);
});

test('the ornithopter body bobs against the beat', () => {
  const model = buildOrnithopter();
  model.tick(0, 0.016, true);
  const low = model.root.position.y;
  model.tick(Math.PI / 2.1, 0.016, true);
  assert.notEqual(model.root.position.y, low, 'the hull should rise and fall');
});

test('the ornithopter holds still when paused', () => {
  const model = buildOrnithopter();
  const left = findGroup(model.root, 'wingLeft');
  model.tick(1, 0.016, false);
  assert.equal(left.rotation.z, 0);
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test:unit
```

Expected: FAIL — six new failures. The stub still returns the old line model.

- [ ] **Step 3: Rewrite ornithopter.js**

```js
/* ============================================================
   II. the ornithopter
   A boat hull the pilot lies in, two wings of fustian stretched
   over ribs socketed into a whippy leading spar, and a crank the
   cords run down to. Proportions from the folio: hull 1.5 long
   and 0.34 in the beam, span 2.5 in six bays.
   ============================================================ */

import * as THREE from 'three';
import { beam, canvasPanel, ironStrap, rope, spar } from './kit.js';
import { MATERIALS } from './materials.js';

const L = 1.5, W = 0.34;
const SPAN = 2.5;
const N = 6;

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function place(geometry, from, to) {
  const dir = to.clone().sub(from);
  const length = dir.length();
  if (length < 1e-9) return geometry;
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    dir.clone().normalize()
  );
  return geometry.applyMatrix4(new THREE.Matrix4()
    .compose(from.clone().addScaledVector(dir, 0.5), q, new THREE.Vector3(1, 1, 1)));
}

/* The spar and trailing edge of one wing, as the folio draws them:
   the spar sweeps back and falls away toward the tip. */
function wingCurves(side) {
  const spar_ = [];
  const trail = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = side * (0.3 + t * SPAN);
    const sweep = -t * t * 0.55;
    const droop = -t * t * 0.18;
    const chord = 1.15 * (1 - t * 0.72);
    spar_.push(new THREE.Vector3(x, droop, sweep));
    trail.push(new THREE.Vector3(x, droop - 0.02, sweep + chord));
  }
  return { spar: spar_, trail };
}

function makeWing(side) {
  const wing = new THREE.Group();
  wing.name = side < 0 ? 'wingLeft' : 'wingRight';
  wing.userData.dynamic = true;

  const { spar: sparPts, trail } = wingCurves(side);

  // The leading spar: thick at the root, whippy at the tip.
  for (let i = 0; i < N; i++) {
    const t = i / N;
    wing.add(mesh(
      place(spar(sparPts[i].distanceTo(sparPts[i + 1]), 0.05 * (1 - t * 0.55), 0.05 * (1 - (t + 1 / N) * 0.55), { swell: 0.03, radial: 8 }),
        sparPts[i], sparPts[i + 1]),
      MATERIALS.oak
    ));
  }

  // Ribs socketed into it, each bound with an iron strap.
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    wing.add(mesh(
      place(beam(sparPts[i].distanceTo(trail[i]), 0.016, 0.032, { taper: 0.4 }), sparPts[i], trail[i]),
      MATERIALS.oak
    ));
    const along = trail[i].clone().sub(sparPts[i]).normalize();
    wing.add(mesh(
      ironStrap([
        sparPts[i].clone().addScaledVector(along, -0.03),
        sparPts[i].clone().addScaledVector(along, 0.05),
      ], 0.05, 0.008),
      MATERIALS.iron,
      { cast: false }
    ));
  }

  // The fustian, one panel per bay, slack between the ribs.
  for (let i = 0; i < N; i++) {
    const grid = [
      [sparPts[i].clone(), sparPts[i].clone().lerp(trail[i], 0.5), trail[i].clone()],
      [
        sparPts[i].clone().lerp(sparPts[i + 1], 0.5),
        sparPts[i].clone().lerp(sparPts[i + 1], 0.5).lerp(trail[i].clone().lerp(trail[i + 1], 0.5), 0.5),
        trail[i].clone().lerp(trail[i + 1], 0.5),
      ],
      [sparPts[i + 1].clone(), sparPts[i + 1].clone().lerp(trail[i + 1], 0.5), trail[i + 1].clone()],
    ];
    wing.add(mesh(canvasPanel(grid, { slack: 0.05 }), MATERIALS.linen));
  }

  // The cords down to the crank, hanging under their own weight.
  const crankAt = new THREE.Vector3(side * 0.12, -0.55, 0.1);
  for (const from of [sparPts[0], sparPts[2]]) {
    wing.add(mesh(
      rope([from.clone(), from.clone().lerp(crankAt, 0.5), crankAt.clone()], 0.009,
        { sag: 0.03, segments: 16, radial: 5, lay: 20 }),
      MATERIALS.hemp,
      { cast: false }
    ));
  }

  return wing;
}

export function buildOrnithopter() {
  const root = new THREE.Group();

  /* ---- the hull -------------------------------------------- */

  // A keel the length of the boat.
  root.add(mesh(
    place(beam(L * 2, 0.05, 0.07), new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L)),
    MATERIALS.oak
  ));

  // Five bent ribs, as the folio shows them.
  for (let i = -2; i <= 2; i++) {
    const z = (i / 2) * L * 0.7;
    const w = W * (1 - Math.abs(i) * 0.16);
    const path = [];
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI * (k / 16);
      path.push(new THREE.Vector3(Math.cos(a) * w, -Math.sin(a) * w * 0.55, z));
    }
    root.add(mesh(ironStrap(path, 0.045, 0.014), MATERIALS.oak));
  }

  // Gunwales, curving in toward bow and stern.
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let i = -3; i <= 3; i++) {
      const t = i / 3;
      pts.push(new THREE.Vector3(sx * W * (1 - t * t * 0.5), 0, t * L));
    }
    root.add(mesh(ironStrap(pts, 0.05, 0.022), MATERIALS.oak));
  }

  // A slatted floor the pilot lies on.
  for (let i = 0; i < 11; i++) {
    const z = -L * 0.62 + (i / 10) * L * 1.24;
    const half = W * (1 - (z / L) * (z / L) * 0.5) * 0.86;
    root.add(mesh(
      place(beam(half * 2, 0.055, 0.014), new THREE.Vector3(-half, -0.1, z), new THREE.Vector3(half, -0.1, z)),
      MATERIALS.oak
    ));
  }

  const left = makeWing(-1);
  const right = makeWing(1);
  root.add(left, right);

  /* ---- the crank ------------------------------------------- */

  const crank = new THREE.Group();
  crank.name = 'crank';
  crank.userData.dynamic = true;

  // A shaft with a throw, journals, and the pedals underfoot.
  crank.add(mesh(
    place(spar(0.5, 0.028, 0.028, { swell: 0 }), new THREE.Vector3(-0.25, 0, 0), new THREE.Vector3(0.25, 0, 0)),
    MATERIALS.iron
  ));
  for (const sx of [-1, 1]) {
    const journal = new THREE.Vector3(sx * 0.22, 0, 0);
    const throwEnd = new THREE.Vector3(sx * 0.22, 0.16, 0);
    crank.add(mesh(place(beam(0.16, 0.03, 0.045), journal, throwEnd), MATERIALS.iron));
    crank.add(mesh(
      place(spar(0.14, 0.02, 0.02, { swell: 0 }), throwEnd, throwEnd.clone().add(new THREE.Vector3(sx * 0.14, 0, 0))),
      MATERIALS.iron
    ));
    // The pedal itself.
    const pedal = throwEnd.clone().add(new THREE.Vector3(sx * 0.14, 0, 0));
    crank.add(mesh(place(beam(0.12, 0.07, 0.018), pedal, pedal.clone().add(new THREE.Vector3(0, 0, 0.12))), MATERIALS.oak));
  }
  crank.position.set(0, -0.55, 0.1);
  root.add(crank);

  root.position.y = 0.2;

  return {
    root,
    tick(t, dt, running) {
      if (!running) return;
      const beat = Math.sin(t * 2.1);
      // The tip lags the root: the wing is a flexible thing, not a plank.
      left.rotation.z = -beat * 0.42;
      right.rotation.z = beat * 0.42;
      left.rotation.y = beat * 0.05;
      right.rotation.y = -beat * 0.05;
      crank.rotation.z = t * 2.1;
      root.position.y = 0.2 + Math.sin(t * 2.1 - 0.6) * 0.06;
    },
    frame: 5.6,
  };
}
```

Two things to note. The hull ribs and gunwales use `ironStrap` with `MATERIALS.oak`, not iron — a strap is the right primitive for a bent laminated member, and the material is a separate choice from the geometry. And the wing membrane is one `canvasPanel` per bay rather than one across the whole wing, because a single panel would sag as one great sheet instead of bay by bay.

- [ ] **Step 4: Run to verify they pass**

```bash
npm run test:unit
```

Expected: PASS — thirty-nine tests.

- [ ] **Step 5: Look at it**

```bash
npm run dev
```

The wings should beat with the ribs visibly separate and the fustian undulating between them. Watch that the cords stay attached to the crank through the beat; they are built into the wing group, so they swing with it.

- [ ] **Step 6: Commit**

```bash
git add src/js/machines/ornithopter.js tests/unit/machines.test.js && git commit -m "feat: build the ornithopter as hull, ribs and fustian"
```

## Task 11: The cart, built, and the old file deleted

The last and most mechanical of the three. This task also removes `src/js/machines.js`, since the stub re-exports from Task 8 are no longer needed once all three builders are real.

**Files:**
- Rewrite: `src/js/machines/cart.js`
- Delete: `src/js/machines.js`
- Test: `tests/unit/machines.test.js`

**Interfaces:**
- Consumes: the same kit and materials, plus `solidGear` from Task 5.
- Produces: `buildCart() -> { root, tick, frame: 6.4 }`. `root` contains nine `userData.dynamic` groups: `drumLeft`, `drumRight`, `crownLarge`, `crownSmall`, `wheelLeft`, `wheelRight`, `wheelFront`, `balance`, `steering`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/machines.test.js`:

```js
import { buildCart } from '../../src/js/machines/cart.js';

test('the cart keeps its chassis proportions and frame', () => {
  const model = buildCart();
  assert.equal(model.frame, 6.4);
  const box = new THREE.Box3().setFromObject(model.root);
  // W=1.5 plus the wheels standing off at 0.12, plus tyre thickness.
  assert.ok(box.max.x >= 1.6, `should reach past x=1.6, got ${box.max.x}`);
  assert.ok(box.max.z >= 1.9, `should reach past z=1.9, got ${box.max.z}`);
});

test('the cart is built, not drawn', () => {
  const model = buildCart();
  assert.ok(triangleCount(model.root) > 20000, `only ${triangleCount(model.root)} triangles`);
});

test('the cart has nine moving assemblies', () => {
  const model = buildCart();
  const dynamic = [];
  model.root.traverse((c) => { if (c.userData.dynamic) dynamic.push(c.name); });
  assert.deepEqual(dynamic.sort(), [
    'balance', 'crownLarge', 'crownSmall', 'drumLeft', 'drumRight',
    'steering', 'wheelFront', 'wheelLeft', 'wheelRight',
  ]);
});

test('the spring drums are counter-wound', () => {
  const model = buildCart();
  const l = findGroup(model.root, 'drumLeft');
  const r = findGroup(model.root, 'drumRight');
  model.tick(0, 1, true);
  assert.ok(l.rotation.y * r.rotation.y < 0, 'the drums must wind against each other');
});

test('the crown gears turn in mesh, geared by their radii', () => {
  const model = buildCart();
  const large = findGroup(model.root, 'crownLarge');
  const small = findGroup(model.root, 'crownSmall');
  model.tick(0, 1, true);
  assert.ok(Math.abs(large.rotation.y - 0.9) < 1e-9, `large was ${large.rotation.y}`);
  assert.ok(Math.abs(small.rotation.y + 0.9 * (0.78 / 0.42)) < 1e-9, `small was ${small.rotation.y}`);
});

test('the wheels roll and the escapement rocks', () => {
  const model = buildCart();
  const wheel = findGroup(model.root, 'wheelLeft');
  const balance = findGroup(model.root, 'balance');
  model.tick(Math.PI / 2 / 7, 1, true);
  assert.ok(Math.abs(wheel.rotation.z - 1.5) < 1e-9, `wheel was ${wheel.rotation.z}`);
  assert.ok(Math.abs(balance.rotation.y - 0.7) < 1e-6, `balance was ${balance.rotation.y}`);
});

test('the cart holds still when paused', () => {
  const model = buildCart();
  const wheel = findGroup(model.root, 'wheelLeft');
  model.tick(1, 1, false);
  assert.equal(wheel.rotation.z, 0);
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test:unit
```

Expected: FAIL — seven new failures.

- [ ] **Step 3: Rewrite cart.js**

```js
/* ============================================================
   III. the self-propelled cart
   A mortised chassis carrying two counter-wound spring drums, a
   crown-gear train, an escapement to meter the release, and three
   wheels. Proportions from the folio: 1.5 in the beam, 1.9 fore
   and aft of centre.
   ============================================================ */

import * as THREE from 'three';
import { beam, ironStrap, peg, solidGear, spar } from './kit.js';
import { MATERIALS } from './materials.js';

const W = 1.5, Lz = 1.9;

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function place(geometry, from, to) {
  const dir = to.clone().sub(from);
  if (dir.length() < 1e-9) return geometry;
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    dir.clone().normalize()
  );
  return geometry.applyMatrix4(new THREE.Matrix4()
    .compose(from.clone().addScaledVector(dir, 0.5), q, new THREE.Vector3(1, 1, 1)));
}

/* A cart wheel as a wheelwright builds one: felloe segments jointed
   to each other, spokes mortised into a turned hub, an iron tyre
   shrunk on over the lot. Lies in the xy plane, turning about z. */
function wheel(r, name) {
  const g = new THREE.Group();
  g.name = name;
  g.userData.dynamic = true;

  const SPOKES = 10;
  const FELLOES = 5;
  const hubR = r * 0.16;

  // The hub, with its iron nave band.
  g.add(mesh(
    place(spar(r * 0.34, hubR, hubR * 0.86, { swell: 0.12, radial: 12 }),
      new THREE.Vector3(0, 0, -r * 0.17), new THREE.Vector3(0, 0, r * 0.17)),
    MATERIALS.oak
  ));
  const band = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    band.push(new THREE.Vector3(Math.cos(a) * hubR * 1.06, Math.sin(a) * hubR * 1.06, 0));
  }
  g.add(mesh(ironStrap(band, r * 0.07, 0.012), MATERIALS.iron, { cast: false }));

  // Felloe segments, each an arc of the rim.
  for (let i = 0; i < FELLOES; i++) {
    const a0 = (i / FELLOES) * Math.PI * 2;
    const a1 = ((i + 0.97) / FELLOES) * Math.PI * 2;
    const arc = [];
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (a1 - a0) * (k / 6);
      arc.push(new THREE.Vector3(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, 0));
    }
    g.add(mesh(ironStrap(arc, r * 0.16, r * 0.11), MATERIALS.oak));
  }

  // The iron tyre.
  const tyre = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    tyre.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  g.add(mesh(ironStrap(tyre, r * 0.13, r * 0.035), MATERIALS.iron));

  // Spokes, mortised at both ends and pegged at the hub.
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2;
    const inner = new THREE.Vector3(Math.cos(a) * hubR, Math.sin(a) * hubR, 0);
    const outer = new THREE.Vector3(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, 0);
    g.add(mesh(
      place(beam(inner.distanceTo(outer), r * 0.075, r * 0.05, { taper: 0.3 }), inner, outer),
      MATERIALS.oak
    ));
    g.add(mesh(place(peg(r * 0.018, r * 0.09), inner, inner.clone().lerp(outer, 0.1)), MATERIALS.iron, { cast: false }));
  }

  return g;
}

export function buildCart() {
  const root = new THREE.Group();
  const spin = [];

  /* ---- the chassis ----------------------------------------- */

  // Two stacked frames, through-tenoned at the corners.
  for (const y of [0, 0.34]) {
    const corners = [
      new THREE.Vector3(-W, y, -Lz), new THREE.Vector3(W, y, -Lz),
      new THREE.Vector3(W, y, Lz), new THREE.Vector3(-W, y, Lz),
    ];
    for (let i = 0; i < 4; i++) {
      const from = corners[i];
      const to = corners[(i + 1) % 4];
      root.add(mesh(place(beam(from.distanceTo(to), 0.09, 0.11), from, to), MATERIALS.oak));
    }
  }

  // Uprights, standing proud of the frames so the tenon shows.
  for (const sx of [-W, W]) {
    for (const sz of [-Lz, 0, Lz]) {
      const from = new THREE.Vector3(sx, -0.04, sz);
      const to = new THREE.Vector3(sx, 0.42, sz);
      root.add(mesh(place(beam(0.46, 0.075, 0.075), from, to), MATERIALS.oak));
      root.add(mesh(place(peg(0.014, 0.14), new THREE.Vector3(sx - 0.07, 0.34, sz), new THREE.Vector3(sx + 0.07, 0.34, sz)), MATERIALS.iron, { cast: false }));
    }
  }

  // Cross members.
  for (const z of [-1.0, 0, 1.0]) {
    root.add(mesh(
      place(beam(W * 2, 0.08, 0.06), new THREE.Vector3(-W, 0, z), new THREE.Vector3(W, 0, z)),
      MATERIALS.oak
    ));
  }

  // Iron brackets at the four bottom corners.
  for (const sx of [-W, W]) {
    for (const sz of [-Lz, Lz]) {
      root.add(mesh(ironStrap([
        new THREE.Vector3(sx - Math.sign(sx) * 0.2, 0, sz),
        new THREE.Vector3(sx, 0, sz),
        new THREE.Vector3(sx, 0, sz - Math.sign(sz) * 0.2),
      ], 0.09, 0.014), MATERIALS.iron, { cast: false }));
    }
  }

  /* ---- the spring drums ------------------------------------ */

  for (const [sx, name] of [[-0.72, 'drumLeft'], [0.72, 'drumRight']]) {
    const drum = new THREE.Group();
    drum.name = name;
    drum.userData.dynamic = true;

    // The barrel.
    drum.add(mesh(
      place(spar(0.22, 0.5, 0.5, { swell: 0.02, radial: 20 }),
        new THREE.Vector3(0, -0.11, 0), new THREE.Vector3(0, 0.11, 0)),
      MATERIALS.oak
    ));
    // The ratchet wheel on top of it.
    const ratchet = solidGear(0.52, 24, 0.045, { depth: 0.06, hub: 0.3, spokes: 6 });
    ratchet.translate(0, 0.14, 0);
    drum.add(mesh(ratchet, MATERIALS.brass));

    // The leaf spring, coiled as a strip of real thickness.
    const coil = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const a = t * Math.PI * 2 * 3.4;
      const rad = 0.1 + t * 0.34;
      coil.push(new THREE.Vector3(Math.cos(a) * rad, 0.02, Math.sin(a) * rad));
    }
    drum.add(mesh(ironStrap(coil, 0.16, 0.01), MATERIALS.iron, { cast: false }));

    drum.position.set(sx, 0.18, 0.15);
    root.add(drum);
    spin.push({ obj: drum, rate: sx > 0 ? -0.5 : 0.5 });
  }

  /* ---- the gear train -------------------------------------- */

  const crownLarge = new THREE.Group();
  crownLarge.name = 'crownLarge';
  crownLarge.userData.dynamic = true;
  crownLarge.add(mesh(solidGear(0.78, 34, 0.07, { depth: 0.1, hub: 0.16, spokes: 8 }), MATERIALS.brass));
  crownLarge.position.set(0, 0.30, -0.55);
  root.add(crownLarge);
  spin.push({ obj: crownLarge, rate: 0.9 });

  const crownSmall = new THREE.Group();
  crownSmall.name = 'crownSmall';
  crownSmall.userData.dynamic = true;
  crownSmall.add(mesh(solidGear(0.42, 18, 0.07, { depth: 0.09, hub: 0.22, spokes: 6 }), MATERIALS.brass));
  crownSmall.position.set(0, 0.30, -1.5);
  root.add(crownSmall);
  spin.push({ obj: crownSmall, rate: -0.9 * (0.78 / 0.42) });

  // The axles they run on, in iron bearing blocks.
  for (const z of [-0.55, -1.5]) {
    root.add(mesh(
      place(spar(0.34, 0.035, 0.035, { swell: 0 }), new THREE.Vector3(0, 0.14, z), new THREE.Vector3(0, 0.48, z)),
      MATERIALS.iron
    ));
    root.add(mesh(
      place(beam(0.2, 0.12, 0.1), new THREE.Vector3(-0.1, 0.14, z), new THREE.Vector3(0.1, 0.14, z)),
      MATERIALS.iron,
      { cast: false }
    ));
  }

  /* ---- the escapement -------------------------------------- */

  // The post it stands on.
  root.add(mesh(
    place(spar(0.66, 0.05, 0.04, { swell: 0.04 }), new THREE.Vector3(0, 0.34, 1.35), new THREE.Vector3(0, 1.0, 1.35)),
    MATERIALS.oak
  ));

  const balance = new THREE.Group();
  balance.name = 'balance';
  balance.userData.dynamic = true;
  // The arm, with a weight at each end.
  balance.add(mesh(
    place(beam(1.0, 0.035, 0.028), new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)),
    MATERIALS.oak
  ));
  for (const sx of [-0.46, 0.46]) {
    balance.add(mesh(
      place(spar(0.07, 0.055, 0.055, { swell: 0.2, radial: 10 }),
        new THREE.Vector3(sx, -0.035, 0), new THREE.Vector3(sx, 0.035, 0)),
      MATERIALS.iron
    ));
  }
  // The pallet that engages the wheel below.
  balance.add(mesh(
    place(beam(0.16, 0.02, 0.03), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.16, 0)),
    MATERIALS.iron
  ));
  balance.position.set(0, 1.0, 1.35);
  root.add(balance);

  /* ---- the wheels ------------------------------------------ */

  for (const [sx, name] of [[-1, 'wheelLeft'], [1, 'wheelRight']]) {
    const w = wheel(0.62, name);
    w.rotation.y = Math.PI / 2;
    w.position.set(sx * (W + 0.12), -0.28, -1.5);
    root.add(w);
    spin.push({ obj: w, rate: 1.5, axis: 'z' });
  }

  // The rear axle between them.
  root.add(mesh(
    place(spar((W + 0.12) * 2, 0.045, 0.045, { swell: 0 }),
      new THREE.Vector3(-W - 0.12, -0.28, -1.5), new THREE.Vector3(W + 0.12, -0.28, -1.5)),
    MATERIALS.iron
  ));

  const steering = new THREE.Group();
  steering.name = 'steering';
  steering.userData.dynamic = true;
  const fw = wheel(0.4, 'wheelFront');
  fw.rotation.y = Math.PI / 2;
  fw.position.y = -0.5;
  steering.add(fw);
  // The fork it hangs in, and the tiller above.
  steering.add(mesh(
    place(spar(0.84, 0.05, 0.042, { swell: 0.05 }), new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 0.34, 0)),
    MATERIALS.oak
  ));
  steering.add(mesh(
    place(spar(0.75, 0.032, 0.024, { swell: 0.04 }), new THREE.Vector3(0, 0.34, 0), new THREE.Vector3(0, 0.9, 0.5)),
    MATERIALS.oak
  ));
  steering.position.set(0, 0, 1.72);
  root.add(steering);
  spin.push({ obj: fw, rate: 2.3, axis: 'z' });

  root.position.y = 0.1;

  return {
    root,
    tick(t, dt, running) {
      if (!running) return;
      for (const s of spin) {
        if (s.axis === 'z') s.obj.rotation.z += dt * s.rate;
        else s.obj.rotation.y += dt * s.rate;
      }
      // The escapement rocks; the steering hunts a little either side.
      balance.rotation.y = Math.sin(t * 7) * 0.7;
      steering.rotation.y = Math.sin(t * 0.5) * 0.22;
    },
    frame: 6.4,
  };
}
```

Note that `wheelFront` is a `dynamic` group nested inside `steering`, which is also `dynamic`. That nesting is correct and the merge pass handles it: the front wheel rolls about its own z while the steering group it sits in swings about y.

- [ ] **Step 4: Run to verify they pass**

```bash
npm run test:unit
```

Expected: PASS — forty-six tests.

- [ ] **Step 5: Delete the old file**

The three stub re-exports from Task 8 are the only thing still importing `src/js/machines.js`, and they were overwritten in Tasks 9–11. Confirm nothing references it:

```bash
grep -rn "machines.js" src/ tests/ index.html
```

Expected: only `src/js/main.js` matching `machines/index.js`. If anything else matches, fix it before deleting.

```bash
rm src/js/machines.js
```

- [ ] **Step 6: Verify the whole page**

```bash
npm run test:unit && npm test && npm run build
```

Expected: all three PASS.

- [ ] **Step 7: Commit**

```bash
git add -A src/js tests/unit && git commit -m "feat: build the cart as a wheelwright would, and retire the line-drawing module"
```

## Task 12: Browser tests

The three tests from the spec, which need a real WebGL context. If Task 1 found no WebGL2, skip this task entirely and record why here — `tests/unit/` is then the automated safety net and Task 13 is the verification.

**Files:**
- Create: `tests/browser/machines.spec.js`

**Interfaces:**
- Consumes: `stage._machineApi` from Task 8.
- Produces: nothing further tasks depend on.

- [ ] **Step 1: Write the tests**

`tests/browser/machines.spec.js`:

```js
import { expect, test } from '@playwright/test';

/* The stage elements, in the order the chapter lays them out. */
const STAGES = '.machine-stage';

/* Bring each machine into view so its deferred mount fires, then wait
   for the api the viewer parks on the stage. */
async function mountAll(page) {
  await page.goto('/#macchine');
  const stages = page.locator(STAGES);
  await expect(stages).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await stages.nth(i).scrollIntoViewIfNeeded();
    await expect(stages.nth(i).locator('canvas')).toBeAttached();
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
```

`expect(casting).toBe(1)` rather than `toBeGreaterThan(0)`: exactly one shadow caster is the design, and a second one appearing would be a regression worth catching.

- [ ] **Step 2: Run them**

```bash
npx playwright test machines --reporter=line
```

Expected: PASS — six tests, three per project.

If the draw-call assertion fails on the cart, that is the merge pass not reaching something. Read the actual number from the failure, check it against the budget in the spec, and either fix the merge or — if the geometry genuinely needs more assemblies than planned — raise the ceiling and note the change in the spec's budget table.

- [ ] **Step 3: Run the whole suite**

```bash
npm test
```

Expected: PASS — twenty tests across both projects.

- [ ] **Step 4: Commit**

```bash
git add tests/browser/machines.spec.js && git commit -m "test: assert the machines render solid, lit geometry"
```

---

## Task 13: Copy, docs, and final verification

Everything user-facing that the rebuild makes inaccurate, in one commit, plus the by-hand check that the machines actually look the way this was all for.

**Files:**
- Modify: `src/js/machines/index.js`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-29-machine-models-design.md`

**Interfaces:**
- Consumes: everything.
- Produces: nothing.

- [ ] **Step 1: Update the aria-label**

In `src/js/machines/index.js`, change:

```js
    stage.setAttribute('aria-label', `${m.en}: a rotatable line model`);
```

to:

```js
    stage.setAttribute('aria-label', `${m.en}: a rotatable model of the machine as it would have been built`);
```

- [ ] **Step 2: Update the README**

In the chapter table, change the Chapter IV row from:

```
| **IV · Le Macchine** | Aerial screw, ornithopter, and self-propelled cart — procedural Three.js blueprints |
```

to:

```
| **IV · Le Macchine** | Aerial screw, ornithopter, and self-propelled cart — built procedurally as timber, iron and canvas |
```

Leave the sources-and-caveats paragraph exactly as it is. "Machine models are proportional readings of the drawings, not measured reconstructions" is more important now, not less: more detail is not more evidence.

- [ ] **Step 3: Look at all three machines properly**

```bash
npm run dev
```

For each machine, check:

- It reads as a built object — joints visible, pegs catching light, rope with thickness.
- The key light comes from the upper left and the shadow falls plausibly.
- Nothing is black. If a shadowed face has gone to nothing, the hemisphere fill needs raising.
- Dragging turns it smoothly; scrolling closes in without clipping through geometry.
- The run/pause button stops and starts the motion.
- Nothing is inside-out. A single dark, flat-looking panel usually means reversed winding.

Then at a narrow viewport (a phone-width window) confirm the machines still frame correctly and the frame rate holds.

- [ ] **Step 4: Record the measured numbers in the spec**

The spec says frame time and the geometry budget would be measured during implementation and recorded. Replace the estimated budget table in the spec's Budget section with the numbers the browser test actually reported, and add a line giving the frame time observed on the development machine. If any figure came out materially worse than budgeted, say so plainly rather than adjusting the target to match.

- [ ] **Step 5: Full verification**

```bash
npm run test:unit && npm test && npm run build
```

Expected: all PASS. Confirm `dist/` builds without warnings about unresolved imports — the old `machines.js` is gone, so a stale reference would surface here.

- [ ] **Step 6: Commit**

```bash
git add src/js/machines/index.js README.md docs/ && git commit -m "docs: describe the machines as built rather than drawn"
```

---

## Self-Review

**Spec coverage.** Every section of the design maps to a task: architecture → Task 8 and the File Structure table; the carpentry kit → Tasks 3, 4, 5 (all seven primitives plus `mergeByMaterial`); materials → Task 6 (all five, with linen as the one `MeshPhysicalMaterial`); lighting → Task 7 (all three lights, tone mapping and shadow settings in Task 8); the three machines → Tasks 9, 10, 11, each preserving its proportions and rates; budget → Task 11's triangle assertions and Task 12's draw-call ceiling, with the real numbers recorded in Task 13; error handling → Task 6's texture fallback and Task 8's `shadowBudget`; testing → Tasks 2 and 12, with the WebGL2 risk resolved in Task 1; accessibility → Task 13; documentation → Task 13.

**Two gaps found and closed while reviewing.** The spec's error-handling section describes the WebGL2 path as unchanged from today's behaviour, which Task 8 honours by not adding a check — worth stating explicitly so an implementer does not add a redundant guard. And the spec never said where `peg` and `ropeLashing` came from; they are additions the machines needed, so they are specified in Tasks 3 and 4 rather than appearing unannounced in Task 9.

**Type consistency.** `mergeByMaterial` is named identically in Tasks 7, 8, and the file table. `MATERIALS` is the export name throughout. `place()` and `mesh()` are defined in each of Tasks 9, 10, 11 rather than imported, which is deliberate and noted. `finish()` gains a third parameter in Task 4 and the replacement is shown in full rather than described. `mergeGeometries` likewise. The `dynamic` flag is `userData.dynamic` everywhere. Group names in the tests match the names set in the builders: `screw`/`base`, `wingLeft`/`wingRight`/`crank`, and the cart's nine.

**One thing an implementer must not skip.** Task 8 exports the three builders from the old `machines.js` and creates three stub files that re-export them. That scaffolding exists so Task 8 ends with a working page, and Tasks 9–11 overwrite the stubs. Deleting `machines.js` before Task 11 breaks the page.

