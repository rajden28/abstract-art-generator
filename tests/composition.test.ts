import { describe, it, expect } from "vitest";
import { generateTile } from "../src/generator.js";
import { defaultConfig } from "../src/config.js";

function only(strategy: "single" | "hero-accent" | "four-corner" | "opposite-pair") {
  return {
    ...defaultConfig,
    composition: {
      weights: {
        "single": strategy === "single" ? 1 : 0,
        "hero-accent": strategy === "hero-accent" ? 1 : 0,
        "four-corner": strategy === "four-corner" ? 1 : 0,
        "opposite-pair": strategy === "opposite-pair" ? 1 : 0,
      },
    },
  };
}

describe("composition", () => {
  it("single strategy produces a tile with one primitive (no placement wrapper)", () => {
    const cfg = only("single");
    for (let s = 1; s < 5; s++) {
      const svg = generateTile(cfg, s).svg;
      expect(svg).toMatch(/^<svg /);
      expect(svg).toContain("</svg>");
    }
  });

  it("four-corner strategy emits four scale(0.5) placements (facing-out or uniform)", () => {
    const cfg = only("four-corner");
    for (let s = 1; s < 10; s++) {
      const svg = generateTile(cfg, s).svg;
      const facingOut =
        svg.includes('transform="translate(0 0) scale(0.5)"') &&
        svg.includes('transform="translate(100 0) rotate(90) scale(0.5)"') &&
        svg.includes('transform="translate(100 100) rotate(180) scale(0.5)"') &&
        svg.includes('transform="translate(0 100) rotate(270) scale(0.5)"');
      const uniform =
        svg.includes('transform="translate(0 0) scale(0.45)"') &&
        svg.includes('transform="translate(55 0) scale(0.45)"') &&
        svg.includes('transform="translate(55 55) scale(0.45)"') &&
        svg.includes('transform="translate(0 55) scale(0.45)"');
      expect(facingOut || uniform).toBe(true);
    }
  });

  it("opposite-pair strategy emits exactly two diagonal placements", () => {
    const cfg = only("opposite-pair");
    for (let s = 1; s < 20; s++) {
      const svg = generateTile(cfg, s).svg;
      const tl = svg.includes('transform="translate(0 0) scale(0.5)"');
      const tr = svg.includes('transform="translate(100 0) rotate(90) scale(0.5)"');
      const br = svg.includes('transform="translate(100 100) rotate(180) scale(0.5)"');
      const bl = svg.includes('transform="translate(0 100) rotate(270) scale(0.5)"');
      const diag1 = tl && br && !tr && !bl;
      const diag2 = tr && bl && !tl && !br;
      expect(diag1 || diag2).toBe(true);
    }
  });

  it("hero-accent strategy produces valid SVG with at least one shape", () => {
    const cfg = only("hero-accent");
    for (let s = 1; s < 20; s++) {
      const svg = generateTile(cfg, s).svg;
      expect(svg).toMatch(/^<svg /);
      expect(svg).toContain("</svg>");
      expect(svg.length).toBeGreaterThan(200);
    }
  });
});
