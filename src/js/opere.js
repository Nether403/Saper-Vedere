/* ============================================================
   Chapter II — Le Opere
   A plate viewer with a ground-glass lens, a golden-section
   armature, and annotations that stay shut until asked for.
   ============================================================ */

import { fieldbookHas, fieldbookToggle } from './fieldbook.js';

const $ = (s, r = document) => r.querySelector(s);
const PHI_INV = 0.6180339887;

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

  /* ---- the golden-section armature -------------------------- */

  function sizeOverlay() {
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    overlay.width = Math.round(r.width * dpr);
    overlay.height = Math.round(r.height * dpr);
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
    const ctx = overlay.getContext('2d');
    // Scale once, then draw in CSS pixels — the maths stays readable.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawArmature(r.width, r.height, ctx);
  }

  function drawArmature(w, h, ctx) {
    ctx.clearRect(0, 0, w, h);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(216, 180, 99, 0.7)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (const f of [PHI_INV, 1 - PHI_INV]) {
      ctx.moveTo(w * f, 0); ctx.lineTo(w * f, h);
      ctx.moveTo(0, h * f); ctx.lineTo(w, h * f);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(35, 25, 15, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, h);
    ctx.moveTo(w, 0); ctx.lineTo(0, h);
    ctx.stroke();

    const PHI = 1.6180339887;
    let rw, rh;
    if (h >= w) { rw = w; rh = w * PHI; if (rh > h) { rh = h; rw = h / PHI; } }
    else { rh = h; rw = h * PHI; if (rw > w) { rw = w; rh = w / PHI; } }

    const ox = (w - rw) / 2;
    const oy = (h - rh) / 2;

    ctx.strokeStyle = 'rgba(164, 68, 47, 0.75)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.rect(ox, oy, rw, rh);
    ctx.stroke();

    ctx.beginPath();
    let x = ox, y = oy, bw = rw, bh = rh, dir = 0;
    for (let i = 0; i < 10; i++) {
      const s = Math.min(bw, bh);
      if (s < 2) break;
      let cx, cy, a0;
      const d = dir % 4;
      if (d === 0) { cx = x + s; cy = y + s; a0 = Math.PI; }
      else if (d === 1) { cx = x + bw - s; cy = y + s; a0 = -Math.PI / 2; }
      else if (d === 2) { cx = x + bw - s; cy = y + bh - s; a0 = 0; }
      else { cx = x + s; cy = y + bh - s; a0 = Math.PI / 2; }
      ctx.arc(cx, cy, s, a0, a0 + Math.PI / 2);

      if (bh > bw) { if (d === 0 || d === 1) y += s; bh -= s; }
      else { if (d === 0 || d === 3) x += s; bw -= s; }
      dir++;
    }
    ctx.stroke();
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
    }
    if (name === 'spots') {
      spotsHost.classList.toggle('is-on', on);
      if (!on) { readout.hidden = true; }
    }
  }

  for (const [name, btn] of Object.entries(tools)) {
    if (!btn) continue;
    btn.addEventListener('click', () => setTool(name, !state[name]));
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
