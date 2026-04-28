import { describe, it, expect } from "vitest";
import { createRng } from "../src/rng.js";
import { halfCircle } from "../src/primitives/halfCircle.js";
import { leaf } from "../src/primitives/leaf.js";
import { arch } from "../src/primitives/arch.js";
import { concentricBands } from "../src/primitives/concentricBands.js";
import { quarterRound } from "../src/primitives/quarterRound.js";
import { dot } from "../src/primitives/dot.js";
import { plus } from "../src/primitives/plus.js";

const prims = [halfCircle, leaf, arch, concentricBands, quarterRound, dot, plus];

describe("primitives", () => {
  it.each(prims.map((p) => [p.name, p]))("%s is deterministic", (_name, p) => {
    const a = p.render({ fg: "#111", bg: "#eee", rng: createRng(5), padding: 0 });
    const b = p.render({ fg: "#111", bg: "#eee", rng: createRng(5), padding: 0 });
    expect(a).toBe(b);
  });

  it.each(prims.map((p) => [p.name, p]))("%s output contains the foreground color", (_name, p) => {
    const svg = p.render({ fg: "#abcdef", bg: "#000", rng: createRng(5), padding: 0 });
    expect(svg.toLowerCase()).toContain("#abcdef");
  });

  it.each(prims.map((p) => [p.name, p]))("%s output is non-empty", (_name, p) => {
    const svg = p.render({ fg: "#abcdef", bg: "#000", rng: createRng(5), padding: 0 });
    expect(svg.length).toBeGreaterThan(0);
  });
});

describe("padding", () => {
  it("arch shrinks vertically when padded", () => {
    const a = arch.render({ fg: "#111", bg: "#eee", rng: createRng(1), padding: 0 });
    const b = arch.render({ fg: "#111", bg: "#eee", rng: createRng(1), padding: 10 });
    expect(a).not.toBe(b);
  });

  it("plus arms shorten when padded", () => {
    const a = plus.render({ fg: "#111", bg: "#eee", rng: createRng(1), padding: 0 });
    const b = plus.render({ fg: "#111", bg: "#eee", rng: createRng(1), padding: 10 });
    expect(a).not.toBe(b);
  });
});
