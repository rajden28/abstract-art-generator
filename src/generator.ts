import type { Config } from "./config.js";
import { createRng, randomSeed, pick } from "./rng.js";
import { bootstrapPrimitives } from "./primitives/index.js";
import { renderTile, type Background } from "./renderer.js";
import { compose } from "./composition.js";

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

function pickBackground(cfg: Config, rng: () => number): Background {
  let mode = cfg.background;
  if (mode === "random") {
    mode = pick(rng, ["auto", "split-h", "split-v"] as const);
  }
  if (mode === "split-h" || mode === "split-v") {
    if (cfg.palette.length < 2) throw new Error("Split background requires at least 2 palette colors");
    const c1 = pick(rng, cfg.palette);
    const rest = cfg.palette.filter((c) => c.toLowerCase() !== c1.toLowerCase());
    const c2 = pick(rng, rest);
    const dir = mode === "split-h" ? "h" : "v";
    return { mode: "split", dir, colors: [c1, c2] };
  }
  const color = mode === "auto" ? pick(rng, cfg.palette) : mode;
  return { mode: "solid", color };
}

export function generateTile(cfg: Config, seedOverride?: number): GeneratedTile {
  bootstrapPrimitives();
  const seed = seedOverride ?? cfg.seed ?? randomSeed();
  const rng = createRng(seed);

  const bg = pickBackground(cfg, rng);
  const bgColors = bg.mode === "solid" ? [bg.color] : [...bg.colors];
  const primaryBg = bgColors[0]!;
  const rotation = pickRotation(cfg, rng);

  const result = compose({ cfg, rng, bgColors, primaryBg });
  const svg = renderTile({ resolution: cfg.resolution, background: bg, rotation, inner: result.inner });
  return { svg, seed };
}

export function generateBatch(cfg: Config, startSeed: number, count: number): GeneratedTile[] {
  const out: GeneratedTile[] = [];
  for (let i = 0; i < count; i++) {
    out.push(generateTile(cfg, startSeed + i));
  }
  return out;
}
