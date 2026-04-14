import type { Primitive } from "./types.js";

export const plus: Primitive = {
  name: "plus",
  defaultWeight: 0.3,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const armW = 8;
    const armL = 40 - p;
    const cx = 50;
    const cy = 50;
    return [
      `<rect x="${cx - armW / 2}" y="${cy - armL}" width="${armW}" height="${armL * 2}" fill="${fg}" />`,
      `<rect x="${cx - armL}" y="${cy - armW / 2}" width="${armL * 2}" height="${armW}" fill="${fg}" />`,
    ].join("");
  },
};
