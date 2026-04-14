export interface TileArgs {
  resolution: number;
  background: string;
  rotation: 0 | 90 | 180 | 270;
  inner: string;
}

export function renderTile(args: TileArgs): string {
  const { resolution, background, rotation, inner } = args;
  const rotated =
    rotation === 0 ? inner : `<g transform="rotate(${rotation} 50 50)">${inner}</g>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${resolution}" height="${resolution}" viewBox="0 0 100 100">`,
    `<rect x="0" y="0" width="100" height="100" fill="${background}" />`,
    rotated,
    `</svg>`,
  ].join("");
}
