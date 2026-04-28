import type { Primitive } from "./types.js";

// Rounded-corner rectangle extracted from reference/Frame 164.svg (native 251×251).
// Fills the right portion of the canvas with the bottom-left corner rounded.
export const quarterRound: Primitive = {
  name: "quarterRound",
  defaultWeight: 1,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const k = (100 - 2 * p) / 251;
    return `<g transform="translate(${p} ${p}) scale(${k})"><path d="M190.5 219 C157.087 219 130 191.913 130 158.5 L130 0 L251 0 L251 219 L190.5 219 Z" fill="${fg}" /></g>`;
  },
};
