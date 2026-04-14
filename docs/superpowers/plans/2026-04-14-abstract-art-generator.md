# Abstract Art Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js + TypeScript tool that generates single-tile Bauhaus-style SVG images, with both a CLI and a local web UI, driven by a seeded, extensible config-based generator.

**Architecture:** One shared `generator.ts` core with two front-ends (`cli.ts`, `server.ts`). Primitives are self-registering modules under `src/primitives/`. Rendering uses a normalized 100×100 viewBox with the outer `<svg>` setting real pixel resolution. Deterministic via a seeded `mulberry32` RNG.

**Tech Stack:** TypeScript, Node.js, `zod` (config validation), `express` (web UI server), `vitest` (tests), `tsx` (dev runner). No SVG library — SVG is emitted as XML strings.

**Spec:** [docs/superpowers/specs/2026-04-14-abstract-art-generator-design.md](../specs/2026-04-14-abstract-art-generator-design.md)

---

## File Structure Overview

| File | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `vitest.config.ts` | Project scaffolding |
| `src/rng.ts` | Seeded mulberry32 RNG factory |
| `src/config.ts` | zod schema, load, merge (defaults ← config ← preset ← overrides) |
| `src/primitives/types.ts` | `Primitive` / `RenderContext` interfaces |
| `src/primitives/index.ts` | Registry, weighted sampler |
| `src/primitives/{circle,halfCircle,quarterCircle,leaf,arch,concentricArches,quarterRound,dot,plus,square}.ts` | Individual primitive renderers |
| `src/decorations/index.ts` | `+` and dot overlay logic |
| `src/renderer.ts` | Wraps primitive output in outer `<svg>`, applies rotation, paints background |
| `src/generator.ts` | Orchestration: config → tile(s); writes files |
| `src/cli.ts` | CLI entry, arg parsing |
| `src/server.ts` | Express app and API endpoints |
| `public/index.html`, `public/app.js`, `public/styles.css` | Web UI |
| `config.json`, `presets/bauhaus-red.json`, `presets/mono.json` | Default configs |
| `run.bat` | Windows launcher |

---

## Task 0: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/`, `tests/`, `public/`, `presets/`, `output/.gitkeep`

- [ ] **Step 1: Initialize git repo**

Run: `git init && git add reference/ docs/ && git commit -m "chore: initial commit with reference and spec"`

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "abstract-art-generator",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev:cli": "tsx src/cli.ts",
    "dev:server": "tsx src/server.ts",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^4.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "tsx": "^4.15.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
