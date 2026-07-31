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
      /* Anything hanging off a merged-away mesh — a rigging line, an
         annotation — would leave the scene graph with it, silently.
         Re-parent it onto the group first, folding the vanishing mesh's
         own transform into the child so it stays where it stood.
         mesh.matrix is current: the bake above called updateMatrix on
         exactly these meshes. */
      for (const child of [...mesh.children]) {
        child.applyMatrix4(mesh.matrix);
        group.add(child);
      }
      group.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const geometry of baked) geometry.dispose();

    group.add(merged);
  }

  return group;
}
