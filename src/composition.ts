import type { Config, Anchor } from "./config.js";
import { allPrimitives, sampleByWeight } from "./primitives/index.js";
import type { Primitive } from "./primitives/types.js";
import { pick, type Rng } from "./rng.js";

export const STRATEGIES = ["single", "hero-accent", "four-corner", "opposite-pair", "layered"] as const;
export type Strategy = (typeof STRATEGIES)[number];
export type SymmetryStrategy = "four-corner" | "opposite-pair";

const ACCENT_ANCHORS: readonly Anchor[] = [
  "top-left", "top-right",
  "center",
  "bottom-left", "bottom-right",
];

const ANCHOR_OFFSET: Record<Anchor, [number, number]> = {
  "top-left": [0, 0], "top": [0.5, 0], "top-right": [1, 0],
  "left": [0, 0.5], "center": [0.5, 0.5], "right": [1, 0.5],
  "bottom-left": [0, 1], "bottom": [0.5, 1], "bottom-right": [1, 1],
};

const ACCENT_NAMES = ["dot", "plus"] as const;
const SYMMETRY_NAMES = ["leaf"] as const;
const ACCENT_SCALE = 0.15;
const SYMMETRY_SCALE = 0.5;
const COLOR_POP_PROBABILITY = 0.35;
const TILE_PADDING = 6;
const PADDED_HERO_NAMES = new Set(["circle", "halfCircle"]);

const isAccent = (p: Primitive) => (ACCENT_NAMES as readonly string[]).includes(p.name);
const isSymmetry = (p: Primitive) => (SYMMETRY_NAMES as readonly string[]).includes(p.name);

interface Rect { x: number; y: number; w: number; h: number; }

const HERO_BBOX: Record<string, Rect> = {
  circle: { x: 0, y: 0, w: 100, h: 100 },
  leaf: { x: 0, y: 0, w: 100, h: 100 },
  concentricBands: { x: 10, y: 0, w: 80, h: 88 },
  halfCircle: { x: 0, y: 0, w: 100, h: 50 },
  arch: { x: 25, y: 0, w: 50, h: 100 },
  quarterRound: { x: 52, y: 0, w: 48, h: 88 },
};

function bboxFor(prim: Primitive): Rect {
  return HERO_BBOX[prim.name] ?? { x: 0, y: 0, w: 100, h: 100 };
}

function anchorBbox(anchor: Anchor, scale: number): Rect {
  const [ax, ay] = ANCHOR_OFFSET[anchor];
  const size = 100 * scale;
  return { x: ax * (100 - size), y: ay * (100 - size), w: size, h: size };
}

function rectContains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h;
}

function rectsDisjoint(a: Rect, b: Rect): boolean {
  return a.x + a.w <= b.x || b.x + b.w <= a.x ||
    a.y + a.h <= b.y || b.y + b.h <= a.y;
}

function nonPartialAnchors(heroBox: Rect, scale: number, candidates: readonly Anchor[]): Anchor[] {
  return candidates.filter((a) => {
    const ab = anchorBbox(a, scale);
    return rectContains(heroBox, ab) || rectsDisjoint(ab, heroBox);
  });
}

export function placeAccent(inner: string, anchor: Anchor, scale: number = ACCENT_SCALE): string {
  const [ax, ay] = ANCHOR_OFFSET[anchor];
  const size = 100 * scale;
  const x = ax * (100 - size);
  const y = ay * (100 - size);
  return `<g transform="translate(${x} ${y}) scale(${scale})">${inner}</g>`;
}

function withTilePadding(inner: string, padding: number): string {
  if (padding <= 0) return inner;
  const scale = (100 - 2 * padding) / 100;
  return `<g transform="translate(${padding} ${padding}) scale(${scale})">${inner}</g>`;
}

function placeAtCorner(inner: string, cx: number, cy: number, scale: number, rotateDeg: number): string {
  const parts = [`translate(${cx} ${cy})`];
  if (rotateDeg !== 0) parts.push(`rotate(${rotateDeg})`);
  parts.push(`scale(${scale})`);
  return `<g transform="${parts.join(" ")}">${inner}</g>`;
}

function pickColorExcluding(palette: readonly string[], exclude: readonly string[], rng: Rng): string {
  const ex = new Set(exclude.map((c) => c.toLowerCase()));
  const options = palette.filter((c) => !ex.has(c.toLowerCase()));
  if (options.length === 0) throw new Error("No palette color distinct from excludes");
  return pick(rng, options);
}

