import { describe, it, expect } from "vitest";
import { createApp } from "../src/server.js";
import { defaultConfig } from "../src/config.js";

async function req(app: ReturnType<typeof createApp>, method: string, path: string, body?: unknown) {
  const { createServer } = await import("node:http");
  return await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const srv = createServer(app);
    srv.listen(0, () => {
      const port = (srv.address() as { port: number }).port;
      fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
        .then(async (r) => ({ status: r.status, body: await r.text() }))
        .then((r) => { srv.close(); resolve(r); })
        .catch((e) => { srv.close(); reject(e); });
    });
  });
}

describe("server", () => {
  it("GET /api/presets returns an array", async () => {
    const app = createApp({ presetsDir: "./presets", outputDir: "./output" });
    const r = await req(app, "GET", "/api/presets");
    expect(r.status).toBe(200);
    const list = JSON.parse(r.body);
    expect(Array.isArray(list)).toBe(true);
  });

  it("POST /api/generate writes files and returns seeds", async () => {
    const app = createApp({ presetsDir: "./presets", outputDir: "./output" });
    const r = await req(app, "POST", "/api/generate", { config: { ...defaultConfig, seed: 999 }, count: 2 });
    expect(r.status).toBe(200);
    const out = JSON.parse(r.body) as { filename: string; seed: number }[];
    expect(out.length).toBe(2);
    expect(out[0].seed).toBe(999);
    expect(out[1].seed).toBe(1000);
  });

  it("POST /api/generate returns 400 on invalid config", async () => {
    const app = createApp({ presetsDir: "./presets", outputDir: "./output" });
    const r = await req(app, "POST", "/api/generate", { config: { bad: true }, count: 1 });
    expect(r.status).toBe(400);
  });
});
