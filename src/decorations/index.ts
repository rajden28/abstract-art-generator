export type DecorationType = "plus" | "dot";

export function renderDecoration(type: DecorationType, color: string): string {
  if (type === "plus") {
    const armW = 2;
    const armL = 6;
    const cx = 50;
    const cy = 50;
    return [
      `<rect x="${cx - armW / 2}" y="${cy - armL}" width="${armW}" height="${armL * 2}" fill="${color}" />`,
      `<rect x="${cx - armL}" y="${cy - armW / 2}" width="${armL * 2}" height="${armW}" fill="${color}" />`,
    ].join("");
  }
  return `<circle cx="50" cy="50" r="3" fill="${color}" />`;
}