output/*.svg
!output/.gitkeep
```

- [ ] **Step 6: Create empty directories**

Create: `src/`, `src/primitives/`, `src/decorations/`, `tests/`, `public/`, `presets/`, `output/`
Create empty file: `output/.gitkeep`

- [ ] **Step 7: Install and verify**

Run: `npm install && npx tsc --noEmit`
Expected: no errors (tsc will succeed with no source files yet).

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore src tests public presets output
git commit -m "chore: project scaffolding"
```

---

## Task 1: Seeded RNG

**Files:**
- Create: `src/rng.ts`
- Test: `tests/rng.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/rng.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createRng } from "../src/rng.js";

describe("createRng", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it("returns values in [0, 1)", () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- rng`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/rng.ts`:
```ts
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  if (state === 0) state = 1;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick: empty array");
  return arr[Math.floor(rng() * arr.length)]!;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- rng`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/rng.ts tests/rng.test.ts
git commit -m "feat: seeded mulberry32 RNG"
```

---

## Task 2: Config schema and merge

**Files:**
- Create: `src/config.ts`
- Test: `tests/config.test.ts`
- Create: `config.json`

- [ ] **Step 1: Write the failing test**

`tests/config.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ConfigSchema, mergeConfig, defaultConfig } from "../src/config.js";

describe("ConfigSchema", () => {
  it("accepts a valid config", () => {
    const result = ConfigSchema.safeParse(defaultConfig);
    expect(result.success).toBe(true);
  });

  it("rejects negative resolution", () => {
    const result = ConfigSchema.safeParse({ ...defaultConfig, resolution: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects a palette with fewer than 2 colors", () => {
    const result = ConfigSchema.safeParse({ ...defaultConfig, palette: ["#000"] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex colors", () => {
    const result = ConfigSchema.safeParse({ ...defaultConfig, palette: ["not-hex", "#111"] });
    expect(result.success).toBe(false);
  });

  it("accepts rotation as array of valid angles", () => {
    const r = ConfigSchema.safeParse({ ...defaultConfig, rotation: [0, 90] });
    expect(r.success).toBe(true);
  });

  it("rejects rotation with non-cardinal angles", () => {
    const r = ConfigSchema.safeParse({ ...defaultConfig, rotation: [45] });
    expect(r.success).toBe(false);
  });
});

describe("mergeConfig", () => {
  it("applies preset over defaults, overrides over preset", () => {
    const merged = mergeConfig(
      defaultConfig,
      { resolution: 512 },
      { seed: 123 }
    );
    expect(merged.resolution).toBe(512);
    expect(merged.seed).toBe(123);
    expect(merged.palette).toEqual(defaultConfig.palette);
  });

  it("deep-merges shape weights", () => {
    const merged = mergeConfig(
      defaultConfig,
      { shapes: { circle: { weight: 5 } } },
      {}
    );
    expect(merged.shapes.circle.weight).toBe(5);
    expect(merged.shapes.square.weight).toBe(defaultConfig.shapes.square.weight);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- config`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/config.ts`:
```ts
import { z } from "zod";
import { readFile } from "node:fs/promises";

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const hex = z.string().regex(HEX, "must be a hex color like #RRGGBB");

const ShapeKeys = [
  "circle",
  "halfCircle",
  "quarterCircle",
  "leaf",
  "arch",
  "concentricArches",
  "quarterRound",
  "dot",
  "plus",
  "square",
] as const;
export type ShapeKey = (typeof ShapeKeys)[number];

const ShapeWeightSchema = z.object({ weight: z.number().min(0) });

const ShapesSchema = z.object(
  Object.fromEntries(ShapeKeys.map((k) => [k, ShapeWeightSchema])) as Record<
    ShapeKey,
    typeof ShapeWeightSchema
  >
);

const RotationSchema = z.union([
  z.literal("random"),
  z.literal("fixed"),
  z.array(z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])).min(1),
]);

const DecorationsSchema = z.object({
  enabled: z.boolean(),
  probability: z.number().min(0).max(1),
  types: z.array(z.enum(["plus", "dot"])).min(1),
});

export const ConfigSchema = z.object({
  resolution: z.number().int().positive(),
  seed: z.number().int().nullable(),
  palette: z.array(hex).min(2),
  background: z.union([z.literal("auto"), hex]),
  shapes: ShapesSchema,
  rotation: RotationSchema,
  decorations: DecorationsSchema,
  padding: z.number().min(0),
});

export type Config = z.infer<typeof ConfigSchema>;

export const defaultConfig: Config = {
  resolution: 1024,
  seed: null,
  palette: ["#C4402E", "#1A1A1A", "#E8D4A8"],
  background: "auto",
  shapes: {
    circle: { weight: 1 },
    halfCircle: { weight: 1 },
    quarterCircle: { weight: 1 },
    leaf: { weight: 1 },
    arch: { weight: 1 },
    concentricArches: { weight: 0.5 },
    quarterRound: { weight: 1 },
    dot: { weight: 0.3 },
    plus: { weight: 0.3 },
    square: { weight: 0.5 },
  },
  rotation: "random",
  decorations: { enabled: true, probability: 0.2, types: ["plus", "dot"] },
  padding: 0,
};

export type PartialConfig = Partial<Omit<Config, "shapes" | "decorations">> & {
  shapes?: Partial<Record<ShapeKey, { weight: number }>>;
  decorations?: Partial<Config["decorations"]>;
};

export function mergeConfig(
  base: Config,
  preset: PartialConfig,
  overrides: PartialConfig
): Config {
  const out: Config = {
    ...base,
    ...stripUndefined(preset),
    ...stripUndefined(overrides),
    shapes: { ...base.shapes },
    decorations: { ...base.decorations },
  };
  for (const src of [preset.shapes, overrides.shapes]) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      if (v) out.shapes[k as ShapeKey] = v;
    }
  }
  for (const src of [preset.decorations, overrides.decorations]) {
    if (!src) continue;
    out.decorations = { ...out.decorations, ...src };
  }
  return ConfigSchema.parse(out);
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const r: Partial<T> = {};
  for (const k of Object.keys(o) as (keyof T)[]) {
    if (o[k] !== undefined && k !== "shapes" && k !== "decorations") r[k] = o[k];
  }
  return r;
}

export async function loadJsonFile(path: string): Promise<unknown> {
  const text = await readFile(path, "utf8");
  return JSON.parse(text);
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- config`
Expected: all tests pass.

- [ ] **Step 5: Create default `config.json` at repo root**

```json
{
  "resolution": 1024,
  "seed": null,
  "palette": ["#C4402E", "#1A1A1A", "#E8D4A8"],
  "background": "auto",
  "shapes": {
    "circle": { "weight": 1 },
    "halfCircle": { "weight": 1 },
    "quarterCircle": { "weight": 1 },
    "leaf": { "weight": 1 },
    "arch": { "weight": 1 },
    "concentricArches": { "weight": 0.5 },
    "quarterRound": { "weight": 1 },
    "dot": { "weight": 0.3 },
    "plus": { "weight": 0.3 },
    "square": { "weight": 0.5 }
  },
  "rotation": "random",
  "decorations": { "enabled": true, "probability": 0.2, "types": ["plus", "dot"] },
  "padding": 0
}
```

- [ ] **Step 6: Commit**

```bash
git add src/config.ts tests/config.test.ts config.json
git commit -m "feat: config schema with zod validation and merge"
```

---

## Task 3: Primitive interface + registry + weighted sampler

**Files:**
- Create: `src/primitives/types.ts`, `src/primitives/index.ts`
- Test: `tests/primitives-registry.test.ts`

- [ ] **Step 1: Write the types file**

`src/primitives/types.ts`:
```ts
import type { Rng } from "../rng.js";

export interface RenderContext {
  fg: string;
  bg: string;
  rng: Rng;
  padding: number;
}

export interface Primitive {
  name: string;
  defaultWeight: number;
  acceptsDecorations: boolean;
  render(ctx: RenderContext): string;
}
```

- [ ] **Step 2: Write the failing test**

`tests/primitives-registry.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sampleByWeight } from "../src/primitives/index.js";
import type { Primitive } from "../src/primitives/types.js";

const mkPrim = (name: string): Primitive => ({
  name,
  defaultWeight: 1,
  acceptsDecorations: false,
  render: () => "",
});

describe("sampleByWeight", () => {
  it("picks the only non-zero-weighted primitive", () => {
    const prims = [mkPrim("a"), mkPrim("b")];
    const weights = { a: 0, b: 1 };
    const rng = () => 0.5;
    expect(sampleByWeight(prims, weights, rng).name).toBe("b");
  });

  it("throws if all weights are zero", () => {
    const prims = [mkPrim("a"), mkPrim("b")];
    const weights = { a: 0, b: 0 };
    const rng = () => 0.5;
    expect(() => sampleByWeight(prims, weights, rng)).toThrow();
  });

  it("respects weight proportions", () => {
    const prims = [mkPrim("a"), mkPrim("b")];
    const weights = { a: 1, b: 3 };
    let aCount = 0;
    const N = 4000;
    let i = 0;
    const rng = () => ((i = (i + 1) % 10000) / 10000);
    for (let k = 0; k < N; k++) if (sampleByWeight(prims, weights, rng).name === "a") aCount++;
    // Expect ~25% a. Allow slack.
    expect(aCount / N).toBeGreaterThan(0.2);
    expect(aCount / N).toBeLessThan(0.3);
  });
});
```

- [ ] **Step 3: Run — expect failure**

Run: `npm test -- primitives-registry`
Expected: FAIL (module missing).

- [ ] **Step 4: Implement registry**

`src/primitives/index.ts`:
```ts
import type { Primitive } from "./types.js";
import type { Rng } from "../rng.js";

const registry: Primitive[] = [];

export function register(p: Primitive): void {
  if (registry.some((r) => r.name === p.name)) {
    throw new Error(`Primitive already registered: ${p.name}`);
  }
  registry.push(p);
}

export function allPrimitives(): readonly Primitive[] {
  return registry;
}

export function getPrimitive(name: string): Primitive {
  const p = registry.find((r) => r.name === name);
  if (!p) throw new Error(`Unknown primitive: ${name}`);
  return p;
}

export function sampleByWeight(
  prims: readonly Primitive[],
  weights: Record<string, number>,
  rng: Rng
): Primitive {
  const active = prims.filter((p) => (weights[p.name] ?? 0) > 0);
  if (active.length === 0) throw new Error("No primitives with weight > 0");
  const total = active.reduce((s, p) => s + (weights[p.name] ?? 0), 0);
  let r = rng() * total;
  for (const p of active) {
    r -= weights[p.name] ?? 0;
    if (r <= 0) return p;
  }
  return active[active.length - 1]!;
}
```

- [ ] **Step 5: Run — expect pass**

Run: `npm test -- primitives-registry`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/primitives/types.ts src/primitives/index.ts tests/primitives-registry.test.ts
git commit -m "feat: primitive registry and weighted sampler"
```

---

## Task 4: Circle primitive (template for others)

**Files:**
- Create: `src/primitives/circle.ts`
- Test: `tests/primitive-circle.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/primitive-circle.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { circle } from "../src/primitives/circle.js";
import { createRng } from "../src/rng.js";

describe("circle primitive", () => {
  it("is deterministic", () => {
    const a = circle.render({ fg: "#111", bg: "#eee", rng: createRng(1), padding: 0 });
    const b = circle.render({ fg: "#111", bg: "#eee", rng: createRng(1), padding: 0 });
    expect(a).toBe(b);
  });

  it("produces a <circle> element with the foreground fill", () => {
    const svg = circle.render({ fg: "#abcdef", bg: "#000", rng: createRng(1), padding: 0 });
    expect(svg).toContain("<circle");
    expect(svg).toContain('fill="#abcdef"');
  });

  it("accepts decorations", () => {
    expect(circle.acceptsDecorations).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- primitive-circle`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/primitives/circle.ts`:
```ts
import type { Primitive } from "./types.js";

export const circle: Primitive = {
  name: "circle",
  defaultWeight: 1,
  acceptsDecorations: true,
  render({ fg, padding }) {
    const r = 50 - padding;
    return `<circle cx="50" cy="50" r="${r}" fill="${fg}" />`;
  },
};
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- primitive-circle`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/primitives/circle.ts tests/primitive-circle.test.ts
git commit -m "feat: circle primitive"
```

---

## Task 5: Remaining primitives

Each primitive is implemented in its own file, exporting a `Primitive` object. Render into a 100×100 viewBox at **0° orientation** (rotation is applied by the renderer, not here). All coordinates account for `padding` by shrinking inward from the edges (valid range for shape: `[padding, 100-padding]`).

**Files:**
- Create: `src/primitives/halfCircle.ts`, `quarterCircle.ts`, `leaf.ts`, `arch.ts`, `concentricArches.ts`, `quarterRound.ts`, `dot.ts`, `plus.ts`, `square.ts`
- Test: `tests/primitives-shapes.test.ts`

- [ ] **Step 1: Write a combined determinism test**

`tests/primitives-shapes.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createRng } from "../src/rng.js";
import { halfCircle } from "../src/primitives/halfCircle.js";
import { quarterCircle } from "../src/primitives/quarterCircle.js";
import { leaf } from "../src/primitives/leaf.js";
import { arch } from "../src/primitives/arch.js";
import { concentricArches } from "../src/primitives/concentricArches.js";
import { quarterRound } from "../src/primitives/quarterRound.js";
import { dot } from "../src/primitives/dot.js";
import { plus } from "../src/primitives/plus.js";
import { square } from "../src/primitives/square.js";

const prims = [halfCircle, quarterCircle, leaf, arch, concentricArches, quarterRound, dot, plus, square];

describe("primitives", () => {
  it.each(prims.map((p) => [p.name, p]))("%s is deterministic", (_name, p) => {
    const a = p.render({ fg: "#111", bg: "#eee", rng: createRng(5), padding: 0 });
    const b = p.render({ fg: "#111", bg: "#eee", rng: createRng(5), padding: 0 });
    expect(a).toBe(b);
  });

  it.each(prims.map((p) => [p.name, p]))("%s output contains the foreground color", (_name, p) => {
    const svg = p.render({ fg: "#abcdef", bg: "#000", rng: createRng(5), padding: 0 });
    expect(svg.toLowerCase()).toContain("#abcdef");
  });

  it.each(prims.map((p) => [p.name, p]))("%s output is non-empty", (_name, p) => {
    const svg = p.render({ fg: "#abcdef", bg: "#000", rng: createRng(5), padding: 0 });
    expect(svg.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- primitives-shapes`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `halfCircle.ts`**

```ts
import type { Primitive } from "./types.js";

export const halfCircle: Primitive = {
  name: "halfCircle",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    // Half-circle on the bottom half of the tile (flat edge at y=50).
    return `<path d="M ${p} 50 A ${50 - p} ${50 - p} 0 0 0 ${100 - p} 50 Z" fill="${fg}" />`;
  },
};
```

- [ ] **Step 4: Implement `quarterCircle.ts`**

```ts
import type { Primitive } from "./types.js";

export const quarterCircle: Primitive = {
  name: "quarterCircle",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    // Quarter circle filling the bottom-left corner.
    const s = 100 - p;
    return `<path d="M ${p} ${p} L ${p} ${s} A ${s - p} ${s - p} 0 0 0 ${s} ${s} Z" fill="${fg}" />`;
  },
};
```

- [ ] **Step 5: Implement `leaf.ts`**

```ts
import type { Primitive } from "./types.js";

export const leaf: Primitive = {
  name: "leaf",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    // Two quarter-arcs: top-left corner pointing in, bottom-right corner pointing in.
    const s = 100 - p;
    const r = s - p;
    // Top-left quarter filling toward center.
    const tl = `<path d="M ${p} ${p} L ${s} ${p} A ${r} ${r} 0 0 0 ${p} ${s} Z" fill="${fg}" />`;
    return tl;
  },
};
```

- [ ] **Step 6: Implement `arch.ts`**

```ts
import type { Primitive } from "./types.js";

export const arch: Primitive = {
  name: "arch",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    // Tall stadium: rect with rounded top.
    const x = 25 + p / 2;
    const w = 50 - p;
    const y = p;
    const h = 100 - 2 * p;
    const rx = w / 2;
    return `<path d="M ${x} ${y + h} L ${x} ${y + rx} A ${rx} ${rx} 0 0 1 ${x + w} ${y + rx} L ${x + w} ${y + h} Z" fill="${fg}" />`;
  },
};
```

- [ ] **Step 7: Implement `concentricArches.ts`**

```ts
import type { Primitive } from "./types.js";

export const concentricArches: Primitive = {
  name: "concentricArches",
  defaultWeight: 0.5,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const rings = 3;
    const strokeW = 3;
    const parts: string[] = [];
    for (let i = 0; i < rings; i++) {
      const inset = p + i * (strokeW * 2.5);
      const x = 25 + inset / 2;
      const w = 50 - inset;
      if (w <= 0) break;
      const y = inset;
      const h = 100 - 2 * inset;
      const rx = w / 2;
      parts.push(
        `<path d="M ${x} ${y + h} L ${x} ${y + rx} A ${rx} ${rx} 0 0 1 ${x + w} ${y + rx} L ${x + w} ${y + h}" fill="none" stroke="${fg}" stroke-width="${strokeW}" />`
      );
    }
    return parts.join("");
  },
};
```

- [ ] **Step 8: Implement `quarterRound.ts`**

```ts
import type { Primitive } from "./types.js";

export const quarterRound: Primitive = {
  name: "quarterRound",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    // Filled square with a single rounded corner (top-right).
    const s = 100 - p;
    const r = s - p;
    return `<path d="M ${p} ${p} L ${s - r} ${p} A ${r} ${r} 0 0 1 ${s} ${p + r} L ${s} ${s} L ${p} ${s} Z" fill="${fg}" />`;
  },
};
```

- [ ] **Step 9: Implement `dot.ts`**

```ts
import type { Primitive } from "./types.js";

export const dot: Primitive = {
  name: "dot",
  defaultWeight: 0.3,
  acceptsDecorations: false,
  render({ fg }) {
    return `<circle cx="50" cy="50" r="8" fill="${fg}" />`;
  },
};
```

- [ ] **Step 10: Implement `plus.ts`**

```ts
import type { Primitive } from "./types.js";

export const plus: Primitive = {
  name: "plus",
  defaultWeight: 0.3,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const armW = 8;
    const armL = 40 - p;
    const cx = 50;
    const cy = 50;
    return [
      `<rect x="${cx - armW / 2}" y="${cy - armL}" width="${armW}" height="${armL * 2}" fill="${fg}" />`,
      `<rect x="${cx - armL}" y="${cy - armW / 2}" width="${armL * 2}" height="${armW}" fill="${fg}" />`,
    ].join("");
  },
};
```

- [ ] **Step 11: Implement `square.ts`**

```ts
import type { Primitive } from "./types.js";

export const square: Primitive = {
  name: "square",
  defaultWeight: 0.5,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const s = 100 - 2 * p;
    return `<rect x="${p}" y="${p}" width="${s}" height="${s}" fill="${fg}" />`;
  },
};
```

- [ ] **Step 12: Run — expect pass**

Run: `npm test -- primitives-shapes`
Expected: all tests pass.

- [ ] **Step 13: Commit**

```bash
git add src/primitives tests/primitives-shapes.test.ts
git commit -m "feat: all remaining primitives"
```

---

## Task 6: Register all primitives

**Files:**
- Modify: `src/primitives/index.ts` (add a bootstrap function)

- [ ] **Step 1: Append to `src/primitives/index.ts`**

Add at the bottom of the file:
```ts
import { circle } from "./circle.js";
import { halfCircle } from "./halfCircle.js";
import { quarterCircle } from "./quarterCircle.js";
import { leaf } from "./leaf.js";
import { arch } from "./arch.js";
import { concentricArches } from "./concentricArches.js";
import { quarterRound } from "./quarterRound.js";
import { dot } from "./dot.js";
import { plus } from "./plus.js";
import { square as squarePrim } from "./square.js";

let bootstrapped = false;
export function bootstrapPrimitives(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  for (const p of [circle, halfCircle, quarterCircle, leaf, arch, concentricArches, quarterRound, dot, plus, squarePrim]) {
    register(p);
  }
}
```

- [ ] **Step 2: Write test**

Append to `tests/primitives-registry.test.ts`:
```ts
import { bootstrapPrimitives, allPrimitives } from "../src/primitives/index.js";

describe("bootstrapPrimitives", () => {
  it("registers the 10 built-in primitives", () => {
    bootstrapPrimitives();
    const names = allPrimitives().map((p) => p.name).sort();
    expect(names).toEqual(
      [
        "arch",
        "circle",
        "concentricArches",
        "dot",
        "halfCircle",
        "leaf",
        "plus",
        "quarterCircle",
        "quarterRound",
        "square",
      ].sort()
    );
  });
});
```

- [ ] **Step 3: Run — expect pass**

Run: `npm test -- primitives-registry`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/primitives/index.ts tests/primitives-registry.test.ts
git commit -m "feat: bootstrap registration of all primitives"
```

---

## Task 7: Decorations

**Files:**
- Create: `src/decorations/index.ts`
- Test: `tests/decorations.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/decorations.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { renderDecoration } from "../src/decorations/index.js";

describe("renderDecoration", () => {
  it("renders a '+' decoration in the given color", () => {
    const out = renderDecoration("plus", "#123456");
    expect(out).toContain("#123456");
    expect(out).toContain("<rect");
  });

  it("renders a 'dot' decoration", () => {
    const out = renderDecoration("dot", "#111");
    expect(out).toContain("<circle");
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- decorations`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/decorations/index.ts`:
```ts
export type DecorationType = "plus" | "dot";

export function renderDecoration(type: DecorationType, color: string): string {
  if (type === "plus") {
    const armW = 2;
    const armL = 6;
    const cx = 50;
    const cy = 50;
    return [
      `<rect x="${cx - armW / 2}" y="${cy - armL}" width="${armW}" height="${armL * 2}" fill="${color}" />`,
      `<rect x="${cx - armL}" y="${cy - armW / 2}" width="${armL * 2}" height="${armW}" fill="${color}" />`,
    ].join("");
  }
  return `<circle cx="50" cy="50" r="3" fill="${color}" />`;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- decorations`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/decorations tests/decorations.test.ts
git commit -m "feat: decoration overlays (+ and dot)"
```

---

## Task 8: Renderer (compose outer SVG)

**Files:**
- Create: `src/renderer.ts`
- Test: `tests/renderer.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/renderer.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { renderTile } from "../src/renderer.js";

describe("renderTile", () => {
  it("wraps content in an outer <svg> with the given resolution", () => {
    const svg = renderTile({
      resolution: 256,
      background: "#fff",
      rotation: 0,
      inner: "<circle cx='50' cy='50' r='10' fill='#000' />",
    });
    expect(svg).toContain(`width="256"`);
    expect(svg).toContain(`height="256"`);
    expect(svg).toContain(`viewBox="0 0 100 100"`);
  });

  it("paints a background <rect> first", () => {
    const svg = renderTile({
      resolution: 100,
      background: "#abcdef",
      rotation: 0,
      inner: "",
    });
    expect(svg).toContain(`<rect x="0" y="0" width="100" height="100" fill="#abcdef"`);
  });

  it("wraps inner in a rotation group when rotation != 0", () => {
    const svg = renderTile({
      resolution: 100,
      background: "#fff",
      rotation: 90,
      inner: "<g/>",
    });
    expect(svg).toContain(`transform="rotate(90 50 50)"`);
  });

  it("omits the rotation group when rotation is 0", () => {
    const svg = renderTile({
      resolution: 100,
      background: "#fff",
      rotation: 0,
      inner: "<g/>",
    });
    expect(svg).not.toContain("rotate(");
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- renderer`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/renderer.ts`:
```ts
export interface TileArgs {
  resolution: number;
  background: string;
  rotation: 0 | 90 | 180 | 270;
  inner: string;
}

export function renderTile(args: TileArgs): string {
  const { resolution, background, rotation, inner } = args;
  const rotated =
    rotation === 0 ? inner : `<g transform="rotate(${rotation} 50 50)">${inner}</g>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${resolution}" height="${resolution}" viewBox="0 0 100 100">`,
    `<rect x="0" y="0" width="100" height="100" fill="${background}" />`,
    rotated,
    `</svg>`,
  ].join("");
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- renderer`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/renderer.ts tests/renderer.test.ts
git commit -m "feat: renderer wraps primitive output in outer SVG"
```

---

## Task 9: Generator orchestration

**Files:**
- Create: `src/generator.ts`
- Test: `tests/generator.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/generator.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateTile, generateBatch } from "../src/generator.js";
import { defaultConfig } from "../src/config.js";

describe("generator", () => {
  it("same config + same seed produces identical output", () => {
    const a = generateTile(defaultConfig, 42);
    const b = generateTile(defaultConfig, 42);
    expect(a.svg).toBe(b.svg);
    expect(a.seed).toBe(42);
  });

  it("respects background='auto' (from palette)", () => {
    const svg = generateTile(defaultConfig, 1).svg;
    const lower = svg.toLowerCase();
    const anyPaletteColor = defaultConfig.palette.some((c) => lower.includes(c.toLowerCase()));
    expect(anyPaletteColor).toBe(true);
  });

  it("respects fixed background color", () => {
    const cfg = { ...defaultConfig, background: "#ff00aa" as const };
    const svg = generateTile(cfg, 1).svg;
    expect(svg.toLowerCase()).toContain("#ff00aa");
  });

  it("fixed rotation always yields 0°", () => {
    const cfg = { ...defaultConfig, rotation: "fixed" as const };
    for (let s = 1; s < 30; s++) {
      expect(generateTile(cfg, s).svg).not.toContain("rotate(");
    }
  });

  it("rotation whitelist never yields excluded angles", () => {
    const cfg = { ...defaultConfig, rotation: [0, 90] as (0 | 90)[] };
    for (let s = 1; s < 50; s++) {
      const svg = generateTile(cfg, s).svg;
      expect(svg).not.toContain("rotate(180");
      expect(svg).not.toContain("rotate(270");
    }
  });

  it("generateBatch produces N tiles with sequential seeds", () => {
    const tiles = generateBatch(defaultConfig, 100, 5);
    expect(tiles.length).toBe(5);
    expect(tiles.map((t) => t.seed)).toEqual([100, 101, 102, 103, 104]);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- generator`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/generator.ts`:
```ts
import type { Config } from "./config.js";
import { createRng, randomSeed, pick } from "./rng.js";
import { allPrimitives, bootstrapPrimitives, sampleByWeight } from "./primitives/index.js";
import { renderTile } from "./renderer.js";
import { renderDecoration, type DecorationType } from "./decorations/index.js";

export interface GeneratedTile {
  svg: string;
  seed: number;
}

const CARDINALS = [0, 90, 180, 270] as const;
type Cardinal = (typeof CARDINALS)[number];

function pickRotation(cfg: Config, rng: () => number): Cardinal {
  if (cfg.rotation === "fixed") return 0;
  if (cfg.rotation === "random") return pick(rng, CARDINALS);
  return pick(rng, cfg.rotation);
}

function pickBackground(cfg: Config, rng: () => number): string {
  if (cfg.background === "auto") return pick(rng, cfg.palette);
  return cfg.background;
}

function pickForeground(palette: readonly string[], bg: string, rng: () => number): string {
  const options = palette.filter((c) => c.toLowerCase() !== bg.toLowerCase());
  if (options.length === 0) throw new Error("Palette has no foreground option distinct from background");
  return pick(rng, options);
}

export function generateTile(cfg: Config, seedOverride?: number): GeneratedTile {
  bootstrapPrimitives();
  const seed = seedOverride ?? cfg.seed ?? randomSeed();
  const rng = createRng(seed);

  const bg = pickBackground(cfg, rng);
  const weights = Object.fromEntries(
    Object.entries(cfg.shapes).map(([k, v]) => [k, v.weight])
  );
  const prim = sampleByWeight(allPrimitives(), weights, rng);
  const fg = pickForeground(cfg.palette, bg, rng);
  const rotation = pickRotation(cfg, rng);

  let inner = prim.render({ fg, bg, rng, padding: cfg.padding });

  if (
    cfg.decorations.enabled &&
    prim.acceptsDecorations &&
    rng() < cfg.decorations.probability
  ) {
    const deco = pick(rng, cfg.decorations.types) as DecorationType;
    const decoColor = pickForeground(cfg.palette, fg, rng);
    inner += renderDecoration(deco, decoColor);
  }

  const svg = renderTile({ resolution: cfg.resolution, background: bg, rotation, inner });
  return { svg, seed };
}

export function generateBatch(cfg: Config, startSeed: number, count: number): GeneratedTile[] {
  const out: GeneratedTile[] = [];
  for (let i = 0; i < count; i++) {
    out.push(generateTile(cfg, startSeed + i));
  }
  return out;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- generator`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/generator.ts tests/generator.test.ts
git commit -m "feat: generator orchestration (tile and batch)"
```

---

## Task 10: Presets

**Files:**
- Create: `presets/bauhaus-red.json`, `presets/mono.json`

- [ ] **Step 1: Create `presets/bauhaus-red.json`**

```json
{
  "palette": ["#C4402E", "#1A1A1A", "#E8D4A8"],
  "background": "auto",
  "rotation": "random",
  "decorations": { "enabled": true, "probability": 0.25, "types": ["plus", "dot"] },
  "padding": 0
}
```

- [ ] **Step 2: Create `presets/mono.json`**

```json
{
  "palette": ["#F2F2F2", "#1A1A1A"],
  "background": "#F2F2F2",
  "rotation": "random",
  "decorations": { "enabled": false, "probability": 0, "types": ["dot"] },
  "padding": 4
}
```

- [ ] **Step 3: Commit**

```bash
git add presets/
git commit -m "feat: bauhaus-red and mono presets"
```

---

## Task 11: CLI

**Files:**
- Create: `src/cli.ts`
- Test: `tests/cli.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/cli.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseArgs } from "../src/cli.js";

describe("parseArgs", () => {
  it("parses defaults", () => {
    const a = parseArgs([]);
    expect(a.out).toBe("./output");
    expect(a.count).toBe(1);
    expect(a.seed).toBeNull();
    expect(a.preset).toBeNull();
    expect(a.configPath).toBe("./config.json");
  });

  it("parses all flags", () => {
    const a = parseArgs(["--config", "x.json", "--preset", "p", "--seed", "7", "--count", "3", "--out", "o"]);
    expect(a.configPath).toBe("x.json");
    expect(a.preset).toBe("p");
    expect(a.seed).toBe(7);
    expect(a.count).toBe(3);
    expect(a.out).toBe("o");
  });

  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--bogus"])).toThrow();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- cli`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/cli.ts`:
```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import {
  ConfigSchema,
  defaultConfig,
  loadJsonFile,
  mergeConfig,
  type PartialConfig,
} from "./config.js";
import { generateBatch } from "./generator.js";
import { randomSeed } from "./rng.js";

export interface CliArgs {
  configPath: string;
  preset: string | null;
  seed: number | null;
  count: number;
  out: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    configPath: "./config.json",
    preset: null,
    seed: null,
    count: 1,
    out: "./output",
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    switch (flag) {
      case "--config": args.configPath = String(val); i++; break;
      case "--preset": args.preset = String(val); i++; break;
      case "--seed":   args.seed = Number(val); i++; break;
      case "--count":  args.count = Number(val); i++; break;
      case "--out":    args.out = String(val); i++; break;
      default: throw new Error(`Unknown flag: ${flag}`);
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const base = defaultConfig;
  const fileCfg: PartialConfig = existsSync(args.configPath)
    ? ((await loadJsonFile(args.configPath)) as PartialConfig)
    : {};
  const presetCfg: PartialConfig = args.preset
    ? ((await loadJsonFile(resolve("presets", `${args.preset}.json`))) as PartialConfig)
    : {};
  const overrides: PartialConfig = args.seed !== null ? { seed: args.seed } : {};

  const cfg = mergeConfig(mergeConfig(base, fileCfg, {}), presetCfg, overrides);
  ConfigSchema.parse(cfg);

  const start = cfg.seed ?? randomSeed();
  const tiles = generateBatch(cfg, start, args.count);

  await mkdir(args.out, { recursive: true });
  for (const t of tiles) {
    const file = join(args.out, `tile-${t.seed}.svg`);
    await writeFile(file, t.svg, "utf8");
    console.log(file);
  }
}

const isDirect = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`;
if (isDirect) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- cli`
Expected: 3 tests pass.

- [ ] **Step 5: Manual smoke test — generate a tile**

Run: `npx tsx src/cli.ts --seed 1 --count 1`
Expected: file `output/tile-1.svg` exists. Open it in a browser — should render a shape.

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: CLI entry with arg parsing and file output"
```

---

## Task 12: Express server

**Files:**
- Create: `src/server.ts`
- Test: `tests/server.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/server.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createApp } from "../src/server.js";
import { defaultConfig } from "../src/config.js";

async function req(app: ReturnType<typeof createApp>, method: string, path: string, body?: unknown) {
  const { createServer } = await import("node:http");
  return await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const srv = createServer(app);
    srv.listen(0, () => {
      const port = (srv.address() as { port: number }).port;
      fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
        .then(async (r) => ({ status: r.status, body: await r.text() }))
        .then((r) => { srv.close(); resolve(r); })
        .catch((e) => { srv.close(); reject(e); });
    });
  });
}

describe("server", () => {
  it("GET /api/presets returns an array", async () => {
    const app = createApp({ presetsDir: "./presets", outputDir: "./output" });
    const r = await req(app, "GET", "/api/presets");
    expect(r.status).toBe(200);
    const list = JSON.parse(r.body);
    expect(Array.isArray(list)).toBe(true);
  });

  it("POST /api/generate writes files and returns seeds", async () => {
    const app = createApp({ presetsDir: "./presets", outputDir: "./output" });
    const r = await req(app, "POST", "/api/generate", { config: { ...defaultConfig, seed: 999 }, count: 2 });
    expect(r.status).toBe(200);
    const out = JSON.parse(r.body) as { filename: string; seed: number }[];
    expect(out.length).toBe(2);
    expect(out[0].seed).toBe(999);
    expect(out[1].seed).toBe(1000);
  });

  it("POST /api/generate returns 400 on invalid config", async () => {
    const app = createApp({ presetsDir: "./presets", outputDir: "./output" });
    const r = await req(app, "POST", "/api/generate", { config: { bad: true }, count: 1 });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- server`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/server.ts`:
```ts
import express, { type Express } from "express";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { exec } from "node:child_process";
import { ConfigSchema, loadJsonFile } from "./config.js";
import { generateBatch } from "./generator.js";
import { randomSeed } from "./rng.js";

export interface ServerOptions {
  presetsDir: string;
  outputDir: string;
}

export function createApp(opts: ServerOptions): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/presets", async (_req, res) => {
    try {
      const files = await readdir(opts.presetsDir);
      const names = files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
      res.json(names.map((name) => ({ name })));
    } catch {
      res.json([]);
    }
  });

  app.get("/api/preset/:name", async (req, res) => {
    const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, "");
    try {
      const body = await loadJsonFile(join(opts.presetsDir, `${name}.json`));
      res.json(body);
    } catch {
      res.status(404).json({ error: `Preset not found: ${name}` });
    }
  });

  app.post("/api/generate", async (req, res) => {
    const parsed = ConfigSchema.safeParse(req.body?.config);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.format() });
      return;
    }
    const cfg = parsed.data;
    const count = Math.max(1, Math.min(50, Number(req.body?.count ?? 1)));
    const start = cfg.seed ?? randomSeed();
    const tiles = generateBatch(cfg, start, count);

    await mkdir(opts.outputDir, { recursive: true });
    const results: { filename: string; seed: number }[] = [];
    for (const t of tiles) {
      const filename = `tile-${t.seed}.svg`;
      await writeFile(join(opts.outputDir, filename), t.svg, "utf8");
      results.push({ filename, seed: t.seed });
    }
    res.json(results);
  });

  app.post("/api/open-output", (_req, res) => {
    if (process.platform !== "win32") {
      res.status(501).json({ error: "Only supported on Windows" });
      return;
    }
    exec(`explorer "${resolve(opts.outputDir)}"`);
    res.json({ ok: true });
  });

  app.use("/output", express.static(opts.outputDir));
  app.use("/", express.static("public"));

  return app;
}

const isDirect = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`;
if (isDirect) {
  const app = createApp({ presetsDir: "./presets", outputDir: "./output" });
  const port = 3000;
  app.listen(port, () => {
    console.log(`Art generator running at http://localhost:${port}`);
  });
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- server`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "feat: express server with generate/presets/open-output endpoints"
```

---

## Task 13: Web UI

**Files:**
- Create: `public/index.html`, `public/styles.css`, `public/app.js`

- [ ] **Step 1: Create `public/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Abstract Art Generator</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <aside id="controls">
      <h1>Art Generator</h1>

      <label>Preset
        <select id="preset"><option value="">(none)</option></select>
      </label>

      <label>Resolution
        <input type="number" id="resolution" min="64" max="4096" value="1024" />
      </label>

      <label>Seed
        <span class="row">
          <input type="number" id="seed" placeholder="(random)" />
          <button type="button" id="randomize">🎲</button>
        </span>
      </label>

      <label>Count
        <input type="number" id="count" min="1" max="50" value="6" />
      </label>

      <fieldset>
        <legend>Palette</legend>
        <div id="palette"></div>
        <button type="button" id="add-color">+ Add color</button>
      </fieldset>

      <fieldset>
        <legend>Shapes</legend>
        <div id="shapes"></div>
      </fieldset>

      <fieldset>
        <legend>Rotation</legend>
        <label><input type="radio" name="rot" value="random" checked /> Random</label>
        <label><input type="radio" name="rot" value="fixed" /> Fixed (0°)</label>
        <label><input type="radio" name="rot" value="custom" /> Custom</label>
        <div id="rot-custom" hidden>
          <label><input type="checkbox" class="rot-angle" value="0" checked /> 0°</label>
          <label><input type="checkbox" class="rot-angle" value="90" checked /> 90°</label>
          <label><input type="checkbox" class="rot-angle" value="180" /> 180°</label>
          <label><input type="checkbox" class="rot-angle" value="270" /> 270°</label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Decorations</legend>
        <label><input type="checkbox" id="deco-enabled" checked /> Enabled</label>
        <label>Probability <input type="range" id="deco-prob" min="0" max="1" step="0.05" value="0.2" /></label>
      </fieldset>

      <div class="row">
        <button type="button" id="generate">Generate</button>
        <button type="button" id="open-output">Open folder</button>
      </div>
    </aside>

    <main id="preview"></main>

    <script src="app.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `public/styles.css`**

```css
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; background: #111; color: #eee; }
body { display: grid; grid-template-columns: 320px 1fr; }
#controls { padding: 16px; background: #1a1a1a; overflow-y: auto; height: 100vh; }
#controls h1 { font-size: 18px; margin: 0 0 12px; }
#controls label { display: block; margin: 8px 0; font-size: 13px; }
#controls input[type=number], #controls select { width: 100%; padding: 4px 6px; background: #222; color: #eee; border: 1px solid #333; }
#controls fieldset { border: 1px solid #333; margin: 12px 0; padding: 8px; }
#controls legend { font-size: 12px; text-transform: uppercase; color: #aaa; }
#controls .row { display: flex; gap: 6px; align-items: center; }
#controls button { padding: 6px 10px; background: #333; color: #eee; border: 1px solid #444; cursor: pointer; }
#controls button:hover { background: #444; }
#palette { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
#palette .swatch { display: flex; gap: 2px; }
#palette input[type=color] { width: 32px; height: 32px; padding: 0; border: none; background: none; }
#palette .remove { padding: 2px 6px; }
#shapes .shape-row { display: flex; align-items: center; gap: 8px; margin: 2px 0; font-size: 12px; }
#shapes .shape-row span { flex: 0 0 110px; }
#shapes .shape-row input { flex: 1; }

main { padding: 16px; overflow-y: auto; height: 100vh; }
#preview { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.tile { background: #000; border: 1px solid #222; padding: 8px; }
.tile svg { width: 100%; height: auto; display: block; }
.tile .meta { margin-top: 6px; font-size: 11px; display: flex; justify-content: space-between; color: #888; }
.tile .meta button { padding: 2px 6px; font-size: 11px; }
```

- [ ] **Step 3: Create `public/app.js`**

```js
const SHAPE_KEYS = [
  "circle","halfCircle","quarterCircle","leaf","arch",
  "concentricArches","quarterRound","dot","plus","square",
];

const DEFAULT_CFG = {
  resolution: 1024,
  seed: null,
  palette: ["#C4402E", "#1A1A1A", "#E8D4A8"],
  background: "auto",
  shapes: Object.fromEntries(SHAPE_KEYS.map(k => [k, { weight: 1 }])),
  rotation: "random",
  decorations: { enabled: true, probability: 0.2, types: ["plus", "dot"] },
  padding: 0,
};

const state = structuredClone(DEFAULT_CFG);

function el(id) { return document.getElementById(id); }

function renderPalette() {
  const box = el("palette");
  box.innerHTML = "";
  state.palette.forEach((c, i) => {
    const wrap = document.createElement("div");
    wrap.className = "swatch";
    const input = document.createElement("input");
    input.type = "color";
    input.value = c;
    input.oninput = () => { state.palette[i] = input.value; };
    const rm = document.createElement("button");
    rm.className = "remove";
    rm.textContent = "×";
    rm.onclick = () => {
      if (state.palette.length <= 2) return;
      state.palette.splice(i, 1);
      renderPalette();
    };
    wrap.appendChild(input);
    wrap.appendChild(rm);
    box.appendChild(wrap);
  });
}

function renderShapes() {
  const box = el("shapes");
  box.innerHTML = "";
  SHAPE_KEYS.forEach((k) => {
    const row = document.createElement("div");
    row.className = "shape-row";
    const label = document.createElement("span");
    label.textContent = k;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0"; slider.max = "2"; slider.step = "0.1";
    slider.value = String(state.shapes[k].weight);
    const out = document.createElement("span");
    out.style.flex = "0 0 30px";
    out.textContent = slider.value;
    slider.oninput = () => {
      state.shapes[k].weight = Number(slider.value);
      out.textContent = slider.value;
    };
    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(out);
    box.appendChild(row);
  });
}

function readRotation() {
  const sel = document.querySelector('input[name="rot"]:checked').value;
  if (sel === "random") return "random";
  if (sel === "fixed") return "fixed";
  const angles = Array.from(document.querySelectorAll(".rot-angle"))
    .filter(x => x.checked).map(x => Number(x.value));
  return angles.length ? angles : "random";
}

async function loadPresets() {
  const list = await fetch("/api/presets").then(r => r.json());
  const sel = el("preset");
  list.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.name; opt.textContent = p.name;
    sel.appendChild(opt);
  });
  sel.onchange = async () => {
    if (!sel.value) return;
    const preset = await fetch(`/api/preset/${sel.value}`).then(r => r.json());
    Object.assign(state, { ...DEFAULT_CFG, ...preset,
      shapes: { ...DEFAULT_CFG.shapes, ...(preset.shapes || {}) },
      decorations: { ...DEFAULT_CFG.decorations, ...(preset.decorations || {}) },
    });
    syncFormFromState();
  };
}

function syncFormFromState() {
  el("resolution").value = state.resolution;
  el("seed").value = state.seed ?? "";
  el("deco-enabled").checked = state.decorations.enabled;
  el("deco-prob").value = state.decorations.probability;
  renderPalette();
  renderShapes();
}

function buildConfig() {
  const seedRaw = el("seed").value;
  return {
    ...state,
    resolution: Number(el("resolution").value),
    seed: seedRaw === "" ? null : Number(seedRaw),
    rotation: readRotation(),
    decorations: {
      ...state.decorations,
      enabled: el("deco-enabled").checked,
      probability: Number(el("deco-prob").value),
    },
  };
}

async function generate() {
  const count = Math.max(1, Math.min(50, Number(el("count").value)));
  const config = buildConfig();
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, count }),
  });
  if (!res.ok) {
    const err = await res.text();
    alert("Generate failed:\n" + err);
    return;
  }
  const tiles = await res.json();
  renderPreview(tiles);
}

async function renderPreview(tiles) {
  const box = el("preview");
  box.innerHTML = "";
  for (const t of tiles) {
    const svgText = await fetch(`/output/${t.filename}?_=${Date.now()}`).then(r => r.text());
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = svgText;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span>seed ${t.seed}</span>`;
    const copy = document.createElement("button");
    copy.textContent = "Copy seed";
    copy.onclick = () => navigator.clipboard.writeText(String(t.seed));
    meta.appendChild(copy);
    tile.appendChild(meta);
    box.appendChild(tile);
  }
}

document.querySelectorAll('input[name="rot"]').forEach(r => {
  r.addEventListener("change", () => {
    el("rot-custom").hidden = r.value !== "custom" || !r.checked;
  });
});

el("add-color").onclick = () => { state.palette.push("#888888"); renderPalette(); };
el("randomize").onclick = () => { el("seed").value = ""; };
el("generate").onclick = generate;
el("open-output").onclick = () => fetch("/api/open-output", { method: "POST" });

syncFormFromState();
loadPresets();
```

- [ ] **Step 4: Manual smoke test**

Run: `npx tsx src/server.ts`
Open: `http://localhost:3000` in a browser.
- Click "Generate" — preview tiles appear.
- Change palette colors, click Generate again — new tiles use new colors.
- Select a preset — form updates.

Stop the server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add public/
git commit -m "feat: web UI (vanilla HTML/CSS/JS)"
```

---

## Task 14: `run.bat` launcher

**Files:**
- Create: `run.bat`

- [ ] **Step 1: Create `run.bat`**

```bat
@echo off
setlocal

cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)

if not exist dist\server.js (
  echo Building...
  call npm run build
  if errorlevel 1 goto :error
)

echo Starting server on http://localhost:3000
start "" http://localhost:3000
node dist/server.js
goto :eof

:error
echo.
echo Failed. Press any key to exit.
pause >nul
exit /b 1
```

- [ ] **Step 2: Manual smoke test**

Double-click `run.bat`. A browser window should open at `http://localhost:3000` showing the UI.

- [ ] **Step 3: Commit**

```bash
git add run.bat
git commit -m "feat: Windows run.bat launcher"
```

---

## Task 15: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Generate a batch via CLI**

Run: `npx tsx src/cli.ts --preset bauhaus-red --seed 1 --count 10`
Expected: 10 SVG files in `output/`, named `tile-1.svg` … `tile-10.svg`. Open a few in a browser — they should resemble the reference tiles.

- [ ] **Step 3: Verify reproducibility**

Run the same CLI command again. New SVGs should be byte-identical to the previous run. Check with:
Run: `git diff --no-index output/tile-1.svg` (after overwriting — the files should not change).

- [ ] **Step 4: Final commit if anything changed**

```bash
git status
# If clean, nothing to do. Otherwise:
git add -A
git commit -m "chore: final pass"
```
