import type { Primitive } from "./types.js";

export const dot: Primitive = {
  name: "dot",
  defaultWeight: 0.3,
  render({ fg }) {
    return `<circle cx="50" cy="50" r="40" fill="${fg}" />`;
  },
};