function tryPickColorExcluding(palette: readonly string[], exclude: readonly string[], rng: Rng): string | null {
  try { return pickColorExcluding(palette, exclude, rng); } catch { return null; }
}

function weightsFromConfig(cfg: Config): Record<string, number> {
  return Object.fromEntries(Object.entries(cfg.shapes).map(([k, v]) => [k, v.weight]));
}

function findPrimitive(name: string): Primitive | null {
  return allPrimitives().find((p) => p.name === name) ?? null;
}

export interface ComposeContext {
  cfg: Config;
  rng: Rng;
  bgColors: string[];
  primaryBg: string;
}

export interface ComposeResult {
  inner: string;
  strategy: Strategy;
  primaryFg: string;
  acceptsDecorations: boolean;
}

export function pickStrategy(cfg: Config, rng: Rng): Strategy {
  const w = cfg.composition.weights;
  const total = STRATEGIES.reduce((s, k) => s + w[k], 0);
  if (total <= 0) return "single";
  let r = rng() * total;
  for (const k of STRATEGIES) {
    r -= w[k];
    if (r <= 0) return k;
  }
  return "single";
}

function pickHero(ctx: ComposeContext, exclude: readonly string[] = ctx.bgColors): { prim: Primitive; fg: string } | null {
  const heroCandidates = allPrimitives().filter((p) => !isAccent(p));
  const weights = weightsFromConfig(ctx.cfg);
  const active = heroCandidates.filter((p) => (weights[p.name] ?? 0) > 0);
  if (active.length === 0) return null;
  const prim = sampleByWeight(heroCandidates, weights, ctx.rng);
  const fg = pickColorExcluding(ctx.cfg.palette, exclude, ctx.rng);
  return { prim, fg };
}

function composeSingle(ctx: ComposeContext): ComposeResult {
  const hero = pickHero(ctx);
  if (!hero) throw new Error("No hero primitive available (all weights zero or only accent shapes enabled)");
  let inner = hero.prim.render({ fg: hero.fg, bg: ctx.primaryBg, rng: ctx.rng, padding: ctx.cfg.padding });
  if (PADDED_HERO_NAMES.has(hero.prim.name)) inner = withTilePadding(inner, TILE_PADDING);
  return { inner, strategy: "single", primaryFg: hero.fg, acceptsDecorations: hero.prim.acceptsDecorations };
}

function composeHeroAccent(ctx: ComposeContext): ComposeResult {
  const hero = pickHero(ctx);
  if (!hero) return composeSingle(ctx);
  const heroInner = hero.prim.render({ fg: hero.fg, bg: ctx.primaryBg, rng: ctx.rng, padding: ctx.cfg.padding });

  const shapeWeights = weightsFromConfig(ctx.cfg);
  const accentPrims = allPrimitives().filter((p) => isAccent(p) && (shapeWeights[p.name] ?? 0) > 0);
  const heroBox = bboxFor(hero.prim);
  const validAnchors = nonPartialAnchors(heroBox, ACCENT_SCALE, ACCENT_ANCHORS);
  const accentCount = accentPrims.length === 0 || validAnchors.length === 0 ? 0 : 1;
  const accentParts: string[] = [];
  for (let i = 0; i < accentCount; i++) {
    const ap = pick(ctx.rng, accentPrims);
    const aanchor = pick(ctx.rng, validAnchors);
    const accentBox = anchorBbox(aanchor, ACCENT_SCALE);
    const onTopOfHero = rectContains(heroBox, accentBox);
    const exclude = onTopOfHero ? [hero.fg] : ctx.bgColors;
    const afg = tryPickColorExcluding(ctx.cfg.palette, exclude, ctx.rng) ?? hero.fg;
    const raw = ap.render({ fg: afg, bg: ctx.primaryBg, rng: ctx.rng, padding: ctx.cfg.padding });
    accentParts.push(placeAccent(raw, aanchor));
  }
  return {
    inner: heroInner + accentParts.join(""),
    strategy: "hero-accent",
    primaryFg: hero.fg,
    acceptsDecorations: false,
  };
}

interface SymmetryRender {
  inner: string;
  fg: string;
}

