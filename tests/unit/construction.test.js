import assert from 'node:assert/strict';
import test from 'node:test';
import {
  phiGrid, phiRectangle, goldenSpiral, orthogonals, pyramid, diagonals,
} from '../../src/js/construction.js';

const PHI_INV = 1 / 1.6180339887;

function allFinite(segments) {
  for (const [[x0, y0], [x1, y1]] of segments) {
    assert.ok(Number.isFinite(x0) && Number.isFinite(y0), `start (${x0}, ${y0})`);
    assert.ok(Number.isFinite(x1) && Number.isFinite(y1), `end (${x1}, ${y1})`);
  }
}

function allInRange(segments, lo = -0.01, hi = 1.01) {
  for (const [[x0, y0], [x1, y1]] of segments) {
    assert.ok(x0 >= lo && x0 <= hi, `x0=${x0}`);
    assert.ok(y0 >= lo && y0 <= hi, `y0=${y0}`);
    assert.ok(x1 >= lo && x1 <= hi, `x1=${x1}`);
    assert.ok(y1 >= lo && y1 <= hi, `y1=${y1}`);
  }
}

/* ---- phiGrid ------------------------------------------------ */

test('phiGrid returns four lines', () => {
  const g = phiGrid();
  assert.equal(g.length, 4);
  allFinite(g);
});

test('phiGrid vertical lines sit at the golden divisions', () => {
  const g = phiGrid();
  assert.ok(Math.abs(g[0][0][0] - PHI_INV) < 1e-6, `first vertical x=${g[0][0][0]}`);
  assert.ok(Math.abs(g[1][0][0] - (1 - PHI_INV)) < 1e-6, `second vertical x=${g[1][0][0]}`);
});

test('phiGrid horizontal lines sit at the golden divisions', () => {
  const g = phiGrid();
  assert.ok(Math.abs(g[2][0][1] - PHI_INV) < 1e-6, `first horizontal y=${g[2][0][1]}`);
  assert.ok(Math.abs(g[3][0][1] - (1 - PHI_INV)) < 1e-6, `second horizontal y=${g[3][0][1]}`);
});

/* ---- phiRectangle ------------------------------------------- */

test('phiRectangle centred returns a rectangle with golden proportions', () => {
  const r = phiRectangle(0.5, 0.5, 0.9);
  assert.equal(r.length, 4);
  allFinite(r);
  allInRange(r);
  // Width and height should be in golden ratio
  const w = r[0][1][0] - r[0][0][0];
  const h = r[1][1][1] - r[1][0][1];
  const ratio = Math.max(w, h) / Math.min(w, h);
  assert.ok(Math.abs(ratio - 1.618) < 0.01, `ratio was ${ratio}`);
});

test('phiRectangle honours its anchor rather than defaulting to centre', () => {
  const offCenter = phiRectangle(0.3, 0.5, 0.8);
  allFinite(offCenter);
  allInRange(offCenter);
  // The rectangle's horizontal midpoint should be at 0.3
  const mid = (offCenter[0][0][0] + offCenter[0][1][0]) / 2;
  assert.ok(Math.abs(mid - 0.3) < 1e-6, `midpoint was ${mid}`);
});

test('phiRectangle stays within [0,1] even at extreme anchors', () => {
  for (const [cx, cy] of [[0.1, 0.1], [0.9, 0.9], [0.5, 0.05]]) {
    const r = phiRectangle(cx, cy, 0.95);
    allFinite(r);
    allInRange(r);
  }
});

/* ---- goldenSpiral ------------------------------------------- */

test('goldenSpiral returns chord segments', () => {
  const s = goldenSpiral(0.5, 0.5, 0.9, 8, 8);
  assert.ok(s.length > 0, 'should have segments');
  allFinite(s);
});

test('goldenSpiral first arc sits inside the phiRectangle', () => {
  const rect = phiRectangle(0.5, 0.5, 0.9);
  const l = rect[0][0][0];
  const t = rect[0][0][1];
  const r = rect[1][0][0];
  const b = rect[2][0][1];
  const spiral = goldenSpiral(0.5, 0.5, 0.9, 3, 8);
  for (const [[x0, y0], [x1, y1]] of spiral) {
    assert.ok(x0 >= l - 1e-6 && x0 <= r + 1e-6, `x0=${x0} outside [${l},${r}]`);
    assert.ok(y0 >= t - 1e-6 && y0 <= b + 1e-6, `y0=${y0} outside [${t},${b}]`);
    assert.ok(x1 >= l - 1e-6 && x1 <= r + 1e-6, `x1=${x1} outside [${l},${r}]`);
    assert.ok(y1 >= t - 1e-6 && y1 <= b + 1e-6, `y1=${y1} outside [${t},${b}]`);
  }
});

/* ---- orthogonals -------------------------------------------- */

test('orthogonals converge on the vanishing point', () => {
  const vp = [0.494, 0.485];
  const edges = [[0, 0], [1, 0], [0, 1], [1, 1]];
  const lines = orthogonals(vp, edges);
  assert.equal(lines.length, 4);
  for (const [start, end] of lines) {
    assert.deepEqual(end, vp, 'every line must end at the vanishing point');
  }
  allFinite(lines);
});

test('orthogonals with no edge points returns empty', () => {
  assert.deepEqual(orthogonals([0.5, 0.5], []), []);
});

/* ---- pyramid ------------------------------------------------ */

test('pyramid returns three segments forming a closed triangle', () => {
  const apex = [0.5, 0.1];
  const bl = [0.2, 0.9];
  const br = [0.8, 0.9];
  const tri = pyramid(apex, bl, br);
  assert.equal(tri.length, 3);
  // The three segments connect apex→bl, apex→br, bl→br
  assert.deepEqual(tri[0], [apex, bl]);
  assert.deepEqual(tri[1], [apex, br]);
  assert.deepEqual(tri[2], [bl, br]);
  allFinite(tri);
});

/* ---- diagonals ---------------------------------------------- */

test('diagonals returns two corner-to-corner lines', () => {
  const d = diagonals();
  assert.equal(d.length, 2);
  assert.deepEqual(d[0], [[0, 0], [1, 1]]);
  assert.deepEqual(d[1], [[1, 0], [0, 1]]);
});
