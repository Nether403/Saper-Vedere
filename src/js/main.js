/* ============================================================
   SAPER VEDERE — boot, choreography, and the lighter chapters
   ============================================================ */

import { PLATES } from './images.js';
import { PRINCIPLES, WORKS, FOLIOS, MIRROR_SAMPLES, SOURCES, CAVEATS } from './data.js';
import { fieldbookItems } from './fieldbook.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Build an <img> from a plate in the manifest. */
export function plateImg(key, { alt = '', sizes = '100vw', eager = false } = {}) {
  const p = PLATES[key];
  const img = document.createElement('img');
  if (!p) return img;
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  img.width = p.w;
  img.height = p.h;
  img.alt = alt;
  img.sizes = sizes;
  if (p.srcset) img.srcset = p.srcset;
  img.src = p.src;
  return img;
}

/* ------------------------------------------------------------
   Reveal on approach. GSAP does the choreography where it can;
   this is the floor everything else stands on.
   ------------------------------------------------------------ */

const riseObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-risen');
      riseObserver.unobserve(e.target);
    }
  },
  { rootMargin: '0px 0px -12% 0px', threshold: 0.06 }
);

function rise(el, delay = 0) {
  if (REDUCED) { el.classList.add('is-risen'); return; }
  el.setAttribute('data-rise', '');
  el.style.setProperty('--rise-delay', `${delay}ms`);
  riseObserver.observe(el);
}

/* ------------------------------------------------------------
   Incipit: the title arrives mirrored and turns over.
   ------------------------------------------------------------ */

function buildIncipit() {
  const plate = $('[data-hero-plate]');
  if (plate && PLATES.acqua) {
    const image = plateImg('acqua', {
      alt: 'Leonardo da Vinci, studies of water passing obstacles and falling',
      sizes: '(max-width: 62rem) 100vw, 62vw',
      eager: true,
    });
    image.fetchPriority = 'high';
    plate.prepend(image);
    const credit = $('[data-hero-credit]');
    if (credit) {
      const asset = PLATES.acqua;
      credit.innerHTML = `<a href="${asset.page}" target="_blank" rel="noopener noreferrer">${asset.artist || 'Creator not recorded in the image manifest'}</a> · ${asset.license}`;
    }
  }

  const observe = $('[data-observe]');
  observe?.addEventListener('click', () => {
    const traced = plate?.dataset.state === 'traced';
    if (plate) plate.dataset.state = traced ? '' : 'traced';
    observe.setAttribute('aria-pressed', String(!traced));
    observe.firstChild.textContent = traced ? 'Trace the current ' : 'Hide the trace ';
  });

  const title = $('[data-mirror-title]');
  if (!title) return;

  if (REDUCED) { title.dataset.state = 'true'; return; }

  title.dataset.state = 'reversed';
  // Let the face land first, then turn it over — the page's own
  // demonstration of what Chapter VI is about.
  window.setTimeout(() => { title.dataset.state = 'true'; }, 1150);
}

/* ------------------------------------------------------------
   Chapter I — the principles
   ------------------------------------------------------------ */

function buildPrinciples() {
  const list = $('[data-principles]');
  if (!list || list.children.length) return;

  for (const p of PRINCIPLES) {
    const li = document.createElement('li');
    li.className = 'principle';
    li.innerHTML = `
      <span class="principle-n">${p.n}</span>
      <div>
        <h3 class="principle-it">${p.it}</h3>
        <p class="principle-en">${p.en}</p>
        <p class="principle-source">${p.source}</p>
      </div>
      <div class="principle-rule">
        <span class="label">Therefore, on this page</span>
        <p>${p.rule}</p>
      </div>`;
    list.append(li);
    rise(li);
  }
}

/* ------------------------------------------------------------
   Chapter III — the folios
   ------------------------------------------------------------ */

