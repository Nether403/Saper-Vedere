/* ============================================================
   Chapter IV — Le Macchine Vive
   Three devices modelled procedurally as line drawings in
   three dimensions. Nothing is loaded from a model file; every
   vertex below is computed from the proportions in the folios.
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MACHINES } from './data.js';

const GOLD = 0xd4b463;
const GOLD_DIM = 0x8a6f38;
const SANGUINE = 0xc9705a;
const LINEN = 0xe8dcc2;

/* ---- drawing primitives ------------------------------------- */

const lineMat = (color = GOLD, opacity = 0.9) =>
  new THREE.LineBasicMaterial({ color, transparent: true, opacity });

function polyline(points, material) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(g, material);
}

function segments(pairs, material) {
  const g = new THREE.BufferGeometry().setFromPoints(pairs);
  return new THREE.LineSegments(g, material);
}

function circle(radius, segs, material, axis = 'y') {
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

/* A toothed wheel, drawn as a rim plus radial teeth — the crown
   gears in the cart folio are drawn exactly this way. */
function gear(radius, teeth, depth, material, axis = 'y') {
  const group = new THREE.Group();
  group.add(circle(radius, 72, material, axis));
  group.add(circle(radius - depth, 72, material, axis));
  const pairs = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const inner = radius - depth;
    if (axis === 'y') {
      pairs.push(new THREE.Vector3(c * inner, 0, s * inner), new THREE.Vector3(c * radius, 0, s * radius));
    } else {
      pairs.push(new THREE.Vector3(c * inner, s * inner, 0), new THREE.Vector3(c * radius, s * radius, 0));
    }
  }
  group.add(segments(pairs, material));
  return group;
}

/* ---- I. the aerial screw ------------------------------------ */

function buildScrew() {
  const root = new THREE.Group();
  const parts = {};

  const R = 2.0;          // outer radius of the sail
  const r0 = 0.16;        // radius at the mast
  const H = 2.3;          // rise of one full turn
  const TURNS = 1.05;
  const U = 96, V = 7;

  const screw = new THREE.Group();
  parts.screw = screw;

  const at = (u, v) => {
    const a = u * Math.PI * 2 * TURNS;
    const rad = r0 + v * (R - r0);
    return new THREE.Vector3(Math.cos(a) * rad, u * H, Math.sin(a) * rad);
  };

  // The linen itself, as a translucent helicoid.
  const pos = [];
  const idx = [];
  for (let i = 0; i <= U; i++) {
    for (let j = 0; j <= V; j++) {
      const p = at(i / U, j / V);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < U; i++) {
    for (let j = 0; j < V; j++) {
      const a = i * (V + 1) + j;
      const b = a + V + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const sail = new THREE.BufferGeometry();
  sail.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sail.setIndex(idx);
  sail.computeVertexNormals();
  screw.add(
    new THREE.Mesh(
      sail,
      new THREE.MeshBasicMaterial({
        color: LINEN, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false,
      })
    )
  );

  // Helical edges: the outer rope and two intermediate seams.
  for (const v of [1, 0.62, 0.3]) {
    const pts = [];
    for (let i = 0; i <= U; i++) pts.push(at(i / U, v));
    screw.add(polyline(pts, lineMat(v === 1 ? GOLD : GOLD_DIM, v === 1 ? 0.95 : 0.45)));
  }

  // Radial ribs from mast to rim.
  const ribs = [];
  const RIBS = 16;
  for (let i = 0; i <= RIBS; i++) {
    const u = i / RIBS;
    ribs.push(at(u, 0), at(u, 1));
  }
  screw.add(segments(ribs, lineMat(GOLD, 0.62)));

  // Stays from the mast head down to the rim.
  const stays = [];
  const head = new THREE.Vector3(0, H + 0.42, 0);
  for (let i = 0; i < 8; i++) stays.push(head.clone(), at(i / 8, 1));
  screw.add(segments(stays, lineMat(GOLD_DIM, 0.32)));

  // The mast.
  screw.add(polyline([new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, H + 0.42, 0)], lineMat(GOLD, 0.9)));

  root.add(screw);

  // The platform, and the capstan bars the crew would push.
  const base = new THREE.Group();
  parts.base = base;
  const bR = 1.15;
  base.add(circle(bR, 64, lineMat(SANGUINE, 0.7)));
  base.add(circle(bR * 0.28, 32, lineMat(SANGUINE, 0.5)));
  const spokes = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    spokes.push(
      new THREE.Vector3(Math.cos(a) * bR * 0.28, 0, Math.sin(a) * bR * 0.28),
      new THREE.Vector3(Math.cos(a) * bR, 0, Math.sin(a) * bR)
    );
  }
  base.add(segments(spokes, lineMat(SANGUINE, 0.42)));
  // capstan bars, a little above the deck
  const bars = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    bars.push(new THREE.Vector3(0, 0.22, 0), new THREE.Vector3(Math.cos(a) * bR * 1.25, 0.22, Math.sin(a) * bR * 1.25));
  }
  base.add(segments(bars, lineMat(SANGUINE, 0.55)));
  base.position.y = -0.5;
  root.add(base);

  root.position.y = -0.9;

  return {
    root,
    tick(t, dt, running) {
      if (!running) return;
      parts.screw.rotation.y += dt * 1.15;
      // Nothing anchors the platform, so it turns the other way.
      parts.base.rotation.y -= dt * 0.42;
    },
    frame: 5.2,
  };
}

