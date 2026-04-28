import type { Primitive } from "./types.js";

export const arch: Primitive = {
  name: "arch",
  defaultWeight: 1,
  render({ fg, padding: p }) {
    const x = 25 + p / 2;
    const w = 50 - p;
    const y = p;
    const h = 100 - 2 * p;
    const rx = w / 2;
    return `<path d="M ${x} ${y + h} L ${x} ${y + rx} A ${rx} ${rx} 0 0 1 ${x + w} ${y + rx} L ${x + w} ${y + h} Z" fill="${fg}" />`;
  },
};
