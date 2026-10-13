import { describe, expect, it } from "vitest";
import { HARDWARE } from "./hardware";
import { buildKeyRects, buildMap, buildScriptLayouts, currentLayoutMap, currentMatchMap, getFingerName, getMirroredMap, sourceLayersFor, usesScriptLayout } from "./keyboard";
import { DEFAULT_CONFIG } from "./storage";
import type { Config, ImportedLayers } from "./types";

const cfg = (over: Partial<Config> = {}): Config => ({ ...DEFAULT_CONFIG, ...over });

describe("buildMap", () => {
  it("maps layout labels onto hardware positions", () => {
    const map = buildMap("go60", "qwerty");
    expect(map[HARDWARE.go60.pos[0]]).toBe(HARDWARE.go60.layouts.qwerty[0]);
    expect(map[HARDWARE.go60.pos[59]]).toBe(HARDWARE.go60.layouts.qwerty[59]);
  });

  it("falls back to qwerty for unknown layout names", () => {
    const map = buildMap("go60", "nonsense");
    expect(map[HARDWARE.go60.pos[0]]).toBe(HARDWARE.go60.layouts.qwerty[0]);
  });
});

describe("currentLayoutMap", () => {
  it("draws the layout the computer outputs", () => {
    const map = currentLayoutMap(cfg({ sourceKey: "dvorak", hw: "go60" }));
    expect(map[HARDWARE.go60.pos[13]]).toBe(HARDWARE.go60.layouts.dvorak[13]);
  });

  it("prefers the imported keymap over the built-in layout", () => {
    const imported = { L_C0R0: "Q" };
    expect(currentLayoutMap(cfg({ sourceKey: "custom_json", sourceJsonMap: imported }))).toBe(imported);
  });

  it("reads Arabic through its generated script layout", () => {
    buildScriptLayouts();
    const map = currentLayoutMap(cfg({ lang: "ar", hw: "go60" }));
    expect(map[HARDWARE.go60.pos[13]]).toBe("ض"); // the Q key types its Arabic letter
  });

  it("lets an imported keymap spell its own letters for a script language", () => {
    buildScriptLayouts();
    const imported = { [HARDWARE.go60.pos[13]]: "ع" };
    const map = currentLayoutMap(cfg({ lang: "ar", hw: "go60", sourceKey: "custom_json", sourceJsonMap: imported }));
    expect(map[HARDWARE.go60.pos[13]]).toBe("ع");
  });

  it("lays dragged keys over whichever layout is in play", () => {
    const base = buildMap("go60", "qwerty");
    const dragged = { [HARDWARE.go60.pos[0]]: "X" };
    const map = currentLayoutMap(cfg({ hw: "go60", draggedMap: dragged }));
    expect(map[HARDWARE.go60.pos[0]]).toBe("X");
    expect(map[HARDWARE.go60.pos[1]]).toBe(base[HARDWARE.go60.pos[1]]);
  });
});

describe("currentMatchMap", () => {
  it("keeps the physical labels, so a dragged key still answers to its original letter", () => {
    const base = buildMap("go60", "qwerty");
    const dragged = { [HARDWARE.go60.pos[0]]: "X" };
    const match = currentMatchMap(cfg({ hw: "go60", draggedMap: dragged }));
    expect(match[HARDWARE.go60.pos[0]]).toBe(base[HARDWARE.go60.pos[0]]);
  });
});

describe("usesScriptLayout", () => {
  it("only counts the blind-typed scripts", () => {
    expect(usesScriptLayout(cfg({ lang: "ar" }))).toBe(true);
    expect(usesScriptLayout(cfg({ lang: "en" }))).toBe(false);
    expect(usesScriptLayout(cfg({ lang: "es" }))).toBe(false);
  });

  it("gives way to a keymap that spells the letters itself", () => {
    expect(usesScriptLayout(cfg({ lang: "ar", sourceKey: "custom_json" }))).toBe(false);
  });
});

describe("sourceLayersFor", () => {
  it("only offers layers for an imported source", () => {
    const imported: ImportedLayers = { names: ["Base"], maps: [["Q"]], activators: [{}] };
    expect(sourceLayersFor(cfg({ sourceKey: "custom_json", sourceLayers: imported }))).toBe(imported);
    expect(sourceLayersFor(cfg({ sourceKey: "qwerty", sourceLayers: imported }))).toBeNull();
  });
});

describe("getMirroredMap", () => {
  it("swaps left and right labels", () => {
    expect(getMirroredMap({ L_C0R0: "A", R_C0R0: "B" })).toEqual({ R_C0R0: "A", L_C0R0: "B" });
  });

  it("swaps glove-style LH/RH prefixes", () => {
    expect(getMirroredMap({ LH_C1R1: "A", RH_C1R1: "B" })).toEqual({ RH_C1R1: "A", LH_C1R1: "B" });
  });

  it("keeps centered keys in place", () => {
    expect(getMirroredMap({ K00: "Esc" })).toEqual({ K00: "Esc" });
  });
});

describe("getFingerName", () => {
  it("names split-board fingers", () => {
    expect(getFingerName("L_C0R1")).toBe("L pinky");
    expect(getFingerName("R_C5R2")).toBe("R index");
    expect(getFingerName("L_T2")).toBe("L thumb");
    expect(getFingerName("R_T1")).toBe("R thumb");
    expect(getFingerName("LH_C2R3")).toBe("L pinky");
    expect(getFingerName("RH_C3R3")).toBe("R ring");
  });

  it("names ansi matrix positions", () => {
    expect(getFingerName("K00")).toBe("L pinky");
    expect(getFingerName("K0D")).toBe("R pinky");
  });
});

describe("buildKeyRects", () => {
  it("produces one rect per hardware position", () => {
    const layout = buildKeyRects("corne");
    expect(layout.keys).toHaveLength(HARDWARE.corne.pos.length);
    expect(layout.keys[0].pos).toBe(HARDWARE.corne.pos[0]);
    expect(layout.viewBox.split(" ")).toHaveLength(4);
    expect(layout.maxWidth).toBeGreaterThan(0);
  });

  it("emits rotate transforms for rotated keys", () => {
    const layout = buildKeyRects("corne");
    const thumbs = layout.keys.filter((k) => k.transform.includes("rotate("));
    expect(thumbs.length).toBeGreaterThan(0);
  });
});
