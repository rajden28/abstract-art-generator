import type { Primitive } from "./types.js";

export const leaf: Primitive = {
  name: "leaf",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const s = 100 - p;
    const r = s - p;
    return `<path d="M ${p} ${p} L ${s} ${p} A ${r} ${r} 0 0 0 ${p} ${s} Z" fill="${fg}" />`;
  },
};
