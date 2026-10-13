import { describe, expect, it } from "vitest";
import { HARDWARE } from "./hardware";
import { extractZMKLabel, layerTarget, parseKeyboardLayout, parseZmkJson, parseZmkKeymap, parseZmkLayout } from "./zmk";

describe("extractZMKLabel", () => {
  it("returns NONE for empty bindings", () => {
    expect(extractZMKLabel(null)).toBe("NONE");
    expect(extractZMKLabel(undefined)).toBe("NONE");
  });

  it("extracts plain keycodes from strings", () => {
    expect(extractZMKLabel("&kp A")).toBe("A");
    expect(extractZMKLabel("&kp BSPC")).toBe("BSPC");
  });

  it("peels modifiers and nested behaviors", () => {
    expect(extractZMKLabel("&kp LS(A)")).toBe("A");
    expect(extractZMKLabel("&kp LCTRL(A)")).toBe("A");
    expect(extractZMKLabel("&kp LCTRL(LS(Z))")).toBe("LS(Z)"); // nested string wraps keep the inner call text
    expect(extractZMKLabel("&mt LCTRL A")).toBe("A");
  });

  it("falls back to the behavior name when there are no arguments", () => {
    expect(extractZMKLabel("&trans")).toBe("TRANS");
  });

  it("keeps the modifier name for a bare modifier key", () => {
    expect(extractZMKLabel("&kp LSHIFT")).toBe("LSHIFT");
    expect(extractZMKLabel("&kp RALT")).toBe("RALT");
  });

  it("reads labels from object ASTs", () => {
    expect(extractZMKLabel({ value: "&kp A" })).toBe("A");
    expect(extractZMKLabel({ behavior: "&kp", params: [{ value: "B" }] })).toBe("B");
    expect(extractZMKLabel({ decoration: { label: "CUSTOM" } })).toBe("CUSTOM");
    expect(extractZMKLabel({ label: "home" })).toBe("home");
  });
});

describe("parseZmkJson", () => {
  it("infers the hardware from the keyboard field and maps bindings to positions", () => {
    const layer = HARDWARE.glove80.pos.map(() => "&kp A");
    const parsed = parseZmkJson(JSON.stringify({ keyboard: "Glove80", layers: [layer] }), "go60");
    expect(parsed.hw).toBe("glove80");
    expect(Object.keys(parsed.map)).toHaveLength(HARDWARE.glove80.pos.length);
    expect(parsed.map[HARDWARE.glove80.pos[0]]).toBe("A");
  });

  it("applies ZMK exceptions", () => {
    const layer = HARDWARE.corne.pos.map((_, i) => (i === 0 ? "&kp SPACE" : "&kp N1"));
    const parsed = parseZmkJson(JSON.stringify({ keyboard: "Corne", layers: [layer] }), "go60");
    expect(parsed.hw).toBe("corne");
    expect(parsed.map[HARDWARE.corne.pos[0]]).toBe("Space");
    expect(parsed.map[HARDWARE.corne.pos[1]]).toBe("1");
  });

  it("accepts raw array layers", () => {
    const parsed = parseZmkJson(JSON.stringify([["&kp X"]]), "corne");
    expect(parsed.hw).toBe("corne");
    expect(parsed.map[HARDWARE.corne.pos[0]]).toBe("X");
    expect(parsed.map[HARDWARE.corne.pos[1]]).toBe("NONE");
  });

  it("throws on unparseable or empty input", () => {
    expect(() => parseZmkJson("not json", "go60")).toThrow();
    expect(() => parseZmkJson(JSON.stringify({}), "go60")).toThrow();
    expect(() => parseZmkJson(JSON.stringify({ layers: [[]] }), "go60")).toThrow();
  });

  it("points a keyboard layout file at the Hardware row", () => {
    expect(() => parseZmkJson(JSON.stringify({ id: "lily58", layouts: { x: { layout: [] } } }), "go60")).toThrow(
      /Hardware/i
    );
  });
});

