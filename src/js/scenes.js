/* ============================================================
   Chapter V — Dentro i Dipinti

   The refectory is not decorated with the Last Supper: it is
   generated from it. Every wall is a subdivided quad whose UVs
   are computed by projecting each vertex back through the very
   camera Leonardo used to set the picture out. Stand at his
   viewpoint and the reconstruction is the painting again.
   ============================================================ */

import * as THREE from 'three';
import {
  EYES_POINT, MOUTH_POINT, FOVEA_RADIUS, FOVEA_FEATHER,
  pointerToUV, easeToward, maskParams,
} from './foveal.js';

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

  const timer = new THREE.Timer();
  timer.connect(document);
  api.raf = 0;
  function loop(time) {
    api.raf = 0;
    timer.update(time);
    if (!api.visible) return;
    const dt = Math.min(timer.getDelta(), 0.05);

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
    api.raf = requestAnimationFrame(loop);
  }
  renderer.render(scene, camera);

  new IntersectionObserver(
    (e) => {
      api.visible = e[0].isIntersecting;
      if (api.visible && !api.raf) api.raf = requestAnimationFrame(loop);
    },
    { threshold: 0.02 }
  ).observe(stage);

  if (reduced) api.home();
  return api;
}

/* ============================================================
   The Mona Lisa — the shifting smile

   Sfumato blurs the corners of the mouth. Peripheral vision
   (poor acuity, what looks at the mouth when you fixate on the
   eyes) reads more of an upturn into that blur than foveal
   vision does when you look straight at it. This scene simulates
   the acuity falloff: a radial mask sharpens where you look and
   blurs everything else, so you feel the smile change as your
   attention moves across the face.

   Research: Margaret Livingstone, 'Is It Warm? Is She Smiling?',
   Science 290, 2000.
   ============================================================ */

/* Load an image and return it as a resolved HTMLImageElement. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* Bake a blurred variant of the painting on a canvas.
   This is the "peripheral" version — low spatial frequency only. */
function bakeBlurred(img, w, h, blur = 6) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

