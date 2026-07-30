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
