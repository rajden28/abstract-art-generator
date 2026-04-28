import { describe, it, expect } from "vitest";
import { renderTile } from "../src/renderer.js";

const solid = (color: string) => ({ mode: "solid" as const, color });

describe("renderTile", () => {
  it("wraps content in an outer <svg> with the given resolution", () => {
    const svg = renderTile({
      resolution: 256,
      background: solid("#fff"),
      rotation: 0,
      inner: "<circle cx='50' cy='50' r='10' fill='#000' />",
    });
    expect(svg).toContain(`width="256"`);
    expect(svg).toContain(`height="256"`);
    expect(svg).toContain(`viewBox="0 0 100 100"`);
  });

  it("paints a solid background <rect> first", () => {
    const svg = renderTile({
      resolution: 100,
      background: solid("#abcdef"),
      rotation: 0,
      inner: "",
    });
    expect(svg).toContain(`<rect x="0" y="0" width="100" height="100" fill="#abcdef"`);
  });

  it("paints two stacked rects for split-h background", () => {
    const svg = renderTile({
      resolution: 100,
      background: { mode: "split", dir: "h", colors: ["#111", "#eee"] },
      rotation: 0,
      inner: "",
    });
    expect(svg).toContain(`<rect x="0" y="0" width="100" height="50" fill="#111"`);
    expect(svg).toContain(`<rect x="0" y="50" width="100" height="50" fill="#eee"`);
  });

  it("paints two side-by-side rects for split-v background", () => {
    const svg = renderTile({
      resolution: 100,
      background: { mode: "split", dir: "v", colors: ["#111", "#eee"] },
      rotation: 0,
      inner: "",
    });
    expect(svg).toContain(`<rect x="0" y="0" width="50" height="100" fill="#111"`);
    expect(svg).toContain(`<rect x="50" y="0" width="50" height="100" fill="#eee"`);
  });

  it("wraps inner in a rotation group when rotation != 0", () => {
    const svg = renderTile({
      resolution: 100,
      background: solid("#fff"),
      rotation: 90,
      inner: "<g/>",
    });
    expect(svg).toContain(`transform="rotate(90 50 50)"`);
  });

  it("omits the rotation group when rotation is 0", () => {
    const svg = renderTile({
      resolution: 100,
      background: solid("#fff"),
      rotation: 0,
      inner: "<g/>",
    });
    expect(svg).not.toContain("rotate(");
  });
});
