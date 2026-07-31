import assert from 'node:assert/strict';
import test from 'node:test';
import { WORKS } from '../../src/js/data.js';

test('every work has at least four hotspots', () => {
  for (const w of WORKS) {
    assert.ok(
      Array.isArray(w.hotspots) && w.hotspots.length >= 4,
      `${w.id} has only ${w.hotspots?.length ?? 0} hotspots`
    );
  }
});

test('every hotspot has the required fields', () => {
  for (const w of WORKS) {
    for (const h of w.hotspots) {
      assert.ok(typeof h.x === 'number', `${w.id}: hotspot missing x`);
      assert.ok(typeof h.y === 'number', `${w.id}: hotspot missing y`);
      assert.ok(typeof h.t === 'string' && h.t.length > 0, `${w.id}: hotspot missing title`);
      assert.ok(typeof h.d === 'string' && h.d.length > 0, `${w.id}: hotspot missing description`);
    }
  }
});

test('every hotspot coordinate is within the painting (0 to 1)', () => {
  for (const w of WORKS) {
    for (const h of w.hotspots) {
      assert.ok(h.x >= 0 && h.x <= 1, `${w.id} "${h.t}": x=${h.x} out of range`);
      assert.ok(h.y >= 0 && h.y <= 1, `${w.id} "${h.t}": y=${h.y} out of range`);
    }
  }
});


/* ---- constructions guard ------------------------------------ */

const VALID_KINDS = new Set(['perspective', 'orthogonals', 'pyramid', 'phi']);

test('every work has a constructions array', () => {
  for (const w of WORKS) {
    assert.ok(Array.isArray(w.constructions), `${w.id} is missing constructions`);
  }
});

test('every construction has kind, params, label, claim, and verdict', () => {
  for (const w of WORKS) {
    for (const c of w.constructions) {
      assert.ok(VALID_KINDS.has(c.kind), `${w.id}: unknown kind "${c.kind}"`);
      assert.ok(typeof c.params === 'object' && c.params !== null, `${w.id}: missing params`);
      assert.ok(typeof c.label === 'string' && c.label.length > 0, `${w.id}: missing label`);
      assert.ok(typeof c.claim === 'string' && c.claim.length > 0, `${w.id}: missing claim`);
      assert.ok(typeof c.verdict === 'string' && c.verdict.length > 0, `${w.id}: missing verdict`);
    }
  }
});
