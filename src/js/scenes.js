/* ============================================================
   Chapter V — Dentro i Dipinti

   The refectory is not decorated with the Last Supper: it is
   generated from it. Every wall is a subdivided quad whose UVs
   are computed by projecting each vertex back through the very
   camera Leonardo used to set the picture out. Stand at his
   viewpoint and the reconstruction is the painting again.
   ============================================================ */

import * as THREE from 'three';

/* ---- the Cenacolo's own perspective ---------------------------
   Measured off the plate. All lengths in metres; the painted
   surface is 880 x 460 cm.                                      */

const CEN = {
  W: 8.8,               // width of the painted opening
  H: 4.6,               // height of it
  vpX: 0.494,           // vanishing point, normalised across the plate
  vpY: 0.485,           // and down it — Christ's right temple
  rearScale: 0.38,      // the back wall measures 0.38 of the full width
  eye: 9.0,             // therefore the viewpoint sits 9 m out
};
CEN.ex = (CEN.vpX - 0.5) * CEN.W;          // vanishing point in world x
CEN.ey = (1 - CEN.vpY) * CEN.H;            // and in world y, from the floor
CEN.depth = CEN.eye * (1 / CEN.rearScale - 1);

/* Project a point in the reconstructed room back onto the picture
   plane, and return it as a texture coordinate. This is the inverse
   of what the painting did to the room. */
function toPlateUV(x, y, z) {
  const t = CEN.eye / (CEN.eye - z);          // z is zero or negative
  const px = CEN.ex + (x - CEN.ex) * t;
  const py = CEN.ey + (y - CEN.ey) * t;
  return [px / CEN.W + 0.5, py / CEN.H];
}

/* A quad, subdivided so that the projective UVs stay true across
   it — three.js interpolates UVs affinely, so the grid does the
   perspective correction for us. */
