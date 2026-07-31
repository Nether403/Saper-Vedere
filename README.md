# Saper Vedere

A living codex of Leonardo da Vinci — six chapters in a single scroll-through webpage.

Il Metodo · Le Opere · I Fogli · Le Macchine Vive · Dentro i Dipinti · Lo Specchio

## Develop locally

Install the pinned dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Vite prints the local URL when it starts. Opening `index.html` as a file is not supported.

## Verify and build

```bash
npm test
npm run build
```

The production output is written to `dist/`.

## What’s inside

| Chapter | What it does |
| --- | --- |
| **I · Il Metodo** | Eight of Leonardo’s principles restated as the design rules of this page |
| **II · Le Opere** | Annotated painting gallery with magnifier, per-work geometric constructions, hotspots |
| **III · I Fogli** | Blueprint folio collection from the notebooks |
| **IV · Le Macchine** | Aerial screw, ornithopter, and self-propelled cart, built procedurally as timber, iron and canvas |
| **V · Dentro i Dipinti** | Walkable Last Supper; Mona Lisa foveal-peripheral smile illusion |
| **VI · Lo Specchio** | Mirror-writing playground |

Heavy Three.js scenes load only when their chapter approaches the viewport. Three.js is bundled locally by Vite; artwork is currently loaded from the source URLs recorded in the image manifest.

## Sources & caveats

See the Colophon and object-level credits on the page itself. Historical claims follow Kemp; machine models are proportional readings of the drawings, not measured reconstructions. Artwork licenses vary and are recorded beside each artifact.
