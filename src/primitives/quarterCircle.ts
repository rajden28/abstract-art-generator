import type { Primitive } from "./types.js";

export const quarterCircle: Primitive = {
  name: "quarterCircle",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const s = 100 - p;
    return `<path d="M ${p} ${p} L ${p} ${s} A ${s - p} ${s - p} 0 0 0 ${s} ${s} Z" fill="${fg}" />`;
  },
};
