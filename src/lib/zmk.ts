import { HARDWARE, ZMK_EXCEPTIONS } from "./hardware";
import { prettyLayerName } from "./layers";
import type { BoardLayout, HardwareId, KeyGeo } from "./types";

const MOD_MAP: Record<string, string> = {
  LC: "ctrl", LCTRL: "ctrl", LCTL: "ctrl", RC: "ctrl", RCTRL: "ctrl", RCTL: "ctrl",
  LS: "shift", LSHIFT: "shift", LSFT: "shift", RS: "shift", RSHIFT: "shift", RSFT: "shift",
  LA: "alt", LALT: "alt", RA: "alt", RALT: "alt", LOPT: "alt", ROPT: "alt",
  LG: "meta", LGUI: "meta", RG: "meta", RGUI: "meta", LMETA: "meta", RMETA: "meta",
  LCMD: "meta", RCMD: "meta", LMAC: "meta", RMAC: "meta", WIN: "meta", MAC: "meta", CMD: "meta",
};

export function extractZMKLabel(bind: unknown): string {
  if (!bind) return "NONE";
  const flatArgs: string[] = [];

  const walkAST = (node: unknown): void => {
    if (typeof node === "object" && node !== null) {
      const rec = node as Record<string, unknown>;
      const v = String(rec.value || rec.behavior || rec.command || "").toUpperCase();
      const tokens = v.replace(/^&/, "").split(/\s+/);
      tokens.forEach((tok) => {
        const match = tok.match(/^([A-Z_]+)\((.*?)\)$/);
        if (match) flatArgs.push(match[2]);
        else if (tok !== "" && !rec.behavior && !MOD_MAP[tok]) flatArgs.push(tok);
      });
      if (Array.isArray(rec.params)) rec.params.forEach(walkAST);
    }
  };

  if (typeof bind === "object" && bind !== null) {
    const rec = bind as Record<string, unknown>;
    const decoration = rec.decoration as Record<string, unknown> | undefined;
    if (decoration && decoration.label) return String(decoration.label);
    if (rec.label) return String(rec.label);
    walkAST(bind);
  } else {
    const str = String(bind).trim().toUpperCase();
    const parts = str.split(/\s+/);
    parts.slice(1).forEach((p) => {
      const match = p.match(/^([A-Z_]+)\((.*?)\)$/);
      if (match) flatArgs.push(match[2]);
      else if (!MOD_MAP[p]) flatArgs.push(p);
    });
    if (flatArgs.length === 0) {
      // Nothing survived modifier stripping: either the behavior had no arguments at all
      // ("&trans") or it is a plain modifier key ("&kp LSHIFT"). Prefer the argument.
      flatArgs.push(parts.length > 1 ? parts[1] : parts[0].replace(/^&/, ""));
    }
  }

  const keycode = flatArgs.length > 0 ? flatArgs[flatArgs.length - 1] : "NONE";
  return String(keycode).toUpperCase().replace("KP_", "");
}

export interface ParsedZmk {
  hw: HardwareId;
  map: Record<string, string>;
  /** One position-aligned label map per layer, in file order (index 0 = base). */
  layers: string[][];
  /** Layer node names as the file spells them, e.g. ["default_layer", "lower_layer"]. */
  names: string[];
  /** Per layer: position -> index of the layer that key switches to. */
  activators: Array<Record<string, number>>;
}

interface RawLayer {
  name: string;
  /** Layer entries in board order: "&kp Q" strings, or JSON binding objects. */
  entries: unknown[];
}

// Behaviors that produce no character: layer switching, bluetooth, resets. Mapped to
// inert multi-character labels so the engine leaves those keys out of scoring while the
// on-screen keyboard still shows what they are.
const NON_CHARACTER_BEHAVIORS: Record<string, string> = {
  trans: "NONE",
  none: "NONE",
  mo: "MO",
  to: "TO",
  tog: "TOG",
  sl: "SL",
  sk: "SK",
  bt: "BT",
  rgb_ug: "RGB",
  ext_power: "PWR",
  sys_reset: "RST",
  bootloader: "BOOT",
  soft_off: "OFF",
  studio_unlock: "UNLOCK",
};

// Layer switching keeps its number in the activators table, so the board knows which key has
// to be held for the layer it is about to draw.
const LAYER_BEHAVIORS = new Set(["mo", "lt", "sl", "to", "tog"]);

// A layer-tap types its tap key too, so only these carry nothing but the layer switch.
const PURE_LAYER_BEHAVIORS = new Set(["mo", "to", "tog", "sl"]);

