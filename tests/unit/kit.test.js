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
  let minV = 1;
  let maxV = 0;
  for (let i = 0; i < uv.count; i++) {
    minV = Math.min(minV, uv.getY(i));
    maxV = Math.max(maxV, uv.getY(i));
  }
  assert.ok(Math.abs(minV) < 1e-6 && Math.abs(maxV - 1) < 1e-6, `uv v spanned ${minV}..${maxV}`);
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
      assert.ok(p.getY(i) === 0, `edge vertex moved to y=${p.getY(i)}`);
    } else {
      // Cloth hangs. A displaced interior vertex must go down, never up.
      assert.ok(p.getY(i) < 1e-6, `interior vertex rose to y=${p.getY(i)}`);
      if (p.getY(i) < -1e-6) interiorMoved = true;
    }
  }
  assert.ok(interiorMoved, 'slack should displace interior vertices downward');
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

/* ---- subdivision, and the promise that defaults never move -----
   beam, peg and solidGear grew density options so the machines can
   spend their triangle budget where it shows. Every one of them is
   opt-in: a caller that passes nothing must get byte-identical
   geometry, because the aerial screw is already built and its
   triangle count is asserted elsewhere. The frozen signatures below
   are the guard. If one of them moves, a default moved with it. */

/* A hash over the raw float bits of the positions and over the whole
   index buffer. Catches a moved vertex, a reordered vertex and a
   reordered triangle alike, which a bare count cannot. */
function signature(geometry) {
  const p = geometry.getAttribute('position').array;
  const bits = new Uint32Array(p.buffer, p.byteOffset, p.length);
  let h = 2166136261;
  for (let i = 0; i < bits.length; i++) {
    h ^= bits[i];
    h = Math.imul(h, 16777619);
  }
  const index = geometry.getIndex();
  for (let i = 0; i < index.count; i++) {
    h ^= index.getX(i) + 1;
    h = Math.imul(h, 16777619);
  }
  return {
    vertices: geometry.getAttribute('position').count,
    triangles: index.count / 3,
    checksum: h >>> 0,
  };
}

/* Triangles of zero area: invisible, but they poison normals. */
function degenerateCount(geometry) {
  const p = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  let bad = 0;
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(p, index.getX(i));
    b.fromBufferAttribute(p, index.getX(i + 1));
    c.fromBufferAttribute(p, index.getX(i + 2));
    n.crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (n.length() < 1e-12) bad++;
  }
  return bad;
}

test('beam at its defaults is byte-identical to the stock it always cut', () => {
  assert.deepEqual(signature(beam(2, 0.2, 0.3)), {
    vertices: 18, triangles: 32, checksum: 3255006845,
  });
  assert.deepEqual(signature(beam(2, 0.2, 0.2, { taper: 0.5 })), {
    vertices: 18, triangles: 32, checksum: 3109966701,
  });
  assert.deepEqual(signature(beam(1, 0.4, 0.4, { chamfer: 0.05 })), {
    vertices: 18, triangles: 32, checksum: 875493805,
  });
  // The screw's rib stock, verbatim from screw.js.
  assert.deepEqual(signature(beam(0.92, 0.055, 0.11, { taper: 0.45 })), {
    vertices: 18, triangles: 32, checksum: 3127595407,
  });
});

test('beam at its defaults puts every vertex exactly where it did', () => {
  // hw = hd = 0.2, hl = 0.5, chamfer 0.05: the octagon, both rings,
  // then the two cap centres. Round numbers, so worth spelling out.
  const g = beam(1, 0.4, 0.4, { chamfer: 0.05 });
  const section = [
    [-0.15, -0.2], [0.15, -0.2], [0.2, -0.15], [0.2, 0.15],
    [0.15, 0.2], [-0.15, 0.2], [-0.2, 0.15], [-0.2, -0.15],
  ];
  const want = [];
  for (const z of [-0.5, 0.5]) for (const [x, y] of section) want.push(x, y, z);
  want.push(0, 0, -0.5, 0, 0, 0.5);
  const p = g.getAttribute('position');
  assert.equal(p.count * 3, want.length);
  for (let i = 0; i < want.length; i++) {
    assert.ok(Math.abs(p.array[i] - want[i]) < 1e-7, `position[${i}] was ${p.array[i]}, wanted ${want[i]}`);
  }
});

test('peg at its defaults is byte-identical to the pin it always turned', () => {
  assert.deepEqual(signature(peg(0.02, 0.1)), {
    vertices: 81, triangles: 104, checksum: 1982890379,
  });
  // The screw's platform pin, verbatim from screw.js.
  assert.deepEqual(signature(peg(0.014, 0.075)), {
    vertices: 81, triangles: 104, checksum: 600230880,
  });
});

