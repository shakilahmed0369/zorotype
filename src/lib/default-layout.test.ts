import { describe, expect, it } from "vitest";
import { deriveDefaultLayout } from "./default-layout";
import type { KeyGeo } from "./types";

// Builds a split board: rows of `perHalf` keys per side with a gap in the middle, plus thumbs.
function splitBoard(rows: number, perHalf: number, thumbs: number) {
  const geo: KeyGeo[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < perHalf; c++) geo.push({ x: c, y: r });
    for (let c = 0; c < perHalf; c++) geo.push({ x: c + perHalf + 1, y: r });
  }
  for (let t = 0; t < thumbs; t++) geo.push({ x: perHalf - 2 + t, y: rows });
  return { geo, pos: geo.map((_, i) => `K${i}`) };
}

describe("deriveDefaultLayout", () => {
  it("labels a three row split as QWERTY / ASDF / ZXCV", () => {
    const { geo, pos } = splitBoard(3, 5, 3);
    const letters = deriveDefaultLayout(geo, pos);
    const rowOf = (row: number) => letters.slice(row * 10, row * 10 + 10).join(" ");
    expect(rowOf(0)).toBe("Q W E R T Y U I O P");
    expect(rowOf(1)).toBe("A S D F G H J K L ;");
    expect(rowOf(2)).toBe("Z X C V B N M , . /");
  });

  it("adds a number row and outer modifiers on a four row board", () => {
    const { geo, pos } = splitBoard(4, 6, 4);
    const letters = deriveDefaultLayout(geo, pos);
    expect(letters.slice(0, 12).join(" ")).toBe("Esc 1 2 3 4 5 6 7 8 9 0 `");
    expect(letters.slice(12, 24).join(" ")).toBe("Tab Q W E R T Y U I O P -");
    expect(letters.slice(24, 36).join(" ")).toBe("Shift A S D F G H J K L ; '");
    expect(letters.slice(36, 48).join(" ")).toBe("Ctrl Z X C V B N M , . / Shift");
  });

  it("gives a thumbnail Space and leaves the other thumbs inert", () => {
    const { geo, pos } = splitBoard(3, 5, 3);
    const letters = deriveDefaultLayout(geo, pos);
    const thumbs = letters.slice(30);
    expect(thumbs.filter((l) => l === "Space")).toHaveLength(1);
    expect(thumbs.filter((l) => l === "NONE")).toHaveLength(2);
  });

  it("splits monoblock rows in the middle", () => {
    const geo: KeyGeo[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 12; c++) geo.push({ x: c, y: r });
    }
    const letters = deriveDefaultLayout(
      geo,
      geo.map((_, i) => `K${i}`)
    );
    const rowOf = (row: number) => letters.slice(row * 12, row * 12 + 12).join(" ");
    expect(rowOf(0)).toBe("Tab Q W E R T Y U I O P -");
    expect(rowOf(1)).toBe("Shift A S D F G H J K L ; '");
    expect(rowOf(2)).toBe("Ctrl Z X C V B N M , . / Shift");
  });

  it("keeps a row together when key heights are staggered", () => {
    // Shape taken from a Lily58: each row spans ~0.4 in y, and the angled thumbs sit higher
    // than the row above them, which must not merge the two.
    const jitter = [0.4, 0.33, 0.07, 0, 0.07, 0.2];
    const geo: KeyGeo[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) geo.push({ x: c + 1, y: r + jitter[c] });
      for (let c = 0; c < 6; c++) geo.push({ x: c + 10, y: r + jitter[c] });
    }
    geo.push({ x: 7, y: 2.7 });
    geo.push({ x: 9, y: 2.7 });
    for (const x of [3.49, 4.49, 5.49, 6.49]) geo.push({ x, y: 4.08 });
    geo.push({ x: 6.49, y: 3.7, h: 1.5 });
    geo.push({ x: 9.51, y: 3.7, h: 1.5 });
    for (const x of [10.51, 11.51, 12.51]) geo.push({ x, y: 4.08 });

    const letters = deriveDefaultLayout(
      geo,
      geo.map((_, i) => `K${i}`)
    );
    expect(letters.slice(0, 12).join(" ")).toBe("Esc 1 2 3 4 5 6 7 8 9 0 `");
    expect(letters.slice(12, 24).join(" ")).toBe("Tab Q W E R T Y U I O P -");
    expect(letters.slice(24, 36).join(" ")).toBe("Shift A S D F G H J K L ; '");
    expect(letters.filter((letter) => letter === "Space")).toHaveLength(1);
  });

  it("leaves keys blank when a half is wider than the template", () => {
    const { geo, pos } = splitBoard(3, 4, 0);
    const letters = deriveDefaultLayout(geo, pos);
    expect(letters.slice(0, 4).join(" ")).toBe("Q W E R");
    expect(letters.slice(4, 8).join(" ")).toBe("Y U I O");

    const wide = splitBoard(3, 7, 0);
    const wideLetters = deriveDefaultLayout(wide.geo, wide.pos);
    expect(wideLetters.slice(0, 7).join(" ")).toBe("Tab Q W E R T ");
  });

  it("leaves rows above the number row blank", () => {
    const { geo, pos } = splitBoard(5, 5, 3);
    const letters = deriveDefaultLayout(geo, pos);
    expect(letters.slice(0, 10).every((l) => l === "")).toBe(true);
    expect(letters.slice(10, 15).join(" ")).toBe("1 2 3 4 5");
  });
});
