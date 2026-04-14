import { describe, it, expect } from "vitest";
import { renderDecoration } from "../src/decorations/index.js";

describe("renderDecoration", () => {
  it("renders a '+' decoration in the given color", () => {
    const out = renderDecoration("plus", "#123456");
    expect(out).toContain("#123456");
    expect(out).toContain("<rect");
  });

  it("renders a 'dot' decoration", () => {
    const out = renderDecoration("dot", "#111");
    expect(out).toContain("<circle");
  });
});