// "&mo 1" and { behavior: "&mo", params: [{ value: "1" }] } both flatten to ["mo", "1"].
function flatTokens(entry: unknown): string[] {
  if (typeof entry === "string") {
    return entry.replace(/^&/, "").trim().split(/[\s,]+/).filter(Boolean);
  }
  if (typeof entry !== "object" || entry === null) return [];
  const rec = entry as Record<string, unknown>;
  const head = String(rec.behavior || rec.command || rec.value || "");
  const tokens = head ? head.replace(/^&/, "").trim().split(/[\s,]+/).filter(Boolean) : [];
  if (Array.isArray(rec.params)) rec.params.forEach((param) => tokens.push(...flatTokens(param)));
  return tokens;
}

/** The layer a binding switches to: `&mo 1` -> { mo, 1 }, `&lt 2 SPACE` -> { lt, 2 }. */
export function layerTarget(entry: unknown): { kind: string; layer: number } | null {
  const tokens = flatTokens(entry);
  const kind = (tokens[0] ?? "").toLowerCase();
  if (!LAYER_BEHAVIORS.has(kind)) return null;
  const arg = tokens.slice(1).find((token) => /^\d+$/.test(token));
  return arg === undefined ? null : { kind, layer: Number(arg) };
}

// One entry looks like "&mt LSHIFT A", "&kp LS(N1)" or an AST object. JSON exports and
// .keymap source share this, so both imports label a key exactly the same way.
function labelFromEntry(entry: unknown): string {
  if (typeof entry === "object" && entry !== null) {
    const rec = entry as Record<string, unknown>;
    const decoration = rec.decoration as Record<string, unknown> | undefined;
    if (decoration?.label) return String(decoration.label);
    if (rec.label) return String(rec.label);
  }

  const tokens = flatTokens(entry);
  if (tokens.length === 0) return "NONE";
  const override = NON_CHARACTER_BEHAVIORS[tokens[0].toLowerCase()];
  if (override) return override;
  return extractZMKLabel(`&${tokens.join(" ")}`);
}

// Shared by both import paths: line every layer up with the board that is active right now.
function buildLayerMaps(
  hw: HardwareId,
  rawLayers: RawLayer[]
): Pick<ParsedZmk, "map" | "layers" | "names" | "activators"> {
  const positions = HARDWARE[hw].pos;
  const names = rawLayers.map((rawLayer, index) => prettyLayerName(rawLayer.name, index));
  const layers: string[][] = [];
  const activators: Array<Record<string, number>> = [];

  rawLayers.forEach((rawLayer) => {
    const labels: string[] = [];
    const active: Record<string, number> = {};
    positions.forEach((pos, index) => {
      const entry = rawLayer.entries[index];
      let label = entry === undefined ? "NONE" : labelFromEntry(entry);
      const target = layerTarget(entry);
      // A pure layer key is more useful named after the layer it opens than as "MO"/"TO".
      if (target && PURE_LAYER_BEHAVIORS.has(target.kind) && names[target.layer]) label = names[target.layer];
      labels.push(ZMK_EXCEPTIONS[label] || label);
      if (target) active[pos] = target.layer;
    });
    layers.push(labels);
    activators.push(active);
  });

  const map: Record<string, string> = {};
  positions.forEach((pos, index) => {
    map[pos] = layers[0][index];
  });

  return { map, layers, names, activators };
}

// JSON exports and Keymap Editor files list layers as arrays of entries; a few files carry a
// single unnamed bindings list instead.
function jsonRawLayers(data: unknown): RawLayer[] {
  const record = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  const list = Array.isArray(data) ? data : Array.isArray(record.layers) ? (record.layers as unknown[]) : null;

  if (!list) {
    const single = Array.isArray(record.bindings)
      ? (record.bindings as unknown[])
      : Array.isArray(record.keys)
        ? (record.keys as unknown[])
        : null;
    return single ? [{ name: "", entries: single }] : [];
  }

  const names = Array.isArray(record.layer_names) ? record.layer_names.map(String) : [];
  return list
    .map((entry, index) => {
      const layerRec =
        !Array.isArray(entry) && typeof entry === "object" && entry !== null
          ? (entry as Record<string, unknown>)
          : null;
      const entries = Array.isArray(entry)
        ? entry
        : Array.isArray(layerRec?.bindings)
          ? (layerRec?.bindings as unknown[])
          : Array.isArray(layerRec?.keys)
            ? (layerRec?.keys as unknown[])
            : [];
      return { name: String(layerRec?.name ?? names[index] ?? ""), entries };
    })
    .filter((layer) => layer.entries.length > 0);
}

