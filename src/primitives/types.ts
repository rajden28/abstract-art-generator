import type { Rng } from "../rng.js";

export interface RenderContext {
  fg: string;
  bg: string;
  rng: Rng;
  padding: number;
  accent?: string;
}

export interface Primitive {
  name: string;
  defaultWeight: number;
  render(ctx: RenderContext): string;
}
