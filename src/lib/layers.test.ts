import { describe, expect, it } from "vitest";
import { HARDWARE } from "./hardware";
import { importedLayersFrom } from "./keyboard";
import {
  activatorPositions,
  buildLayerStack,
  findChar,
  findLabelPos,
  isBlankLabel,
  labelToChar,
  layerToMap,
  predictedLayer,
  prettyLayerName,
  resolveTransparency,
  resolvedLayerMap,
  visibleLayer,
  withLayerOverride,
} from "./layers";
import type { ImportedLayers, LayerStack } from "./types";
import { parseZmkKeymap } from "./zmk";

const POS = HARDWARE.corne.pos;

// A three-layer Corne-shaped import: digits on Lower, a symbol on Raise, and the thumb that
// opens Lower. NONE is a key with nothing on it; TRANS is `&trans`, which keeps the key from the
// layer below — the way a layer that only overrides a few keys is spelled.
function corneLayers(over: Partial<ImportedLayers> = {}): ImportedLayers {
  const base = POS.map(() => "NONE");
  base[0] = "Q";
  base[1] = "W";
  base[3] = "E";
  base[12] = "A";
  base[36] = "Lower";

  const lower = POS.map(() => "TRANS");
  lower[0] = "1";
  lower[1] = "2";
  lower[12] = "TRANS"; // transparent: the A stays where it is

  const raise = POS.map(() => "TRANS");
  raise[2] = "0"; // digits are not on Raise, so this inherits from Lower
  raise[3] = "NONE"; // &none: nothing here, and nothing comes through from Base

  return {
    names: ["default_layer", "lower_layer", "raise_layer"],
    maps: [base, lower, raise],
    activators: [{ [POS[36]]: 1 }, {}, {}],
    ...over,
  };
}

function stack(over: Partial<ImportedLayers> = {}): LayerStack {
  const built = buildLayerStack("corne", corneLayers(over));
  if (!built) throw new Error("expected a stack");
  return built;
}

describe("prettyLayerName", () => {
  it("names layers from their keymap node names", () => {
    expect(prettyLayerName("default_layer", 0)).toBe("Base");
    expect(prettyLayerName("lower_layer", 1)).toBe("Lower");
    expect(prettyLayerName("RAISE", 2)).toBe("Raise");
    expect(prettyLayerName("adjust_layer", 3)).toBe("Adjust");
  });

  it("falls back to a numbered name", () => {
    expect(prettyLayerName("", 0)).toBe("Base");
    expect(prettyLayerName("", 2)).toBe("L2");
    expect(prettyLayerName("3", 3)).toBe("L3");
  });
});

describe("resolveTransparency", () => {
  it("inherits transparent keys from the layer below", () => {
    const resolved = resolveTransparency(
      [
        ["A", "B"],
        ["TRANS", "C"],
      ],
      2
    );
    expect(resolved[1]).toEqual(["A", "C"]);
  });

  it("resolves a chain of transparent layers", () => {
    const resolved = resolveTransparency([["A"], ["TRANS"], ["TRANS"]], 1);
    expect(resolved[2]).toEqual(["A"]);
  });

  it("leaves a key with nothing on it blank instead of borrowing the layer below", () => {
    const resolved = resolveTransparency(
      [
        ["A", "B"],
        ["NONE", "C"],
      ],
      2
    );
    expect(resolved[1]).toEqual(["NONE", "C"]);
  });

  it("leaves blank keys blank on the base layer", () => {
    expect(resolveTransparency([["NONE"]], 1)[0]).toEqual(["NONE"]);
  });

  it("stays blank where a layer stops early", () => {
    expect(resolveTransparency([["A", "B"], ["C"]], 2)[1]).toEqual(["C", "NONE"]);
  });
});

describe("labelToChar", () => {
  it("normalises labels the way the engine scores them", () => {
    expect(labelToChar("A")).toBe("a");
    expect(labelToChar("Space")).toBe(" ");
    expect(labelToChar("7")).toBe("7");
    expect(labelToChar("Enter")).toBe("");
    expect(labelToChar("Lower")).toBe("");
    expect(labelToChar("NONE")).toBe("");
    expect(labelToChar("TRANS")).toBe("");
  });
});

