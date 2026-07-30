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
