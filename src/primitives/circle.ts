import type { Primitive } from "./types.js";

export const circle: Primitive = {
  name: "circle",
  defaultWeight: 1,
  acceptsDecorations: true,
  render({ fg, padding }) {
    const r = 50 - padding;
    return `<circle cx="50" cy="50" r="${r}" fill="${fg}" />`;
  },
};
