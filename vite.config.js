import { defineConfig } from 'vite';
import { CAVEATS, FOLIOS, PRINCIPLES, SOURCES } from './src/js/data.js';
import { PLATES } from './src/js/images.js';

function attribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function plate(key, alt, sizes) {
  const image = PLATES[key];
  if (!image) return '';
  return `<img src="${attribute(image.src)}"${image.srcset ? ` srcset="${attribute(image.srcset)}"` : ''} sizes="${attribute(sizes)}" width="${image.w}" height="${image.h}" alt="${attribute(alt)}" loading="lazy" decoding="async">`;
}

function credit(key) {
  const image = PLATES[key];
  if (!image) return '';
  const creator = image.artist || 'Creator not recorded in the image manifest';
  return `<p class="asset-credit"><a href="${attribute(image.page)}" target="_blank" rel="noopener noreferrer">${attribute(creator)}</a> · ${attribute(image.license)}</p>`;
}

function renderPrinciples() {
  return PRINCIPLES.map((principle) => `
    <li class="principle">
      <span class="principle-n">${principle.n}</span>
      <div>
        <h3 class="principle-it">${principle.it}</h3>
        <p class="principle-en">${principle.en}</p>
        <p class="principle-source">${principle.source}</p>
      </div>
      <div class="principle-rule">
        <span class="label">Therefore, on this page</span>
        <p>${principle.rule}</p>
      </div>
    </li>`).join('');
}

function renderFolios() {
  return FOLIOS.map((group) => `
    <section class="folio-group">
      <div class="folio-group-head">
        <h3>${group.group}</h3>
        <p class="en">${group.en}</p>
        <p>${group.blurb}</p>
      </div>
      <div class="sheets">
        ${group.sheets.map((sheet) => `
          <figure class="sheet">
            <div class="sheet-plate">${plate(sheet.plate, sheet.title, '(max-width: 48rem) 90vw, 22rem')}</div>
            <figcaption>
              <h4>${sheet.title}</h4>
              <p class="ref">${sheet.ref} · ${sheet.date}</p>
              <p class="d">${sheet.d}</p>
              ${credit(sheet.plate)}
            </figcaption>
          </figure>`).join('')}
      </div>
    </section>`).join('');
}

function renderSources() {
  return SOURCES.map((source) => `
    <li>
      <h3>${source.u ? `<a href="${attribute(source.u)}" target="_blank" rel="noopener noreferrer">${source.t}</a>` : source.t}</h3>
      <p>${source.d}</p>
    </li>`).join('');
}

function renderStaticContent(html) {
  return html
    .replace('<ol class="principles" data-principles></ol>', `<ol class="principles" data-principles>${renderPrinciples()}</ol>`)
    .replace('<div class="folios" data-folios></div>', `<div class="folios" data-folios>${renderFolios()}</div>`)
    .replace('<ol class="sources" data-sources></ol>', `<ol class="sources" data-sources>${renderSources()}</ol>`)
    .replace('<ul class="caveats" data-caveats></ul>', `<ul class="caveats" data-caveats>${CAVEATS.map((caveat) => `<li>${caveat}</li>`).join('')}</ul>`);
}

export default defineConfig({
  plugins: [
    {
      name: 'saper-vedere-static-content',
      transformIndexHtml: {
        order: 'pre',
        handler: renderStaticContent,
      },
    },
  ],
});