function buildFolios() {
  const host = $('[data-folios]');
  if (!host || host.children.length) return;

  for (const g of FOLIOS) {
    const sec = document.createElement('section');
    sec.className = 'folio-group';

    const head = document.createElement('div');
    head.className = 'folio-group-head';
    head.innerHTML = `
      <h3>${g.group}</h3>
      <p class="en">${g.en}</p>
      <p>${g.blurb}</p>`;
    sec.append(head);

    const grid = document.createElement('div');
    grid.className = 'sheets';

    for (const s of g.sheets) {
      const fig = document.createElement('figure');
      fig.className = 'sheet';

      const frame = document.createElement('div');
      frame.className = 'sheet-plate';
      frame.append(plateImg(s.plate, { alt: s.title, sizes: '(max-width: 48rem) 90vw, 22rem' }));

      const cap = document.createElement('figcaption');
      const asset = PLATES[s.plate];
      cap.innerHTML = `
        <h4>${s.title}</h4>
        <p class="ref">${s.ref} · ${s.date}</p>
        <p class="d">${s.d}</p>
        ${asset ? `<p class="asset-credit"><a href="${asset.page}" target="_blank" rel="noopener noreferrer">${asset.artist || 'Creator not recorded in the image manifest'}</a> · ${asset.license}</p>` : ''}`;

      fig.append(frame, cap);
      grid.append(fig);
      rise(fig);
    }

    sec.append(grid);
    host.append(sec);
  }
}

/* ------------------------------------------------------------
   Chapter VI — the mirror
   ------------------------------------------------------------ */

function buildSpecchio() {
  const host = $('[data-specchio]');
  if (!host) return;

  host.innerHTML = `
    <div class="specchio-write">
      <p class="specchio-legend">As you write it</p>
      <textarea class="specchio-field" data-mirror-in id="mirror-field" name="mirror-field" rows="5"
        spellcheck="false"
        placeholder="Write here, left to right, the ordinary way…"></textarea>
      <div class="specchio-samples" data-mirror-samples></div>
    </div>
    <div class="specchio-read">
      <p class="specchio-legend">As he wrote it</p>
      <div class="specchio-glass" data-mirror-out aria-live="polite"></div>
      <p class="marginalia" style="max-width:none">
        Hold a mirror to your screen and the right-hand panel becomes
        legible again. He used no cipher and made no attempt to hide
        anything — a left hand dragged across wet iron-gall ink smears it,
        and writing backwards solves that.
      </p>
    </div>`;

  const input = $('[data-mirror-in]', host);
  const output = $('[data-mirror-out]', host);
  const samples = $('[data-mirror-samples]', host);

  const render = () => {
    const v = input.value.trim();
    output.textContent = v || 'Il moto è causa d’ogni vita';
    output.style.opacity = v ? '1' : '0.45';
    for (const b of samples.querySelectorAll('button')) {
      b.classList.toggle('is-active', b.dataset.sample === v);
    }
  };

  input.addEventListener('input', render);

  for (const s of MIRROR_SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = s.it;
    b.title = s.en;
    b.dataset.sample = s.it;
    b.addEventListener('click', () => {
      input.value = s.it;
      render();
      input.focus();
    });
    samples.append(b);
  }

  render();
  rise(host);
}

/* ------------------------------------------------------------
   Colophon
   ------------------------------------------------------------ */

function buildColophon() {
  const list = $('[data-sources]');
  if (list && !list.children.length) {
    for (const s of SOURCES) {
      const li = document.createElement('li');
      const title = s.u
        ? `<a href="${s.u}" target="_blank" rel="noopener noreferrer">${s.t}</a>`
        : s.t;
      li.innerHTML = `<h3>${title}</h3><p>${s.d}</p>`;
      list.append(li);
    }
  }

  const cav = $('[data-caveats]');
  if (cav && !cav.children.length) {
    for (const c of CAVEATS) {
      const li = document.createElement('li');
      li.innerHTML = c;
      cav.append(li);
    }
  }
}

/* ------------------------------------------------------------
   The chapter rail
   ------------------------------------------------------------ */

function buildRail() {
  const rail = $('.rail');
  if (!rail) return;

  const links = $$('a[data-rail]', rail);
  const progress = $('[data-rail-progress]', rail);
  const sections = links
    .map((a) => ({ a, el: document.getElementById(a.dataset.rail) }))
    .filter((s) => s.el);

  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const s of sections) s.a.classList.toggle('is-current', s.el === e.target);
      }
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );
  for (const s of sections) spy.observe(s.el);

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (progress) progress.style.height = `${(p * 100).toFixed(2)}%`;
    rail.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.5);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ------------------------------------------------------------
   GSAP choreography — enhancement only. If GSAP fails to load
   from the CDN the page loses parallax and nothing else.
   ------------------------------------------------------------ */

