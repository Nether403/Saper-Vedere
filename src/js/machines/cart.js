/* ============================================================
   III. the self-propelled cart
   A mortised chassis carrying two counter-wound spring drums, a
   crown-gear train, an escapement to meter the release, and three
   wheels. Proportions from the folio: 1.5 in the beam, 1.9 fore
   and aft of centre.
   ============================================================ */

import * as THREE from 'three';
import { beam, ironStrap, peg, solidGear, spar } from './kit.js';
import { MATERIALS } from './materials.js';

const W = 1.5, Lz = 1.9;

/* ---- tessellation -------------------------------------------
   Smoothness only. Every constant below feeds a subdivision or
   station count; none of them moves a part, changes a count of
   parts, or touches a folio reading. The wheels take the largest
   share, because they are the best single detail on the cart. */

/* One wheel. Stations along the three bent members — nave band,
   felloe arcs, tyre — and subdivision for the turned hub, the
   mortised spokes and the pins that fix them. */
const NAVE_STATIONS = 120;
const FELLOE_STATIONS = 40;
const TYRE_STATIONS = 180;
const HUB_CUT = { segments: 24, radial: 32 };
const SPOKE_CUT = { segments: 14, radial: 28 };
const SPOKE_PIN = { segments: 4, radial: 16, headRings: 8 };

/* The chassis. Long timber gets rings down its run so the light
   travels the length instead of landing in one flat band. */
const FRAME_CUT = { segments: 24, radial: 28 };
const UPRIGHT_CUT = { segments: 6, radial: 20 };
const CROSS_CUT = { segments: 16, radial: 20 };
const CHASSIS_PIN = { segments: 4, radial: 16, headRings: 8 };

/* The drums and the gear train, second call on the budget. */
const BARREL_CUT = { segments: 24, radial: 48 };
const COIL_STATIONS = 480;
const RATCHET_CUT = { segments: 4, hubSegments: 48, spokeSegments: 6, spokeRadial: 24 };
const CROWN_LARGE_CUT = { segments: 4, hubSegments: 64, spokeSegments: 10, spokeRadial: 36 };
const CROWN_SMALL_CUT = { segments: 4, hubSegments: 48, spokeSegments: 6, spokeRadial: 24 };

/* Round stock and the escapement. Thin members nobody looks along,
   so these stay modest. */
const AXLE_CUT = { segments: 8, radial: 16 };
const BLOCK_CUT = { segments: 4, radial: 16 };
const POST_CUT = { segments: 16, radial: 20 };
const ARM_CUT = { segments: 16, radial: 20 };
const WEIGHT_CUT = { segments: 12, radial: 20 };
const PALLET_CUT = { segments: 4, radial: 16 };
const STOCK_CUT = { segments: 16, radial: 20 };
const TILLER_CUT = { segments: 16, radial: 16 };

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function place(geometry, from, to) {
  const dir = to.clone().sub(from);
  if (dir.length() < 1e-9) return geometry;
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    dir.clone().normalize()
  );
  return geometry.applyMatrix4(new THREE.Matrix4()
    .compose(from.clone().addScaledVector(dir, 0.5), q, new THREE.Vector3(1, 1, 1)));
}

/* A cart wheel as a wheelwright builds one: felloe segments jointed
   to each other, spokes mortised into a turned hub, an iron tyre
   shrunk on over the lot. Lies in the xy plane, turning about z. */
function wheel(r, name) {
  const g = new THREE.Group();
  g.name = name;
  g.userData.dynamic = true;

  const SPOKES = 10;
  const FELLOES = 5;
  const hubR = r * 0.16;

  // The hub, with its iron nave band.
  g.add(mesh(
    place(spar(r * 0.34, hubR, hubR * 0.86, { swell: 0.12, ...HUB_CUT }),
      new THREE.Vector3(0, 0, -r * 0.17), new THREE.Vector3(0, 0, r * 0.17)),
    MATERIALS.oak
  ));
  const band = [];
  for (let i = 0; i <= NAVE_STATIONS; i++) {
    const a = (i / NAVE_STATIONS) * Math.PI * 2;
    band.push(new THREE.Vector3(Math.cos(a) * hubR * 1.06, Math.sin(a) * hubR * 1.06, 0));
  }
  g.add(mesh(ironStrap(band, r * 0.07, 0.012), MATERIALS.iron, { cast: false }));

  // Felloe segments, each an arc of the rim.
  for (let i = 0; i < FELLOES; i++) {
    const a0 = (i / FELLOES) * Math.PI * 2;
    const a1 = ((i + 0.97) / FELLOES) * Math.PI * 2;
    const arc = [];
    for (let k = 0; k <= FELLOE_STATIONS; k++) {
      const a = a0 + (a1 - a0) * (k / FELLOE_STATIONS);
      arc.push(new THREE.Vector3(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, 0));
    }
    g.add(mesh(ironStrap(arc, r * 0.16, r * 0.11), MATERIALS.oak));
  }

  // The iron tyre.
  const tyre = [];
  for (let i = 0; i <= TYRE_STATIONS; i++) {
    const a = (i / TYRE_STATIONS) * Math.PI * 2;
    tyre.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  g.add(mesh(ironStrap(tyre, r * 0.13, r * 0.035), MATERIALS.iron));

  // Spokes, mortised at both ends and pegged at the hub.
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2;
    const inner = new THREE.Vector3(Math.cos(a) * hubR, Math.sin(a) * hubR, 0);
    const outer = new THREE.Vector3(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, 0);
    g.add(mesh(
      place(beam(inner.distanceTo(outer), r * 0.075, r * 0.05, { taper: 0.3, ...SPOKE_CUT }), inner, outer),
      MATERIALS.oak
    ));
    g.add(mesh(place(peg(r * 0.018, r * 0.09, SPOKE_PIN), inner, inner.clone().lerp(outer, 0.1)), MATERIALS.iron, { cast: false }));
  }

  return g;
}

