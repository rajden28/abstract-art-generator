import type { Primitive } from "./types.js";

export const square: Primitive = {
  name: "square",
  defaultWeight: 0.5,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const s = 100 - 2 * p;
    return `<rect x="${p}" y="${p}" width="${s}" height="${s}" fill="${fg}" />`;
  },
};