function choreograph() {
  const gsap = window.gsap;
  if (!gsap || REDUCED) return;
  const ST = window.ScrollTrigger;
  if (ST) gsap.registerPlugin(ST);

  const plate = $('[data-hero-plate]');
  if (plate && ST) {
    gsap.to(plate, {
      yPercent: 16,
      rotate: 1.6,
      ease: 'none',
      scrollTrigger: { trigger: '.incipit', start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
  }

  const inner = $('.incipit-inner');
  if (inner && ST) {
    gsap.to(inner, {
      yPercent: -8,
      opacity: 0.15,
      ease: 'none',
      scrollTrigger: { trigger: '.incipit', start: 'top top', end: 'bottom top', scrub: 0.4 },
    });
  }

  // Chapter headings drift up a little slower than the page.
  if (ST) {
    for (const head of $$('.chapter-head')) {
      gsap.fromTo(
        head,
        { y: 26 },
        {
          y: -18,
          ease: 'none',
          scrollTrigger: { trigger: head, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        }
      );
    }
  }
}

/* ------------------------------------------------------------
   Lazy chapters: the heavy modules are only fetched when their
   chapter comes within a screen of the viewport.
   ------------------------------------------------------------ */

function whenNear(el, fn, distance = 1.2) {
  if (!el) return;
  let started = false;

  const load = async () => {
    if (started) return;
    started = true;
    el.dataset.loadState = 'loading';
    try {
      await fn();
      el.dataset.loadState = 'ready';
      if (window.location.hash === `#${el.id}`) {
        requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
      }
    } catch (error) {
      console.error(error);
      el.dataset.loadState = 'error';
      const status = document.createElement('div');
      status.className = 'chapter-error';
      status.setAttribute('role', 'status');
      status.innerHTML = `<p>This interactive chapter could not be opened.</p>`;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn';
      retry.textContent = 'Retry';
      retry.addEventListener('click', () => window.location.reload());
      status.append(retry);
      el.querySelector('.folio')?.append(status);
    }
  };

  if (window.location.hash === `#${el.id}` || !('IntersectionObserver' in window)) {
    load();
    return;
  }

  const margin = `${Math.round(window.innerHeight * distance)}px 0px`;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.disconnect();
        load();
      }
    },
    { rootMargin: margin }
  );
  io.observe(el);
}

function buildFieldbook() {
  const open = $('[data-fieldbook-open]');
  const dialog = $('[data-fieldbook-dialog]');
  const close = $('[data-fieldbook-close]');
  const count = $('[data-fieldbook-count]');
  const host = $('[data-fieldbook-items]');
  if (!open || !dialog || !host) return;

  const render = () => {
    const ids = fieldbookItems();
    count.textContent = String(ids.length);
    host.textContent = '';
    if (!ids.length) {
      host.innerHTML = `<p class="fieldbook-empty">Nothing saved yet. Open a painting in the Codex and add the works you want to see again.</p>`;
      return;
    }
    for (const id of ids) {
      const work = WORKS.find((item) => `work:${item.id}` === id);
      if (!work) continue;
      const link = document.createElement('a');
      link.className = 'fieldbook-item';
      link.href = `?work=${encodeURIComponent(work.id)}#opere`;
      link.innerHTML = `<span>${work.title}</span><small>${work.date} · ${work.home}</small>`;
      link.addEventListener('click', () => dialog.close());
      host.append(link);
    }
  };

  open.addEventListener('click', () => { render(); dialog.showModal(); });
  close?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  window.addEventListener('fieldbookchange', render);
  render();
}

function stabilizeInitialHash() {
  const target = window.location.hash && document.querySelector(window.location.hash);
  if (!target) return;

  const timers = [0, 100, 500, 1500, 3500].map((delay) =>
    window.setTimeout(() => target.scrollIntoView({ block: 'start' }), delay)
  );
  const cancel = () => {
    for (const timer of timers) window.clearTimeout(timer);
  };
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(event, cancel, { once: true, passive: true });
  }
}

function boot() {
  document.documentElement.classList.remove('no-js');

  buildIncipit();
  buildPrinciples();
  buildFolios();
  buildSpecchio();
  buildColophon();
  buildRail();
  buildFieldbook();
  choreograph();

  whenNear($('#opere'), async () => {
    const m = await import('./opere.js');
    m.buildOpere({ plateImg, rise, WORKS, PLATES });
  });

  whenNear($('#macchine'), async () => {
    const m = await import('./machines/index.js');
    m.buildMachines({ plateImg, rise, PLATES, REDUCED });
  });

  whenNear($('#dipinti'), async () => {
    const m = await import('./scenes.js');
    m.buildScenes({ PLATES, REDUCED });
  });

  stabilizeInitialHash();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
