import { describe, it, expect } from "vitest";
import { sampleByWeight } from "../src/primitives/index.js";
import type { Primitive } from "../src/primitives/types.js";

const mkPrim = (name: string): Primitive => ({
  name,
  defaultWeight: 1,
  acceptsDecorations: false,
  render: () => "",
});

describe("sampleByWeight", () => {
  it("picks the only non-zero-weighted primitive", () => {
    const prims = [mkPrim("a"), mkPrim("b")];
    const weights = { a: 0, b: 1 };
    const rng = () => 0.5;
    expect(sampleByWeight(prims, weights, rng).name).toBe("b");
  });

  it("throws if all weights are zero", () => {
    const prims = [mkPrim("a"), mkPrim("b")];
    const weights = { a: 0, b: 0 };
    const rng = () => 0.5;
    expect(() => sampleByWeight(prims, weights, rng)).toThrow();
  });

  it("respects weight proportions", () => {
    const prims = [mkPrim("a"), mkPrim("b")];
    const weights = { a: 1, b: 3 };
    let aCount = 0;
    const N = 10000;
    let i = 0;
    const rng = () => ((i = (i + 1) % 10000) / 10000);
    for (let k = 0; k < N; k++) if (sampleByWeight(prims, weights, rng).name === "a") aCount++;
    expect(aCount / N).toBeGreaterThan(0.2);
    expect(aCount / N).toBeLessThan(0.3);
  });
});

import { bootstrapPrimitives, allPrimitives } from "../src/primitives/index.js";

describe("bootstrapPrimitives", () => {
  it("registers the 8 built-in primitives", () => {
    bootstrapPrimitives();
    const names = allPrimitives().map((p) => p.name).sort();
    expect(names).toEqual(
      [
        "arch",
        "circle",
        "concentricBands",
        "dot",
        "halfCircle",
        "leaf",
        "plus",
        "quarterRound",
      ].sort()
    );
  });
});
