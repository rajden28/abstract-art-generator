import { describe, it, expect } from "vitest";
import { circle } from "../src/primitives/circle.js";
import { createRng } from "../src/rng.js";

describe("circle primitive", () => {
  it("is deterministic", () => {
    const a = circle.render({ fg: "#111", bg: "#eee", rng: createRng(1), padding: 0 });
    const b = circle.render({ fg: "#111", bg: "#eee", rng: createRng(1), padding: 0 });
    expect(a).toBe(b);
  });

  it("produces a <circle> element with the foreground fill", () => {
    const svg = circle.render({ fg: "#abcdef", bg: "#000", rng: createRng(1), padding: 0 });
    expect(svg).toContain("<circle");
    expect(svg).toContain('fill="#abcdef"');
  });

});
