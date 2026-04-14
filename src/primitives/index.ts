import type { Primitive } from "./types.js";
import type { Rng } from "../rng.js";

const registry: Primitive[] = [];

export function register(p: Primitive): void {
  if (registry.some((r) => r.name === p.name)) {
    throw new Error(`Primitive already registered: ${p.name}`);
  }
  registry.push(p);
}

export function allPrimitives(): readonly Primitive[] {
  return registry;
}

export function getPrimitive(name: string): Primitive {
  const p = registry.find((r) => r.name === name);
  if (!p) throw new Error(`Unknown primitive: ${name}`);
  return p;
}

export function sampleByWeight(
  prims: readonly Primitive[],
  weights: Record<string, number>,
  rng: Rng
): Primitive {
  const active = prims.filter((p) => (weights[p.name] ?? 0) > 0);
  if (active.length === 0) throw new Error("No primitives with weight > 0");
  const total = active.reduce((s, p) => s + (weights[p.name] ?? 0), 0);
  let r = rng() * total;
  for (const p of active) {
    r -= weights[p.name] ?? 0;
    if (r <= 0) return p;
  }
  return active[active.length - 1]!;
}
