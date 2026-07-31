/* ============================================================
   Chapter IV — the viewer
   One renderer per machine, mounted only when the machine comes
   near, drawing frames only while it is on screen.
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeLightRig } from './lighting.js';
import { mergeByMaterial } from './merge.js';
import { buildScrew } from './screw.js';
import { buildOrnithopter } from './ornithopter.js';
import { buildCart } from './cart.js';

export const BUILDERS = { vite: buildScrew, ornitottero: buildOrnithopter, carro: buildCart };

/* A 1024² depth map is modest, but not every device will give us
   one. Below that we light the machine flat rather than fail it. */
function shadowBudget(renderer) {
  const max = renderer.capabilities.maxTextureSize;
  if (max >= 2048) return 1024;
  if (max >= 1024) return 512;
  return 0;
}

export function mountViewer(stage, id, reduced) {
  const build = BUILDERS[id];
  if (!build) return null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // A still frame needs less shadow than a turning one.
  const mapSize = shadowBudget(renderer) * (reduced ? 0.5 : 1);
  const shadows = mapSize >= 512;
  renderer.shadowMap.enabled = shadows;
  if (shadows) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  stage.prepend(renderer.domElement);

  const model = build();

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x191207, 0.075 * (5.2 / model.frame));

  const camera = new THREE.PerspectiveCamera(38, 1.618, 0.1, 200);
  mergeByMaterial(model.root);
  scene.add(model.root);
  scene.add(makeLightRig(model.frame, { shadows, mapSize }));

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
  controls.update();
  renderer.render(scene, camera);

  const timer = new THREE.Timer();
  timer.connect(document);
  // renderer, scene and controls are exposed for the browser tests;
  // nothing in the page reads them.
  const api = { running: !reduced, visible: false, raf: 0, renderer, scene, controls };

  function loop(time) {
    api.raf = 0;
    timer.update(time);
    if (!api.visible) return;
    const dt = Math.min(timer.getDelta(), 0.05);
    model.tick(timer.getElapsed(), dt, api.running);
    controls.autoRotate = api.running && !reduced;
    controls.update();
    renderer.render(scene, camera);
    api.raf = requestAnimationFrame(loop);
  }

  // Schedule frames only while the machine is actually on screen.
  new IntersectionObserver(
    (entries) => {
      api.visible = entries[0].isIntersecting;
      if (api.visible && !api.raf) api.raf = requestAnimationFrame(loop);
    },
    { threshold: 0.05 }
  ).observe(stage);

  return api;
}
