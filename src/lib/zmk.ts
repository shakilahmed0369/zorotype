import { HARDWARE, ZMK_EXCEPTIONS } from "./hardware";
import type { HardwareId } from "./types";

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
    if (flatArgs.length === 0) flatArgs.push(parts[0].replace(/^&/, ""));
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

  if (!firstLayer) throw new Error("Could not find layer data");

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