export function parseZmkJson(jsonString: string, currentHw: HardwareId): ParsedZmk {
  const data = JSON.parse(jsonString) as Record<string, unknown> | unknown[];
  let hw = currentHw;

  const keyboard = !Array.isArray(data) ? data.keyboard : undefined;
  if (keyboard) {
    const kb = String(keyboard).toLowerCase();
    (["glove80", "go60", "corne", "voyager"] as HardwareId[]).forEach((k) => {
      if (kb.includes(k)) hw = k;
    });
  }

  const rawLayers = jsonRawLayers(data);
  if (rawLayers.length === 0) {
    throw new Error(
      !Array.isArray(data) && data.layouts
        ? "That is a keyboard layout definition — load it on the Hardware row instead."
        : "Could not find layer data in that file."
    );
  }

  return { hw, ...buildLayerMaps(hw, rawLayers) };
}

/* ==========================================================================
   .keymap / .dtsi source files
   ========================================================================== */

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

// Combos and macros use "bindings" too, so every layer node is read from inside the keymap
// node (its compatible marker) and each node name becomes that layer's name.
function keymapLayerBlocks(text: string): RawLayer[] {
  const keymapMarker = text.search(/compatible\s*=\s*"zmk,keymap"/);
  const scoped = keymapMarker >= 0 ? text.slice(keymapMarker) : text;

  const node = /([A-Za-z_][\w-]*)\s*\{([^{}]*)\}/g;
  const layers: RawLayer[] = [];
  let match: RegExpExecArray | null;
  while ((match = node.exec(scoped)) !== null) {
    const entries = bindingsEntries(match[2]);
    if (entries.length > 0) layers.push({ name: match[1], entries });
  }

  // A bindings list pasted on its own (no layer node around it) is still one usable layer.
  if (layers.length === 0) {
    const entries = bindingsEntries(scoped);
    if (entries.length > 0) layers.push({ name: "", entries });
  }

  return layers;
}

function bindingsEntries(body: string): string[] {
  const block = /(?:^|[^\w-])bindings\s*=\s*<([\s\S]*?)>/.exec(body);
  if (!block) return [];
  return block[1]
    .split("&")
    .map((entry) => `&${entry.trim()}`)
    .filter((entry) => entry.length > 1);
}

export function parseZmkKeymap(keymapText: string, currentHw: HardwareId): ParsedZmk {
  const layers = keymapLayerBlocks(stripComments(keymapText));
  if (layers.length === 0) throw new Error("No bindings block found in the keymap");

  return { hw: currentHw, ...buildLayerMaps(currentHw, layers) };
}

// Accepts either a ZMK JSON export or raw .keymap / .dtsi source.
export function parseZmkLayout(text: string, currentHw: HardwareId): ParsedZmk {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return parseZmkJson(text, currentHw);
  return parseZmkKeymap(text, currentHw);
}

/* ==========================================================================
   Keyboard layout definitions (QMK info.json / Keymap Editor keyboard json)
   ========================================================================== */

interface LayoutKeyEntry {
  row?: number;
  col?: number;
  matrix?: number[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  r?: number;
  rx?: number;
  ry?: number;
}

// Files shaped like { id, name, layouts: { <transform>: { layout: [ { row, col, x, y } ] } } }
// describe the keyboard itself: one entry per key in binding order, with its matrix position
// and its visual place. That is what lets a board we don't ship work out of the box.
export function parseKeyboardLayout(jsonText: string): BoardLayout {
  const data = JSON.parse(jsonText) as Record<string, unknown>;

  const layouts = data.layouts as Record<string, { layout?: LayoutKeyEntry[] }> | undefined;
  if (!layouts || typeof layouts !== "object") {
    throw new Error(
      data.layers
        ? "That is a keymap, not a keyboard layout — load it on the Source or Target row."
        : "No layouts section found in that file."
    );
  }

  const first = Object.values(layouts)[0];
  const entries = first?.layout;
  if (!Array.isArray(entries) || entries.length === 0) throw new Error("That layout file has no keys.");

  const geo: KeyGeo[] = [];
  const pos: string[] = [];

  entries.forEach((entry, index) => {
    const matrix = Array.isArray(entry.matrix) ? entry.matrix : undefined;
    const row = typeof entry.row === "number" ? entry.row : matrix?.[0];
    const col = typeof entry.col === "number" ? entry.col : matrix?.[1];

    let id = typeof row === "number" && typeof col === "number" ? `R${row}C${col}` : `K${index}`;
    if (pos.includes(id)) id = `K${index}`;
    pos.push(id);

    geo.push({
      x: Number(entry.x) || 0,
      y: Number(entry.y) || 0,
      w: entry.w,
      h: entry.h,
      r: entry.r,
      rx: entry.rx,
      ry: entry.ry,
    });
  });

  const rawId = String(data.id || data.keyboard_name || data.name || "custom");
  const id = rawId
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const name = String(data.name || data.keyboard_name || data.id || "Custom keyboard");

  return { id: id || "custom", name, geo, pos, origin: "file" };
}
