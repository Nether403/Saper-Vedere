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

test('a dynamic mesh survives while its static siblings collapse', () => {
  const mat = new THREE.MeshStandardMaterial();
  const group = new THREE.Group();
  const arm = boxMesh(mat, 9);
  arm.userData.dynamic = true;
  group.add(boxMesh(mat, 0), boxMesh(mat, 2), arm);
  mergeByMaterial(group);

  assert.ok(group.children.includes(arm), 'the dynamic mesh must keep its own object');
  assert.equal(arm.position.x, 9, 'and its own transform');

  const meshes = group.children.filter((c) => c.isMesh);
  assert.equal(meshes.length, 2, 'the two static siblings collapse into one, beside the dynamic mesh');

  const merged = meshes.find((m) => m !== arm);
  merged.geometry.computeBoundingBox();
  const box = merged.geometry.boundingBox;
  assert.ok(box.min.x > -0.6, `merged left edge was ${box.min.x}`);
  assert.ok(box.max.x < 2.6, `the dynamic mesh was welded in: right edge was ${box.max.x}`);
});

test('merging leaves the source geometry unmodified', () => {
  const mat = new THREE.MeshStandardMaterial();
  const group = new THREE.Group();
  // One geometry instance, also worn by a mesh well away from the origin:
  // if the merge baked the matrix in place instead of into a clone, the
  // shared vertices would move with it.
  const shared = new THREE.BoxGeometry(1, 1, 1);
  const far = new THREE.Mesh(shared, mat);
  far.position.set(20, 0, 0);
  group.add(far, boxMesh(mat, 0));

  const before = Array.from(shared.getAttribute('position').array);
  mergeByMaterial(group);
  const after = shared.getAttribute('position').array;

  assert.equal(after.length, before.length, 'the source attribute was resized');
  for (let i = 0; i < before.length; i++) {
    assert.ok(
      Math.abs(after[i] - before[i]) < 1e-6,
      `source vertex component ${i} moved from ${before[i]} to ${after[i]}`,
    );
  }
});

test('the merged mesh carries the same material instance, undisposed', () => {
  const mat = new THREE.MeshStandardMaterial();
  let disposals = 0;
  mat.addEventListener('dispose', () => { disposals += 1; });

  const group = new THREE.Group();
  group.add(boxMesh(mat, 0), boxMesh(mat, 2));
  mergeByMaterial(group);

  const merged = group.children.find((c) => c.isMesh);
  assert.strictEqual(merged.material, mat, 'bucketing by material identity requires the same instance');
  assert.equal(disposals, 0, 'shared materials must never be disposed here');
});

test('a child of a merged-away mesh stays in the group at its world placement', () => {
  const mat = new THREE.MeshStandardMaterial();
  const group = new THREE.Group();

  const beam = boxMesh(mat, 4);
  beam.rotation.z = Math.PI / 2;
  const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
  line.name = 'rigging';
  line.position.set(0, 2, 0);
  beam.add(line);

  group.add(beam, boxMesh(mat, 0));
  mergeByMaterial(group);

  assert.ok(group.getObjectByName('rigging'), 'the annotation left the scene graph with its parent');
  assert.ok(group.children.includes(line), 'it must be re-parented onto the group itself');

  group.updateMatrixWorld(true);
  const world = new THREE.Vector3().setFromMatrixPosition(line.matrixWorld);
  // beam sits at x = 4, turned a quarter turn about z, so the line's local
  // +2 on y ends up at -2 on x: world (2, 0, 0).
  assert.ok(Math.abs(world.x - 2) < 1e-6, `world x was ${world.x}`);
  assert.ok(Math.abs(world.y - 0) < 1e-6, `world y was ${world.y}`);
  assert.ok(Math.abs(world.z - 0) < 1e-6, `world z was ${world.z}`);
});
