# Chapter IV machine models — design

Date: 2026-07-29
Status: approved (design), not yet implemented

## Problem

The three devices in Chapter IV — the aerial screw, the ornithopter, and the
self-propelled cart — are drawn as wireframe line art. `src/js/machines.js`
builds every one of them from four primitives: `polyline`, `segments`,
`circle`, and `gear`. Surfaces exist only as `MeshBasicMaterial` meshes at
opacity 0.06–0.07, which is close enough to invisible that the sail of the
aerial screw and the wing membranes of the ornithopter read as empty space.
There are no lights in the machine scenes at all.

The result is legible but thin. It looks like a diagram of a machine rather
than a machine.

## Decisions

Four decisions were settled before this design was written.

**Aesthetic: hybrid.** Solid three-dimensional geometry, lit and toned to look
like illuminated-manuscript illustration. Warm ochre key light, soft shadows,
sculptural forms, and the existing da Vinci palette. Not photoreal, and not a
richer line drawing either.

**Where the detail goes: real construction.** Every part becomes an object as a
carpenter would have built it — timber with joints and pegs, iron fittings,
rope lashings, stitched canvas panels with seams. The believability carries the
awe. This is chosen over "light and material only", "mechanical density", and
"scale and staging"; those remain available for a later pass.

**Scope: all three machines equally.** No hero piece. The chapter reads as one
coherent set.

**Approach: a shared carpentry kit.** Construction primitives and materials
live in shared modules, and each machine is rebuilt in terms of them. Chosen
over bespoke per-machine geometry (which drifts and duplicates) and over a
cross-hatching ink shader (distinctive, but hatching hides the pegged joints
and rope lay that the construction decision exists to show).

## Architecture

`src/js/machines.js` is 587 lines and will roughly triple. It becomes a
directory:

```
src/js/machines/
  kit.js          construction primitives
  materials.js    shared materials + canvas texture generators
  lighting.js     light rig factory
  screw.js        aerial screw builder
  ornithopter.js  ornithopter builder
  cart.js         cart builder
  viewer.js       mountViewer, with the light rig installed
  index.js        re-exports buildMachines; the only public surface
```

`src/js/main.js` changes one import path, from `./machines.js` to
`./machines/index.js`. Nothing else in the codebase moves.

`BUILDERS`, `mountViewer`, and `buildMachines` keep their current
responsibilities; they are only separated into files. Four of the existing line
primitives — `lineMat`, `polyline`, `segments`, and `circle` — move into `kit.js`
unchanged and stay in use for rigging lines, construction annotation, and
geometric guide circles, detail that reads better as line than as solid. The
fifth, `gear()`, is deleted: `solidGear` replaces its only two callers, and
nothing else uses it.

## The carpentry kit

`kit.js` holds workshop stock. Each primitive returns geometry or a
`THREE.Group` with no material opinion baked in; the caller passes a material
from `materials.js`, so the same beam can be bare oak in one machine and
iron-bound in another.

**`beam(length, width, depth, opts)`** — a squared timber. Slight taper toward
one end, since the folios show hand-hewn stock rather than milled. Chamfered
arrises, so edges catch the key light instead of going razor-sharp. Optional
`collars: [t, …]` places iron bands at normalised positions along the length.
One `BufferGeometry`, so many beams can merge.

**`spar(length, r0, r1, opts)`** — lathed round stock for masts, axles, and
capstan bars. A `LatheGeometry` profile with a subtle swell at midspan; a turned
spar is never a true cylinder.

**`rope(points, radius, opts)`** — `TubeGeometry` swept along a
`CatmullRomCurve3` through the given points, with a lay twist written into the
UVs so the hemp texture spirals correctly. A `sag` factor bows the curve
downward between endpoints, so stays and cords hang rather than run straight.

**`canvasPanel(corners, opts)`** — a subdivided quad or helicoid patch with a
shallow sine slack across it. `seams: n` inserts stitched seam lines as separate
thin geometry. This replaces the near-invisible `opacity: 0.07` meshes on the
screw sail and the wing membranes.

**`ironStrap(path, width, thickness)`** — a flat band bent along a path, for
corner brackets and hinge plates. Ends carry pegs: small `spar` cylinders
standing slightly proud of the surface. A visible peg head is the single
strongest cue that something was built by hand.

