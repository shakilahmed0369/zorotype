import { HARDWARE, ZMK_EXCEPTIONS } from "./hardware";
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
}

export function parseZmkJson(jsonString: string, currentHw: HardwareId): ParsedZmk {
  const data = JSON.parse(jsonString);
  let hw = currentHw;

  if (data && data.keyboard) {
    const kb = String(data.keyboard).toLowerCase();
    (["glove80", "go60", "corne", "voyager"] as HardwareId[]).forEach((k) => {
      if (kb.includes(k)) hw = k;
    });
  }

  let firstLayer: unknown = null;
  if (data && data.layers && data.layers.length > 0) firstLayer = data.layers[0];
  else if (Array.isArray(data) && data.length > 0) firstLayer = data[0];
  else if (data && data.bindings) firstLayer = data;

  if (!firstLayer) {
    throw new Error(
      data && data.layouts
        ? "That is a keyboard layout definition — load it on the Hardware row instead."
        : "Could not find layer data in that file."
    );
  }

  const layerRec = firstLayer as Record<string, unknown>;
  let bindings: unknown = Array.isArray(firstLayer) ? firstLayer : layerRec.bindings || layerRec.keys || [];
  if (!Array.isArray(bindings) || bindings.length === 0) {
    if (data.keys && Array.isArray(data.keys)) bindings = data.keys;
    else throw new Error("Layer has no bindings");
  }

  const limit = HARDWARE[hw].pos.length;
  const map: Record<string, string> = {};
  for (let i = 0; i < limit; i++) {
    const label = extractZMKLabel((bindings as unknown[])[i]);
    map[HARDWARE[hw].pos[i]] = ZMK_EXCEPTIONS[label] || label;
  }

  return { hw, map };
}

/* ==========================================================================
   .keymap / .dtsi source files
   ========================================================================== */

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

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

// One entry looks like "&mt LSHIFT A" or "&kp LS(N1)" - reuse the modifier-peeling
// logic from the JSON path on a rebuilt binding string.
function labelFromBinding(entry: string): string {
  const tokens = entry
    .replace(/^&/, "")
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (tokens.length === 0) return "NONE";

  const override = NON_CHARACTER_BEHAVIORS[tokens[0].toLowerCase()];
  if (override) return override;

  return extractZMKLabel(`&${tokens.join(" ")}`);
}

// Combos and macros also use "bindings", so look for the first block inside the keymap node
// (its compatible marker) rather than the first one in the file.
function firstLayerBindings(text: string): string | null {
  const keymapMarker = text.search(/compatible\s*=\s*"zmk,keymap"/);
  const scoped = keymapMarker >= 0 ? text.slice(keymapMarker) : text;
  const match = /bindings\s*=\s*<([\s\S]*?)>/.exec(scoped);
  return match ? match[1] : null;
}

export function parseZmkKeymap(keymapText: string, currentHw: HardwareId): ParsedZmk {
  const block = firstLayerBindings(stripComments(keymapText));
  if (!block) throw new Error("No bindings block found in the keymap");

  const entries = block
    .split("&")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) throw new Error("The first bindings block is empty");

  const positions = HARDWARE[currentHw].pos;
  const map: Record<string, string> = {};
  for (let i = 0; i < positions.length; i++) {
    const label = entries[i] ? labelFromBinding(entries[i]) : "NONE";
    map[positions[i]] = ZMK_EXCEPTIONS[label] || label;
  }

  return { hw: currentHw, map };
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

  return { id: id || "custom", name, geo, pos };
}
