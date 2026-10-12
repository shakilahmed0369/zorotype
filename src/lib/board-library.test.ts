import { describe, expect, it } from "vitest";
import { BOARD_CATALOG } from "./board-catalog";
import { BOARD_LAYOUTS } from "./board-data";
import { boardLayoutFromTuples, defaultLayoutsFor, searchBoards } from "./board-library";

describe("bundled keyboard library", () => {
  it("ships a broad catalog with unique ids", () => {
    expect(BOARD_CATALOG.length).toBeGreaterThanOrEqual(80);
    const ids = BOARD_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of BOARD_CATALOG) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(BOARD_LAYOUTS[entry.id], `${entry.id} has geometry`).toBeTruthy();
    }
  });

  it("builds every catalog entry into a usable board", () => {
    for (const entry of BOARD_CATALOG) {
      const board = boardLayoutFromTuples(entry.id, entry.name, BOARD_LAYOUTS[entry.id]);
      // The library ranges from 2-key novelties to full splits, so only the shape is guaranteed.
      expect(board.geo.length, `${entry.id} key count`).toBeGreaterThan(0);
      expect(board.pos.length).toBe(board.geo.length);
      expect(new Set(board.pos).size, `${entry.id} unique positions`).toBe(board.pos.length);
      expect(board.origin).toBe("library");

      const layouts = defaultLayoutsFor(board);
      expect(layouts.qwerty).toHaveLength(board.pos.length);
      if (board.pos.length >= 30) {
        expect(
          layouts.qwerty.filter((letter) => letter !== "").length,
          `${entry.id} derived letters`
        ).toBeGreaterThan(10);
      }
    }
  });

  it("filters boards for the picker by name or id", () => {
    expect(searchBoards("")).toHaveLength(BOARD_CATALOG.length);
    expect(searchBoards("lil").map((entry) => entry.id)).toContain("lily58");
    expect(searchBoards("  LILY58  ").map((entry) => entry.id)).toContain("lily58");
    expect(searchBoards("kyria_rev3").map((entry) => entry.id)).toContain("kyria_rev3");
    expect(searchBoards("aurora").length).toBeGreaterThan(3);
    expect(searchBoards("definitely-not-a-board")).toHaveLength(0);
  });

  it("keeps known boards recognisable", () => {
    for (const id of ["lily58", "corne", "sofle", "kyria", "planck_rev6"]) {
      const entry = BOARD_CATALOG.find((candidate) => candidate.id === id);
      expect(entry, `${id} is listed`).toBeTruthy();
      expect(BOARD_LAYOUTS[id].length).toBeGreaterThan(20);
    }
  });
});
