# Saper Vedere

A living codex of Leonardo da Vinci — six chapters in a single scroll-through webpage.

Il Metodo · Le Opere · I Fogli · Le Macchine Vive · Dentro i Dipinti · Lo Specchio

## Open locally

Serve the folder over HTTP (ES modules need a server; opening `index.html` as a file will fail):

```bash
npx --yes serve -l 8099 .
```

Then open [http://127.0.0.1:8099](http://127.0.0.1:8099).

## What’s inside

| Chapter | What it does |
| --- | --- |
| **I · Il Metodo** | Eight of Leonardo’s principles restated as the design rules of this page |
| **II · Le Opere** | Annotated painting gallery with magnifier, golden-section overlay, hotspots |
| **III · I Fogli** | Blueprint folio collection from the notebooks |
| **IV · Le Macchine** | Aerial screw, ornithopter, and self-propelled cart — procedural Three.js blueprints |
| **V · Dentro i Dipinti** | Walkable Last Supper; Mona Lisa depth dive with sfumato fog |
| **VI · Lo Specchio** | Mirror-writing playground |

Heavy Three.js scenes load only when their chapter approaches the viewport. All plates are public-domain Wikimedia Commons images, hotlinked at responsive thumbnail sizes.

## Sources & caveats

See the Colophon on the page itself. Historical claims follow Kemp; machine models are proportional readings of the drawings, not measured reconstructions.
