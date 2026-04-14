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
