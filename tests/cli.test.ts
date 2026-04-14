import { describe, it, expect } from "vitest";
import { parseArgs } from "../src/cli.js";

describe("parseArgs", () => {
  it("parses defaults", () => {
    const a = parseArgs([]);
    expect(a.out).toBe("./output");
    expect(a.count).toBe(1);
    expect(a.seed).toBeNull();
    expect(a.preset).toBeNull();
    expect(a.configPath).toBe("./config.json");
  });

  it("parses all flags", () => {
    const a = parseArgs(["--config", "x.json", "--preset", "p", "--seed", "7", "--count", "3", "--out", "o"]);
    expect(a.configPath).toBe("x.json");
    expect(a.preset).toBe("p");
    expect(a.seed).toBe(7);
    expect(a.count).toBe(3);
    expect(a.out).toBe("o");
  });

  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--bogus"])).toThrow();
  });
});
