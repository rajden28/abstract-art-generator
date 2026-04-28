import type { Primitive } from "./types.js";

// Petal shape extracted from reference/Frame 161.svg (native 112×112).
// Anchored to the (p,p) corner — rotation moves it to other corners.
export const leaf: Primitive = {
  name: "leaf",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const k = (100 - 2 * p) / 112;
    return `<g transform="translate(${p} ${p}) scale(${k})"><path d="M112 0 C50.1441 0 0 50.1441 0 112 C61.8559 112 112 61.8559 112 0 Z" fill="${fg}" /></g>`;
  },
};
