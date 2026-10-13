import { HARDWARE } from "./hardware";
import { LANGUAGES, SCRIPT_MAPS } from "./languages";
import type { ParsedZmk } from "./zmk";
import type { Config, HardwareId, ImportedLayers, KeyGeo } from "./types";

// Derive the script layout (arabic) for every board from its qwerty layout, so pressing a
// physical key produces the correct letter (blind typing of that script).
export function buildScriptLayouts(): void {
  (Object.keys(HARDWARE) as HardwareId[]).forEach((hw) => {
    const q = HARDWARE[hw].layouts["qwerty"];
    if (!q) return;
    Object.keys(SCRIPT_MAPS).forEach((script) => {
      const map = SCRIPT_MAPS[script];
      HARDWARE[hw].layouts[script] = q.map((k) => (map[k] !== undefined ? map[k] : k));
    });
  });
}

export function isHomerow(hw: HardwareId, pos: string): boolean {
  if (hw === "ansi60") return ["K21", "K22", "K23", "K24", "K27", "K28", "K29", "K2A"].includes(pos);
  if (hw === "glove80") return ["LH_C5R4", "LH_C4R4", "LH_C3R4", "LH_C2R4", "RH_C2R4", "RH_C3R4", "RH_C4R4", "RH_C5R4"].includes(pos);
  if (hw === "go60") return ["LH_C5R3", "LH_C4R3", "LH_C3R3", "LH_C2R3", "RH_C2R3", "RH_C3R3", "RH_C4R3", "RH_C5R3"].includes(pos);
  if (hw === "corne" || hw === "voyager")
    return ["L_C1R1", "L_C2R1", "L_C3R1", "L_C4R1", "R_C1R1", "R_C2R1", "R_C3R1", "R_C4R1"].includes(pos);
  // Imported / library boards: the resting row is the one that got the homerow letters, and
  // R1 is the fallback when the board has no derived letters.
  const index = HARDWARE[hw]?.pos.indexOf(pos) ?? -1;
  if (index >= 0) {
    const derived = HARDWARE[hw].layouts["qwerty"]?.[index];
    if (derived) return ["A", "S", "D", "F", "G", "H", "J", "K", "L"].includes(derived);
  }
  return /^R1C/.test(pos);
}

/** A board's built-in layout, as position -> label. */
export function buildMap(hw: HardwareId, layoutName: string): Record<string, string> {
  const map: Record<string, string> = {};
  const posArray = HARDWARE[hw].pos;
  const layoutArray = HARDWARE[hw].layouts[layoutName] || HARDWARE[hw].layouts["qwerty"] || [];
  posArray.forEach((p, i) => {
    map[p] = layoutArray[i] ?? "";
  });
  return map;
}

// Arabic is typed blind: its generated script layout stands in for the keyboard's letters, unless
// an imported keymap already spells them.
export function usesScriptLayout(config: Config): boolean {
  const script = LANGUAGES[config.lang] && LANGUAGES[config.lang].script;
  return script === "arabic" && config.sourceKey !== "custom_json";
}

/**
 * Labels as the physical keys produce them. A press is matched against these, so a dragged key
 * still answers to the letter its keycap originally had.
 */
export function currentMatchMap(config: Config): Record<string, string> {
  return config.sourceKey === "custom_json" ? config.sourceJsonMap || {} : buildMap(config.hw, config.sourceKey);
}

/**
 * The layout the board draws and every press is judged by: your imported keymap, the script layout
 * for a blind-typed language, or the standard layout you picked — with any dragged keys on top.
 */
export function currentLayoutMap(config: Config): Record<string, string> {
  const base =
    config.sourceKey === "custom_json"
      ? config.sourceJsonMap || {}
      : usesScriptLayout(config)
        ? buildMap(config.hw, LANGUAGES[config.lang].script)
        : buildMap(config.hw, config.sourceKey);
  return config.draggedMap ? { ...base, ...config.draggedMap } : base;
}

// Imported keymaps carry every layer; keep them together so the board can show the one in use.
export function importedLayersFrom(parsed: ParsedZmk): ImportedLayers {
  return { names: parsed.names, maps: parsed.layers, activators: parsed.activators };
}

// The layers of what the computer actually outputs, which is what a press can be traced back to.
export function sourceLayersFor(config: Config): ImportedLayers | null {
  return config.sourceKey === "custom_json" ? config.sourceLayers : null;
}

export function mirrorPos(pos: string): string {
  if (pos.startsWith("LH_")) return pos.replace("LH_", "RH_");
  if (pos.startsWith("RH_")) return pos.replace("RH_", "LH_");
  if (pos.startsWith("L_")) return pos.replace("L_", "R_");
  if (pos.startsWith("R_")) return pos.replace("R_", "L_");
  return pos;
}

