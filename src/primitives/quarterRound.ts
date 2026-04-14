import type { Primitive } from "./types.js";

export const quarterRound: Primitive = {
  name: "quarterRound",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const s = 100 - p;
    const r = s - p;
    return `<path d="M ${p} ${p} L ${s - r} ${p} A ${r} ${r} 0 0 1 ${s} ${p + r} L ${s} ${s} L ${p} ${s} Z" fill="${fg}" />`;
  },
};