describe("parseZmkKeymap", () => {
  const keymap = `
    #include <behaviors.dtsi>
    #include <dt-bindings/zmk/keys.h>

    / {
      keymap {
        compatible = "zmk,keymap";

        default_layer {
          // home row mods
          bindings = <
            &kp Q    &kp W    &kp E
            &mt LCTRL A  &kp S  &kp D   /* inline comment */
            &lt 1 SPACE  &trans  &none
            &mo 2    &kp LS(Z)  &kp N1
            &kp EXCL  &kp SEMI  &kp LBKT
          >;
        };

        lower_layer {
          bindings = < &kp A &kp B >;
        };
      };
    };
  `;

  it("reads the first bindings block and lines it up with the selected board", () => {
    const parsed = parseZmkKeymap(keymap, "corne");
    const pos = HARDWARE.corne.pos;
    expect(parsed.hw).toBe("corne");
    expect(parsed.map[pos[0]]).toBe("Q");
    expect(parsed.map[pos[1]]).toBe("W");
    expect(parsed.map[pos[2]]).toBe("E");
    expect(parsed.map[pos[3]]).toBe("A"); // &mt LCTRL A -> tap key
    expect(parsed.map[pos[6]]).toBe("Space"); // &lt 1 SPACE -> tap key
    expect(parsed.map[pos[7]]).toBe("NONE"); // &trans
    expect(parsed.map[pos[8]]).toBe("NONE"); // &none
    expect(parsed.map[pos[9]]).toBe("MO"); // &mo 2 -> no character
    expect(parsed.map[pos[10]]).toBe("Z"); // &kp LS(Z)
    expect(parsed.map[pos[11]]).toBe("1"); // &kp N1
    expect(parsed.map[pos[12]]).toBe("!"); // &kp EXCL
    expect(parsed.map[pos[13]]).toBe(";"); // &kp SEMI
    expect(parsed.map[pos[14]]).toBe("["); // &kp LBKT
  });

  it("skips combos and macros when picking the layer to import", () => {
    const file = `
      / {
        combos {
          compatible = "zmk,combos";
          fg_mouse_combo {
            bindings = <&to 3>;
            key-positions = <28 29>;
            layers = <0>;
          };
        };

        keymap {
          compatible = "zmk,keymap";
          base_layer {
            bindings = < &kp Q &kp W &kp E >;
          };
        };
      };
    `;
    const parsed = parseZmkKeymap(file, "corne");
    expect(parsed.map[HARDWARE.corne.pos[0]]).toBe("Q");
    expect(parsed.map[HARDWARE.corne.pos[1]]).toBe("W");
    expect(parsed.map[HARDWARE.corne.pos[2]]).toBe("E");
  });

  it("re-lines the same keymap up with a different board", () => {
    const text = "bindings = <&kp Q &kp W &kp E>;";
    const corne = parseZmkKeymap(text, "corne");
    const glove = parseZmkKeymap(text, "glove80");
    expect(HARDWARE.corne.pos[0]).not.toBe(HARDWARE.glove80.pos[0]);
    expect(corne.map[HARDWARE.corne.pos[0]]).toBe("Q");
    expect(glove.map[HARDWARE.glove80.pos[0]]).toBe("Q");
    expect(Object.keys(corne.map)).toHaveLength(HARDWARE.corne.pos.length);
    expect(Object.keys(glove.map)).toHaveLength(HARDWARE.glove80.pos.length);
  });

  it("leaves the rest of the board empty when the file is shorter", () => {
    const parsed = parseZmkKeymap("bindings = <&kp A &kp B>;", "corne");
    expect(parsed.map[HARDWARE.corne.pos[0]]).toBe("A");
    expect(parsed.map[HARDWARE.corne.pos[1]]).toBe("B");
    expect(parsed.map[HARDWARE.corne.pos[2]]).toBe("NONE");
  });

  it("covers every key of the selected hardware", () => {
    const parsed = parseZmkKeymap("bindings = <&kp A>;", "glove80");
    expect(parsed.hw).toBe("glove80");
    expect(Object.keys(parsed.map)).toHaveLength(HARDWARE.glove80.pos.length);
  });

  it("throws when there is no usable bindings block", () => {
    expect(() => parseZmkKeymap("/ { keymap { }; };", "corne")).toThrow();
    expect(() => parseZmkKeymap("bindings = <>;", "corne")).toThrow();
  });
});