/* ---- II. the ornithopter ------------------------------------ */

function buildOrnithopter() {
  const root = new THREE.Group();

  // Hull: a shallow boat frame the pilot lies in.
  const hull = new THREE.Group();
  const L = 1.5, W = 0.34;
  const rib = (z, w, y) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (i / 16);
      pts.push(new THREE.Vector3(Math.cos(a) * w, y - Math.sin(a) * w * 0.55, z));
    }
    return polyline(pts, lineMat(GOLD_DIM, 0.5));
  };
  for (let i = -2; i <= 2; i++) hull.add(rib((i / 2) * L * 0.7, W * (1 - Math.abs(i) * 0.16), 0));
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let i = -3; i <= 3; i++) {
      const t = i / 3;
      pts.push(new THREE.Vector3(sx * W * (1 - t * t * 0.5), 0, t * L));
    }
    hull.add(polyline(pts, lineMat(GOLD, 0.8)));
  }
  hull.add(polyline([new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L)], lineMat(GOLD_DIM, 0.4)));
  root.add(hull);

  // A wing: a leading spar with ribs trailing behind it, hinged at the root.
  function makeWing(side) {
    const wing = new THREE.Group();
    const SPAN = 2.5;
    const ribs = [];
    const N = 6;
    const spar = [];

    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = side * (0.3 + t * SPAN);
      const sweep = -t * t * 0.55;            // the spar sweeps back
      const droop = -t * t * 0.18;            // and falls away at the tip
      spar.push(new THREE.Vector3(x, droop, sweep));
    }
    const sparLine = polyline(spar, lineMat(GOLD, 0.95));
    wing.add(sparLine);

    // trailing edge
    const trail = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = side * (0.3 + t * SPAN);
      const chord = 1.15 * (1 - t * 0.72);
      const sweep = -t * t * 0.55;
      const droop = -t * t * 0.18;
      trail.push(new THREE.Vector3(x, droop - 0.02, sweep + chord));
    }
    wing.add(polyline(trail, lineMat(GOLD, 0.7)));

    for (let i = 0; i <= N; i++) {
      ribs.push(spar[i].clone(), trail[i].clone());
    }
    wing.add(segments(ribs, lineMat(GOLD_DIM, 0.55)));

    // The fustian membrane.
    const mpos = [];
    const midx = [];
    for (let i = 0; i <= N; i++) {
      mpos.push(spar[i].x, spar[i].y, spar[i].z);
      mpos.push(trail[i].x, trail[i].y, trail[i].z);
    }
    for (let i = 0; i < N; i++) {
      const a = i * 2;
      midx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.Float32BufferAttribute(mpos, 3));
    mg.setIndex(midx);
    mg.computeVertexNormals();
    wing.add(
      new THREE.Mesh(
        mg,
        new THREE.MeshBasicMaterial({ color: LINEN, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })
      )
    );

    // The cords running from the wing root down to the crank.
    const cords = [];
    cords.push(new THREE.Vector3(side * 0.3, 0, 0), new THREE.Vector3(side * 0.12, -0.55, 0.1));
    cords.push(spar[2].clone(), new THREE.Vector3(side * 0.12, -0.55, 0.1));
    wing.add(segments(cords, lineMat(SANGUINE, 0.5)));

    return wing;
  }

  const left = makeWing(-1);
  const right = makeWing(1);
  root.add(left, right);

  // The crank and the pilot's harness.
  const crank = new THREE.Group();
  crank.add(circle(0.22, 32, lineMat(SANGUINE, 0.6), 'z'));
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

