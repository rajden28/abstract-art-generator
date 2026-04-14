import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import {
  ConfigSchema,
  defaultConfig,
  loadJsonFile,
  mergeConfig,
  type PartialConfig,
} from "./config.js";
import { generateBatch } from "./generator.js";
import { randomSeed } from "./rng.js";

export interface CliArgs {
  configPath: string;
  preset: string | null;
  seed: number | null;
  count: number;
  out: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    configPath: "./config.json",
    preset: null,
    seed: null,
    count: 1,
    out: "./output",
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    switch (flag) {
      case "--config": args.configPath = String(val); i++; break;
      case "--preset": args.preset = String(val); i++; break;
      case "--seed":   args.seed = Number(val); i++; break;
      case "--count":  args.count = Number(val); i++; break;
      case "--out":    args.out = String(val); i++; break;
      default: throw new Error(`Unknown flag: ${flag}`);
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const base = defaultConfig;
  const fileCfg: PartialConfig = existsSync(args.configPath)
    ? ((await loadJsonFile(args.configPath)) as PartialConfig)
    : {};
  const presetCfg: PartialConfig = args.preset
    ? ((await loadJsonFile(resolve("presets", `${args.preset}.json`))) as PartialConfig)
    : {};
  const overrides: PartialConfig = args.seed !== null ? { seed: args.seed } : {};

  const cfg = mergeConfig(mergeConfig(base, fileCfg, {}), presetCfg, overrides);
  ConfigSchema.parse(cfg);

  const start = cfg.seed ?? randomSeed();
  const tiles = generateBatch(cfg, start, args.count);

  await mkdir(args.out, { recursive: true });
  for (const t of tiles) {
    const file = join(args.out, `tile-${t.seed}.svg`);
    await writeFile(file, t.svg, "utf8");
    console.log(file);
  }
}

const isDirect = process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
