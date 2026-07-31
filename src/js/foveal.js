/* ============================================================
   Foveal/peripheral simulation — the shifting smile

   The eye's acuity drops sharply outside the fovea (~2 degrees).
   Given a fixation point on the painting, this module computes
   the normalised position and radius that drive a radial
   sharp-to-blurred mask. No DOM dependency — pure math.

   Landmark positions are proportional readings from the C2RMF
   high-resolution plate (7479 x 11146 px). They are estimates,
   not measurements — the same honest caveat the machine chapter
   carries for its folio proportions.
   ============================================================ */

// Normalised positions within the painting (0,0 = top-left, 1,1 = bottom-right).
// Measured from the C2RMF retouched plate.
export const EYES_POINT = { x: 0.50, y: 0.295 };
export const MOUTH_POINT = { x: 0.497, y: 0.41 };

// The foveal radius as a fraction of the image's shorter dimension.
// Roughly 2–3 degrees of visual angle at a typical viewing distance.
export const FOVEA_RADIUS = 0.09;
export const FOVEA_FEATHER = 0.14; // soft falloff outside the fovea

/**
 * Map a pointer position (in CSS px relative to the stage element)
 * to a normalised image UV, accounting for object-fit: cover.
 *
 * When the stage and image have different aspect ratios, cover crops
 * the overflow — the visible region of the image is a centered sub-rect.
 * This function returns the UV within the full image, clamped to [0,1].
 */
export function pointerToUV(px, py, stageW, stageH, imgW, imgH) {
  if (stageW <= 0 || stageH <= 0 || imgW <= 0 || imgH <= 0) {
    return { x: 0.5, y: 0.5 };
  }

  const stageAspect = stageW / stageH;
  const imgAspect = imgW / imgH;

  let visibleW, visibleH, offsetX, offsetY;

  if (imgAspect > stageAspect) {
    // Image is wider than stage: full height shown, width cropped
    visibleH = 1;
    visibleW = stageAspect / imgAspect;
    offsetX = (1 - visibleW) / 2;
    offsetY = 0;
  } else {
    // Image is taller than stage: full width shown, height cropped
    visibleW = 1;
    visibleH = imgAspect / stageAspect;
    offsetX = 0;
    offsetY = (1 - visibleH) / 2;
  }

  // Normalised position within the stage
  const sx = px / stageW;
  const sy = py / stageH;

  // Map stage position to image UV
  const u = offsetX + sx * visibleW;
  const v = offsetY + sy * visibleH;

  return {
    x: Math.max(0, Math.min(1, u)),
    y: Math.max(0, Math.min(1, v)),
  };
}

/**
 * Lerp between two points with a given factor (0–1).
 */
export function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Ease the current point toward the target, frame-rate independent.
 * Returns the new current point. `decay` is the half-life-like factor:
 * smaller = faster snap.
 */
export function easeToward(current, target, dt, decay = 0.003) {
  const k = 1 - Math.pow(decay, dt);
  return {
    x: current.x + (target.x - current.x) * k,
    y: current.y + (target.y - current.y) * k,
  };
}

/**
 * Compute the CSS mask parameters for the current attention point.
 * Returns values ready to plug into a radial-gradient mask:
 *   cx, cy: percentage positions for the gradient center
 *   radius: the sharp core size as a percentage of the shorter axis
 *   feather: the fade-out zone beyond the core
 */
export function maskParams(point) {
  return {
    cx: point.x * 100,
    cy: point.y * 100,
    radius: FOVEA_RADIUS * 100,
    feather: FOVEA_FEATHER * 100,
  };
}
