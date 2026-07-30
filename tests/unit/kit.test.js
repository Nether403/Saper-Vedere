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
