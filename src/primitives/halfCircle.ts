import type { Primitive } from "./types.js";

export const halfCircle: Primitive = {
  name: "halfCircle",
  defaultWeight: 1,
  render({ fg, padding: p }) {
    return `<path d="M ${p} 50 A ${50 - p} ${50 - p} 0 0 0 ${100 - p} 50 Z" fill="${fg}" />`;
  },
};
