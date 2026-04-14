import type { Primitive } from "./types.js";

export const leaf: Primitive = {
  name: "leaf",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const s = 100 - p;
    const r = 50 - p;
    const tl = `<path d="M ${p} ${p} L ${p + r} ${p} A ${r} ${r} 0 0 1 ${p} ${p + r} Z" fill="${fg}" />`;
    const br = `<path d="M ${s} ${s} L ${s - r} ${s} A ${r} ${r} 0 0 1 ${s} ${s - r} Z" fill="${fg}" />`;
    return tl + br;
  },
};