describe("parseZmkLayout", () => {
  it("routes JSON exports and .keymap source to the right parser", () => {
    expect(parseZmkLayout('{ "layers": [["&kp A"]] }', "corne").map[HARDWARE.corne.pos[0]]).toBe("A");
    expect(parseZmkLayout("bindings = <&kp B>;", "corne").map[HARDWARE.corne.pos[0]]).toBe("B");
  });
});

describe("layerTarget", () => {
  it("reads the layer out of layer behaviors", () => {
    expect(layerTarget("&mo 1")).toEqual({ kind: "mo", layer: 1 });
    expect(layerTarget("&lt 2 SPACE")).toEqual({ kind: "lt", layer: 2 });
    expect(layerTarget("&to 3")).toEqual({ kind: "to", layer: 3 });
    expect(layerTarget("&tog 1")).toEqual({ kind: "tog", layer: 1 });
    expect(layerTarget({ behavior: "&mo", params: [{ value: "2" }] })).toEqual({ kind: "mo", layer: 2 });
  });

  it("ignores keys that are not layer switches", () => {
    expect(layerTarget("&kp A")).toBeNull();
    expect(layerTarget("&mo")).toBeNull();
    expect(layerTarget("&mt LCTRL A")).toBeNull();
    expect(layerTarget(null)).toBeNull();
  });
});

describe("parseZmkKeymap layers", () => {
  const keymap = `
    / {
      keymap {
        compatible = "zmk,keymap";

        default_layer {
          bindings = <&kp Q &kp W &kp E &mo 1>;
        };

        lower_layer {
          bindings = <&kp N1 &kp N2 &trans &kp A>;
        };

        raise_layer {
          bindings = <&trans &kp EXCL &kp LBKT &kp B>;
        };
      };
    };
  `;

  it("keeps every layer instead of stopping at the first", () => {
    const parsed = parseZmkKeymap(keymap, "corne");
    const pos = HARDWARE.corne.pos;
    expect(parsed.layers).toHaveLength(3);
    expect(parsed.names).toEqual(["Base", "Lower", "Raise"]);

    expect(parsed.layers[0][0]).toBe("Q");
    expect(parsed.layers[1][0]).toBe("1");
    expect(parsed.layers[1][2]).toBe("NONE"); // &trans
    expect(parsed.layers[2][1]).toBe("!");
    expect(parsed.layers[2][2]).toBe("[");
    expect(parsed.layers[0]).toHaveLength(pos.length);

    // The flat map stays the base layer, so nothing that reads it changes behaviour.
    expect(parsed.map).toEqual(Object.fromEntries(pos.map((p, i) => [p, parsed.layers[0][i]])));
  });

  it("records which key opens which layer", () => {
    const parsed = parseZmkKeymap(keymap, "corne");
    const pos = HARDWARE.corne.pos;
    expect(parsed.activators[0]).toEqual({ [pos[3]]: 1 });
    expect(parsed.activators[1]).toEqual({});
  });

  it("names a pure layer key after the layer it opens", () => {
    const parsed = parseZmkKeymap(keymap, "corne");
    expect(parsed.layers[0][3]).toBe("Lower");
  });

  it("leaves a layer-tap named after what it types", () => {
    const parsed = parseZmkKeymap("bindings = <&lt 1 SPACE &kp A>;", "corne");
    expect(parsed.layers[0][0]).toBe("Space");
    expect(parsed.activators[0][HARDWARE.corne.pos[0]]).toBe(1);
  });

  it("keeps the inert label when the layer is out of range", () => {
    const parsed = parseZmkKeymap("bindings = <&mo 4>;", "corne");
    expect(parsed.map[HARDWARE.corne.pos[0]]).toBe("MO");
  });
});

