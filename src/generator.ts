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
