import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, getTheme, hexToRgb, isDark, listThemes, shade, themeVars } from "./themes";

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const VAR_VALUE = /^(#[0-9a-fA-F]{3,8}|rgba?\(.+\))$/;

describe("theme data", () => {
  it("loads the full Monkeytype palette set", () => {
    const themes = listThemes();
    expect(themes.length).toBeGreaterThan(150);
    for (const t of themes) {
      expect(t.name, "theme name").toBeTruthy();
      for (const key of ["bg", "main", "caret", "sub", "subAlt", "text", "error", "errorExtra"] as const) {
        expect(t[key], `${t.name}.${key}`).toMatch(HEX);
      }
    }
  });

  it("falls back to the default theme for unknown names", () => {
    expect(getTheme("definitely-not-a-theme").name).toBe(DEFAULT_THEME);
  });

  it("keeps serika_dark identical to the original app palette", () => {
    expect(getTheme("serika_dark")).toMatchObject({
      bg: "#323437",
      main: "#e2b714",
      caret: "#e2b714",
      sub: "#646669",
      subAlt: "#2c2e31",
      text: "#d1d0c5",
      error: "#ca4754",
    });
  });
});

describe("themeVars", () => {
  it("maps the default theme onto the app tokens", () => {
    const vars = themeVars(getTheme(DEFAULT_THEME));
    expect(vars["--color-bg"]).toBe("#212830");
    expect(vars["--color-accent"]).toBe("#41ce5c");
    expect(vars["--color-caret"]).toBe("#41ce5c");
    expect(vars["--color-muted"]).toBe("#788386");
    expect(vars["--color-key"]).toBe("#141b23");
    expect(vars["--color-keytext"]).toBe("#ccdae6");
    expect(vars["--color-correct"]).toBe("#ccdae6");
    expect(vars["--color-error"]).toBe("#c23e3a");
    expect(vars["--color-edge"]).toBe("rgb(14, 18, 24)");
    expect(vars["--color-homerow"]).toBe("rgba(255, 255, 255, 0.05)");
    expect(vars["--color-expected"]).toBe("#f8fafc");
  });

  it("uses dark ink on light themes", () => {
    const vars = themeVars(getTheme("serika"));
    expect(vars["--color-homerow"]).toBe("rgba(0, 0, 0, 0.06)");
    expect(vars["--color-expected"]).toBe("#111827");
  });

  it("derives a complete, valid variable set for every theme", () => {
    for (const t of listThemes()) {
      const vars = themeVars(t);
      expect(Object.keys(vars)).toHaveLength(11);
      for (const [key, value] of Object.entries(vars)) {
        expect(value, `${t.name} ${key}`).toMatch(VAR_VALUE);
      }
    }
  });
});

describe("color helpers", () => {
  it("parses hex colors and expands short form", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#323437")).toEqual([50, 52, 55]);
    expect(hexToRgb("bogus")).toEqual([0, 0, 0]);
  });

  it("shades toward black", () => {
    expect(shade("#646464", 0.5)).toBe("rgb(50, 50, 50)");
  });

  it("detects dark and light backgrounds", () => {
    expect(isDark("#323437")).toBe(true);
    expect(isDark("#e1e1e3")).toBe(false);
  });
});
