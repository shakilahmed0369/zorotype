import type { Difficulty, StopOnError } from "./types";

// Exact-match acceptance: a capital must be typed with Shift. This is the same rule the
// strict word-by-word scoring uses, so an accepted keystroke and a scored keystroke agree.
export function isCharCorrect(mappedChar: string, targetChar: string | undefined): boolean {
  return targetChar !== undefined && mappedChar === targetChar;
}

// Labels for the keys that do not type a character, plus the space bar. Keymaps spell these in
// several ways, and the board's built-in layouts use the short "Backsp".
const CONTROL_KEYS: Record<string, string> = {
  BSPC: "Backspace",
  BACKSPACE: "Backspace",
  BACKSP: "Backspace",
  BKSP: "Backspace",
  BACK_SPACE: "Backspace",
  RET: "Enter",
  ENTER: "Enter",
  RETURN: "Enter",
  ESC: "Escape",
  ESCAPE: "Escape",
  TAB: "Tab",
  SPACE: " ",
  SPC: " ",
};

// A press is read from the label at the pressed position, never from the target layout's label:
// test-driving a layout must not turn Backspace into whatever character happens to sit there.
export function controlKey(label: string | null | undefined): string | null {
  if (!label) return null;
  return CONTROL_KEYS[label.trim().toUpperCase().replace(/^&/, "")] ?? null;
}

// The character a target-layout label types at a position — the same rule for every keycap,
// with capitals following the Shift state of the press.
export function keyLabelToChar(label: string, isUpperCase: boolean): string {
  const control = controlKey(label);
  if (control !== null) return control;
  const upper = (label || "").toUpperCase();
  if (upper.length === 1) return isUpperCase ? upper : upper.toLowerCase();
  return upper; // multi-character labels (MO, LShift, …) never score
}

// Ctrl/Alt/Cmd + Backspace: drop the word being typed, or just the space that was typed before
// it, so the next keystroke retypes that word instead of finishing it.
export function deletePreviousWord(typed: string): string {
  if (/\s$/.test(typed)) return typed.replace(/\s+$/, "");
  return typed.replace(/\S+$/, "");
}

function isLastCharWrong(typed: string, sample: string): boolean {
  if (typed.length === 0) return false;
  return !isCharCorrect(typed[typed.length - 1], sample[typed.length - 1]);
}

// "Stop on error: word" — the current word may be typed through, but you cannot leave it
// or press space while it is wrong.
function wordStopBlocked(typed: string, sample: string, mappedChar: string): boolean {
  const pos = typed.length;
  if (pos === 0 || pos > sample.length) return false;

  let start = pos;
  while (start > 0 && sample[start - 1] !== " ") start--;
  const typedWord = typed.slice(start, pos);
  if (typedWord.length === 0) return false;

  const atWordEnd = pos === sample.length || sample[pos] === " ";
  const wordCorrect = atWordEnd && sample.slice(start, pos) === typedWord;
  if (mappedChar === " ") return !wordCorrect;
  return atWordEnd && !wordCorrect;
}

export function isInputBlocked(params: {
  typed: string;
  sample: string;
  mappedChar: string;
  difficulty: Difficulty;
  stopOnError: StopOnError;
}): boolean {
  const { typed, sample, mappedChar, difficulty, stopOnError } = params;
  if (difficulty === "master" && isLastCharWrong(typed, sample)) return true;
  if (stopOnError === "letter" && isLastCharWrong(typed, sample)) return true;
  if (stopOnError === "word" && wordStopBlocked(typed, sample, mappedChar)) return true;
  return false;
}