function renderSymmetry(
  ctx: ComposeContext,
  strategy: SymmetryStrategy,
  excludeColors: readonly string[],
  forceFacingOut = false,
): SymmetryRender | null {
  const candidates = allPrimitives().filter(isSymmetry);
  const weights = weightsFromConfig(ctx.cfg);
  const active = candidates.filter((p) => (weights[p.name] ?? 0) > 0);
  if (active.length === 0) return null;

  const prim = sampleByWeight(candidates, weights, ctx.rng);
  const fg = tryPickColorExcluding(ctx.cfg.palette, excludeColors, ctx.rng);
  if (!fg) return null;

  let placements: [number, number, number][];
  let scale = SYMMETRY_SCALE;
  let popIdx = -1;
  let popColor: string | null = null;

  if (strategy === "four-corner") {
    const facingOut = forceFacingOut || ctx.rng() < 0.5;
    if (facingOut) {
      placements = [[0, 0, 0], [100, 0, 90], [100, 100, 180], [0, 100, 270]];
    } else {
      scale = SYMMETRY_SCALE * 0.9;
      const off = Math.round(100 * (1 - scale));
      placements = [[0, 0, 0], [off, 0, 0], [off, off, 0], [0, off, 0]];
      if (ctx.rng() < COLOR_POP_PROBABILITY) {
        popColor = tryPickColorExcluding(ctx.cfg.palette, [...excludeColors, fg], ctx.rng);
        if (popColor) popIdx = Math.floor(ctx.rng() * placements.length);
      }
    }
  } else {
    const diag1 = ctx.rng() < 0.5;
    placements = diag1
      ? [[0, 0, 0], [100, 100, 180]]
      : [[100, 0, 90], [0, 100, 270]];
  }

  const inner = placements.map(([cx, cy, rot], i) => {
    const color = (i === popIdx && popColor) ? popColor : fg;
    const raw = prim.render({ fg: color, bg: ctx.primaryBg, rng: ctx.rng, padding: ctx.cfg.padding });
    return placeAtCorner(raw, cx, cy, scale, rot);
  }).join("");

  return { inner, fg };
}

function composeSymmetry(ctx: ComposeContext, strategy: SymmetryStrategy): ComposeResult {
  const result = renderSymmetry(ctx, strategy, ctx.bgColors);
  if (!result) return composeSingle(ctx);
  return { inner: withTilePadding(result.inner, TILE_PADDING), strategy, primaryFg: result.fg, acceptsDecorations: false };
}

function composeLayered(ctx: ComposeContext): ComposeResult {
  const backdrop = findPrimitive("circle");
  if (!backdrop) return composeSingle(ctx);
  const weights = weightsFromConfig(ctx.cfg);
  if ((weights["circle"] ?? 0) <= 0) return composeSingle(ctx);

  const bdColor = tryPickColorExcluding(ctx.cfg.palette, ctx.bgColors, ctx.rng);
  if (!bdColor) return composeSingle(ctx);
  const bdInner = backdrop.render({ fg: bdColor, bg: ctx.primaryBg, rng: ctx.rng, padding: ctx.cfg.padding });

  const subModes = ["four-corner", "halfCircle"] as const;
  const sub = pick(ctx.rng, subModes);
  const exclude = [...ctx.bgColors, bdColor];

  let fgInner = "";
  if (sub === "four-corner") {
    const result = renderSymmetry(ctx, "four-corner", exclude, true);
    if (!result) return { inner: bdInner, strategy: "layered", primaryFg: bdColor, acceptsDecorations: false };
    fgInner = result.inner;
  } else {
    const hc = findPrimitive("halfCircle");
    if (hc && (weights["halfCircle"] ?? 0) > 0) {
      const fgColor = tryPickColorExcluding(ctx.cfg.palette, exclude, ctx.rng);
      if (fgColor) {
        fgInner = hc.render({ fg: fgColor, bg: ctx.primaryBg, rng: ctx.rng, padding: ctx.cfg.padding });
      }
    }
  }

  return {
    inner: bdInner + fgInner,
    strategy: "layered",
    primaryFg: bdColor,
    acceptsDecorations: false,
  };
}

export function compose(ctx: ComposeContext): ComposeResult {
  const strategy = pickStrategy(ctx.cfg, ctx.rng);
  switch (strategy) {
    case "single": return composeSingle(ctx);
    case "hero-accent": return composeHeroAccent(ctx);
    case "four-corner": return composeSymmetry(ctx, "four-corner");
    case "opposite-pair": return composeSymmetry(ctx, "opposite-pair");
    case "layered": return composeLayered(ctx);
  }
}

export function pickAccentAnchor(rng: Rng): Anchor {
  return pick(rng, ACCENT_ANCHORS);
}
