/* ============================================================
   Chapter II — geometric constructions

   Pure geometry: normalised coordinates in, arrays of line
   segments out. No canvas, no DOM. The caller draws them.

   Every function returns an array of segments, where each
   segment is [[x0, y0], [x1, y1]] in normalised [0,1] space.
   ============================================================ */

const PHI = 1.6180339887;
const PHI_INV = 1 / PHI; // ≈ 0.618

/* ---- φ grid ------------------------------------------------
   Four lines: two vertical at the φ divisions, two horizontal.
   This is the overlay everyone draws over every painting; it is
   included here so it can be placed deliberately and assessed
   honestly rather than centred on the canvas by default. */

export function phiGrid() {
  return [
    [[PHI_INV, 0], [PHI_INV, 1]],
    [[1 - PHI_INV, 0], [1 - PHI_INV, 1]],
    [[0, PHI_INV], [1, PHI_INV]],
    [[0, 1 - PHI_INV], [1, 1 - PHI_INV]],
  ];
}

/* ---- φ rectangle -------------------------------------------
   A rectangle whose sides are in golden ratio, positioned by
   its centre and fitted within the given bounds (0–1 both axes).
   Returns four segments forming the rectangle. */

export function phiRectangle(cx = 0.5, cy = 0.5, fill = 0.9) {
  // Determine the largest φ-proportioned rect that fits at
  // this centre within [0,1] × [0,1], scaled by `fill`.
  const maxW = Math.min(cx, 1 - cx) * 2;
  const maxH = Math.min(cy, 1 - cy) * 2;

  let w, h;
  if (maxH >= maxW * PHI) {
    // Width-limited (tall painting)
    w = maxW * fill;
    h = w * PHI;
  } else {
    // Height-limited
    h = maxH * fill;
    w = h / PHI;
  }

  const l = cx - w / 2;
  const r = cx + w / 2;
  const t = cy - h / 2;
  const b = cy + h / 2;

  return [
    [[l, t], [r, t]],
    [[r, t], [r, b]],
    [[r, b], [l, b]],
    [[l, b], [l, t]],
  ];
}

/* ---- golden spiral -----------------------------------------
   A quarter-circle spiral inside a φ rectangle, subdivided by
   successive golden cuts. Returns an array of arc-approximation
   segments (short chords, since canvas lineTo is all we have). */

export function goldenSpiral(cx = 0.5, cy = 0.5, fill = 0.9, steps = 10, chordsPerArc = 12) {
  const rect = phiRectangle(cx, cy, fill);
  // Derive bounds from the rectangle
  const l = rect[0][0][0];
  const t = rect[0][0][1];
  const r = rect[1][0][0];
  const b = rect[2][0][1];

  let x = l, y = t, bw = r - l, bh = b - t;
  let dir = 0;
  const segments = [];

  for (let i = 0; i < steps; i++) {
    const s = Math.min(bw, bh);
    if (s < 1e-6) break;

    let arcCx, arcCy, a0;
    const d = dir % 4;
    if (d === 0) { arcCx = x + s; arcCy = y + s; a0 = Math.PI; }
    else if (d === 1) { arcCx = x + bw - s; arcCy = y + s; a0 = -Math.PI / 2; }
    else if (d === 2) { arcCx = x + bw - s; arcCy = y + bh - s; a0 = 0; }
    else { arcCx = x + s; arcCy = y + bh - s; a0 = Math.PI / 2; }

    // Draw the quarter arc as chords
    for (let c = 0; c < chordsPerArc; c++) {
      const t0 = a0 + (c / chordsPerArc) * (Math.PI / 2);
      const t1 = a0 + ((c + 1) / chordsPerArc) * (Math.PI / 2);
      segments.push([
        [arcCx + Math.cos(t0) * s, arcCy + Math.sin(t0) * s],
        [arcCx + Math.cos(t1) * s, arcCy + Math.sin(t1) * s],
      ]);
    }

    if (bh > bw) { if (d === 0 || d === 1) y += s; bh -= s; }
    else { if (d === 0 || d === 3) x += s; bw -= s; }
    dir++;
  }

  return segments;
}

/* ---- orthogonals -------------------------------------------
   Lines from an array of edge points converging on a vanishing
   point. Used for the Last Supper and the Annunciation. */

export function orthogonals(vp, edgePoints) {
  return edgePoints.map((p) => [p, vp]);
}

/* ---- pyramid -----------------------------------------------
   A triangular armature from three normalised points (apex and
   two base corners). Returns three segments forming the triangle. */

export function pyramid(apex, baseLeft, baseRight) {
  return [
    [apex, baseLeft],
    [apex, baseRight],
    [baseLeft, baseRight],
  ];
}

/* ---- diagonals ---------------------------------------------
   Corner-to-corner diagonals of the full frame. */

export function diagonals() {
  return [
    [[0, 0], [1, 1]],
    [[1, 0], [0, 1]],
  ];
}
