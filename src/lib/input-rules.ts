import type { Difficulty, StopOnError } from "./types";

// Exact-match acceptance: a capital must be typed with Shift. This is the same rule the
// strict word-by-word scoring uses, so an accepted keystroke and a scored keystroke agree.
export function isCharCorrect(mappedChar: string, targetChar: string | undefined): boolean {
  return targetChar !== undefined && mappedChar === targetChar;
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