**`solidGear(radius, teeth, thickness, opts)`** — an extruded tooth profile with
trapezoidal teeth and rounded tips, a hub, and either spokes or a solid web.
Replaces the radial line stubs the current `gear()` draws on the cart's crown
gears and spring drums.

**`mergeByMaterial(group)`** collapses same-material geometry into merged
meshes, baking each part's local transform into its vertices as it goes.

It merges *within* one group, never across groups that move independently. A
machine marks its moving groups with a `dynamic` flag — the screw and the
platform on the aerial screw, each wing and the crankshaft on the ornithopter,
each wheel and gear on the cart — and `mergeByMaterial` recurses into a dynamic
group to merge that group's own static contents, then stops. Merging across the
boundary would bake a rotating part into a stationary one and freeze it. This is
what keeps draw calls in the dozens rather than the hundreds, at the cost of a
few extra calls per machine for each independently moving assembly.

## Materials

`materials.js` exports a small set of shared materials — `MeshStandardMaterial`
for four of the five, `MeshPhysicalMaterial` for the linen, which needs
transmission — created once at module load and reused across all three machines.
Sharing matters twice: it is what lets `mergeByMaterial` collapse draw calls, and
it is what makes the three machines read as one workshop.

| Material | Base colour | Character |
| --- | --- | --- |
| `oak` | `0x9a7845` | roughness 0.78; grain in the normal and roughness maps; warmer on end-grain |
| `iron` | `0x5a5148` | roughness 0.42, metalness 0.75; mottled tarnish, so it is not a mirror |
| `linen` | `0xe8dcc2` | roughness 0.9; `side: DoubleSide`; the one `MeshPhysicalMaterial`, for low `transmission` and `thickness`, so it glows where the key light passes through |
| `hemp` | `0xb59a6a` | roughness 0.95; twisted fibre in the normal map |
| `brass` | `0xb08a3e` | roughness 0.3, metalness 0.85; gear teeth and fittings |

Every texture is generated at runtime on a `<canvas>`, the technique
`src/js/scenes.js` already uses for the Mona Lisa alpha masks. No image files
enter the repository, which keeps the README's claim that the machines carry no
binary payload of their own true. Grain is layered value noise stretched along
one axis; tarnish is blotched noise; fibre is a diagonal repeating stripe. Each
generator is a pure function of a seed, called once at module load and cached in
a module-level map. Textures are 512×512, `RepeatWrapping`, mipmapped.

The base colours above are drawn from the palette that already exists rather
than invented: `brass` takes `--gold`, `linen` keeps the existing `LINEN`
constant, and the hemisphere ground colour takes `--umber`. `materials.js`
carries them as hex literals, matching how `machines.js` and `scenes.js` already
do it — the tokens in `src/css/tokens.css` remain the reference for the values,
not a runtime dependency. The current `GOLD`, `GOLD_DIM`, `SANGUINE`, and `LINEN`
constants move into `materials.js` and stay available to the line primitives.

## Lighting

`lighting.js` exports `makeLightRig(frame)`, returning a `THREE.Group` sized to
the machine. Three lights:

**Key** — a `DirectionalLight` at `0xffd9a0`, intensity about 2.2, high and to
the left at roughly 35°. The only shadow caster: a 1024² map, a tight
orthographic frustum fitted to `frame`, and a raised `radius` for soft edges.

**Fill** — a `HemisphereLight`, sky `0xd8c9a4` (the parchment overhead), ground
`0x2b2016` (the umber below), intensity about 0.55. This keeps shadowed timber
from going black. Leonardo held that the extremes do not occur in nature, and
`src/css/tokens.css` already says so where it defines the pigments.

**Rim** — a dim `DirectionalLight` at `0x8ea6b2`, intensity about 0.4, from
behind and slightly below, separating the silhouette from the fog. That cool
blue is the `--azurite` aerial-perspective token.

No environment map. The hemisphere fill plus the existing fog does that job at a
fraction of the cost.

`viewer.js` sets `renderer.shadowMap.enabled = true` with `PCFSoftShadowMap`,
`toneMapping = ACESFilmicToneMapping` at exposure about 1.05 to keep the ochre
from clipping, and leaves `outputColorSpace` at its sRGB default. The existing
`FogExp2(0x191207, 0.075)` is unchanged; it already does the parchment-shadow
job well.

Under reduced motion the lighting is identical; only the shadow map drops to
512², since a still image needs less.

## The three machines

