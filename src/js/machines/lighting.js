/* ============================================================
   Chapter IV — the light
   One warm key from high on the left, a cool fill from the
   parchment overhead and the umber below, and a dim rim to cut
   the silhouette out of the fog. Leonardo held that the extremes
   do not occur in nature, so nothing here goes to black.
   ============================================================ */

import * as THREE from 'three';

export function makeLightRig(frame, { shadows = true, mapSize = 1024 } = {}) {
  const rig = new THREE.Group();
  rig.name = 'lightRig';

  /* The key: ochre, high and to the left at about 35°. The only
     light that casts, because one clear shadow reads better than
     three competing ones. */
  const key = new THREE.DirectionalLight(0xffd9a0, 2.2);
  key.position.set(-frame * 0.6, frame * 0.85, frame * 0.45);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(mapSize, mapSize);
    const extent = frame * 0.75;
    key.shadow.camera.left = -extent;
    key.shadow.camera.right = extent;
    key.shadow.camera.top = extent;
    key.shadow.camera.bottom = -extent;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = frame * 3;
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 3.5;
  }
  rig.add(key);

  /* The fill: parchment above, umber below. This is what keeps a
     shadowed beam legible instead of a black shape. */
  rig.add(new THREE.HemisphereLight(0xd8c9a4, 0x2b2016, 0.55));

  /* The rim: azurite, from behind and a little below. */
  const rim = new THREE.DirectionalLight(0x8ea6b2, 0.4);
  rim.position.set(frame * 0.5, -frame * 0.2, -frame * 0.7);
  rig.add(rim);

  return rig;
}