async function mountGioconda(stage, plate, reduced) {
  const img = await loadImage(plate.src);

  // Working resolution for the blurred variant — large enough to be
  // crisp on-screen, small enough that the canvas blur is fast.
  const WORK_W = 960;
  const WORK_H = Math.round(WORK_W * (plate.h / plate.w));
  const blurCanvas = bakeBlurred(img, WORK_W, WORK_H);

  // The painting is portrait; the stage is not. A frame carrying the
  // panel's own proportions sits centred inside it, so nothing is
  // cropped — and, because the frame *is* the painting, a mask
  // percentage maps straight onto a position in the picture.
  const wrapper = document.createElement('div');
  wrapper.className = 'gioconda-foveal';
  wrapper.style.cssText =
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;';

  const frame = document.createElement('div');
  frame.className = 'gioconda-frame';
  frame.style.cssText =
    `position:relative;height:100%;max-width:100%;aspect-ratio:${plate.w} / ${plate.h};`;

  const layerCss =
    'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;user-select:none;';

  const blurLayer = document.createElement('img');
  blurLayer.src = blurCanvas.toDataURL('image/jpeg', 0.88);
  blurLayer.alt = '';
  blurLayer.draggable = false;
  blurLayer.style.cssText = layerCss;

  const sharpLayer = document.createElement('img');
  sharpLayer.src = plate.src;
  if (plate.srcset) { sharpLayer.srcset = plate.srcset; sharpLayer.sizes = '(max-width: 68rem) 92vw, 52rem'; }
  sharpLayer.alt = 'Mona Lisa by Leonardo da Vinci';
  sharpLayer.draggable = false;
  sharpLayer.style.cssText = layerCss;

  frame.append(blurLayer, sharpLayer);
  wrapper.append(frame);
  stage.prepend(wrapper);

  // State
  const state = {
    target: { ...EYES_POINT },
    current: { ...EYES_POINT },
    pinned: false,       // true when a button has set the point
    drifting: false,     // true on touch devices when auto-drifting
    driftT: 0,          // 0..1 ping-pong between eyes and mouth
    driftDir: 1,        // +1 toward mouth, -1 toward eyes
  };

  /* The fovea is round, so its radius has to be one length rather than
     a pair of percentages — a percentage pair resolves against width and
     height separately and would come out an oval on a portrait panel.
     So the radii are computed in pixels off the frame's shorter side. */
  let frameW = 0;
  let frameH = 0;

  function applyMask() {
    const short = Math.min(frameW, frameH);
    if (!short) return;
    const p = maskParams(state.current);
    const core = FOVEA_RADIUS * short;
    const edge = (FOVEA_RADIUS + FOVEA_FEATHER) * short;
    const gradient =
      `radial-gradient(circle ${edge}px at ${p.cx}% ${p.cy}%, #000 ${core}px, transparent ${edge}px)`;
    sharpLayer.style.maskImage = gradient;
    sharpLayer.style.webkitMaskImage = gradient;
  }

  function measure() {
    const r = frame.getBoundingClientRect();
    if (!r.width || !r.height) return;
    frameW = r.width;
    frameH = r.height;
    applyMask();
  }
  measure();
  new ResizeObserver(measure).observe(frame);

  // Readout
  const readout = document.createElement('p');
  readout.className = 'scene-readout';
  readout.textContent = 'Look at her eyes, then her mouth';
  stage.append(readout);

  // Pointer tracking (desktop)
  const canHover = window.matchMedia('(hover: hover)').matches;

  if (canHover) {
    wrapper.style.pointerEvents = 'auto';
    wrapper.addEventListener('pointermove', (e) => {
      if (state.pinned) return;
      const r = frame.getBoundingClientRect();
      state.target = pointerToUV(
        e.clientX - r.left, e.clientY - r.top,
        r.width, r.height, plate.w, plate.h
      );
    });
    wrapper.addEventListener('pointerleave', () => {
      if (!state.pinned) state.target = { ...EYES_POINT };
    });
  } else {
    // Touch: auto-drift
    state.drifting = true;
  }

  // Animation loop
  let raf = 0;
  let lastTime = 0;
  const api = { visible: false };

  function loop(time) {
    raf = 0;
    if (!api.visible) return;
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    // Auto-drift on touch
    if (state.drifting && !state.pinned) {
      state.driftT += state.driftDir * dt * 0.18; // ~5.5s per full swing
      if (state.driftT >= 1) { state.driftT = 1; state.driftDir = -1; }
      if (state.driftT <= 0) { state.driftT = 0; state.driftDir = 1; }
      const t = 0.5 - 0.5 * Math.cos(state.driftT * Math.PI); // ease in-out
      state.target = {
        x: EYES_POINT.x + (MOUTH_POINT.x - EYES_POINT.x) * t,
        y: EYES_POINT.y + (MOUTH_POINT.y - EYES_POINT.y) * t,
      };
    }

    // Ease or snap
    if (reduced) {
      state.current = { ...state.target };
    } else {
      state.current = easeToward(state.current, state.target, dt);
    }

    applyMask();
    raf = requestAnimationFrame(loop);
  }

  new IntersectionObserver(
    (entries) => {
      api.visible = entries[0].isIntersecting;
      if (api.visible && !raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(loop);
      }
    },
    { threshold: 0.02 }
  ).observe(stage);

  // API for controls
  api.lookAt = (point) => {
    state.target = { ...point };
    state.pinned = true;
    // Unpin after the visitor moves the mouse again
    if (canHover) {
      const unlisten = () => { state.pinned = false; wrapper.removeEventListener('pointermove', unlisten); };
      wrapper.addEventListener('pointermove', unlisten);
    }
  };

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
    const credit = art.querySelector('[data-scene-credit]');
    const plate = PLATES[id === 'cenacolo' ? 'cenacolo' : 'monalisa'];
    if (!plate || !stage) continue;

    coverImg.src = plate.src;
    if (plate.srcset) { coverImg.srcset = plate.srcset; coverImg.sizes = '(max-width: 68rem) 92vw, 52rem'; }
    coverImg.alt = '';
    if (credit) {
      credit.innerHTML = `<a href="${plate.page}" target="_blank" rel="noopener noreferrer">${plate.artist || 'Creator not recorded in the image manifest'}</a> · ${plate.license}`;
    }

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
              actionControl('Her eyes', () => api.lookAt(EYES_POINT)),
              actionControl('Her mouth', () => api.lookAt(MOUTH_POINT))
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
