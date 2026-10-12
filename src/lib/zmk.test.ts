import { describe, expect, it } from "vitest";
import { HARDWARE } from "./hardware";
import { extractZMKLabel, parseZmkJson } from "./zmk";

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
});
