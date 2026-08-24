/* ============================================================
   Chapter II — Le Opere
   A plate viewer with a ground-glass lens, per-work geometric
   constructions, and annotations that stay shut until asked for.
   ============================================================ */

import { fieldbookHas, fieldbookToggle } from './fieldbook.js';
import {
  phiGrid, phiRectangle, goldenSpiral, orthogonals, pyramid,
} from './construction.js';

const $ = (s, r = document) => r.querySelector(s);

export function buildOpere({ plateImg, rise, WORKS, PLATES }) {
  const stage = $('[data-opere]');
  if (!stage) return;

  const frame = $('[data-plate-frame]', stage);
  const box = $('[data-plate-box]', stage);
  const img = $('[data-plate-img]', stage);
  const overlay = $('[data-plate-overlay]', stage);
  const spotsHost = $('[data-plate-spots]', stage);
  const lens = $('[data-plate-lens]', stage);
  const loading = $('[data-plate-loading]', stage);
  const metaHost = $('[data-work-meta]', stage);
  const noteHost = $('[data-work-note]', stage);
  const readout = $('[data-spot-readout]', stage);
  const index = $('[data-opere-index]');

  const tools = {
    lens: $('[data-tool="lens"]', stage),
    phi: $('[data-tool="phi"]', stage),
    spots: $('[data-tool="spots"]', stage),
  };

  const requestedWork = new URLSearchParams(window.location.search).get('work');
  const initialWork = WORKS.find((work) => work.id === requestedWork) || WORKS[0];
  const state = { work: initialWork, lens: false, phi: false, spots: false };
  let showRequest = 0;

  /* ---- index of plates ------------------------------------- */

  const indexButtons = new Map();
  if (index) {
    for (const w of WORKS) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const thumb = document.createElement('span');
      thumb.className = 'idx-img';
      thumb.append(plateImg(w.plate, { alt: '', sizes: '7rem' }));
      b.append(thumb);
      const t = document.createElement('span');
      t.className = 'idx-t';
      t.textContent = w.title;
      b.append(t);
      b.addEventListener('click', () => show(w));
      li.append(b);
      index.append(li);
      indexButtons.set(w.id, b);
    }
  }

  /* ---- the geometric construction overlay -------------------- */

  let constructionIndex = -1; // -1 = off, 0..n-1 = active construction

  function sizeOverlay() {
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    overlay.width = Math.round(r.width * dpr);
    overlay.height = Math.round(r.height * dpr);
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
    const ctx = overlay.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawConstruction(r.width, r.height, ctx);
  }

  function segmentsForKind(c) {
    const p = c.params;
    switch (c.kind) {
      case 'phi':
        return [
          ...phiGrid(),
          ...phiRectangle(p.cx, p.cy, p.fill),
          ...goldenSpiral(p.cx, p.cy, p.fill),
        ];
      case 'pyramid':
        return pyramid(p.apex, p.baseLeft, p.baseRight);
      case 'orthogonals':
      case 'perspective':
        return orthogonals(p.vp, p.edgePoints);
      default:
        return [];
    }
  }

  function drawConstruction(w, h, ctx) {
    ctx.clearRect(0, 0, w, h);
    const constructions = state.work.constructions || [];
    if (constructionIndex < 0 || constructionIndex >= constructions.length) return;

    const c = constructions[constructionIndex];
    const segments = segmentsForKind(c);

    // φ overlay uses dashed gold for the grid and sanguine for the rectangle/spiral
    if (c.kind === 'phi') {
      const grid = phiGrid();
      const rect = phiRectangle(c.params.cx, c.params.cy, c.params.fill);
      const spiral = goldenSpiral(c.params.cx, c.params.cy, c.params.fill);

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(216, 180, 99, 0.7)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (const [[x0, y0], [x1, y1]] of grid) {
        ctx.moveTo(x0 * w, y0 * h);
        ctx.lineTo(x1 * w, y1 * h);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(164, 68, 47, 0.75)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (const [[x0, y0], [x1, y1]] of rect) {
        ctx.moveTo(x0 * w, y0 * h);
        ctx.lineTo(x1 * w, y1 * h);
      }
      ctx.stroke();

      ctx.beginPath();
      for (const [[x0, y0], [x1, y1]] of spiral) {
        ctx.moveTo(x0 * w, y0 * h);
        ctx.lineTo(x1 * w, y1 * h);
      }
      ctx.stroke();
    } else {
      // All other kinds: sanguine lines
      ctx.strokeStyle = 'rgba(164, 68, 47, 0.75)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (const [[x0, y0], [x1, y1]] of segments) {
        ctx.moveTo(x0 * w, y0 * h);
        ctx.lineTo(x1 * w, y1 * h);
      }
      ctx.stroke();

      // Mark the vanishing point for perspective/orthogonals
      if ((c.kind === 'orthogonals' || c.kind === 'perspective') && c.params.vp) {
        const [vx, vy] = c.params.vp;
        ctx.fillStyle = 'rgba(216, 180, 99, 0.9)';
        ctx.beginPath();
        ctx.arc(vx * w, vy * h, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---- the lens --------------------------------------------- */

  const ZOOM = 2.6;

  function moveLens(ev) {
    if (!state.lens) return;
    const b = box.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    const x = ev.clientX - b.left;
    const y = ev.clientY - b.top;

    const inside = x >= 0 && y >= 0 && x <= b.width && y <= b.height;
    lens.classList.toggle('is-on', inside);
    if (!inside) return;

    lens.style.left = `${ev.clientX - f.left}px`;
    lens.style.top = `${ev.clientY - f.top}px`;

    const lw = lens.offsetWidth;
    const bgW = b.width * ZOOM;
    const bgH = b.height * ZOOM;
    lens.style.backgroundSize = `${bgW}px ${bgH}px`;
    lens.style.backgroundPosition = `${-(x * ZOOM - lw / 2)}px ${-(y * ZOOM - lw / 2)}px`;
  }

  frame.addEventListener('pointermove', moveLens);
  frame.addEventListener('pointerleave', () => lens.classList.remove('is-on'));

  /* ---- hotspots --------------------------------------------- */

  function buildSpots(work) {
    spotsHost.textContent = '';
    readout.hidden = true;

    if (!work.hotspots || !work.hotspots.length) {
      tools.spots.disabled = true;
      tools.spots.title = 'No annotations on this plate';
      setTool('spots', false);
      return;
    }
    tools.spots.disabled = false;
    tools.spots.title = '';

    work.hotspots.forEach((h, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'spot';
      b.style.left = `${h.x * 100}%`;
      b.style.top = `${h.y * 100}%`;
      b.setAttribute('aria-label', h.t);
      b.addEventListener('click', () => {
        for (const other of spotsHost.children) other.classList.remove('is-active');
        b.classList.add('is-active');
        readout.hidden = false;
        readout.innerHTML = `<h4>${h.t}</h4><p>${h.d}</p>`;
      });
      spotsHost.append(b);
      if (i === 0) b.classList.add('is-first');
    });
  }

  /* ---- tools ------------------------------------------------- */

  function setTool(name, on) {
    state[name] = on;
    const btn = tools[name];
    if (btn) btn.setAttribute('aria-pressed', String(on));

    if (name === 'lens') {
      lens.classList.toggle('is-on', false);
      frame.style.cursor = on ? 'none' : 'crosshair';
    }
    if (name === 'phi') {
      overlay.classList.toggle('is-on', on);
      if (on) sizeOverlay();
      // Show/hide construction verdict
      const cReadout = stage.querySelector('[data-construction-readout]');
      if (cReadout) {
        const constructions = state.work.constructions || [];
        if (on && constructionIndex >= 0 && constructionIndex < constructions.length) {
          const c = constructions[constructionIndex];
          cReadout.hidden = false;
          cReadout.innerHTML = `<h4>${c.label}</h4><p class="construction-claim">${c.claim}</p><p class="construction-verdict">${c.verdict}</p>`;
        } else {
          cReadout.hidden = true;
        }
      }
    }
    if (name === 'spots') {
      spotsHost.classList.toggle('is-on', on);
      if (!on) { readout.hidden = true; }
    }
  }

  for (const [name, btn] of Object.entries(tools)) {
    if (!btn) continue;
    if (name === 'phi') {
      // Cycle: off → construction 0 → construction 1 → ... → off
      btn.addEventListener('click', () => {
        const constructions = state.work.constructions || [];
        if (!constructions.length) return;
        constructionIndex++;
        if (constructionIndex >= constructions.length) {
          constructionIndex = -1;
          setTool('phi', false);
          btn.textContent = 'Construction';
        } else {
          setTool('phi', true);
          btn.textContent = constructions[constructionIndex].label;
        }
      });
    } else {
      btn.addEventListener('click', () => setTool(name, !state[name]));
    }
  }

  /* ---- showing a work ---------------------------------------- */

  function show(work) {
    const request = ++showRequest;
    state.work = work;
    const p = PLATES[work.plate];
    if (!p) return;

    for (const [id, b] of indexButtons) b.classList.toggle('is-current', id === work.id);

    img.classList.remove('is-in');
    loading.textContent = 'Unrolling the plate…';
    loading.hidden = false;
    spotsHost.textContent = '';
    readout.hidden = true;

    const next = new Image();
    next.decoding = 'async';
    if (p.srcset) { next.srcset = p.srcset; next.sizes = '(max-width: 68rem) 92vw, 58rem'; }
    next.src = p.src;

    const settle = async () => {
      if (request !== showRequest) return;
      if (!next.naturalWidth) {
        loading.textContent = 'This plate would not load.';
        return;
      }
      try {
        await next.decode();
      } catch {
        loading.textContent = 'This plate could not be decoded.';
        return;
      }
      if (request !== showRequest) return;
      img.src = next.currentSrc || next.src;
      if (p.srcset) { img.srcset = p.srcset; img.sizes = '(max-width: 68rem) 92vw, 58rem'; }
      img.width = p.w;
      img.height = p.h;
      img.alt = `${work.title}, ${work.date}`;
      lens.style.backgroundImage = `url("${next.currentSrc || p.src}")`;

      loading.hidden = true;
      img.classList.add('is-in');

      requestAnimationFrame(() => {
        sizeOverlay();
        buildSpots(work);
        if (state.spots) spotsHost.classList.add('is-on');
        // Reset construction state for the new work
        constructionIndex = -1;
        const constructions = work.constructions || [];
        if (!constructions.length) {
          tools.phi.disabled = true;
          tools.phi.title = 'No documented construction for this plate';
          tools.phi.textContent = 'Construction';
          setTool('phi', false);
        } else {
          tools.phi.disabled = false;
          tools.phi.title = '';
          tools.phi.textContent = 'Construction';
          setTool('phi', false);
        }
      });
    };

    if (next.complete) settle();
    else {
      next.addEventListener('load', settle, { once: true });
      next.addEventListener('error', () => {
        if (request === showRequest) loading.textContent = 'This plate would not load.';
      }, { once: true });
    }

    renderApparatus(work);
  }

  function renderApparatus(w) {
    const fieldbookId = `work:${w.id}`;
    const asset = PLATES[w.plate];
    metaHost.innerHTML = `
      <h3>${w.title}</h3>
      ${w.subtitle ? `<p class="work-sub">${w.subtitle}</p>` : ''}
      <dl class="work-facts">
        <div><dt>Date</dt><dd>${w.date}</dd></div>
        <div><dt>Medium</dt><dd>${w.medium}</dd></div>
        <div><dt>Size</dt><dd>${w.size}</dd></div>
        <div><dt>Where</dt><dd>${w.home}</dd></div>
      </dl>
      <button class="save-work" type="button" data-save-work aria-pressed="${fieldbookHas(fieldbookId)}">
        ${fieldbookHas(fieldbookId) ? 'Saved to fieldbook' : 'Save to fieldbook'}
      </button>
      ${asset ? `<p class="asset-credit"><a href="${asset.page}" target="_blank" rel="noopener noreferrer">${asset.artist || 'Creator not recorded in the image manifest'}</a> · ${asset.license}</p>` : ''}`;

    const save = $('[data-save-work]', metaHost);
    save.addEventListener('click', () => {
      const saved = fieldbookToggle(fieldbookId);
      save.setAttribute('aria-pressed', String(saved));
      save.textContent = saved ? 'Saved to fieldbook' : 'Save to fieldbook';
    });

    noteHost.innerHTML = `
      <p>${w.note}</p>
      <p class="seeing">${w.seeing}</p>`;
  }

  /* ---- resize ------------------------------------------------ */

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (state.phi) sizeOverlay(); }, 140);
  });

  show(initialWork);
  rise(stage);
  if (index) rise(index);
}
