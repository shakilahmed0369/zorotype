import { BLANK, HARDWARE, TRANSPARENT_LABEL } from "./hardware";
import type { HardwareId, ImportedLayers, LayerStack } from "./types";

// How long the board keeps showing the layer a press came from. The firmware layer key itself
// never reaches the browser, so a press is the only evidence that a thumb is being held —
// this window is what makes the board follow that hold instead of snapping back instantly.
export const LAYER_HOLD_MS = 900;

// Which labels reach through to the layer below when a press is read (`&trans`), and which labels
// have nothing on them at all. Non-character labels ("MO", "BT") are drawn but never scored.
const TRANSPARENT = new Set([TRANSPARENT_LABEL, "TRNS", "▽", "Ø", "ø"]);
const NO_CHARACTER = new Set([...TRANSPARENT, BLANK, ""]);
const SPACE_ALIASES = new Set(["SPACE", "SPC"]);

// The board's own normalisation (`&trans` comes through as TRANS, SPACE as Space) is already
// applied at parse time, so a label maps to a character exactly the way the engine scores it.
export function labelToChar(label: string): string {
  const upper = (label || "").trim().toUpperCase();
  if (upper.length === 0 || NO_CHARACTER.has(upper)) return "";
  if (SPACE_ALIASES.has(upper)) return " ";
  if (upper.length === 1) return upper.toLowerCase();
  return "";
}

function isTransparent(label: string | undefined): boolean {
  return TRANSPARENT.has((label ?? "").trim().toUpperCase());
}

/**
 * A key with nothing on it: `&none`, a key the file never binds, and `&trans` — the board draws a
 * layer exactly as the keymap writes it, so a pass-through key is empty on the board too. The
 * renderer and the engine share this, so a key that looks empty is never scored either. The space
 * bar types a space and is not a blank.
 */
export function isBlankLabel(label: string | undefined): boolean {
  if (label === " ") return false;
  const upper = (label ?? "").trim().toUpperCase();
  return upper.length === 0 || NO_CHARACTER.has(upper);
}