The proportions do not change. The numbers in the current builders are readings
of the folios, and the README's caveat that these are proportional readings
rather than measured reconstructions still holds. What changes is that every
line becomes a made object.

### The aerial screw — `screw.js`

The mast becomes a `spar` of real thickness, swelling at midspan and stepped
where it passes through the platform bearing. The sixteen radial ribs become
tapered `beam`s, deeper at the hub and thinner at the rim, each seated into a
turned hub block with a visible peg. The rim rope becomes a `rope` of
substantial gauge, and where each rib meets it there is a lashing — a short
helix of the same rope wound over the joint.

The sail stops being an invisible film. `canvasPanel` builds the helicoid as
four gores stitched along the seam lines the current code already uses at
v = 1, 0.62, and 0.3, with slack sagging between ribs and a hemmed edge where it
is roped. The eight stays from the mast head gain real sag.

The platform gains a plank deck of radial boards with visible gaps, a rim curb,
and four capstan bars as `spar`s with worn grip ends.

Rotating parts stay in the same two groups, so the existing counter-rotation in
`tick` — screw one way at 1.15 rad/s, platform the other at 0.42 — is untouched.

### The ornithopter — `ornithopter.js`

The hull becomes a real boat frame: a keel `beam` running the length, the five
semicircular ribs as bent laminated members, two `spar` gunwales, and a slatted
floor the pilot lies on.

Each wing's leading spar becomes a tapered `spar`, thick at the root and whippy
at the tip, with the six ribs as thin bent members socketed into it and bound
with iron straps. The fustian membrane becomes `canvasPanel` per bay, seven bays
per wing, each panel slack between ribs so the wing surface undulates. The
sanguine cords become `rope` with real sag that visibly tightens on the
downbeat. The crank becomes a solid crankshaft with a throw, journals, and a
pair of pedals.

The existing `Math.sin(t * 2.1)` beat drives all of it. The tip lag the current
comment describes becomes visible, because the ribs are now separate objects.

### The cart — `cart.js`

The chassis becomes mortise-and-tenon: the two stacked frames as `beam`s with
the uprights visibly through-tenoned and pegged, and `ironStrap` brackets at the
corners.

The spring drums become real drums — a turned barrel, a `solidGear` ratchet
wheel, and the leaf spring as a coiled strip of actual thickness. The current
220-point spiral becomes a swept ribbon; this is the one place a strip reads
better than a tube.

The crown gears become `solidGear` with extruded trapezoidal teeth, mounted on
`spar` axles in iron bearing blocks. The escapement gains a real balance arm
with weights at each end and a pallet that visibly engages the wheel.

The wheels are the best single detail on the cart: felloe segments jointed to
each other, ten mortised spokes, a turned hub with an iron nave band, and an
iron tyre.

Every existing entry in the `spin` array keeps its object and its rate.

### Budget

Rough geometry targets, measured after merge:

| Machine | Triangles | Moving assemblies | Draw calls |
| --- | --- | --- | --- |
| Aerial screw | ~85k | 2 | ~10 |
| Ornithopter | ~70k | 3 | ~14 |
| Cart | ~110k | 9 | ~30 |

The cart costs the most because it has the most independently moving parts — two
spring drums, two crown gears, three wheels, the balance arm, and the steering
group — and each is a merge boundary. Thirty calls is still comfortable, and it
is the reason the test ceiling is set at 40 rather than something tighter.

Comfortable for a `low-power` context rendering one machine at a time. All of
the existing performance discipline is preserved unchanged: the
`powerPreference: 'low-power'` hint, the pixel-ratio cap at 2, the
`IntersectionObserver` that defers mounting until a machine is within
`rootMargin: '60% 0px'`, the second observer that gates per-frame rendering at
`threshold: 0.05`, and the `dt = Math.min(delta, 0.05)` clamp.

## Error handling

The existing failure path stays as it is: `buildMachines` wraps `mountViewer` in
a try/catch and writes "This model could not be drawn." into the idle element.
That covers a geometry bug thrown during `build()`, which is the one genuinely
new hard-failure risk.

Two new soft failure modes come with this change, and both degrade rather than
fail.

**No WebGL context.** Three.js 0.185 dropped WebGL1, so a machine on hardware
without WebGL2 already fails at `new THREE.WebGLRenderer()` and lands in the
existing catch. No new handling is needed, and a graceful lit-but-shadowless
fallback is not available at that level — there is no renderer to fall back
with. This is unchanged from today's behaviour.

