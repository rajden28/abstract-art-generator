import type { Primitive } from "./types.js";

export const concentricArches: Primitive = {
  name: "concentricArches",
  defaultWeight: 0.5,
  acceptsDecorations: false,
  render({ fg, padding: p }) {
    const rings = 3;
    const strokeW = 3;
    const parts: string[] = [];
    for (let i = 0; i < rings; i++) {
      const inset = p + i * (strokeW * 2.5);
      const x = 25 + inset / 2;
      const w = 50 - inset;
      if (w <= 0) break;
      const y = inset;
      const h = 100 - 2 * inset;
      const rx = w / 2;
      parts.push(
        `<path d="M ${x} ${y + h} L ${x} ${y + rx} A ${rx} ${rx} 0 0 1 ${x + w} ${y + rx} L ${x + w} ${y + h}" fill="none" stroke="${fg}" stroke-width="${strokeW}" />`
      );
    }
    return parts.join("");
  },
};
