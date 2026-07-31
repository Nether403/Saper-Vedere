/* ============================================================
   Chapter IV — the timber, iron and cloth
   Five materials, shared by all three machines. Sharing is what
   lets a machine merge into a handful of draw calls, and what
   makes the three read as one workshop.
   ============================================================ */

import * as THREE from 'three';
import { fibreTexture, grainTexture, tarnishTexture } from './textures.js';

/* The palette, as the chapter has always carried it. Values follow
   src/css/tokens.css; the line work still uses these directly. */
export const GOLD = 0xd4b463;
export const GOLD_DIM = 0x8a6f38;
export const SANGUINE = 0xc9705a;
export const LINEN = 0xe8dcc2;

const grain = grainTexture(1);
const tarnish = tarnishTexture(2);
const fibre = fibreTexture(3);

export const MATERIALS = {
  /* Seasoned oak: the structural timber of all three machines. */
  oak: new THREE.MeshStandardMaterial({
    color: 0x9a7845,
    roughness: 0.78,
    metalness: 0.02,
    bumpMap: grain,
    bumpScale: 0.4,
    roughnessMap: grain,
  }),

  /* Wrought iron, handled and tarnished. */
  iron: new THREE.MeshStandardMaterial({
    color: 0x5a5148,
    roughness: 0.42,
    metalness: 0.75,
    roughnessMap: tarnish,
    metalnessMap: tarnish,
  }),

  /* Sailcloth. The one physical material: transmission is what makes
     it glow where the key light passes through, which is most of why
     the sail reads as cloth at all. */
  linen: new THREE.MeshPhysicalMaterial({
    color: LINEN,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    transmission: 0.35,
    thickness: 0.04,
    ior: 1.2,
  }),

  /* Hemp cordage. */
  hemp: new THREE.MeshStandardMaterial({
    color: 0xb59a6a,
    roughness: 0.95,
    metalness: 0,
    bumpMap: fibre,
    bumpScale: 0.5,
  }),

  /* Brass, for gear teeth and fittings. Takes --gold. */
  brass: new THREE.MeshStandardMaterial({
    color: 0xb08a3e,
    roughness: 0.3,
    metalness: 0.85,
    roughnessMap: tarnish,
  }),
};

export function disposeMaterials() {
  for (const m of Object.values(MATERIALS)) m.dispose();
}
