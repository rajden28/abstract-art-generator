const SHAPE_KEYS = [
  "circle","halfCircle","quarterCircle","leaf","arch",
  "concentricArches","quarterRound","dot","plus","square",
];

const DEFAULT_CFG = {
  resolution: 1024,
  seed: null,
  palette: ["#C4402E", "#1A1A1A", "#E8D4A8"],
  background: "auto",
  shapes: Object.fromEntries(SHAPE_KEYS.map(k => [k, { weight: 1 }])),
  rotation: "random",
  decorations: { enabled: true, probability: 0.2, types: ["plus", "dot"] },
  padding: 0,
};

const state = structuredClone(DEFAULT_CFG);

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

async function loadPresets() {
  const list = await fetch("/api/presets").then(r => r.json());
  const sel = el("preset");
  list.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.name; opt.textContent = p.name;
    sel.appendChild(opt);
  });
  sel.onchange = async () => {
    if (!sel.value) return;
    const preset = await fetch(`/api/preset/${sel.value}`).then(r => r.json());
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
}

function buildConfig() {
  const seedRaw = el("seed").value;
  return {
    ...state,
    resolution: Number(el("resolution").value),
    seed: seedRaw === "" ? null : Number(seedRaw),
    rotation: readRotation(),
    decorations: {
      ...state.decorations,
      enabled: el("deco-enabled").checked,
      probability: Number(el("deco-prob").value),
    },
  };
}

async function generate() {
  const count = Math.max(1, Math.min(50, Number(el("count").value)));
  const config = buildConfig();
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, count }),
  });
  if (!res.ok) {
    const err = await res.text();
    alert("Generate failed:\n" + err);
    return;
  }
  const tiles = await res.json();
  renderPreview(tiles);
}

async function renderPreview(tiles) {
  const box = el("preview");
  box.innerHTML = "";
  for (const t of tiles) {
    const svgText = await fetch(`/output/${t.filename}?_=${Date.now()}`).then(r => r.text());
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = svgText;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span>seed ${t.seed}</span>`;
    const copy = document.createElement("button");
    copy.textContent = "Copy seed";
    copy.onclick = () => navigator.clipboard.writeText(String(t.seed));
    meta.appendChild(copy);
    tile.appendChild(meta);
    box.appendChild(tile);
  }
}

document.querySelectorAll('input[name="rot"]').forEach(r => {
  r.addEventListener("change", () => {
    el("rot-custom").hidden = r.value !== "custom" || !r.checked;
  });
});

el("add-color").onclick = () => { state.palette.push("#888888"); renderPalette(); };
el("randomize").onclick = () => { el("seed").value = ""; };
el("generate").onclick = generate;
el("open-output").onclick = () => fetch("/api/open-output", { method: "POST" });

syncFormFromState();
loadPresets();