/** `lower_layer` / `RAISE` / `3` -> "Lower" / "Raise" / "L3". */
export function prettyLayerName(nodeName: string, index: number): string {
  const cleaned = (nodeName || "").replace(/[-_]+/g, " ").replace(/\blayers?\b/gi, "").trim();
  if (!cleaned) return index === 0 ? "Base" : `L${index}`;
  if (/^\d+$/.test(cleaned)) return `L${cleaned}`;
  const words = cleaned.toLowerCase().split(/\s+/);
  if (index === 0 && (words[0] === "default" || words[0] === "base")) return "Base";
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function layerNames(names: string[] | null | undefined, count: number): string[] {
  return Array.from({ length: count }, (_, index) => prettyLayerName(names?.[index] ?? "", index));
}

// `&trans` means "keep whatever the layer below has on this key", so a stack is only usable for
// reading presses once every layer has been overlaid on its predecessor. Chains resolve as they
// are built. This is for the engine, not for the board: `layerToMap` draws what a layer assigns.
export function resolveTransparency(raw: string[][], length: number): string[][] {
  const resolved: string[][] = [];
  raw.forEach((layer, index) => {
    const below = resolved[index - 1];
    resolved.push(
      Array.from({ length }, (_, i) => {
        const label = layer[i];
        if (!isTransparent(label)) return label ?? BLANK;
        return below ? below[i] ?? BLANK : label ?? BLANK;
      })
    );
  });
  return resolved;
}

function padLayer(layer: string[], length: number): string[] {
  return Array.from({ length }, (_, i) => layer[i] ?? BLANK);
}

function validActivators(activators: Record<string, number> | undefined, layerCount: number): Record<string, number> {
  const out: Record<string, number> = {};
  Object.entries(activators ?? {}).forEach(([pos, layer]) => {
    if (Number.isInteger(layer) && layer >= 0 && layer < layerCount) out[pos] = layer;
  });
  return out;
}

/** Builds the display stack for an import, or null when the layout has a single layer. */
export function buildLayerStack(hw: HardwareId, imported: ImportedLayers | null): LayerStack | null {
  if (!imported || imported.maps.length === 0) return null;
  const pos = HARDWARE[hw]?.pos ?? [];
  if (pos.length === 0) return null;

  const raw = imported.maps.map((layer) => padLayer(layer, pos.length));
  return {
    pos,
    names: layerNames(imported.names, raw.length),
    raw,
    resolved: resolveTransparency(raw, pos.length),
    activators: raw.map((_, index) => validActivators(imported.activators?.[index], raw.length)),
  };
}

/** True when the layer itself assigns this character to a key (transparency does not count). */
function layerDefines(stack: LayerStack, layer: number, ch: string): boolean {
  const want = labelToChar(ch);
  if (!want || !stack.raw[layer]) return false;
  return stack.raw[layer].some((label) => labelToChar(label) === want);
}

/**
 * The layer the next character needs, or null when there is nothing to go on (no next
 * character, or no layer can type it). The layer already on screen wins when it can produce
 * the character too, so two layers that share a key never make the board flicker.
 */
export function predictedLayer(stack: LayerStack | null, expectedChar: string | null, current: number): number | null {
  if (!stack || !expectedChar) return null;
  const clamped = current >= 0 && current < stack.raw.length ? current : 0;
  if (layerDefines(stack, clamped, expectedChar)) return clamped;
  for (let layer = 0; layer < stack.raw.length; layer++) {
    if (layerDefines(stack, layer, expectedChar)) return layer;
  }
  return null;
}

/**
 * Finds the key that produces a character and the layer it comes from, preferring the layer
 * already on screen — that is the reading the user's hands are in.
 */
export function findChar(
  stack: LayerStack | null,
  ch: string,
  preferred: number
): { pos: string; layer: number } | null {
  const want = labelToChar(ch);
  if (!stack || !want) return null;

  const order: number[] = [];
  const push = (layer: number) => {
    if (layer >= 0 && layer < stack.resolved.length && !order.includes(layer)) order.push(layer);
  };
  push(preferred);
  push(0);
  stack.resolved.forEach((_, layer) => push(layer));

  for (const layer of order) {
    const index = stack.resolved[layer].findIndex((label) => labelToChar(label) === want);
    if (index >= 0) return { pos: stack.pos[index], layer };
  }
  return null;
}

/** Position of the expected key: the layer on screen first, then the layers underneath. */
export function findLabelPos(stack: LayerStack | null, layer: number, ch: string): string | undefined {
  const match = findChar(stack, ch, layer);
  return match ? match.pos : undefined;
}

function toMap(stack: LayerStack, labels: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  stack.pos.forEach((pos, index) => {
    map[pos] = labels[index] ?? "";
  });
  return map;
}

/**
 * One layer as the board draws it: exactly what that layer assigns. A key the file leaves empty —
 * `&trans`, `&none`, a position it never spells out — is drawn empty instead of borrowing the
 * label of the layer below, so the board shows the layer the way the keymap writes it.
 */
export function layerToMap(stack: LayerStack, layer: number): Record<string, string> {
  return toMap(stack, stack.raw[layer] ?? stack.raw[0] ?? []);
}

/** The same layer with `&trans` filled in from below: the labels a press on it really produces. */
export function resolvedLayerMap(stack: LayerStack, layer: number): Record<string, string> {
  return toMap(stack, stack.resolved[layer] ?? stack.resolved[0] ?? []);
}

/** Replaces one layer's labels with an edited map — drag-remap only touches the base layer. */
export function withLayerOverride(stack: LayerStack, layer: number, override: Record<string, string>): LayerStack {
  const raw = stack.raw.map((labels, index) =>
    index === layer ? stack.pos.map((pos, i) => override[pos] ?? labels[i]) : labels
  );
  return {
    pos: stack.pos,
    names: stack.names,
    raw,
    resolved: resolveTransparency(raw, stack.pos.length),
    activators: stack.activators,
  };
}

/**
 * The layer the board should draw. A manual pin beats everything, then the layer the next
 * character needs — so the board is back on base on the very next key rather than waiting.
 * The layer a press came from only stands in while the next character cannot be placed.
 */
export function visibleLayer(
  stack: LayerStack | null,
  state: {
    activeLayer: number | null;
    pinnedLayer: number | null;
    typedLayer: number | null;
    typedLayerUntil: number;
  },
  now: number = Date.now()
): number {
  const available = stack?.resolved.length ?? 1;
  const clamp = (layer: number) => (layer >= 0 && layer < available ? layer : 0);
  if (state.pinnedLayer !== null) return clamp(state.pinnedLayer);
  if (state.activeLayer !== null) return clamp(state.activeLayer);
  if (state.typedLayer !== null && state.typedLayerUntil > now) return clamp(state.typedLayer);
  return 0;
}

/** Every position whose key activates `layer`, looked up across the whole stack. */
export function activatorPositions(stack: LayerStack, layer: number): string[] {
  const positions = new Set<string>();
  stack.activators.forEach((activators) => {
    Object.entries(activators).forEach(([pos, target]) => {
      if (target === layer) positions.add(pos);
    });
  });
  return [...positions];
}

