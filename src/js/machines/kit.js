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

function finish(pos, idx, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* A local merge, so the kit does not depend on the addons build.
   Handles non-indexed inputs, and — unlike the addon version, which
   demands identical attribute sets — tolerates a mix of UV-bearing
   and UV-less geometry. If any input carries UVs the output does
   too, with (0, 0) filled in for the members that had none. */
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
    // A bare chord has no midspan node to bow, so give it one.
    const source = points.length > 2
      ? points
      : [first, first.clone().lerp(last, 0.5), last];
    control = source.map((p, i) => {
      const t = source.length === 1 ? 0 : i / (source.length - 1);
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
        // Cloth hangs: bias the normal downward so slack sags under its
        // own weight whichever way the caller wound the grid.
        if (n.y > 0) n.negate();
        const fade = Math.sin((i / (rows - 1)) * Math.PI) * Math.sin((j / (cols - 1)) * Math.PI);
        p.addScaledVector(n, slack * fade);
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

/* The surface normal at one interior grid node, from its neighbours.
   Needs a neighbour on all four sides, so a boundary node has no
   normal to give; it falls back to up, as the degenerate cross does. */
function gridNormal(grid, i, j) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  if (i < 1 || i > rows - 2 || j < 1 || j > cols - 2) {
    return new THREE.Vector3(0, 1, 0);
  }
  const along = grid[i][j + 1].clone().sub(grid[i][j - 1]);
  const across = grid[i + 1][j].clone().sub(grid[i - 1][j]);
  const n = new THREE.Vector3().crossVectors(along, across);
  if (n.lengthSq() < 1e-12) return new THREE.Vector3(0, 1, 0);
  return n.normalize();
}

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
      bar.rotateY(-a);
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
      for (const y of [-hy, hy]) {
        wpos.push(c * hubR, y, s * hubR, c * root, y, s * root);
      }
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