function projectedQuad(a, b, c, d, seg = 24, material) {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  const uv = [];
  const idx = [];

  const lerp3 = (p, q, t) => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
    p[2] + (q[2] - p[2]) * t,
  ];

  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const top = lerp3(a, b, u);
    const bot = lerp3(d, c, u);
    for (let j = 0; j <= seg; j++) {
      const v = j / seg;
      const p = lerp3(top, bot, v);
      pos.push(p[0], p[1], p[2]);
      const [tu, tv] = toPlateUV(p[0], p[1], p[2]);
      uv.push(tu, tv);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < seg; j++) {
      const k = i * (seg + 1) + j;
      const k2 = k + seg + 1;
      idx.push(k, k2, k + 1, k2, k2 + 1, k + 1);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const l = new THREE.TextureLoader();
    l.setCrossOrigin('anonymous');
    l.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.anisotropy = 8;
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

/* ============================================================
   The refectory
   ============================================================ */

async function mountCenacolo(stage, plate, reduced) {
  const tex = await loadTexture(plate.src);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0d0905, 1);
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x14100a, CEN.eye, CEN.eye + CEN.depth * 1.5);

  // Vertical field chosen so that, from the viewpoint, the frame of
  // the picture falls exactly on the frame of the painted opening.
  const fov = 2 * Math.atan(CEN.H / 2 / CEN.eye) * (180 / Math.PI);
  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 400);

  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });

  const a = CEN.W / 2;
  const H = CEN.H;
  const D = -CEN.depth;
  const room = new THREE.Group();

  // corners named as [x, y, z]
  room.add(projectedQuad([-a, H, 0], [-a, H, D], [-a, 0, D], [-a, 0, 0], 28, mat)); // left wall
  room.add(projectedQuad([a, H, D], [a, H, 0], [a, 0, 0], [a, 0, D], 28, mat));     // right wall
  room.add(projectedQuad([-a, H, 0], [a, H, 0], [a, H, D], [-a, H, D], 28, mat));   // ceiling
  room.add(projectedQuad([-a, H, D], [a, H, D], [a, 0, D], [-a, 0, D], 20, mat));   // rear wall

  // The painting tells us nothing about the floor — the table hides it.
  // Rather than smear the tablecloth across it, it is left as stone.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CEN.W, CEN.depth),
    new THREE.MeshBasicMaterial({ color: 0x2b2016 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, D / 2);
  room.add(floor);

  scene.add(room);

  /* The construction lines, drawn on demand. */
  const orthos = new THREE.Group();
  {
    const pts = [];
    const vp = new THREE.Vector3(CEN.ex, CEN.ey, D);
    const corners = [
      [-a, H, 0], [a, H, 0], [-a, 0, 0], [a, 0, 0],
      [-a, H * 0.5, 0], [a, H * 0.5, 0],
    ];
    for (const c of corners) pts.push(new THREE.Vector3(c[0], c[1], c[2]), vp.clone());
    // a few extra rays fanning out across the picture plane
    for (let i = 1; i < 8; i++) {
      pts.push(new THREE.Vector3(-a + (2 * a * i) / 8, H, 0), vp.clone());
      pts.push(new THREE.Vector3(-a + (2 * a * i) / 8, 0, 0), vp.clone());
    }
    orthos.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xc9705a, transparent: true, opacity: 0.5 })
      )
    );
    const ring = [];
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2;
      ring.push(new THREE.Vector3(CEN.ex + Math.cos(t) * 0.22, CEN.ey + Math.sin(t) * 0.22, D + 0.02));
    }
    orthos.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ring),
        new THREE.LineBasicMaterial({ color: 0xd4b463 })
      )
    );
  }
  orthos.visible = false;
  scene.add(orthos);

  /* ---- movement ------------------------------------------------ */

  const home = { x: CEN.ex, y: CEN.ey, z: CEN.eye };
  const cam = { x: home.x, y: home.y, z: home.z, yaw: 0, pitch: 0 };
  const target = { ...cam };
  const keys = new Set();

  camera.position.set(cam.x, cam.y, cam.z);

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointerup', (e) => {
    dragging = false;
    if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    target.yaw -= (e.clientX - lastX) * 0.0026;
    target.pitch -= (e.clientY - lastY) * 0.0022;
    target.pitch = Math.max(-0.6, Math.min(0.6, target.pitch));
    target.yaw = Math.max(-0.9, Math.min(0.9, target.yaw));
    lastX = e.clientX;
    lastY = e.clientY;
  });

  const onKey = (e, down) => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      if (down) keys.add(k); else keys.delete(k);
      if (document.activeElement === stage) e.preventDefault();
    }
  };
  stage.tabIndex = 0;
  stage.addEventListener('keydown', (e) => onKey(e, true));
  stage.addEventListener('keyup', (e) => onKey(e, false));
  stage.addEventListener('blur', () => keys.clear());

  const readout = document.createElement('p');
  readout.className = 'scene-readout';
  stage.append(readout);

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(stage);

  const api = {
    visible: false,
    setDepth(v) { target.z = home.z - v; },
    home() { target.x = home.x; target.y = home.y; target.z = home.z; target.yaw = 0; target.pitch = 0; },
    orthos(on) { orthos.visible = on; },
  };

  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    if (!api.visible) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);

    const speed = 6 * dt;
    if (keys.has('w') || keys.has('arrowup')) target.z -= speed;
    if (keys.has('s') || keys.has('arrowdown')) target.z += speed;
    if (keys.has('a') || keys.has('arrowleft')) target.x -= speed;
    if (keys.has('d') || keys.has('arrowright')) target.x += speed;

    target.z = Math.max(D + 1.6, Math.min(CEN.eye + 6, target.z));
    target.x = Math.max(-CEN.W / 2 + 0.6, Math.min(CEN.W / 2 - 0.6, target.x));

    // Motion carries momentum in and out — Chapter I, principle vi.
    const k = 1 - Math.pow(0.0016, dt);
    for (const p of ['x', 'y', 'z', 'yaw', 'pitch']) cam[p] += (target[p] - cam[p]) * k;

    camera.position.set(cam.x, cam.y, cam.z);
    camera.rotation.set(cam.pitch, cam.yaw, 0, 'YXZ');

    const off = Math.hypot(cam.x - home.x, cam.z - home.z) + Math.abs(cam.yaw) * 4;
    readout.textContent =
      off < 0.22
        ? 'The perspective is exact from here'
        : cam.z < 0
          ? `Inside the painted room · ${(-cam.z).toFixed(1)} m past the wall`
          : `${(cam.z - home.z).toFixed(1)} m from Leonardo’s viewpoint`;

    renderer.render(scene, camera);
  }
  loop();

  new IntersectionObserver(
    (e) => { api.visible = e[0].isIntersecting; },
    { threshold: 0.02 }
  ).observe(stage);

  if (reduced) api.home();
  return api;
}

/* ============================================================
   The Mona Lisa, pulled apart into the planes it was built from
   ============================================================ */

/* Alpha masks drawn on a canvas: soft-edged regions, because a
   hard-edged one would be a lie about how the picture is made. */