describe("parseZmkJson layers", () => {
  it("reads every layer of a JSON export", () => {
    const parsed = parseZmkJson(
      JSON.stringify({
        keyboard: "Corne",
        layer_names: ["base", "lower", "raise"],
        layers: [
          ["&kp Q", "&kp W", "&mo 1"],
          ["&kp N1", "&mo 2", "&kp A"],
          ["&kp EXCL", "&trans", "&kp B"],
        ],
      }),
      "go60"
    );
    const pos = HARDWARE.corne.pos;
    expect(parsed.hw).toBe("corne");
    expect(parsed.layers).toHaveLength(3);
    expect(parsed.names).toEqual(["Base", "Lower", "Raise"]);
    expect(parsed.layers[1][0]).toBe("1");
    expect(parsed.layers[2][0]).toBe("!");
    expect(parsed.activators[1][pos[1]]).toBe(2);
    expect(parsed.map[pos[0]]).toBe("Q");
  });

  it("reads Keymap Editor style layers with names", () => {
    const parsed = parseZmkJson(
      JSON.stringify({
        layers: [
          {
            name: "Base",
            bindings: [
              { behavior: "&kp", params: [{ value: "Q" }] },
              { behavior: "&mo", params: [{ value: "1" }] },
            ],
          },
          {
            name: "Lower",
            bindings: [
              { behavior: "&kp", params: [{ value: "N1" }] },
              { behavior: "&trans", params: [] },
            ],
          },
        ],
      }),
      "corne"
    );
    const pos = HARDWARE.corne.pos;
    expect(parsed.names).toEqual(["Base", "Lower"]);
    expect(parsed.layers[0][0]).toBe("Q");
    expect(parsed.layers[0][1]).toBe("Lower");
    expect(parsed.layers[1][0]).toBe("1");
    expect(parsed.layers[1][1]).toBe("NONE");
    expect(parsed.activators[0][pos[1]]).toBe(1);
  });

  it("keeps a single unnamed bindings list as one layer", () => {
    const parsed = parseZmkJson(JSON.stringify({ keys: ["&kp A", "&kp B"] }), "corne");
    expect(parsed.layers).toEqual([["A", "B", ...HARDWARE.corne.pos.slice(2).map(() => "NONE")]]);
    expect(parsed.names).toEqual(["Base"]);
  });
});

describe("parseKeyboardLayout", () => {
  it("reads a Keymap Editor style keyboard definition", () => {
    const file = JSON.stringify({
      id: "lily58",
      name: "Lily58",
      layouts: {
        default_transform: {
          name: "default_transform",
          layout: [
            { row: 0, col: 0, x: 0.0, y: 0.375 },
            { row: 0, col: 1, x: 1.0, y: 0.375 },
            { row: 4, col: 2, x: 5.0, y: 4.75 },
          ],
        },
      },
    });
    const parsed = parseKeyboardLayout(file);
    expect(parsed.id).toBe("lily58");
    expect(parsed.name).toBe("Lily58");
    expect(parsed.pos).toEqual(["R0C0", "R0C1", "R4C2"]);
    expect(parsed.geo[0]).toMatchObject({ x: 0, y: 0.375 });
    expect(parsed.geo[2]).toMatchObject({ x: 5, y: 4.75 });
  });

  it("reads a QMK info.json style layout and keeps entry order", () => {
    const file = JSON.stringify({
      keyboard_name: "Test Pad",
      layouts: {
        LAYOUT_split: {
          layout: [{ x: 0, y: 0 }, { matrix: [1, 2], x: 1, y: 0, w: 1.5 }],
        },
      },
    });
    const parsed = parseKeyboardLayout(file);
    expect(parsed.id).toBe("test-pad");
    expect(parsed.pos).toEqual(["K0", "R1C2"]);
    expect(parsed.geo[1]).toMatchObject({ x: 1, w: 1.5 });
  });

  it("points a keymap file at the right row", () => {
    expect(() => parseKeyboardLayout(JSON.stringify({ layers: [[]] }))).toThrow(/keymap/i);
    expect(() => parseKeyboardLayout(JSON.stringify({ nothing: true }))).toThrow(/layouts/i);
  });
});
