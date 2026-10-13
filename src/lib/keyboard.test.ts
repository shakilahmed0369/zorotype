import { describe, expect, it } from "vitest";
import { HARDWARE } from "./hardware";
import { buildKeyRects, buildMap, buildScriptLayouts, currentTargetLayers, currentTargetMap, getFingerName, getMirroredMap, sourceLayersFor, usesScriptLayout } from "./keyboard";
import { DEFAULT_CONFIG } from "./storage";
import type { Config, ImportedLayers } from "./types";

const cfg = (over: Partial<Config> = {}): Config => ({ ...DEFAULT_CONFIG, ...over });

describe("buildMap", () => {
  it("maps layout labels onto hardware positions", () => {
    const map = buildMap("go60", "qwerty", "target", cfg());
    expect(map[HARDWARE.go60.pos[0]]).toBe(HARDWARE.go60.layouts.qwerty[0]);
    expect(map[HARDWARE.go60.pos[59]]).toBe(HARDWARE.go60.layouts.qwerty[59]);
  });

  it("resolves a default target to the source layout", () => {
    const map = buildMap("go60", "default", "target", cfg({ sourceKey: "dvorak" }));
    expect(map[HARDWARE.go60.pos[1]]).toBe(HARDWARE.go60.layouts.dvorak[1]);
  });

  it("falls back to qwerty for unknown layout names", () => {
    const map = buildMap("go60", "nonsense", "target", cfg());
    expect(map[HARDWARE.go60.pos[0]]).toBe(HARDWARE.go60.layouts.qwerty[0]);
  });

  it("returns custom json maps verbatim", () => {
    const custom = { L_C0R0: "Z" };
    expect(buildMap("corne", "custom_json", "source", cfg({ sourceJsonMap: custom }))).toBe(custom);
    expect(buildMap("corne", "custom_json", "target", cfg({ targetJsonMap: custom }))).toBe(custom);
    expect(buildMap("corne", "custom_dragged", "target", cfg({ draggedMap: custom }))).toBe(custom);
  });

  it("resolves a custom_json default target to the source json map", () => {
    const source = { L_C0R0: "Q" };
    const map = buildMap("corne", "default", "target", cfg({ sourceKey: "custom_json", sourceJsonMap: source }));
    expect(map).toBe(source);
  });
});

describe("currentTargetMap", () => {
  it("forces the generated script layout for rtl languages", () => {
    buildScriptLayouts();
    const map = currentTargetMap(cfg({ lang: "ar", hw: "go60" }));
    expect(map[HARDWARE.go60.pos[13]]).toBe("ض"); // the Q key types its Arabic letter
  });

  it("respects explicit custom targets even for rtl languages", () => {
    buildScriptLayouts();
    const base = buildMap("go60", "qwerty", "target", cfg());
    const dragged = { ...base, [HARDWARE.go60.pos[0]]: "X" };
    const map = currentTargetMap(cfg({ lang: "ar", tgt: "custom_dragged", draggedMap: dragged }));
    expect(map[HARDWARE.go60.pos[0]]).toBe("X");
  });
});

describe("usesScriptLayout", () => {
  it("only counts the blind-typed scripts", () => {
    expect(usesScriptLayout(cfg({ lang: "ar" }))).toBe(true);
    expect(usesScriptLayout(cfg({ lang: "en" }))).toBe(false);
    expect(usesScriptLayout(cfg({ lang: "es" }))).toBe(false);
  });

  it("gives way to an explicit target", () => {
    expect(usesScriptLayout(cfg({ lang: "ar", tgt: "custom_dragged" }))).toBe(false);
  });
});

describe("currentTargetLayers", () => {
  const imported: ImportedLayers = {
    names: ["Base", "Lower"],
    maps: [["Q"], ["1"]],
    activators: [{}, {}],
  };

  it("follows a default target back to the source import", () => {
    expect(currentTargetLayers(cfg({ tgt: "default", sourceLayers: imported }))).toBe(imported);
  });

  it("uses the target import when the target is an imported layout", () => {
    expect(currentTargetLayers(cfg({ tgt: "custom_json", targetLayers: imported }))).toBe(imported);
    expect(currentTargetLayers(cfg({ tgt: "custom_json", sourceLayers: imported }))).toBeNull();
  });

  it("has no layers for built-in layouts, dragged maps and script targets", () => {
    expect(currentTargetLayers(cfg({ tgt: "colemak-dh", sourceLayers: imported }))).toBeNull();
    expect(currentTargetLayers(cfg({ tgt: "custom_dragged", sourceLayers: imported }))).toBeNull();
    buildScriptLayouts();
    expect(currentTargetLayers(cfg({ lang: "ar", tgt: "default", sourceLayers: imported }))).toBeNull();
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