/* ---- III. the self-propelled cart --------------------------- */

function buildCart() {
  const root = new THREE.Group();
  const spin = [];

  const W = 1.5, Lz = 1.9;

  // Chassis: two stacked rectangular frames with cross members.
  const frameMat = lineMat(GOLD, 0.9);
  for (const y of [0, 0.34]) {
    root.add(
      polyline(
        [
          new THREE.Vector3(-W, y, -Lz), new THREE.Vector3(W, y, -Lz),
          new THREE.Vector3(W, y, Lz), new THREE.Vector3(-W, y, Lz),
          new THREE.Vector3(-W, y, -Lz),
        ],
        frameMat
      )
    );
  }
  const uprights = [];
  for (const sx of [-W, W]) for (const sz of [-Lz, 0, Lz]) {
    uprights.push(new THREE.Vector3(sx, 0, sz), new THREE.Vector3(sx, 0.34, sz));
  }
  const cross = [];
  for (const z of [-1.0, 0, 1.0]) cross.push(new THREE.Vector3(-W, 0, z), new THREE.Vector3(W, 0, z));
  root.add(segments(uprights, lineMat(GOLD_DIM, 0.55)));
  root.add(segments(cross, lineMat(GOLD_DIM, 0.5)));

  // Two spring drums, lying flat, counter-wound.
  for (const sx of [-0.72, 0.72]) {
    const drum = new THREE.Group();
    drum.add(gear(0.52, 24, 0.08, lineMat(SANGUINE, 0.8)));
    // the coiled leaf spring, drawn as a spiral
    const sp = [];
    for (let i = 0; i <= 220; i++) {
      const t = i / 220;
      const a = t * Math.PI * 2 * 3.4;
      const r = 0.1 + t * 0.34;
      sp.push(new THREE.Vector3(Math.cos(a) * r, 0.01, Math.sin(a) * r));
    }
    drum.add(polyline(sp, lineMat(SANGUINE, 0.5)));
    drum.position.set(sx, 0.18, 0.15);
    root.add(drum);
    spin.push({ obj: drum, rate: sx > 0 ? -0.5 : 0.5 });
  }

  // The horizontal crown gears of the transmission.
  const g1 = gear(0.78, 34, 0.1, lineMat(GOLD, 0.85));
  g1.position.set(0, 0.30, -0.55);
  root.add(g1);
  spin.push({ obj: g1, rate: 0.9 });

  const g2 = gear(0.42, 18, 0.09, lineMat(GOLD, 0.85));
  g2.position.set(0, 0.30, -1.5);
  root.add(g2);
  spin.push({ obj: g2, rate: -0.9 * (0.78 / 0.42) });

  // The escapement: a vertical post with a swinging balance arm.
  const esc = new THREE.Group();
  esc.add(polyline([new THREE.Vector3(0, 0.34, 1.35), new THREE.Vector3(0, 1.0, 1.35)], lineMat(GOLD, 0.7)));
  const arm = polyline([new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)], lineMat(SANGUINE, 0.85));
  arm.position.set(0, 1.0, 1.35);
  esc.add(arm);
  root.add(esc);

  // Wheels: two driven at the rear, one steered at the front.
  function wheel(r) {
    const g = new THREE.Group();
    g.add(circle(r, 48, lineMat(GOLD, 0.95), 'z'));
    g.add(circle(r * 0.16, 16, lineMat(GOLD_DIM, 0.6), 'z'));
    const sp = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      sp.push(new THREE.Vector3(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16, 0), new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    g.add(segments(sp, lineMat(GOLD_DIM, 0.45)));
    return g;
  }

  for (const sx of [-1, 1]) {
    const w = wheel(0.62);
    w.rotation.y = Math.PI / 2;
    w.position.set(sx * (W + 0.12), -0.28, -1.5);
    root.add(w);
    spin.push({ obj: w, rate: 1.5, axis: 'z' });
  }

  const front = new THREE.Group();
  const fw = wheel(0.4);
  fw.rotation.y = Math.PI / 2;
  fw.position.y = -0.5;
  front.add(fw);
  front.add(polyline([new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 0.34, 0)], lineMat(GOLD, 0.7)));
  // the tiller
  front.add(polyline([new THREE.Vector3(0, 0.34, 0), new THREE.Vector3(0, 0.9, 0.5)], lineMat(SANGUINE, 0.7)));
  front.position.set(0, 0, 1.72);
  root.add(front);
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
      arm.rotation.y = Math.sin(t * 7) * 0.7;
      front.rotation.y = Math.sin(t * 0.5) * 0.22;
    },
    frame: 6.4,
  };
}