export function buildCart() {
  const root = new THREE.Group();
  const spin = [];

  /* ---- the chassis ----------------------------------------- */

  // Two stacked frames, through-tenoned at the corners.
  for (const y of [0, 0.34]) {
    const corners = [
      new THREE.Vector3(-W, y, -Lz), new THREE.Vector3(W, y, -Lz),
      new THREE.Vector3(W, y, Lz), new THREE.Vector3(-W, y, Lz),
    ];
    for (let i = 0; i < 4; i++) {
      const from = corners[i];
      const to = corners[(i + 1) % 4];
      root.add(mesh(place(beam(from.distanceTo(to), 0.09, 0.11, FRAME_CUT), from, to), MATERIALS.oak));
    }
  }

  // Uprights, standing proud of the frames so the tenon shows.
  for (const sx of [-W, W]) {
    for (const sz of [-Lz, 0, Lz]) {
      const from = new THREE.Vector3(sx, -0.04, sz);
      const to = new THREE.Vector3(sx, 0.42, sz);
      root.add(mesh(place(beam(0.46, 0.075, 0.075, UPRIGHT_CUT), from, to), MATERIALS.oak));
      root.add(mesh(place(peg(0.014, 0.14, CHASSIS_PIN), new THREE.Vector3(sx - 0.07, 0.34, sz), new THREE.Vector3(sx + 0.07, 0.34, sz)), MATERIALS.iron, { cast: false }));
    }
  }

  // Cross members.
  for (const z of [-1.0, 0, 1.0]) {
    root.add(mesh(
      place(beam(W * 2, 0.08, 0.06, CROSS_CUT), new THREE.Vector3(-W, 0, z), new THREE.Vector3(W, 0, z)),
      MATERIALS.oak
    ));
  }

  // Iron brackets at the four bottom corners.
  for (const sx of [-W, W]) {
    for (const sz of [-Lz, Lz]) {
      root.add(mesh(ironStrap([
        new THREE.Vector3(sx - Math.sign(sx) * 0.2, 0, sz),
        new THREE.Vector3(sx, 0, sz),
        new THREE.Vector3(sx, 0, sz - Math.sign(sz) * 0.2),
      ], 0.09, 0.014), MATERIALS.iron, { cast: false }));
    }
  }

  /* ---- the spring drums ------------------------------------ */

  for (const [sx, name] of [[-0.72, 'drumLeft'], [0.72, 'drumRight']]) {
    const drum = new THREE.Group();
    drum.name = name;
    drum.userData.dynamic = true;

    // The barrel.
    drum.add(mesh(
      place(spar(0.22, 0.5, 0.5, { swell: 0.02, ...BARREL_CUT }),
        new THREE.Vector3(0, -0.11, 0), new THREE.Vector3(0, 0.11, 0)),
      MATERIALS.oak
    ));
    // The ratchet wheel on top of it.
    const ratchet = solidGear(0.52, 24, 0.045, { depth: 0.06, hub: 0.3, spokes: 6, ...RATCHET_CUT });
    ratchet.translate(0, 0.14, 0);
    drum.add(mesh(ratchet, MATERIALS.brass));

    // The leaf spring, coiled as a strip of real thickness.
    const coil = [];
    for (let i = 0; i <= COIL_STATIONS; i++) {
      const t = i / COIL_STATIONS;
      const a = t * Math.PI * 2 * 3.4;
      const rad = 0.1 + t * 0.34;
      coil.push(new THREE.Vector3(Math.cos(a) * rad, 0.02, Math.sin(a) * rad));
    }
    drum.add(mesh(ironStrap(coil, 0.16, 0.01), MATERIALS.iron, { cast: false }));

    drum.position.set(sx, 0.18, 0.15);
    root.add(drum);
    spin.push({ obj: drum, rate: sx > 0 ? -0.5 : 0.5 });
  }

  /* ---- the gear train -------------------------------------- */

  const crownLarge = new THREE.Group();
  crownLarge.name = 'crownLarge';
  crownLarge.userData.dynamic = true;
  crownLarge.add(mesh(solidGear(0.78, 34, 0.07, { depth: 0.1, hub: 0.16, spokes: 8, ...CROWN_LARGE_CUT }), MATERIALS.brass));
  crownLarge.position.set(0, 0.30, -0.55);
  root.add(crownLarge);
  spin.push({ obj: crownLarge, rate: 0.9 });

  const crownSmall = new THREE.Group();
  crownSmall.name = 'crownSmall';
  crownSmall.userData.dynamic = true;
  crownSmall.add(mesh(solidGear(0.42, 18, 0.07, { depth: 0.09, hub: 0.22, spokes: 6, ...CROWN_SMALL_CUT }), MATERIALS.brass));
  crownSmall.position.set(0, 0.30, -1.5);
  root.add(crownSmall);
  spin.push({ obj: crownSmall, rate: -0.9 * (0.78 / 0.42) });

  // The axles they run on, in iron bearing blocks.
  for (const z of [-0.55, -1.5]) {
    root.add(mesh(
      place(spar(0.34, 0.035, 0.035, { swell: 0, ...AXLE_CUT }), new THREE.Vector3(0, 0.14, z), new THREE.Vector3(0, 0.48, z)),
      MATERIALS.iron
    ));
    root.add(mesh(
      place(beam(0.2, 0.12, 0.1, BLOCK_CUT), new THREE.Vector3(-0.1, 0.14, z), new THREE.Vector3(0.1, 0.14, z)),
      MATERIALS.iron,
      { cast: false }
    ));
  }

  /* ---- the escapement -------------------------------------- */

  // The post it stands on.
  root.add(mesh(
    place(spar(0.66, 0.05, 0.04, { swell: 0.04, ...POST_CUT }), new THREE.Vector3(0, 0.34, 1.35), new THREE.Vector3(0, 1.0, 1.35)),
    MATERIALS.oak
  ));

  const balance = new THREE.Group();
  balance.name = 'balance';
  balance.userData.dynamic = true;
  // The arm, with a weight at each end.
  balance.add(mesh(
    place(beam(1.0, 0.035, 0.028, ARM_CUT), new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)),
    MATERIALS.oak
  ));
  for (const sx of [-0.46, 0.46]) {
    balance.add(mesh(
      place(spar(0.07, 0.055, 0.055, { swell: 0.2, ...WEIGHT_CUT }),
        new THREE.Vector3(sx, -0.035, 0), new THREE.Vector3(sx, 0.035, 0)),
      MATERIALS.iron
    ));
  }
  // The pallet that engages the wheel below.
  balance.add(mesh(
    place(beam(0.16, 0.02, 0.03, PALLET_CUT), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.16, 0)),
    MATERIALS.iron
  ));
  balance.position.set(0, 1.0, 1.35);
  root.add(balance);

  /* ---- the wheels ------------------------------------------ */

  for (const [sx, name] of [[-1, 'wheelLeft'], [1, 'wheelRight']]) {
    const w = wheel(0.62, name);
    w.rotation.y = Math.PI / 2;
    w.position.set(sx * (W + 0.12), -0.28, -1.5);
    root.add(w);
    spin.push({ obj: w, rate: 1.5, axis: 'z' });
  }

  // The rear axle between them.
  root.add(mesh(
    place(spar((W + 0.12) * 2, 0.045, 0.045, { swell: 0, ...STOCK_CUT }),
      new THREE.Vector3(-W - 0.12, -0.28, -1.5), new THREE.Vector3(W + 0.12, -0.28, -1.5)),
    MATERIALS.iron
  ));

  const steering = new THREE.Group();
  steering.name = 'steering';
  steering.userData.dynamic = true;
  const fw = wheel(0.4, 'wheelFront');
  fw.rotation.y = Math.PI / 2;
  fw.position.y = -0.5;
  steering.add(fw);
  // The fork it hangs in, and the tiller above.
  steering.add(mesh(
    place(spar(0.84, 0.05, 0.042, { swell: 0.05, ...STOCK_CUT }), new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 0.34, 0)),
    MATERIALS.oak
  ));
  steering.add(mesh(
    place(spar(0.75, 0.032, 0.024, { swell: 0.04, ...TILLER_CUT }), new THREE.Vector3(0, 0.34, 0), new THREE.Vector3(0, 0.9, 0.5)),
    MATERIALS.oak
  ));
  steering.position.set(0, 0, 1.72);
  root.add(steering);
  spin.push({ obj: fw, rate: 2.3, axis: 'z' });

  root.position.y = 0.1;

  return {
    root,
    tick(t, dt, running) {
      if (!running) return;
      for (const s of spin) {
        if (s.axis === 'z') s.obj.rotation.z += dt * s.rate;
        else s.obj.rotation.y += dt * s.rate;
      }
      // The escapement rocks; the steering hunts a little either side.
      balance.rotation.y = Math.sin(t * 7) * 0.7;
      steering.rotation.y = Math.sin(t * 0.5) * 0.22;
    },
    frame: 6.4,
  };
}
