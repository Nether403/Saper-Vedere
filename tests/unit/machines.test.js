import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildScrew } from '../../src/js/machines/screw.js';
import { buildOrnithopter } from '../../src/js/machines/ornithopter.js';

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
