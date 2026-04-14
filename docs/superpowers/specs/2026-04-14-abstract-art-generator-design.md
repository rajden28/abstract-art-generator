# Abstract Art Generator — Design

**Date:** 2026-04-14
**Status:** Approved design, pending implementation plan

## Overview

A Node.js + TypeScript tool that generates single-tile Bauhaus / mid-century style abstract SVG images, similar to the reference at `reference/Frame 120.png`. Each generated file is one square tile containing one primitive geometric shape (circle, half-circle, arch, leaf, etc.) on a colored background.

The tool has two front-ends over a shared generator core:
1. A **CLI** for scripted / batch generation.
2. A **local web UI** launched from `run.bat`, providing a form-based interface with inline SVG previews.

Output is written as real `.svg` files to an `output/` directory on disk. Generation is fully seeded for reproducibility.

## Goals

- Emit single-tile square SVGs matching the aesthetic of the reference image.
- Config-driven: user controls palette, resolution, seed, shape weights, rotation policy, decorations.
- Reproducible: same seed + same config yields byte-identical output.
- Extensible: new shape primitives can be added as isolated modules without touching core logic.
- Two interfaces share one generator core (no duplication).

## Non-Goals

- Full grid compositions of many tiles in one SVG (each run = one tile per file; users compose grids externally if desired).
- Non-square tiles / aspect ratio variation.
- Freeform / overlapping / non-grid layouts.
- Browser-based visual regression tests.
- Cross-platform auto-open of the output folder (Windows-focused; `explorer` on Windows only).

## Tech Stack

- **Runtime:** Node.js + TypeScript.
- **Dev deps:** `typescript`, `tsx` (run TS directly during dev), `zod` (config validation), `vitest` (tests), `express` (web UI server).
- **Runtime deps:** `express` only. SVG is emitted as XML strings — no SVG library.
- **Seeded RNG:** inline `mulberry32` implementation (no dependency).

## Project Layout

```
src/
  cli.ts                 # CLI entry — arg parsing, orchestration
  server.ts              # Express server for web UI
  generator.ts           # Shared core: config -> SVG string(s) + file writes
  config.ts              # zod schema, load + validate + merge config/presets
  rng.ts                 # mulberry32 seeded RNG
  renderer.ts            # wraps a primitive's output in the outer <svg>
  primitives/
    index.ts             # registry (extensible)
    circle.ts
    halfCircle.ts
    quarterCircle.ts
    leaf.ts
    arch.ts
    concentricArches.ts
    quarterRound.ts
    dot.ts
    plus.ts
    square.ts
  decorations/
    index.ts             # + and small dot overlays
public/
  index.html             # web UI page
  app.js                 # vanilla JS form + preview logic
  styles.css
config.json              # default working config
presets/
  bauhaus-red.json       # matches the reference palette
  mono.json
output/                  # generated SVGs land here
run.bat                  # double-click launcher for the web UI
reference/
  Frame 120.png          # existing reference image
docs/superpowers/specs/
  2026-04-14-abstract-art-generator-design.md
```

## Config Schema

`config.json` — validated by zod at load time:

```json
{
  "resolution": 1024,
  "seed": null,
  "palette": ["#C4402E", "#1A1A1A", "#E8D4A8"],
  "background": "auto",
  "shapes": {
    "circle":           { "weight": 1 },
    "halfCircle":       { "weight": 1 },
    "quarterCircle":    { "weight": 1 },
    "leaf":             { "weight": 1 },
    "arch":             { "weight": 1 },
    "concentricArches": { "weight": 0.5 },
    "quarterRound":     { "weight": 1 },
    "dot":              { "weight": 0.3 },
    "plus":             { "weight": 0.3 },
    "square":           { "weight": 0.5 }
  },
  "rotation": "random",
  "decorations": {
    "enabled": true,
    "probability": 0.2,
    "types": ["plus", "dot"]
  },
  "padding": 0
}
```

Field rules:
- `resolution`: positive integer. Sets `width`/`height` on the outer `<svg>`. Tiles are always square.
- `seed`: integer or `null`. `null` means a random seed is generated per run; the actual seed used is always logged and encoded in the filename so a run is re-renderable.
- `palette`: array of hex color strings (min length 2). Required.
- `background`: `"auto"` (random palette entry) or a specific hex string that must be in the palette.
- `shapes`: map of primitive name to `{ weight: number >= 0 }`. Weight 0 disables a shape. Unknown keys fail validation. New primitives register defaults in code.
- `rotation`: `"random"` | `"fixed"` | array of allowed angles (subset of `[0, 90, 180, 270]`).
- `decorations`: overlay marks (`+`, dot) applied to primitives that accept them (e.g. `circle`). `probability` is 0–1.
- `padding`: SVG units of inset between shape and tile edge (0 = flush).

**Presets** live in `presets/*.json`, share the same schema but are partial — missing fields fall through to `config.json` defaults.

**Merge order (later overrides earlier):** built-in defaults → `config.json` → selected preset (if any) → CLI flag overrides (or web UI form values).

## CLI

```
art-gen [--config path] [--preset name] [--seed N] [--count N] [--out dir]
```

- `--preset bauhaus-red` — loads `presets/bauhaus-red.json`.
- `--config my.json` — overrides further on top.
- `--seed 1234` — overrides config seed; useful for re-rendering a favorite tile at a different resolution.
- `--count 20` — generates 20 tiles with sequential seeds (`seed`, `seed+1`, …). Filenames include the actual seed so any tile can be reproduced individually.
- `--out` — output directory; defaults to `./output`.

