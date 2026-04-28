import JSZip from "jszip";
import { generateBatch } from "./src/generator.js";
import { ConfigSchema, defaultConfig } from "./src/config.js";
import { randomSeed } from "./src/rng.js";

const SHAPE_KEYS = [
  "circle","halfCircle","leaf","arch",
  "concentricBands","quarterRound","dot","plus",
];

const DEFAULT_CFG = {
  ...defaultConfig,
  shapes: Object.fromEntries(SHAPE_KEYS.map(k => [k, { weight: defaultConfig.shapes[k]?.weight ?? 1 }])),
};

const presetModules = import.meta.glob("/public/presets/*.json", { eager: true });
const PRESETS = Object.fromEntries(
  Object.entries(presetModules).map(([path, mod]) => {
    const name = path.split("/").pop().replace(/\.json$/, "");
    return [name, mod.default ?? mod];
  })
);

const state = structuredClone(DEFAULT_CFG);
let lastTiles = [];

function el(id) { return document.getElementById(id); }

function renderPalette() {
  const box = el("palette");
  box.innerHTML = "";
  state.palette.forEach((c, i) => {
    const wrap = document.createElement("div");
    wrap.className = "swatch";
    const input = document.createElement("input");
    input.type = "color";
    input.value = c;
    input.oninput = () => { state.palette[i] = input.value; };
    const rm = document.createElement("button");
    rm.className = "remove";
    rm.textContent = "x";
    rm.onclick = () => {
      if (state.palette.length <= 2) return;
      state.palette.splice(i, 1);
      renderPalette();
    };
    wrap.appendChild(input);
    wrap.appendChild(rm);
    box.appendChild(wrap);
  });
}

function renderShapes() {
  const box = el("shapes");
  box.innerHTML = "";
  SHAPE_KEYS.forEach((k) => {
    const row = document.createElement("div");
    row.className = "shape-row";
    const label = document.createElement("span");
    label.textContent = k;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0"; slider.max = "2"; slider.step = "0.1";
    slider.value = String(state.shapes[k].weight);
    const out = document.createElement("span");
    out.style.flex = "0 0 30px";
    out.textContent = slider.value;
    slider.oninput = () => {
      state.shapes[k].weight = Number(slider.value);
      out.textContent = slider.value;
    };
    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(out);
    box.appendChild(row);
  });
}

function readRotation() {
  const sel = document.querySelector('input[name="rot"]:checked').value;
  if (sel === "random") return "random";
  if (sel === "fixed") return "fixed";
  const angles = Array.from(document.querySelectorAll(".rot-angle"))
    .filter(x => x.checked).map(x => Number(x.value));
  return angles.length ? angles : "random";
}

function loadPresets() {
  const sel = el("preset");
  Object.keys(PRESETS).sort().forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    if (!sel.value) return;
    const preset = PRESETS[sel.value];
    Object.assign(state, { ...DEFAULT_CFG, ...preset,
      shapes: { ...DEFAULT_CFG.shapes, ...(preset.shapes || {}) },
      decorations: { ...DEFAULT_CFG.decorations, ...(preset.decorations || {}) },
    });
    syncFormFromState();
  };
}

function syncFormFromState() {
  el("resolution").value = state.resolution;
  el("seed").value = state.seed ?? "";
  el("deco-enabled").checked = state.decorations.enabled;
  el("deco-prob").value = state.decorations.probability;
  renderPalette();
  renderShapes();
  document.querySelectorAll(".comp-weight").forEach((s) => {
    const key = s.dataset.key;
    s.value = state.composition.weights[key] ?? 0;
    const valSpan = document.querySelector(`.comp-val[data-key="${key}"]`);
    if (valSpan) valSpan.textContent = s.value;
  });
}

function readBackground() {
  const sel = document.querySelector('input[name="bg"]:checked');
  return sel ? sel.value : "auto";
}

function readComposition() {
  const weights = {};
  document.querySelectorAll(".comp-weight").forEach((s) => {
    weights[s.dataset.key] = Number(s.value);
  });
  return { weights };
}

function buildConfig() {
  const seedRaw = el("seed").value;
  return {
    ...state,
    resolution: Number(el("resolution").value),
    seed: seedRaw === "" ? null : Number(seedRaw),
    background: readBackground(),
    rotation: readRotation(),
    composition: readComposition(),
    decorations: {
      ...state.decorations,
      enabled: el("deco-enabled").checked,
      probability: Number(el("deco-prob").value),
    },
  };
}

function generate() {
  const count = Math.max(1, Math.min(50, Number(el("count").value)));
  const rawConfig = buildConfig();
  const parsed = ConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    alert("Invalid config:\n" + JSON.stringify(parsed.error.format(), null, 2));
    return;
  }
  const cfg = parsed.data;
  const start = cfg.seed ?? randomSeed();
  const tiles = generateBatch(cfg, start, count);
  lastTiles = tiles;
  renderPreview(tiles);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadTile(tile) {
  const blob = new Blob([tile.svg], { type: "image/svg+xml" });
  downloadBlob(blob, `tile-${tile.seed}.svg`);
}

async function downloadZip() {
  if (lastTiles.length === 0) { alert("Generate tiles first."); return; }
  const zip = new JSZip();
  for (const t of lastTiles) zip.file(`tile-${t.seed}.svg`, t.svg);
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `tiles-${Date.now()}.zip`);
}

function renderPreview(tiles) {
  const box = el("preview");
  box.innerHTML = "";
  for (const t of tiles) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = t.svg;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span>seed ${t.seed}</span>`;
    const actions = document.createElement("span");
    actions.className = "actions";
    const copy = document.createElement("button");
    copy.textContent = "Copy seed";
    copy.onclick = () => navigator.clipboard.writeText(String(t.seed));
    const download = document.createElement("button");
    download.textContent = "Download";
    download.onclick = () => downloadTile(t);
    actions.appendChild(copy);
    actions.appendChild(download);
    meta.appendChild(actions);
    tile.appendChild(meta);
    box.appendChild(tile);
  }
}

document.querySelectorAll('input[name="rot"]').forEach(r => {
  r.addEventListener("change", () => {
    el("rot-custom").hidden = r.value !== "custom" || !r.checked;
  });
});

document.querySelectorAll(".comp-weight").forEach((s) => {
  s.addEventListener("input", () => {
    const valSpan = document.querySelector(`.comp-val[data-key="${s.dataset.key}"]`);
    if (valSpan) valSpan.textContent = s.value;
  });
});
el("add-color").onclick = () => { state.palette.push("#888888"); renderPalette(); };
el("randomize").onclick = () => { el("seed").value = ""; };
el("generate").onclick = generate;
el("download-zip").onclick = downloadZip;

syncFormFromState();
loadPresets();
