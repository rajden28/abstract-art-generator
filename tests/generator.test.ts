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
