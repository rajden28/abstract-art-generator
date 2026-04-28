import type { Primitive } from "./types.js";

// Three concentric stadiums (flat top, rounded bottom) from reference/Frame 160.svg (native 251×251)
export const concentricBands: Primitive = {
  name: "concentricBands",
  defaultWeight: 0.5,
  render({ fg, bg, padding: p }) {
    const k = (100 - 2 * p) / 251;
    const outer = `<path d="M125.5 219.5 C69.4431 219.5 24 174.057 24 118 L24 0.5 L227 0.5 L227 118 C227 174.057 181.557 219.5 125.5 219.5 Z" fill="${fg}" />`;
    const mid = `<path d="M125.5 195 C82.9741 195 48.5 160.526 48.5 118 L48.5 0 L202.5 0 L202.5 118 C202.5 160.526 168.026 195 125.5 195 Z" fill="${bg}" />`;
    const inner = `<path d="M125.5 171 C96.2289 171 72.5 147.271 72.5 118 L72.5 0 L178.5 0 L178.5 118 C178.5 147.271 154.771 171 125.5 171 Z" fill="${fg}" />`;
    return `<g transform="translate(${p} ${p}) scale(${k})">${outer}${mid}${inner}</g>`;
  },
};
