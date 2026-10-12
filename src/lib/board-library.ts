import { BOARD_CATALOG } from "./board-catalog";
import { deriveDefaultLayout } from "./default-layout";
import type { BoardCatalogEntry } from "./board-catalog";
import type { BoardLayout, KeyGeo } from "./types";
import type { BoardKeyTuple } from "./board-data";

// Filter for the board picker: matches the display name or the id, case-insensitively.
export function searchBoards(query: string): BoardCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return BOARD_CATALOG;
  return BOARD_CATALOG.filter((entry) => entry.name.toLowerCase().includes(q) || entry.id.includes(q));
}

// The bundled library stores keys as compact tuples: [row, col, x, y, w?, h?, r?, rx?, ry?].
export function boardLayoutFromTuples(id: string, name: string, tuples: BoardKeyTuple[]): BoardLayout {
  const geo: KeyGeo[] = [];
  const pos: string[] = [];

  tuples.forEach((tuple, index) => {
    const [row, col, x, y, w, h, r, rx, ry] = tuple;
    let position = typeof row === "number" && typeof col === "number" ? `R${row}C${col}` : `K${index}`;
    if (pos.includes(position)) position = `K${index}`;
    pos.push(position);
    geo.push({ x, y, w, h, r, rx, ry });
  });

  return { id, name, geo, pos, origin: "library" };
}

// Boards come without a keymap, so they start from a derived standard QWERTY.
export function defaultLayoutsFor(board: BoardLayout): Record<string, string[]> {
  return { qwerty: deriveDefaultLayout(board.geo, board.pos) };
}

// Loads a board from the bundled library. The geometry data is a separate chunk, so it is
// only pulled in when a library board is actually selected.
export async function libraryBoardLayout(id: string, name: string): Promise<BoardLayout | null> {
  const { BOARD_LAYOUTS } = await import("./board-data");
  const tuples = BOARD_LAYOUTS[id];
  if (!tuples) return null;
  return boardLayoutFromTuples(id, name, tuples);
}
