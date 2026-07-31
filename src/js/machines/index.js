/* ============================================================
   Chapter IV — Le Macchine Vive
   Three devices built procedurally in three dimensions: timber,
   iron and canvas, computed from the proportions in the folios.
   Nothing is loaded from a model file.
   ============================================================ */

import { MACHINES } from '../data.js';
import { mountViewer } from './viewer.js';

export function buildMachines({ plateImg, rise, PLATES, REDUCED }) {
  const host = document.querySelector('[data-machines]');
  if (!host) return;

  for (const m of MACHINES) {
    const art = document.createElement('article');
    art.className = 'machine';

    const stage = document.createElement('div');
    stage.className = 'machine-stage';
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', `${m.en}: a rotatable model of the machine as it would have been built`);

    const cap = document.createElement('p');
    cap.className = 'machine-caption';
    cap.textContent = 'Drag to turn · scroll to close in';
    stage.append(cap);

    const idle = document.createElement('div');
    idle.className = 'machine-idle';
    idle.textContent = 'Drawing…';
    stage.append(idle);

    const apparatus = document.createElement('div');
    apparatus.className = 'machine-apparatus';
    apparatus.innerHTML = `
      <p class="evidence-label">Explanatory animation · proportional reading</p>
      <h3>${m.title}</h3>
      <p class="ref">${m.en} · ${m.ref}</p>
      <p>${m.body}</p>
      <p class="verdict">${m.verdict}</p>`;

    const row = document.createElement('div');
    row.className = 'btn-row';
    row.style.marginTop = 'var(--s-4)';
    const runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.className = 'btn';
    runBtn.textContent = REDUCED ? 'Set in motion' : 'Pause';
    runBtn.setAttribute('aria-pressed', String(!REDUCED));
    row.append(runBtn);

    const spinNote = document.createElement('span');
    spinNote.className = 'plate-hint';
    spinNote.textContent = m.spin;
    row.append(spinNote);
    apparatus.append(row);

    const fig = document.createElement('figure');
    fig.className = 'machine-thumb';
    fig.append(plateImg(m.plate, { alt: `${m.en}, as drawn`, sizes: '12rem' }));
    const fc = document.createElement('figcaption');
    const asset = PLATES[m.plate];
    fc.innerHTML = `The folio it was modelled from${asset ? `<span class="asset-credit"><a href="${asset.page}" target="_blank" rel="noopener noreferrer">${asset.artist || 'Creator not recorded in the image manifest'}</a> · ${asset.license}</span>` : ''}`;
    fig.append(fc);
    apparatus.append(fig);

    art.append(stage, apparatus);
    host.append(art);
    rise(art);

    // Mount the scene only when this particular machine gets close.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        let api = null;
        try {
          api = mountViewer(stage, m.id, REDUCED);
        } catch (err) {
          idle.textContent = 'This model could not be drawn.';
          console.error(err);
          return;
        }
        idle.hidden = true;
        // Exposed for the browser tests; the page does not read it.
        stage._machineApi = api;
        runBtn.addEventListener('click', () => {
          api.running = !api.running;
          runBtn.textContent = api.running ? 'Pause' : 'Set in motion';
          runBtn.setAttribute('aria-pressed', String(api.running));
        });
      },
      { rootMargin: '60% 0px' }
    );
    io.observe(stage);
  }
}
