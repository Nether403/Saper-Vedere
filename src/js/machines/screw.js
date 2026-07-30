/* ============================================================
   I. the aerial screw
   A linen helicoid on a turned mast, its ribs pegged into a hub
   block and lashed to the rim rope, standing on a plank platform
   the crew would push around. Proportions from the folio:
   R 2.0, mast radius 0.16, rise 2.3 over 1.05 turns.
   ============================================================ */

import * as THREE from 'three';
import {
  beam, canvasPanel, mergeGeometries, peg, rope, ropeLashing, seamLines, spar,
} from './kit.js';
import { MATERIALS } from './materials.js';

const R = 2.0;      // outer radius of the sail
const r0 = 0.16;    // radius at the mast
const H = 2.3;      // rise of one full turn
const TURNS = 1.05;
const U = 400, V = 56;
const RIBS = 16;
const bR = 1.15;    // platform radius

/* The helicoid the whole machine is cut from. */
const at = (u, v) => {
  const a = u * Math.PI * 2 * TURNS;
  const rad = r0 + v * (R - r0);
  return new THREE.Vector3(Math.cos(a) * rad, u * H, Math.sin(a) * rad);
};

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/* Aim a part that runs along local z from one point to another. */
function place(geometry, from, to) {
  const dir = to.clone().sub(from);
  const length = dir.length();
  if (length < 1e-9) return geometry;
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    dir.clone().normalize()
  );
  const m = new THREE.Matrix4()
    .compose(from.clone().addScaledVector(dir, 0.5), q, new THREE.Vector3(1, 1, 1));
  return geometry.applyMatrix4(m);
}

export function buildScrew() {
  const root = new THREE.Group();

  /* ---- the screw itself ------------------------------------- */

  const screw = new THREE.Group();
  screw.name = 'screw';
  screw.userData.dynamic = true;

  // The mast: turned stock, stepped where it passes the bearing.
  screw.add(mesh(
    place(spar(H + 0.92, r0 * 0.9, r0 * 0.55, { swell: 0.08, segments: 48, radial: 32 }),
      new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, H + 0.42, 0)),
    MATERIALS.oak
  ));

  // The hub block the ribs are seated into.
  const hub = new THREE.Group();
  for (let i = 0; i <= RIBS; i++) {
    const u = i / RIBS;
    const inner = at(u, 0);
    const outer = at(u, 1);

    // A rib, deeper at the hub and thinner at the rim.
    hub.add(mesh(
      place(beam(inner.distanceTo(outer), 0.055, 0.11, { taper: 0.45 }), inner, outer),
      MATERIALS.oak
    ));

    // The peg that fixes it, standing proud of the hub.
    const pin = peg(0.014, 0.075);
    hub.add(mesh(place(pin, inner, inner.clone().lerp(outer, 0.06)), MATERIALS.iron));

    // And the lashing where it meets the rim rope.
    const along = outer.clone().sub(inner).normalize();
    hub.add(mesh(ropeLashing(outer, along, 0.05, 2.5), MATERIALS.hemp));
  }
  screw.add(hub);

  // The sail: four gores of linen, stitched along the seams the
  // folio shows, slack between the ribs.
  const grid = [];
  for (let i = 0; i <= U; i++) {
    const row = [];
    for (let j = 0; j <= V; j++) row.push(at(i / U, j / V));
    grid.push(row);
  }
  screw.add(mesh(canvasPanel(grid, { slack: 0.045 }), MATERIALS.linen, { cast: true, receive: true }));
  screw.add(mesh(seamLines(grid, [0.3, 0.62]), MATERIALS.hemp, { cast: false }));

  // The rim rope, and the hem it is sewn into.
  const rimPts = [];
  for (let i = 0; i <= 96; i++) rimPts.push(at(i / 96, 1));
  screw.add(mesh(rope(rimPts, 0.022, { segments: 480, radial: 12, lay: 40 }), MATERIALS.hemp));

  // Stays from the mast head, hanging under their own weight.
  const head = new THREE.Vector3(0, H + 0.42, 0);
  for (let i = 0; i < 8; i++) {
    const foot = at(i / 8, 1);
    screw.add(mesh(
      rope([head.clone(), head.clone().lerp(foot, 0.5), foot], 0.011, { sag: 0.04, segments: 48, radial: 10, lay: 24 }),
      MATERIALS.hemp,
      { cast: false }
    ));
  }

  root.add(screw);

  /* ---- the platform ---------------------------------------- */

  const base = new THREE.Group();
  base.name = 'base';
  base.userData.dynamic = true;

  // A plank deck: radial boards with the gaps a deck actually has.
  const BOARDS = 18;
  for (let i = 0; i < BOARDS; i++) {
    const a = (i / BOARDS) * Math.PI * 2;
    const inner = new THREE.Vector3(Math.cos(a) * bR * 0.26, 0, Math.sin(a) * bR * 0.26);
    const outer = new THREE.Vector3(Math.cos(a) * bR, 0, Math.sin(a) * bR);
    const width = (Math.PI * 2 * bR) / BOARDS * 0.82;
    const board = beam(inner.distanceTo(outer), width, 0.05, { taper: 0.28 });
    board.rotateZ(Math.PI / 2);
    base.add(mesh(place(board, inner, outer), MATERIALS.oak));
  }

  // The curb around the rim, in eight jointed segments.
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 0.94) / 8) * Math.PI * 2;
    const from = new THREE.Vector3(Math.cos(a0) * bR, 0.05, Math.sin(a0) * bR);
    const to = new THREE.Vector3(Math.cos(a1) * bR, 0.05, Math.sin(a1) * bR);
    base.add(mesh(place(beam(from.distanceTo(to), 0.07, 0.09), from, to), MATERIALS.oak));
  }

  // Four capstan bars, worn where hands went.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const from = new THREE.Vector3(0, 0.22, 0);
    const to = new THREE.Vector3(Math.cos(a) * bR * 1.25, 0.22, Math.sin(a) * bR * 1.25);
    base.add(mesh(
      place(spar(from.distanceTo(to), 0.045, 0.032, { swell: 0.05, segments: 32, radial: 24 }), from, to),
      MATERIALS.oak
    ));
  }

  // The iron collar the bars socket into.
  base.add(mesh(
    place(spar(0.3, 0.13, 0.13, { swell: 0, segments: 24, radial: 32 }), new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0, 0.38, 0)),
    MATERIALS.iron
  ));

  base.position.y = -0.5;
  root.add(base);

  root.position.y = -0.9;

  return {
    root,
    tick(t, dt, running) {
      if (!running) return;
      screw.rotation.y += dt * 1.15;
      // Nothing anchors the platform, so it turns the other way.
      base.rotation.y -= dt * 0.42;
    },
    frame: 5.2,
  };
}
