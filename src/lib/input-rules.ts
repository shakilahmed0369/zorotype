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

// A press is read from the label at the pressed position, not from wherever that label has been
// dragged to: moving a keycap must not turn Backspace into whatever character sits there now.
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

/**
 * The character a press produces. A keycap label spells the unshifted character, so a shifted
 * symbol — ":" for Shift+";", "!" for Shift+"1" — can only come from what the OS delivered; the
 * label has no way to spell it. Letters stay label-driven, because the keymap decides which key
 * types which letter.
 */
export function pressedChar(label: string, delivered: string, shift: boolean, isUpperCase: boolean): string {
  const shiftedSymbol = shift && delivered.length === 1 && label.length === 1 && !/[a-z]/i.test(label);
  return shiftedSymbol ? delivered : keyLabelToChar(label, isUpperCase);
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
  /** Code mode fills the indentation in for you, so "wrong word" has nothing to hold you to. */
  code: boolean;
}): boolean {
  const { typed, sample, mappedChar, difficulty, stopOnError, code } = params;
  if (difficulty === "master" && isLastCharWrong(typed, sample)) return true;
  if (stopOnError === "letter" && isLastCharWrong(typed, sample)) return true;
  if (stopOnError === "word" && !code && wordStopBlocked(typed, sample, mappedChar)) return true;
  return false;
}
