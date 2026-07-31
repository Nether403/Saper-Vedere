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

/* Subdivision of one bay of fustian, across the span and along the
   chord. Pure smoothness: the membrane is the hero surface here, so it
   carries the largest share of the machine's triangles. */
const MU = 36, MV = 44;

/* Stations along the bent members of the hull. Both were drafted at 16
   and 6; they are the count of points handed to `ironStrap`, which is a
   smoothness knob, not a count of parts. */
const RIB_STATIONS = 128;
const GUNWALE_STATIONS = 96;

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

/* One bay of cloth, as a bilinear grid between the two ribs that bound
   it. At MU = 2, MV = 2 this returns exactly the three-by-three grid the
   panel was first drafted with, midpoints included; finer settings
   sample the same ruled surface more closely, so the slack field the
   panel adds keeps its amplitude and the silhouette does not move. */
function bayGrid(sparPts, trail, i) {
  const grid = [];
  for (let a = 0; a <= MU; a++) {
    const u = a / MU;
    const lead = sparPts[i].clone().lerp(sparPts[i + 1], u);
    const back = trail[i].clone().lerp(trail[i + 1], u);
    const row = [];
    for (let b = 0; b <= MV; b++) row.push(lead.clone().lerp(back, b / MV));
    grid.push(row);
  }
  return grid;
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
      place(spar(sparPts[i].distanceTo(sparPts[i + 1]), 0.05 * (1 - t * 0.55), 0.05 * (1 - (t + 1 / N) * 0.55), { swell: 0.03, segments: 16, radial: 16 }),
        sparPts[i], sparPts[i + 1]),
      MATERIALS.oak
    ));
  }

  // Ribs socketed into it, each bound with an iron strap.
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    wing.add(mesh(
      place(beam(sparPts[i].distanceTo(trail[i]), 0.016, 0.032, { taper: 0.4, segments: 12, radial: 16 }), sparPts[i], trail[i]),
      MATERIALS.oak
    ));
    const along = trail[i].clone().sub(sparPts[i]).normalize();
    const strap = [];
    for (let k = 0; k <= 5; k++) {
      strap.push(sparPts[i].clone().addScaledVector(along, -0.03 + (k / 5) * 0.08));
    }
    wing.add(mesh(
      ironStrap(strap, 0.05, 0.008),
      MATERIALS.iron,
      { cast: false }
    ));
  }

  // The fustian, one panel per bay, slack between the ribs.
  for (let i = 0; i < N; i++) {
    wing.add(mesh(canvasPanel(bayGrid(sparPts, trail, i), { slack: 0.05 }), MATERIALS.linen));
  }

  // The cords down to the crank, hanging under their own weight.
  const crankAt = new THREE.Vector3(side * 0.12, -0.55, 0.1);
  for (const from of [sparPts[0], sparPts[2]]) {
    wing.add(mesh(
      rope([from.clone(), from.clone().lerp(crankAt, 0.5), crankAt.clone()], 0.009,
        { sag: 0.03, segments: 48, radial: 10, lay: 20 }),
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
    place(beam(L * 2, 0.05, 0.07, { segments: 24, radial: 24 }), new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L)),
    MATERIALS.oak
  ));

  // Five bent ribs, as the folio shows them.
  for (let i = -2; i <= 2; i++) {
    const z = (i / 2) * L * 0.7;
    const w = W * (1 - Math.abs(i) * 0.16);
    const path = [];
    for (let k = 0; k <= RIB_STATIONS; k++) {
      const a = Math.PI * (k / RIB_STATIONS);
      path.push(new THREE.Vector3(Math.cos(a) * w, -Math.sin(a) * w * 0.55, z));
    }
    root.add(mesh(ironStrap(path, 0.045, 0.014), MATERIALS.oak));
  }

  // Gunwales, curving in toward bow and stern.
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= GUNWALE_STATIONS; i++) {
      const t = -1 + (2 * i) / GUNWALE_STATIONS;
      pts.push(new THREE.Vector3(sx * W * (1 - t * t * 0.5), 0, t * L));
    }
    root.add(mesh(ironStrap(pts, 0.05, 0.022), MATERIALS.oak));
  }

  // A slatted floor the pilot lies on.
  for (let i = 0; i < 11; i++) {
    const z = -L * 0.62 + (i / 10) * L * 1.24;
    const half = W * (1 - (z / L) * (z / L) * 0.5) * 0.86;
    root.add(mesh(
      place(beam(half * 2, 0.055, 0.014, { segments: 8, radial: 16 }), new THREE.Vector3(-half, -0.1, z), new THREE.Vector3(half, -0.1, z)),
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
    place(spar(0.5, 0.028, 0.028, { swell: 0, segments: 32, radial: 24 }), new THREE.Vector3(-0.25, 0, 0), new THREE.Vector3(0.25, 0, 0)),
    MATERIALS.iron
  ));
  for (const sx of [-1, 1]) {
    const journal = new THREE.Vector3(sx * 0.22, 0, 0);
    const throwEnd = new THREE.Vector3(sx * 0.22, 0.16, 0);
    crank.add(mesh(place(beam(0.16, 0.03, 0.045, { segments: 8, radial: 20 }), journal, throwEnd), MATERIALS.iron));
    crank.add(mesh(
      place(spar(0.14, 0.02, 0.02, { swell: 0, segments: 16, radial: 20 }), throwEnd, throwEnd.clone().add(new THREE.Vector3(sx * 0.14, 0, 0))),
      MATERIALS.iron
    ));
    // The pedal itself.
    const pedal = throwEnd.clone().add(new THREE.Vector3(sx * 0.14, 0, 0));
    crank.add(mesh(place(beam(0.12, 0.07, 0.018, { segments: 8, radial: 20 }), pedal, pedal.clone().add(new THREE.Vector3(0, 0, 0.12))), MATERIALS.oak));
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
