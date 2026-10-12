import type { KeyGeo } from "./types";

// A "standard QWERTY" split, used as the starting point for boards we have no keymap for.
// Left halves list the letters outer → inner and carry the modifier that sits in the extra
// outer column on wide boards; right halves list the letters inner → outer (so a narrow half
// simply takes a prefix and keeps Y / 6 / H / N in place).
const LEFT_ROWS = {
  numbers: ["1", "2", "3", "4", "5"],
  qwerty: ["Q", "W", "E", "R", "T"],
  asdf: ["A", "S", "D", "F", "G"],
  zxcv: ["Z", "X", "C", "V", "B"],
} as const;

const LEFT_EXTRA = { numbers: "Esc", qwerty: "Tab", asdf: "Shift", zxcv: "Ctrl" } as const;

const RIGHT_ROWS = {
  numbers: ["6", "7", "8", "9", "0", "`"],
  qwerty: ["Y", "U", "I", "O", "P", "-"],
  asdf: ["H", "J", "K", "L", ";", "'"],
  zxcv: ["N", "M", ",", ".", "/", "Shift"],
} as const;

type RowName = keyof typeof LEFT_ROWS;

interface KeyEntry {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const ROW_GAP = 0.45;
const ROW_SPAN = 0.8;
const SPLIT_GAP = 1.5;
const THUMB_ROW_RATIO = 0.7;

// Rows are separated by the vertical centre rather than the raw y: angled thumb keys sit
// higher than their neighbours (a Lily58 thumb spans y 3.7 … 5.2 while row 3 ends at 3.41).
function centreY(key: KeyEntry): number {
  return key.y + key.h / 2;
}

function findSplit(row: KeyEntry[]): number {
  let widestGap = 0;
  let split = row.length;
  for (let i = 1; i < row.length; i++) {
    const gap = row[i].x - row[i - 1].x;
    if (gap > widestGap) {
      widestGap = gap;
      split = i;
    }
  }
  return widestGap > SPLIT_GAP ? split : Math.ceil(row.length / 2);
}

// Keys the templates have no letter for stay blank rather than guessing.
function assignRow(row: KeyEntry[], names: readonly string[], letters: string[]): void {
  row.forEach((key, i) => {
    if (i < names.length) letters[key.index] = names[i];
  });
}

// Left halves read outer → inner, so a wide half takes the modifier template and any extra
// inner key stays blank; a narrow half drops the modifier and keeps the letters.
function assignLeft(half: KeyEntry[], name: RowName, letters: string[]): void {
  const names =
    half.length > LEFT_ROWS[name].length ? [LEFT_EXTRA[name], ...LEFT_ROWS[name]] : LEFT_ROWS[name];
  assignRow(half, names, letters);
}

// Right halves read inner → outer, so they align to the outer edge: extra inner keys stay
// blank, and the letters keep their positions relative to the right hand.
function assignRight(half: KeyEntry[], name: RowName, letters: string[]): void {
  const names = RIGHT_ROWS[name];
  const offset = Math.max(0, half.length - names.length);
  half.forEach((key, i) => {
    const index = i - offset;
    if (index >= 0 && index < names.length) letters[key.index] = names[index];
  });
}

function assignThumbs(row: KeyEntry[], letters: string[]): void {
  if (row.length === 0) return;
  const mid = (row[0].x + row[row.length - 1].x) / 2;
  let primary = row[0];
  for (const key of row) {
    if (key.w > primary.w || (key.w === primary.w && Math.abs(key.x - mid) < Math.abs(primary.x - mid))) {
      primary = key;
    }
  }
  row.forEach((key) => {
    letters[key.index] = key === primary ? "Space" : "NONE";
  });
}

// Best-effort QWERTY for a board whose keymap we don't have: rows are read off the geometry,
// named from the bottom up (ZXCV, ASDF, QWERTY, then a number row), and thumbs get Space.
// Importing a real .keymap replaces all of it.
export function deriveDefaultLayout(geo: KeyGeo[], pos: string[]): string[] {
  const letters = pos.map(() => "");
  if (pos.length === 0 || geo.length !== pos.length) return letters;

  const entries: KeyEntry[] = geo.map((g, index) => ({ index, x: g.x, y: g.y, w: g.w ?? 1, h: g.h ?? 1 }));

  // Walk the keys top to bottom and start a new row when the gap to the previous key is abrupt,
  // or when the row would grow taller than a normal key row. Both guards matter: an angled or
  // offset key can sit between two rows and would otherwise bridge them.
  const rows: KeyEntry[][] = [];
  let current: KeyEntry[] = [];
  let previousCentre = Number.NEGATIVE_INFINITY;
  [...entries]
    .sort((a, b) => centreY(a) - centreY(b))
    .forEach((key) => {
      const centre = centreY(key);
      const first = current[0];
      if (
        current.length === 0 ||
        centre - previousCentre > ROW_GAP ||
        centre - centreY(first) > ROW_SPAN
      ) {
        if (current.length > 0) rows.push(current);
        current = [key];
      } else {
        current.push(key);
      }
      previousCentre = centre;
    });
  if (current.length > 0) rows.push(current);
  rows.forEach((row) => row.sort((a, b) => a.x - b.x));

  const widestRow = Math.max(...rows.map((row) => row.length));
  const isThumbRow = (row: KeyEntry[]) => row.length < widestRow * THUMB_ROW_RATIO;

  const names: (RowName | null)[] = rows.map(() => null);
  const order: RowName[] = ["zxcv", "asdf", "qwerty", "numbers"];
  let next = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (isThumbRow(rows[i])) continue;
    names[i] = next < order.length ? order[next++] : null;
  }

  rows.forEach((row, rowIndex) => {
    const name = names[rowIndex];
    if (!name) {
      if (isThumbRow(row)) assignThumbs(row, letters);
      return;
    }

    const split = findSplit(row);
    assignLeft(row.slice(0, split), name, letters);
    assignRight(row.slice(split), name, letters);
  });

  return letters;
}
