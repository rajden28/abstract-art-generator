import express, { type Express } from "express";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { exec } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ConfigSchema, loadJsonFile } from "./config.js";
import { generateBatch } from "./generator.js";
import { randomSeed } from "./rng.js";

export interface ServerOptions {
  presetsDir: string;
  outputDir: string;
}

export function createApp(opts: ServerOptions): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/presets", async (_req, res) => {
    try {
      const files = await readdir(opts.presetsDir);
      const names = files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
      res.json(names.map((name) => ({ name })));
    } catch {
      res.json([]);
    }
  });

  app.get("/api/preset/:name", async (req, res) => {
    const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, "");
    try {
      const body = await loadJsonFile(join(opts.presetsDir, `${name}.json`));
      res.json(body);
    } catch {
      res.status(404).json({ error: `Preset not found: ${name}` });
    }
  });

  app.post("/api/generate", async (req, res) => {
    const parsed = ConfigSchema.safeParse(req.body?.config);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.format() });
      return;
    }
    const cfg = parsed.data;
    const count = Math.max(1, Math.min(50, Number(req.body?.count ?? 1)));
    const start = cfg.seed ?? randomSeed();
    const tiles = generateBatch(cfg, start, count);

    await mkdir(opts.outputDir, { recursive: true });
    const results: { filename: string; seed: number }[] = [];
    for (const t of tiles) {
      const filename = `tile-${t.seed}.svg`;
      await writeFile(join(opts.outputDir, filename), t.svg, "utf8");
      results.push({ filename, seed: t.seed });
    }
    res.json(results);
  });

  app.post("/api/open-output", (_req, res) => {
    if (process.platform !== "win32") {
      res.status(501).json({ error: "Only supported on Windows" });
      return;
    }
    exec(`explorer "${resolve(opts.outputDir)}"`);
    res.json({ ok: true });
  });

  app.use("/output", express.static(opts.outputDir));
  app.use("/", express.static("public"));

  return app;
}

const mainUrl = pathToFileURL(process.argv[1] ?? "").href;
if (import.meta.url === mainUrl) {
  const app = createApp({ presetsDir: "./presets", outputDir: "./output" });
  const port = 3000;
  app.listen(port, () => {
    console.log(`Art generator running at http://localhost:${port}`);
  });
}
