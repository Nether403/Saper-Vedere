import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildScrew } from '../../src/js/machines/screw.js';
import { buildOrnithopter } from '../../src/js/machines/ornithopter.js';
import { buildCart } from '../../src/js/machines/cart.js';

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
  const box = new THREE.Box3().setFromObject(model.root);
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