**Filename convention:**
- Single tile: `tile-<seed>.svg`
- Batch: `tile-<seed>.svg` for each (each has its own seed, so no index collision).

**Errors:**
- Invalid config / unknown preset → zod-formatted message, non-zero exit.
- Other exceptions throw and crash loudly (no silent fallbacks).

## Generation Flow (per tile)

1. Resolve config: defaults ← `config.json` ← preset ← CLI/UI overrides.
2. Initialize seeded RNG (generate random seed if config seed is null).
3. Pick background color (random from palette, or the pinned `background` hex).
4. Pick a primitive: weighted sample over `shapes` with `weight > 0`.
5. Pick foreground color: random palette entry that differs from background.
6. Pick rotation per the `rotation` policy.
7. Roll decoration (probability gate); apply only if the primitive supports it.
8. Call `primitive.render(ctx)` → inner SVG fragment string.
9. Wrap in `<svg viewBox="0 0 100 100" width="{res}" height="{res}" xmlns="http://www.w3.org/2000/svg">…</svg>`.
10. Write file to `output/tile-<seed>.svg`. Log path + seed to stdout.

## Rendering Details

**Coordinate space.** Every primitive renders into a normalized `100 × 100` viewBox. The outer `<svg>` element carries real pixel resolution via `width`/`height`. Primitives are therefore resolution-independent — same seed produces identical geometry at any resolution.

**Rotation.** Applied via a single `<g transform="rotate(θ 50 50)">` wrapper around the primitive. Primitives author their shape in 0° orientation only.

**Decorations.** The registry marks which primitives accept decorations (e.g. `circle`). A decoration is itself a small primitive (`+` or dot) rendered on top in a contrasting palette color, sized relative to its host.

**Stroke vs fill.** Most primitives use pure fills. `concentricArches` uses stroked paths; stroke width is derived from the 100-unit viewBox (e.g. 3 units ≈ 3% of the tile) so it scales cleanly with resolution.

**Primitive interface:**
```ts
interface Primitive {
  name: string;
  defaultWeight: number;
  acceptsDecorations: boolean;
  render(ctx: RenderContext): string; // returns inner SVG fragment
}

interface RenderContext {
  size: 100;            // normalized units
  fg: string;           // hex
  bg: string;           // hex (already painted as <rect/>; primitive draws on top)
  rng: () => number;    // seeded RNG, already advanced past earlier decisions
  padding: number;
}
```

New primitives: add a file in `src/primitives/`, export the `Primitive` object, register it in `primitives/index.ts`. No other files need to change.

## Web UI

**Launcher (`run.bat`):**
1. `npm install` if `node_modules` missing.
2. `npm run build` if `dist/` missing or stale (simple timestamp check).
3. `node dist/server.js &` — starts on port 3000.
4. `start http://localhost:3000` — opens default browser.

**Server (`src/server.ts`) — Express:**
- `GET /` → serves `public/index.html`.
- `GET /api/presets` → `[{ name, path }]` from scanning `presets/`.
- `GET /api/preset/:name` → preset JSON body.
- `POST /api/generate` → body is a resolved config object plus `count`. Calls the shared `generator.ts`, writes files, returns `[{ filename, seed }]`.
- `GET /output/*.svg` → static file serving for inline preview.
- `POST /api/open-output` → shells `explorer output` on Windows. 501 on other platforms.

The generator core is **shared**: `cli.ts` and `server.ts` both import from `generator.ts`. The web UI is a second front-end over the same engine, not a reimplementation.

**Page (`public/`):**
- Left panel — form controls:
  - Preset dropdown (applying a preset populates form values).
  - Resolution (number input).
  - Seed (number input + "randomize" button that clears it).
  - Count (number input, 1–50).
  - Palette: list of color pickers with add/remove swatch buttons.
  - Shape weights: one slider per primitive, 0–2.
  - Rotation: radio for `random` / `fixed` / `custom`; when `custom`, checkboxes for `0/90/180/270`.
  - Decorations: on/off toggle + probability slider.
- Right panel — preview grid:
  - After generate, each returned SVG is rendered **inline** (not via `<img>`) so it stays crisp at any zoom.
  - Each tile shows its seed with "Copy seed" and "Open file" actions.
- Footer: "Generate" button, "Open output folder" button.

**Scope guard:** no live auto-regenerate on form change. Generation is explicit button-triggered only.

## Testing

Using `vitest`.

- **Determinism:** same seed + same config → byte-identical SVG string. One test per primitive.
- **Schema:** invalid configs (bad hex, negative resolution, unknown shape key, weight < 0, invalid rotation array) fail zod validation with clear messages.
- **Weight sampler:** with a fixed-sequence RNG, the sampler picks the expected primitive.
- **Rotation policy:** `"fixed"` always yields 0°; whitelist array `[0, 90]` never yields 180° or 270°.
- **Snapshot tests:** one SVG snapshot per primitive at seed=1 to catch accidental visual regressions.
- **Config merge:** CLI flag > preset > config.json > defaults, verified with a layered test.

No browser-based visual tests — out of scope. Manual eyeballing of the `output/` folder is the acceptance test for aesthetics.

## Error Handling

- Config / preset validation errors: printed via zod's formatted errors, non-zero exit (CLI) or HTTP 400 JSON (server).
- Filesystem errors (permission, disk full): thrown, crash the process — not silently swallowed.
- Server: uncaught exceptions return HTTP 500 with a short message; full stack in server log.
- Browser side: fetch errors shown as a toast in the UI; no automatic retry.

## Open Questions

None at design time. All questions resolved during brainstorming.
