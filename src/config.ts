import { z } from "zod";

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const hex = z.string().regex(HEX, "must be a hex color like #RRGGBB");

const ShapeKeys = [
  "circle",
  "halfCircle",
  "leaf",
  "arch",
  "concentricBands",
  "quarterRound",
  "dot",
  "plus",
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

const AnchorSchema = z.enum([
  "center",
  "top-left", "top", "top-right",
  "left", "right",
  "bottom-left", "bottom", "bottom-right",
]);
export type Anchor = z.infer<typeof AnchorSchema>;

const CompositionSchema = z.object({
  weights: z.object({
    "single": z.number().min(0),
    "hero-accent": z.number().min(0),
    "four-corner": z.number().min(0),
    "opposite-pair": z.number().min(0),
    "layered": z.number().min(0),
  }),
});

export const ConfigSchema = z
  .object({
    resolution: z.number().int().positive(),
    seed: z.number().int().nullable(),
    palette: z.array(hex).min(2),
    background: z.union([
      z.literal("auto"),
      z.literal("random"),
      z.literal("split-h"),
      z.literal("split-v"),
      hex,
    ]),
    shapes: ShapesSchema,
    rotation: RotationSchema,
    decorations: DecorationsSchema,
    padding: z.number().min(0),
    composition: CompositionSchema,
  })
  .superRefine((cfg, ctx) => {
    if (cfg.background === "auto" || cfg.background === "random" || cfg.background === "split-h" || cfg.background === "split-v") return;
    const lc = cfg.background.toLowerCase();
    if (!cfg.palette.some((c) => c.toLowerCase() === lc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["background"],
        message: "background hex must be present in palette or set to 'auto'",
      });
    }
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
    leaf: { weight: 1 },
    arch: { weight: 1 },
    concentricBands: { weight: 0.5 },
    quarterRound: { weight: 1 },
    dot: { weight: 0.3 },
    plus: { weight: 0.3 },
  },
  rotation: "random",
  decorations: { enabled: true, probability: 0.2, types: ["plus", "dot"] },
  padding: 0,
  composition: {
    weights: {
      "single": 3,
      "hero-accent": 2,
      "four-corner": 1,
      "opposite-pair": 1,
      "layered": 1.5,
    },
  },
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