describe("isBlankLabel", () => {
  it("knows the keys with nothing on them", () => {
    expect(isBlankLabel("NONE")).toBe(true);
    expect(isBlankLabel("TRANS")).toBe(true);
    expect(isBlankLabel("")).toBe(true);
    expect(isBlankLabel(undefined)).toBe(true);
  });

  it("keeps every label the board draws", () => {
    expect(isBlankLabel("A")).toBe(false);
    expect(isBlankLabel("Space")).toBe(false);
    expect(isBlankLabel("MO")).toBe(false);
    expect(isBlankLabel("Lower")).toBe(false);
  });

  it("treats the space bar as a key that types", () => {
    expect(isBlankLabel(" ")).toBe(false); // the space character the engine scores with
  });
});

describe("buildLayerStack", () => {
  it("returns null without an import", () => {
    expect(buildLayerStack("corne", null)).toBeNull();
  });

  it("pads every layer to the board's key count and names them", () => {
    const built = stack();
    expect(built.pos).toEqual(POS);
    expect(built.names).toEqual(["Base", "Lower", "Raise"]);
    expect(built.raw).toHaveLength(3);
    expect(built.raw[1]).toHaveLength(POS.length);
    expect(built.raw[1][POS.length - 1]).toBe("TRANS");
  });

  it("pads a layer that stops early with blank keys, not inherited ones", () => {
    const built = stack({ names: ["Base", "Lower"], maps: [POS.map(() => "Q"), ["1"]], activators: [{}, {}] });
    expect(built.raw[1]).toHaveLength(POS.length);
    expect(built.raw[1][POS.length - 1]).toBe("NONE");
    expect(built.resolved[1][POS.length - 1]).toBe("NONE");
  });

  it("resolves transparency once, per layer", () => {
    const built = stack();
    expect(built.resolved[0][12]).toBe("A");
    expect(built.resolved[1][12]).toBe("A"); // &trans on Lower
    expect(built.resolved[1][0]).toBe("1"); // Lower's own digit
    expect(built.resolved[2][0]).toBe("1"); // Raise inherits through Lower
    expect(built.resolved[2][2]).toBe("0");
    expect(built.resolved[2][3]).toBe("NONE"); // &none on Raise: Base's E does not come through
  });

  it("drops activators that point outside the stack", () => {
    const built = stack({ activators: [{ [POS[36]]: 9 }, {}, {}] });
    expect(built.activators[0]).toEqual({});
  });
});

describe("a layer as the board draws it", () => {
  const keymap = `
    keymap {
      compatible = "zmk,keymap";

      default_layer {
        bindings = <&kp A &kp S &kp D &mo 1>;
      };

      lower_layer {
        bindings = <&none &trans &kp N1 &trans>;
      };
    };
  `;

  it("draws an empty key empty and reads a press on it through the layer below", () => {
    const built = buildLayerStack("corne", importedLayersFrom(parseZmkKeymap(keymap, "corne")));
    if (!built) throw new Error("expected a stack");
    const map = layerToMap(built, 1);

    expect(isBlankLabel(map[POS[0]])).toBe(true); // &none: nothing on this key
    expect(isBlankLabel(map[POS[1]])).toBe(true); // &trans: nothing assigned here either
    expect(map[POS[2]]).toBe("1"); // what the layer does assign
    expect(isBlankLabel(map[POS[3]])).toBe(true);

    // The press side still reads &trans as the pass-through it is, so the character scores.
    const pressed = resolvedLayerMap(built, 1);
    expect(pressed[POS[1]]).toBe("S");
    expect(pressed[POS[3]]).toBe("Lower");

    // A press of A reads as Base's key, not as the empty key on Lower.
    expect(findChar(built, "s", 1)).toEqual({ pos: POS[1], layer: 1 });
    expect(findChar(built, "a", 1)).toEqual({ pos: POS[0], layer: 0 });
  });
});

describe("predictedLayer", () => {
  it("asks for the layer that defines the next character", () => {
    const built = stack();
    expect(predictedLayer(built, "1", 0)).toBe(1);
    expect(predictedLayer(built, "a", 1)).toBe(0);
  });

  it("stays where it is when the current layer can type the character too", () => {
    const shared = POS.map(() => "NONE");
    shared[5] = "-";
    const lower = POS.map(() => "NONE");
    lower[5] = "-";
    const built = stack({ maps: [shared, lower] });
    expect(predictedLayer(built, "-", 1)).toBe(1);
  });

  it("reports nothing to go on when no layer can type the character", () => {
    expect(predictedLayer(stack(), "%", 2)).toBeNull();
    expect(predictedLayer(stack(), null, 2)).toBeNull();
    expect(predictedLayer(null, "a", 0)).toBeNull();
  });
});