export function getMirroredMap(map: Record<string, string>): Record<string, string> {
  const mirrored: Record<string, string> = {};
  Object.keys(map).forEach((pos) => {
    const mirror = mirrorPos(pos);
    mirrored[map[mirror] !== undefined ? mirror : pos] = map[pos];
  });
  return mirrored;
}

export function getFingerName(pos: string, hw?: HardwareId): string {
  if (pos.includes("T") || pos === "K43" || pos === "K44" || pos === "Space") {
    return pos.includes("L") ? "L thumb" : "R thumb";
  }
  const isLeft = pos.includes("L") || (pos.startsWith("K") && parseInt(pos.charAt(2), 16) < 6);
  const hand = isLeft ? "L" : "R";
  const colMatch = pos.match(/C(\d)/);
  if (colMatch) {
    const col = parseInt(colMatch[1]);
    if (pos.startsWith("LH_") || pos.startsWith("RH_")) {
      if (col <= 2) return hand + " pinky";
      if (col === 3) return hand + " ring";
      if (col === 4) return hand + " mid";
      return hand + " index";
    }
    if (pos.startsWith("L_") || pos.startsWith("R_")) {
      if (col <= 1) return hand + " pinky";
      if (col === 2) return hand + " ring";
      if (col === 3) return hand + " mid";
      return hand + " index";
    }
  }
  if (pos.startsWith("K")) {
    const c = parseInt(pos.charAt(2), 16);
    if (isLeft) {
      if (c <= 1) return "L pinky";
      if (c === 2) return "L ring";
      if (c === 3) return "L mid";
      return "L index";
    } else {
      if (c >= 11) return "R pinky";
      if (c === 10) return "R ring";
      if (c === 9) return "R mid";
      return "R index";
    }
  }
  // Imported boards name positions R<row>C<col>: derive the finger from the column, and mark
  // the thumb key(s) from the board's derived starting layout when there is one.
  const grid = pos.match(/^R(\d+)C(\d+)$/);
  if (grid) {
    const row = parseInt(grid[1]);
    const col = parseInt(grid[2]);
    const hand = col <= 5 ? "L" : "R";
    const index = hw ? (HARDWARE[hw]?.pos.indexOf(pos) ?? -1) : -1;
    const derived = index >= 0 && hw ? HARDWARE[hw].layouts["qwerty"]?.[index] : undefined;
    if (derived === "Space" || row >= 4) return hand + " thumb";
    const withinHalf = col <= 5 ? col : 11 - col;
    if (withinHalf <= 1) return hand + " pinky";
    if (withinHalf === 2) return hand + " ring";
    if (withinHalf === 3) return hand + " mid";
    return hand + " index";
  }
  return "other";
}

export interface KeyRect {
  pos: string;
  x: number;
  y: number;
  w: number;
  h: number;
  transform: string;
}

export interface KeyboardLayout {
  keys: KeyRect[];
  viewBox: string;
  maxWidth: number;
}

const UNIT = 56;
const PAD = 12;
const KEY_INSET = 6;

export function buildKeyRects(hw: HardwareId): KeyboardLayout {
  const geo = HARDWARE[hw].geo;
  const posArray = HARDWARE[hw].pos;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const updateBounds = (px: number, py: number, cx: number, cy: number, angle: number) => {
    if (!angle) {
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
      return;
    }
    const rad = angle * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const nx = cos * (px - cx) - sin * (py - cy) + cx;
    const ny = sin * (px - cx) + cos * (py - cy) + cy;
    minX = Math.min(minX, nx);
    maxX = Math.max(maxX, nx);
    minY = Math.min(minY, ny);
    maxY = Math.max(maxY, ny);
  };

  const keys = geo.map((k: KeyGeo, i: number) => {
    const pos = posArray[i];
    const x = (k.x || 0) * UNIT;
    const y = (k.y || 0) * UNIT;
    const w = (k.w || 1) * UNIT - KEY_INSET;
    const h = (k.h || 1) * UNIT - KEY_INSET;

    let cx = x;
    let cy = y;
    let angle = 0;
    let transform = `translate(${x}, ${y})`;
    if (k.r) {
      cx = (k.rx !== undefined ? k.rx : k.x) * UNIT;
      cy = (k.ry !== undefined ? k.ry : k.y) * UNIT;
      angle = k.r;
      transform = `rotate(${k.r}, ${cx}, ${cy}) translate(${x}, ${y})`;
    }

    updateBounds(x, y, cx, cy, angle);
    updateBounds(x + w, y, cx, cy, angle);
    updateBounds(x, y + h, cx, cy, angle);
    updateBounds(x + w, y + h, cx, cy, angle);

    return { pos, x, y, w, h, transform };
  });

  const width = maxX - minX;
  const height = maxY - minY;
  return {
    keys,
    viewBox: `${minX - PAD} ${minY - PAD} ${width + PAD * 2} ${height + PAD * 2}`,
    maxWidth: width + PAD * 2,
  };
}