const BUILDERS = { vite: buildScrew, ornitottero: buildOrnithopter, carro: buildCart };

/* ---- the viewer --------------------------------------------- */

function mountViewer(stage, id, reduced) {
  const build = BUILDERS[id];
  if (!build) return null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x191207, 0.075);

  const camera = new THREE.PerspectiveCamera(38, 1.618, 0.1, 200);

  const model = build();
  scene.add(model.root);

  camera.position.set(model.frame * 0.72, model.frame * 0.42, model.frame * 0.78);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = model.frame * 0.55;
  controls.maxDistance = model.frame * 2.2;
  controls.maxPolarAngle = Math.PI * 0.9;
  controls.target.set(0, 0.1, 0);
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.5;

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(stage);

  const clock = new THREE.Clock();
  const api = { running: !reduced, visible: false, raf: 0 };

  function loop() {
    api.raf = requestAnimationFrame(loop);
    if (!api.visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    model.tick(clock.elapsedTime, dt, api.running);
    controls.autoRotate = api.running && !reduced;
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  // Only spend frames while the machine is actually on screen.
  new IntersectionObserver(
    (entries) => { api.visible = entries[0].isIntersecting; },
    { threshold: 0.05 }
  ).observe(stage);

  return api;
}

/* ---- chapter assembly ---------------------------------------- */

export function buildMachines({ plateImg, rise, REDUCED }) {
  const host = document.querySelector('[data-machines]');
  if (!host) return;

  for (const m of MACHINES) {
    const art = document.createElement('article');
    art.className = 'machine';

    const stage = document.createElement('div');
    stage.className = 'machine-stage';
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', `${m.en}: a rotatable line model`);

    const cap = document.createElement('p');
    cap.className = 'machine-caption';
    cap.textContent = 'Drag to turn · scroll to close in';
    stage.append(cap);

    const idle = document.createElement('div');
    idle.className = 'machine-idle';
    idle.textContent = 'Drawing…';
    stage.append(idle);

    const apparatus = document.createElement('div');
    apparatus.className = 'machine-apparatus';
    apparatus.innerHTML = `
      <h3>${m.title}</h3>
      <p class="ref">${m.en} · ${m.ref}</p>
      <p>${m.body}</p>
      <p class="verdict">${m.verdict}</p>`;

    const row = document.createElement('div');
    row.className = 'btn-row';
    row.style.marginTop = 'var(--s-4)';
    const runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.className = 'btn';
    runBtn.textContent = REDUCED ? 'Set in motion' : 'Pause';
    runBtn.setAttribute('aria-pressed', String(!REDUCED));
    row.append(runBtn);

    const spinNote = document.createElement('span');
    spinNote.className = 'plate-hint';
    spinNote.textContent = m.spin;
    row.append(spinNote);
    apparatus.append(row);

    const fig = document.createElement('figure');
    fig.className = 'machine-thumb';
    fig.append(plateImg(m.plate, { alt: `${m.en}, as drawn`, sizes: '12rem' }));
    const fc = document.createElement('figcaption');
    fc.textContent = 'The folio it was modelled from';
    fig.append(fc);
    apparatus.append(fig);

    art.append(stage, apparatus);
    host.append(art);
    rise(art);

    // Mount the scene only when this particular machine gets close.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        let api = null;
        try {
          api = mountViewer(stage, m.id, REDUCED);
        } catch (err) {
          idle.textContent = 'This model could not be drawn.';
          console.error(err);
          return;
        }
        idle.hidden = true;
        runBtn.addEventListener('click', () => {
          api.running = !api.running;
          runBtn.textContent = api.running ? 'Pause' : 'Set in motion';
          runBtn.setAttribute('aria-pressed', String(api.running));
        });
      },
      { rootMargin: '60% 0px' }
    );
    io.observe(stage);
  }
}