**Shadow map allocation fails.** A 1024² depth texture can fail on constrained
GPUs where the context itself succeeded. `viewer.js` checks
`renderer.capabilities.maxTextureSize` before enabling shadows and halves the map
to 512², or disables shadows entirely below 1024. The machine still renders, lit
but flatter.

**Canvas texture generation fails.** If a `2d` context cannot be acquired,
`materials.js` catches it per generator and falls back to a flat colour with no
map. The machine loses its grain, not its form.

Both soft paths log once to the console and continue.

## Testing

`tests/browser/reliability.spec.js` has two tests asserting a `.machine` count
of 3. They must keep passing untouched, and they will: the DOM structure that
`buildMachines` produces does not change.

To make the new tests possible, `mountViewer` adds `renderer`, `scene`, and
`controls` to the `api` object it already returns, and `buildMachines` assigns
that `api` to the stage element as a `_machineApi` property. Each machine has its
own renderer, so each stage carries its own handle. This is a test-only
observation surface; no behaviour hangs off it.

Three new tests:

1. **Each machine renders geometry.** Navigate to `#macchine`, scroll each stage
   into view so its deferred mount fires, then read back through
   `page.evaluate` that each renderer's `info.render.triangles` exceeds 20,000
   and `info.render.calls` is below 40. This catches an empty scene and a merge
   regression in one assertion. The floor of 20,000 is well under the lowest
   budgeted machine and is a smoke threshold, not a target.
2. **Lights are installed.** Assert each machine's scene graph contains a
   directional light with `castShadow === true` and a hemisphere light. Cheap,
   and it is the thing most likely to be silently lost in a later refactor.
3. **Reduced motion still yields a still, lit frame.** With
   `prefers-reduced-motion: reduce` emulated, the canvas is present, triangles
   exceed the floor, and `controls.autoRotate` is false.

All three read state through `_machineApi` on the stage element. Test 2 asserts
the presence of a shadow-casting directional light unconditionally; Playwright's
bundled Chromium has ample texture size, so the constrained-GPU fallback never
triggers there.

One risk worth naming: these tests depend on a headless Chromium acquiring a
WebGL2 context. If the existing suite turns out to run without GPU support, all
three new tests would fail for environmental reasons rather than code reasons. I
will confirm a context is available as the first implementation step; if it is
not, the three tests are replaced by a Node-side unit test over the kit
primitives, which needs no context, and the visual work is verified by hand.

Frame time gets a soft check rather than an assertion. Numbers will be measured
on the development machine during implementation and recorded here. A Playwright
FPS assertion would fail across CI hardware for reasons unrelated to the code.

## Accessibility

The `REDUCED` flag threads through unchanged, as do the run/pause button, its
`aria-pressed` state, and the stage caption.

One string changes. The stage `aria-label` currently reads
`${m.en}: a rotatable line model`, which will no longer be accurate. It becomes
`${m.en}: a rotatable model of the machine as it would have been built`.

## Documentation

`README.md` describes Chapter IV as "procedural Three.js blueprints". That stays
literally true — everything is still computed, nothing is loaded — but
"blueprints" will read wrong once the machines are built objects. The row becomes
"Aerial screw, ornithopter, and self-propelled cart, built procedurally as
timber, iron and canvas". The caveat that these are proportional readings rather
than measured reconstructions is unchanged and still important; more detail does
not mean more evidence.

The header comment at the top of `machines.js` says the same thing in its own
words and moves, revised, to `index.js`.

## Out of scope

Deliberately not part of this work:

- Chapter V (`src/js/scenes.js`). The Cenacolo and the Mona Lisa depth stack use
  projected painting textures, a different technique with different problems.
- Staging: ground planes, dust in the light, figures for scale, cinematic camera
  moves on arrival. Considered and set aside; a candidate for a later pass.
- The cross-hatching ink shader from approach C.
- Any change to the editorial text, the folio thumbnails, or the credits in
  `src/js/data.js`.
- The rest of the page. The original request was "for starters, the 3D models" —
  further work on other chapters follows separately.

## Verification

```bash
npm test
npm run build
```

Both must pass before the work is considered done. Beyond the automated suite,
each machine is looked at in the browser from several angles and at both viewport
extremes, since the whole point of this change is how it looks.

