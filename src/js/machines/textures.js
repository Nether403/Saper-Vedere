/* ============================================================
   Chapter IV — surfaces
   Grain, tarnish and fibre, drawn onto a canvas at run time.
   Nothing is loaded: the chapter carries no binary payload of
   its own, which is the same promise the folio plates make.
   ============================================================ */

import * as THREE from 'three';

const SIZE = 512;
const cache = new Map();
let warned = false;

/* A canvas and its context, or null on a device that will not give
   us one. Every generator degrades to a flat colour in that case. */
function surface() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    return { canvas, ctx };
  } catch (err) {
    if (!warned) {
      console.warn('Machine textures unavailable; falling back to flat colour.', err);
      warned = true;
    }
    return null;
  }
}

/* Deterministic noise, so a seed always draws the same timber. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function wrap(canvas, repeat) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function cached(key, make) {
  if (cache.has(key)) return cache.get(key);
  const value = make();
  cache.set(key, value);
  return value;
}

/* Timber: long fibres pulled along one axis, with a few darker
   late-wood bands and the odd knot. */
export function grainTexture(seed = 1) {
  return cached(`grain:${seed}`, () => {
    const s = surface();
    if (!s) return null;
    const { canvas, ctx } = s;
    const rand = rng(seed * 2654435761);

    ctx.fillStyle = '#9c9c9c';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Fibres.
    for (let i = 0; i < 900; i++) {
      const y = rand() * SIZE;
      const v = 120 + rand() * 90;
      ctx.strokeStyle = `rgba(${v},${v},${v},0.5)`;
      ctx.lineWidth = 0.5 + rand() * 1.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= SIZE; x += 32) {
        ctx.lineTo(x, y + Math.sin((x / SIZE) * Math.PI * 2 + i) * 1.6);
      }
      ctx.stroke();
    }

    // Late-wood bands.
    for (let i = 0; i < 14; i++) {
      const y = rand() * SIZE;
      const h = 2 + rand() * 7;
      ctx.fillStyle = `rgba(70,70,70,${0.1 + rand() * 0.16})`;
      ctx.fillRect(0, y, SIZE, h);
    }

    // Knots.
    for (let i = 0; i < 3; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const r = 6 + rand() * 16;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(50,50,50,0.6)');
      g.addColorStop(1, 'rgba(150,150,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return wrap(canvas, [2, 1]);
  });
}

/* Iron that has been handled: blotched, uneven, never a mirror. */
export function tarnishTexture(seed = 2) {
  return cached(`tarnish:${seed}`, () => {
    const s = surface();
    if (!s) return null;
    const { canvas, ctx } = s;
    const rand = rng(seed * 40503);

    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 260; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const r = 4 + rand() * 46;
      const v = 60 + rand() * 150;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${v},${v},${v},0.4)`);
      g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return wrap(canvas, [1, 1]);
  });
}

/* Hemp: strands laid up on the diagonal. The rope primitive spirals
   its uvs, so a straight diagonal here reads as a twisted lay. */
export function fibreTexture(seed = 3) {
  return cached(`fibre:${seed}`, () => {
    const s = surface();
    if (!s) return null;
    const { canvas, ctx } = s;
    const rand = rng(seed * 22695477);

    ctx.fillStyle = '#8f8f8f';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.lineWidth = 5;
    for (let i = -SIZE; i < SIZE * 2; i += 11) {
      const v = 110 + rand() * 110;
      ctx.strokeStyle = `rgba(${v},${v},${v},0.75)`;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + SIZE, SIZE);
      ctx.stroke();
    }
    return wrap(canvas, [1, 1]);
  });
}

export function disposeTextures() {
  for (const tex of cache.values()) if (tex) tex.dispose();
  cache.clear();
}
