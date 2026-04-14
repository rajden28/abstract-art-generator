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
