export type Background =
  | { mode: "solid"; color: string }
  | { mode: "split"; dir: "h" | "v"; colors: [string, string] };

export interface TileArgs {
  resolution: number;
  background: Background;
  rotation: 0 | 90 | 180 | 270;
  inner: string;
}

function renderBackground(bg: Background): string {
  if (bg.mode === "solid") {
    return `<rect x="0" y="0" width="100" height="100" fill="${bg.color}" />`;
  }
  const [c1, c2] = bg.colors;
  if (bg.dir === "h") {
    return (
      `<rect x="0" y="0" width="100" height="50" fill="${c1}" />` +
      `<rect x="0" y="50" width="100" height="50" fill="${c2}" />`
    );
  }
  return (
    `<rect x="0" y="0" width="50" height="100" fill="${c1}" />` +
    `<rect x="50" y="0" width="50" height="100" fill="${c2}" />`
  );
}

export function renderTile(args: TileArgs): string {
  const { resolution, background, rotation, inner } = args;
  const rotated =
    rotation === 0 ? inner : `<g transform="rotate(${rotation} 50 50)">${inner}</g>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${resolution}" height="${resolution}" viewBox="0 0 100 100">`,
    renderBackground(background),
    rotated,
    `</svg>`,
  ].join("");
}