test('solidGear at its defaults is byte-identical to the wheel it always cut', () => {
  assert.deepEqual(signature(solidGear(1, 34, 0.07, { spokes: 8 })), {
    vertices: 458, triangles: 568, checksum: 2974417954,
  });
  assert.deepEqual(signature(solidGear(1, 34, 0.07)), {
    vertices: 414, triangles: 408, checksum: 1900606521,
  });
  assert.deepEqual(signature(solidGear(1, 12, 0.1, { depth: 0.15 })), {
    vertices: 238, triangles: 232, checksum: 2758120927,
  });
  assert.deepEqual(signature(solidGear(1, 12, 0.1, { spokes: 6 })), {
    vertices: 246, triangles: 328, checksum: 3911263198,
  });
  assert.deepEqual(signature(solidGear(0.6, 20, 0.05, { hub: 0.3 })), {
    vertices: 302, triangles: 296, checksum: 4249837463,
  });
});

test('beam subdivides along its length without moving its ends', () => {
  const plain = signature(beam(2, 0.2, 0.3));
  const dense = signature(beam(2, 0.2, 0.3, { segments: 8 }));
  assert.ok(dense.triangles > plain.triangles, `${dense.triangles} should exceed ${plain.triangles}`);
  const g = beam(2, 0.2, 0.3, { segments: 8 });
  const b = bounds(g);
  assert.ok(Math.abs(b.min[2] - -1) < 1e-6, `min z was ${b.min[2]}`);
  assert.ok(Math.abs(b.max[2] - 1) < 1e-6, `max z was ${b.max[2]}`);
  assert.equal(degenerateCount(g), 0, 'a subdivided beam should have no zero-area triangles');
  expectFinite(g);
});

test('beam carries its taper smoothly through the intermediate rings', () => {
  // Half-width 0.1 at the butt, half of that at the tip: the ring at
  // midspan must sit halfway between, which one length segment cannot do.
  const g = beam(2, 0.2, 0.2, { taper: 0.5, segments: 4 });
  const p = g.getAttribute('position');
  let mid = 0;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getZ(i)) < 1e-6) mid = Math.max(mid, Math.abs(p.getX(i)));
  }
  assert.ok(Math.abs(mid - 0.075) < 1e-6, `midspan half-width was ${mid}, wanted 0.075`);
});

test('beam subdivides around its girth and keeps the arrises chamfered', () => {
  const plain = signature(beam(1, 0.4, 0.4, { chamfer: 0.05 }));
  const dense = signature(beam(1, 0.4, 0.4, { chamfer: 0.05, radial: 32 }));
  assert.ok(dense.triangles > plain.triangles, `${dense.triangles} should exceed ${plain.triangles}`);
  const g = beam(1, 0.4, 0.4, { chamfer: 0.05, radial: 32 });
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const atX = Math.abs(Math.abs(p.getX(i)) - 0.2) < 1e-6;
    const atY = Math.abs(Math.abs(p.getY(i)) - 0.2) < 1e-6;
    assert.ok(!(atX && atY), 'a vertex sits on a sharp arris');
  }
  const b = bounds(g);
  assert.ok(Math.abs(b.max[0] - 0.2) < 1e-6, `max x was ${b.max[0]}`);
  assert.ok(Math.abs(b.max[1] - 0.2) < 1e-6, `max y was ${b.max[1]}`);
  assert.equal(degenerateCount(g), 0);
  expectFinite(g);
});

test('beam stays sound at the density the cart will ask for', () => {
  const g = beam(1.4, 0.09, 0.12, { taper: 0.2, segments: 10, radial: 24 });
  assert.ok(signature(g).triangles > 400, `only ${signature(g).triangles} triangles`);
  const b = bounds(g);
  assert.ok(Math.abs(b.min[2] - -0.7) < 1e-6 && Math.abs(b.max[2] - 0.7) < 1e-6);
  assert.equal(degenerateCount(g), 0);
  expectFinite(g);
});