function maskTexture(draw) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 380;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff';
  draw(x, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function ellipse(x, cx, cy, rx, ry, w, h, feather = 0.45) {
  const g = x.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, Math.max(rx * w, ry * h));
  g.addColorStop(0, '#fff');
  g.addColorStop(1 - feather, '#fff');
  g.addColorStop(1, '#000');
  x.save();
  x.translate(cx * w, cy * h);
  x.scale(1, (ry * h) / (rx * w));
  x.translate(-cx * w, -cy * h);
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx * w, cy * h, rx * w, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

function bandMask(x, w, h, y0, y1, feather = 0.2) {
  const g = x.createLinearGradient(0, y0 * h, 0, y1 * h);
  g.addColorStop(0, '#000');
  g.addColorStop(feather, '#fff');
  g.addColorStop(1 - feather, '#fff');
  g.addColorStop(1, '#000');
  x.fillStyle = g;
  x.fillRect(0, y0 * h, w, (y1 - y0) * h);
}

// Back to front. The first layer is the whole panel, unmasked: it sits
// furthest away and backs every other plane, so wherever a mask feathers
// out you fall through to the painting itself rather than to a hole.
const GIOCONDA_LAYERS = [
  {
    name: 'The panel entire — sky, and the haze in it',
    depth: 4.6,
    mask: null,
  },
  {
    name: 'The far mountains',
    depth: 3.2,
    mask: (x, w, h) => {
      bandMask(x, w, h, 0.10, 0.50, 0.28);
      x.globalCompositeOperation = 'destination-out';
      ellipse(x, 0.5, 0.44, 0.30, 0.40, w, h, 0.34);
      x.globalCompositeOperation = 'source-over';
    },
  },
  {
    name: 'The road, the lake and the bridge',
    depth: 1.9,
    mask: (x, w, h) => {
      bandMask(x, w, h, 0.34, 0.64, 0.26);
      x.globalCompositeOperation = 'destination-out';
      ellipse(x, 0.5, 0.52, 0.27, 0.42, w, h, 0.34);
      x.globalCompositeOperation = 'source-over';
    },
  },
  {
    name: 'The sitter',
    depth: 0.6,
    mask: (x, w, h) => {
      ellipse(x, 0.49, 0.28, 0.20, 0.18, w, h, 0.40);
      ellipse(x, 0.50, 0.53, 0.28, 0.22, w, h, 0.42);
      ellipse(x, 0.50, 0.76, 0.41, 0.30, w, h, 0.38);
    },
  },
  {
    name: 'The parapet, and its lost columns',
    depth: 0,
    mask: (x, w, h) => { bandMask(x, w, h, 0.80, 1.04, 0.12); },
  },
];

async function mountGioconda(stage, plate, reduced) {
  const tex = await loadTexture(plate.src);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  // Transparent: the chapter's own darkness is the wall behind the panel.
  renderer.setClearColor(0x000000, 0);
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const CAM_Z = 6.2;
  const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  // Aerial perspective, done the way the atmosphere does it: the
  // further a plane sits, the more of the air's own colour it takes.
  // No grey veils floating in the scene — the haze is the medium.
  const HAZE = new THREE.Color(0x8ea6b2);
  const MAX_DEPTH = Math.max(...GIOCONDA_LAYERS.map((L) => L.depth));
  scene.fog = new THREE.Fog(HAZE, CAM_Z - 0.15, 4000);

  const ASPECT = plate.w / plate.h;
  const BASE_H = 3.5;
  const BASE_W = BASE_H * ASPECT;

  const group = new THREE.Group();
  scene.add(group);

  const layers = GIOCONDA_LAYERS.map((L, i) => {
    const m = new THREE.MeshBasicMaterial({
      map: tex,
      alphaMap: L.mask ? maskTexture(L.mask) : null,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    const geo = new THREE.PlaneGeometry(BASE_W, BASE_H, 1, 1);
    const mesh = new THREE.Mesh(geo, m);
    // Painted back to front, as he painted them.
    mesh.renderOrder = i;
    group.add(mesh);

    // A drawn edge on each pane, so that once the stack fans open you
    // can count the planes instead of guessing at them.
    const rim = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({
        color: 0xc8a24a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      })
    );
    rim.renderOrder = i + 0.5;
    mesh.add(rim);

    return { ...L, mesh, rim };
  });

  const state = { sep: reduced ? 0.5 : 0, haze: true, px: 0, py: 0 };
  const shown = { sep: 0, px: 0, py: 0 };

  function layout() {
    for (const L of layers) {
      const z = -L.depth * shown.sep;
      L.mesh.position.z = z;
      // grow with distance so the composite stays registered
      const s = (CAM_Z - z) / CAM_Z;
      L.mesh.scale.set(s, s, 1);
      L.rim.material.opacity = 0.34 * Math.max(0, shown.sep - 0.06);
      L.rim.visible = L.rim.material.opacity > 0.004;
    }
    // The air only thickens once the planes have somewhere to be. Pick
    // the far distance so the deepest plane lands on a chosen amount of
    // haze rather than whatever the arithmetic happens to give.
    const near = CAM_Z - 0.15;
    const deepest = CAM_Z + MAX_DEPTH * shown.sep;
    const strength = 0.5 * shown.sep;
    scene.fog.near = near;
    scene.fog.far = state.haze && strength > 0.01
      ? near + (deepest - near) / strength
      : 4000;
  }

  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    state.px = ((e.clientX - r.left) / r.width - 0.5) * 2;
    state.py = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  stage.addEventListener('pointerleave', () => { state.px = 0; state.py = 0; });

  const readout = document.createElement('p');
  readout.className = 'scene-readout';
  readout.textContent = 'Separate the planes, then move across the picture';
  stage.append(readout);

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(stage);

  const api = {
    visible: false,
    setSeparation(v) { state.sep = v; },
    setHaze(on) { state.haze = on; },
  };

  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    if (!api.visible) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 1 - Math.pow(0.002, dt);

    shown.sep += (state.sep - shown.sep) * k;
    shown.px += (state.px - shown.px) * k;
    shown.py += (state.py - shown.py) * k;

    layout();

    // Move the eye, not the picture. Head-on, a scale-corrected stack
    // looks exactly like the flat panel — which is the point at zero.
    // As the planes part, the eye swings round to see them edge-on.
    const pivotZ = -MAX_DEPTH * shown.sep * 0.5;
    const radius = CAM_Z + MAX_DEPTH * shown.sep;
    const yaw = shown.sep * 0.40 + shown.px * 0.17;
    const pitch = shown.sep * 0.06 - shown.py * 0.11;
    const cp = Math.cos(pitch);
    camera.position.set(
      Math.sin(yaw) * cp * radius,
      Math.sin(pitch) * radius,
      pivotZ + Math.cos(yaw) * cp * radius
    );
    camera.lookAt(0, 0, pivotZ);

    const pct = Math.round(shown.sep * 100);
    readout.textContent =
      pct < 4 ? 'A flat panel, 77 by 53 centimetres'
        : `Depth separated · ${pct}% — the haze between the planes is the sfumato`;

    renderer.render(scene, camera);
  }
  loop();

  new IntersectionObserver(
    (e) => { api.visible = e[0].isIntersecting; },
    { threshold: 0.02 }
  ).observe(stage);

  layout();
  return api;
}

/* ============================================================
   Chapter assembly
   ============================================================ */

export function buildScenes({ PLATES, REDUCED }) {
  for (const art of document.querySelectorAll('[data-scene]')) {
    const id = art.dataset.scene;
    const stage = art.querySelector('[data-scene-stage]');
    const cover = art.querySelector('[data-scene-cover]');
    const coverImg = art.querySelector('[data-scene-cover-img]');
    const enter = art.querySelector('[data-scene-enter]');
    const controls = art.querySelector('[data-scene-controls]');
    const plate = PLATES[id === 'cenacolo' ? 'cenacolo' : 'monalisa'];
    if (!plate || !stage) continue;

    coverImg.src = plate.src;
    if (plate.srcset) { coverImg.srcset = plate.srcset; coverImg.sizes = '(max-width: 68rem) 92vw, 52rem'; }
    coverImg.alt = '';

    enter.addEventListener(
      'click',
      async () => {
        enter.disabled = true;
        enter.querySelector('.enter-btn-label').textContent = 'Opening…';

        try {
          if (id === 'cenacolo') {
            const api = await mountCenacolo(stage, plate, REDUCED);
            controls.hidden = false;
            controls.append(
              rangeControl('Walk in', 0, CEN.eye + CEN.depth - 2.2, 0, 0.1, (v) => api.setDepth(v)),
              toggleControl('Orthogonals', false, (on) => api.orthos(on)),
              actionControl('Leonardo’s viewpoint', () => api.home())
            );
          } else {
            const api = await mountGioconda(stage, plate, REDUCED);
            controls.hidden = false;
            controls.append(
              rangeControl('Separation', 0, 1, REDUCED ? 0.5 : 0, 0.01, (v) => api.setSeparation(v)),
              toggleControl('Sfumato', true, (on) => api.setHaze(on))
            );
          }
          cover.classList.add('is-gone');
        } catch (err) {
          console.error(err);
          enter.disabled = false;
          enter.querySelector('.enter-btn-label').textContent = 'This scene would not open';
          enter.querySelector('.enter-btn-sub').textContent =
            'The plate could not be fetched for use as a texture';
        }
      },
      { once: false }
    );
  }
}

/* ---- small controls ------------------------------------------ */

function rangeControl(label, min, max, value, step, onInput) {
  const wrap = document.createElement('label');
  wrap.className = 'scene-range';
  wrap.innerHTML = `<span>${label}</span>`;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('input', () => onInput(parseFloat(input.value)));
  wrap.append(input);
  return wrap;
}

function toggleControl(label, on, onChange) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = label;
  b.setAttribute('aria-pressed', String(on));
  let cur = on;
  b.addEventListener('click', () => {
    cur = !cur;
    b.setAttribute('aria-pressed', String(cur));
    onChange(cur);
  });
  return b;
}

function actionControl(label, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = label;
  b.addEventListener('click', fn);
  return b;
}