describe("findChar", () => {
  it("prefers the layer already on screen", () => {
    // "A" is transparent on Lower, so a press while Lower is up reads as Lower's key.
    expect(findChar(stack(), "a", 1)).toEqual({ pos: POS[12], layer: 1 });
    expect(findChar(stack(), "a", 0)).toEqual({ pos: POS[12], layer: 0 });
  });

  it("finds characters that only an upper layer has", () => {
    expect(findChar(stack(), "2", 0)).toEqual({ pos: POS[1], layer: 1 });
    expect(findChar(stack(), "%", 0)).toBeNull();
  });
});

describe("findLabelPos", () => {
  it("looks through the layers underneath the one on screen", () => {
    const built = stack();
    expect(findLabelPos(built, 0, "1")).toBe(POS[0]);
    expect(findLabelPos(built, 0, "SPACE")).toBeUndefined();
  });
});

describe("layerToMap", () => {
  it("hands back the layer the way the board draws it: what the layer assigns", () => {
    const map = layerToMap(stack(), 1);
    expect(map[POS[0]]).toBe("1");
    expect(map[POS[12]]).toBe("TRANS"); // &trans draws empty, it does not borrow Base's A
    expect(Object.keys(map)).toHaveLength(POS.length);
  });

  it("carries the blank of a key with nothing on it", () => {
    expect(layerToMap(stack(), 2)[POS[3]]).toBe("NONE");
  });
});

describe("resolvedLayerMap", () => {
  it("fills &trans in from the layer below, which is how a press reads it", () => {
    const map = resolvedLayerMap(stack(), 1);
    expect(map[POS[0]]).toBe("1");
    expect(map[POS[12]]).toBe("A");
  });
});

describe("withLayerOverride", () => {
  it("edits one layer and lets transparent layers above follow it", () => {
    // POS[12] is transparent on Lower and Raise, so an edit there shows through both.
    const edited = withLayerOverride(stack(), 0, { [POS[12]]: "Z", [POS[0]]: "Y" });
    expect(edited.resolved[0][12]).toBe("Z");
    expect(edited.resolved[1][12]).toBe("Z");
    expect(edited.resolved[2][12]).toBe("Z");
    expect(edited.resolved[1][0]).toBe("1"); // Lower's own digit is untouched
    expect(edited.raw[0][0]).toBe("Y");
    expect(edited.names).toEqual(["Base", "Lower", "Raise"]);
  });
});

describe("visibleLayer", () => {
  const state = { activeLayer: 1, pinnedLayer: null, typedLayer: null, typedLayerUntil: 0 };

  it("shows the layer the next character needs", () => {
    expect(visibleLayer(stack(), state, 1000)).toBe(1);
    expect(visibleLayer(stack(), { ...state, activeLayer: 0 }, 1000)).toBe(0);
  });

  it("returns to base on the next press instead of waiting for the press window", () => {
    const typed = { ...state, activeLayer: 0, typedLayer: 2, typedLayerUntil: 5000 };
    expect(visibleLayer(stack(), typed, 1000)).toBe(0);
  });

  it("falls back to the layer a press came from when nothing can be placed", () => {
    const unknown = { activeLayer: null, pinnedLayer: null, typedLayer: 2, typedLayerUntil: 1500 };
    expect(visibleLayer(stack(), unknown, 1000)).toBe(2);
    expect(visibleLayer(stack(), unknown, 2000)).toBe(0);
  });

  it("lets a manual pin win over everything", () => {
    const pinned = { activeLayer: 1, pinnedLayer: 2, typedLayer: 0, typedLayerUntil: 9999 };
    expect(visibleLayer(stack(), pinned, 1000)).toBe(2);
  });

  it("clamps layers the stack does not have", () => {
    expect(visibleLayer(stack(), { ...state, pinnedLayer: 7 }, 1000)).toBe(0);
    expect(visibleLayer(null, state, 1000)).toBe(0);
  });
});

describe("activatorPositions", () => {
  it("finds the key that has to be held for a layer", () => {
    const built = stack();
    expect(activatorPositions(built, 1)).toEqual([POS[36]]);
    expect(activatorPositions(built, 2)).toEqual([]);
  });
});