test('peg subdivides shank and head, and the head stays proud', () => {
  const plain = signature(peg(0.02, 0.1));
  const dense = signature(peg(0.02, 0.1, { segments: 6, radial: 24, headRings: 12 }));
  assert.ok(dense.triangles > plain.triangles, `${dense.triangles} should exceed ${plain.triangles}`);
  const g = peg(0.02, 0.1, { segments: 6, radial: 24, headRings: 12 });
  const p = g.getAttribute('position');
  let head = 0;
  let shank = 0;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    if (p.getZ(i) > 0.04) head = Math.max(head, r);
    else shank = Math.max(shank, r);
  }
  assert.ok(head > shank, `head ${head} should exceed shank ${shank}`);
  // Below the joint only the shank stands, and it is still round stock
  // of the radius asked for: subdivision must not have inflated it.
  let bare = 0;
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) < 0) bare = Math.max(bare, Math.hypot(p.getX(i), p.getY(i)));
  }
  assert.ok(Math.abs(bare - 0.02) < 1e-3, `shank radius was ${bare}`);
  expectFinite(g);
});

test('peg shank and head subdivide independently', () => {
  const base = signature(peg(0.02, 0.1)).vertices;
  assert.ok(signature(peg(0.02, 0.1, { segments: 8 })).vertices > base, 'shank segments should add vertices');
  assert.ok(signature(peg(0.02, 0.1, { radial: 20 })).vertices > base, 'radial should add vertices');
  assert.ok(signature(peg(0.02, 0.1, { headRings: 14 })).vertices > base, 'headRings should add vertices');
});

test('solidGear subdivides its thickness, hub and web without touching the teeth', () => {
  const plain = signature(solidGear(1, 34, 0.07));
  const thick = signature(solidGear(1, 34, 0.07, { segments: 4 }));
  const hubbed = signature(solidGear(1, 34, 0.07, { hubSegments: 64 }));
  const webbed = signature(solidGear(1, 34, 0.07, { webSegments: 72 }));
  const ringed = signature(solidGear(1, 34, 0.07, { webRings: 5 }));
  assert.ok(thick.triangles > plain.triangles, `segments: ${thick.triangles} vs ${plain.triangles}`);
  assert.ok(hubbed.triangles > plain.triangles, `hubSegments: ${hubbed.triangles} vs ${plain.triangles}`);
  assert.ok(webbed.triangles > plain.triangles, `webSegments: ${webbed.triangles} vs ${plain.triangles}`);
  assert.ok(ringed.triangles > plain.triangles, `webRings: ${ringed.triangles} vs ${plain.triangles}`);
});

test('a dense solidGear keeps its tooth profile, its flats and its web', () => {
  const g = solidGear(1, 34, 0.07, { segments: 4, hubSegments: 64, webSegments: 72, webRings: 4 });
  const b = bounds(g);
  assert.ok(Math.abs(b.min[1] - -0.035) < 1e-6, `min y was ${b.min[1]}`);
  assert.ok(Math.abs(b.max[1] - 0.035) < 1e-6, `max y was ${b.max[1]}`);

  const p = g.getAttribute('position');
  let outer = 0;
  for (let i = 0; i < p.count; i++) outer = Math.max(outer, Math.hypot(p.getX(i), p.getZ(i)));
  assert.ok(Math.abs(outer - 1) < 1e-3, `tooth tip radius was ${outer}`);

  // Both flats still close, and still look outward.
  const root = 1 - 0.08;
  const hubR = 0.18;
  const ideal = Math.PI * (root ** 2 - hubR ** 2);
  let up = 0;
  let down = 0;
  for (const t of triangles(g)) {
    if (t.ny > 0.9) up += t.area;
    else if (t.ny < -0.9) down += t.area;
  }
  assert.ok(Math.abs(down - ideal) < ideal * 0.05, `-y web area was ${down}, wanted ~${ideal}`);
  assert.ok(Math.abs(up - ideal) < ideal * 0.05, `+y web area was ${up}, wanted ~${ideal}`);
  assert.equal(degenerateCount(g), 0);
  expectFinite(g);
});

test('a dense spoked solidGear stays the open shell it was ruled to be', () => {
  const opts = { spokes: 8, segments: 4, hubSegments: 48 };
  const spoked = solidGear(1, 34, 0.07, opts);
  const web = solidGear(1, 34, 0.07, { segments: 4, hubSegments: 48 });
  assert.ok(spoked.getIndex().count !== web.getIndex().count, 'spoked and webbed should differ');
  // No annular face closes rim to hub on a spoked wheel: the only flats
  // are the little ends of the spoke bars, far short of a full disc.
  const root = 1 - 0.08;
  const ideal = Math.PI * (root ** 2 - 0.18 ** 2);
  let flat = 0;
  for (const t of triangles(spoked)) if (Math.abs(t.ny) > 0.9) flat += t.area;
  assert.ok(flat < ideal * 0.5, `spoked wheel grew ${flat} of flat area, near the ${ideal} of a web`);
  assert.equal(degenerateCount(spoked), 0);
  expectFinite(spoked);
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
