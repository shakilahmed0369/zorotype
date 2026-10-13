import { describe, expect, it } from "vitest";
import { HARDWARE } from "./hardware";
import { buildScriptLayouts } from "./keyboard";
import { normalizeArabic, stripLatinAccents } from "./languages";

describe("normalizers", () => {
  it("strips latin diacritics and folds curly apostrophes", () => {
    expect(stripLatinAccents("café")).toBe("cafe");
    expect(stripLatinAccents("Español")).toBe("Espanol");
    expect(stripLatinAccents("l’eau")).toBe("l'eau");
  });

  it("normalizes arabic diacritics and alef forms", () => {
    expect(normalizeArabic("أحمد")).toBe("احمد");
    expect(normalizeArabic("كَتَبَ")).toBe("كتب");
    expect(normalizeArabic("إسلام")).toBe("اسلام");
  });
});

describe("buildScriptLayouts", () => {
  it("derives the arabic layout for every board from qwerty", () => {
    buildScriptLayouts();

    const q = HARDWARE.go60.layouts.qwerty;
    const go60 = HARDWARE.go60.layouts.arabic;
    expect(go60).toHaveLength(q.length);
    expect(go60[q.indexOf("Q")]).toBe("ض");
    expect(go60[q.indexOf("H")]).toBe("ا");

    const qa = HARDWARE.ansi60.layouts.qwerty;
    const ar = HARDWARE.ansi60.layouts.arabic;
    expect(ar).toHaveLength(qa.length);
    expect(ar[qa.indexOf("H")]).toBe("ا");
    expect(ar[qa.indexOf("B")]).toBe("لا");
  });
});
