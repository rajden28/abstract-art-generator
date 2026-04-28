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

  it("fixed rotation always yields 0° at the tile level", () => {
    const cfg = { ...defaultConfig, rotation: "fixed" as const };
    for (let s = 1; s < 30; s++) {
      const svg = generateTile(cfg, s).svg;
      expect(svg).not.toMatch(/rotate\([^)]*50 50\)/);
    }
  });

  it("rotation whitelist never yields excluded angles at the tile level", () => {
    const cfg = { ...defaultConfig, rotation: [0, 90] as (0 | 90)[] };
    for (let s = 1; s < 50; s++) {
      const svg = generateTile(cfg, s).svg;
      expect(svg).not.toContain("rotate(180 50 50)");
      expect(svg).not.toContain("rotate(270 50 50)");
    }
  });

  it("split-h background paints two palette colors in stacked rects", () => {
    const cfg = { ...defaultConfig, background: "split-h" as const };
    for (let s = 1; s < 10; s++) {
      const svg = generateTile(cfg, s).svg;
      expect(svg).toMatch(/<rect x="0" y="0" width="100" height="50"/);
      expect(svg).toMatch(/<rect x="0" y="50" width="100" height="50"/);
    }
  });

  it("split-v background paints two palette colors side-by-side", () => {
    const cfg = { ...defaultConfig, background: "split-v" as const };
    for (let s = 1; s < 10; s++) {
      const svg = generateTile(cfg, s).svg;
      expect(svg).toMatch(/<rect x="0" y="0" width="50" height="100"/);
      expect(svg).toMatch(/<rect x="50" y="0" width="50" height="100"/);
    }
  });

  it("generateBatch produces N tiles with sequential seeds", () => {
    const tiles = generateBatch(defaultConfig, 100, 5);
    expect(tiles.length).toBe(5);
    expect(tiles.map((t) => t.seed)).toEqual([100, 101, 102, 103, 104]);
  });

});
