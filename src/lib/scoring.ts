import { HARDWARE } from "./hardware";
import { getFingerName } from "./keyboard";
import type { FingerHit, HardwareId, PracticeResult } from "./types";

export interface TestEvaluation {
  wpm: number;
  raw: number;
  acc: number;
  timeSec: number;
}

// Strict Monkeytype word-by-word evaluation: a word only counts (plus its trailing separator)
// when the typed word matches the sample word exactly. Used for both the final result and the
// in-test wpm graph so the two can never disagree.
//
// A word is a run of non-whitespace and the whitespace run after it is its separator. Any
// whitespace separates — a single space in prose, the newline plus the indentation in code — and a
// run of it counts as one separator, the way the prose modes' single spaces do.
export function countStrictCorrectChars(sample: string, typed: string): number {
  let correctChars = 0;
  let pos = 0;

  while (pos < sample.length) {
    while (pos < sample.length && /\s/.test(sample[pos])) pos++;
    if (pos >= sample.length) break;

    const wordStart = pos;
    while (pos < sample.length && !/\s/.test(sample[pos])) pos++;
    const wordEnd = pos;

    // The user has not typed this far yet (e.g. timed mode ended early): stop.
    if (typed.length <= wordStart) break;
    if (typed.slice(wordStart, wordEnd) !== sample.slice(wordStart, wordEnd)) continue;

    const separator = typed[wordEnd];
    const separatorTyped = separator !== undefined && /\s/.test(separator);
    if (wordEnd === sample.length) correctChars += wordEnd - wordStart;
    else if (separatorTyped) correctChars += wordEnd - wordStart + 1;
  }

  return correctChars;
}

export function evaluateTest(params: {
  sample: string;
  typed: string;
  correctPresses: number;
  totalPresses: number;
  elapsedMs: number;
}): TestEvaluation {
  const { sample, typed, correctPresses, totalPresses } = params;
  const timeSec = Math.max(0.1, params.elapsedMs / 1000);
  const correctChars = countStrictCorrectChars(sample, typed);

  // True keypress accuracy: every scored press counts once, so uncorrected typos are
  // not double counted (an all-wrong run is 0%, not 50%) and the result agrees with
  // the per-finger accuracy chips. A run with no scored presses counts as untarnished.
  const acc =
    totalPresses === 0 ? 100 : Math.min(100, Math.max(0, Math.round((correctPresses / totalPresses) * 100)));
  const wpm = Math.round(correctChars / 5 / (timeSec / 60)) || 0;
  // Raw wpm counts every typed character, correct or not (Monkeytype's "raw").
  const raw = Math.round(typed.length / 5 / (timeSec / 60)) || 0;

  return { wpm, raw, acc, timeSec };
}

export interface MistakePracticeParams {
  mistakeChars: Record<string, number>;
  mistakeWords: Set<string>;
  fingerHits: Record<string, FingerHit>;
  workingMap: Record<string, string>;
  hw: HardwareId;
  count: number;
  pool: string[];
}

export function buildMistakePractice(params: MistakePracticeParams): string[] {
  const { mistakeChars, mistakeWords, fingerHits, workingMap, hw, count, pool } = params;
  const missedWords = [...mistakeWords];
  const charWeights: Record<string, number> = { ...mistakeChars };

  const fingerAccuracy: Record<string, { correct: number; total: number }> = {};
  Object.keys(fingerHits).forEach((p) => {
    const name = getFingerName(p, hw);
    if (!fingerAccuracy[name]) fingerAccuracy[name] = { correct: 0, total: 0 };
    fingerAccuracy[name].correct += fingerHits[p].correct;
    fingerAccuracy[name].total += fingerHits[p].total;
  });

  Object.keys(fingerAccuracy).forEach((finger) => {
    const d = fingerAccuracy[finger];
    if (d.total > 0 && d.correct / d.total < 0.9) {
      HARDWARE[hw].pos.forEach((p) => {
        if (getFingerName(p, hw) === finger) {
          const label = workingMap[p];
          if (label && label.length === 1 && label.match(/[a-z\u0621-\u064A]/i)) {
            charWeights[label.toLowerCase()] =
              (charWeights[label.toLowerCase()] || 0) + Math.round((1 - d.correct / d.total) * 5);
          }
        }
      });
    }
  });

  const selected: string[] = [];
  if (missedWords.length > 0) {
    const shuffled = [...missedWords].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, Math.max(Math.ceil(count / 2), missedWords.length)); i++) {
      selected.push(shuffled[i % shuffled.length]);
    }
  }

  if (selected.length < count) {
    const scored = pool
      .filter((w) => !mistakeWords.has(w))
      .map((word) => {
        let hits = 0;
        for (const ch of word) {
          if (charWeights[ch]) hits += charWeights[ch];
        }
        return { word, density: hits / word.length };
      })
      .filter((w) => w.density > 0)
      .sort((a, b) => b.density - a.density);
    const topTier = scored
      .slice(0, Math.max((count - selected.length) * 2, 20))
      .sort(() => Math.random() - 0.5);
    for (let i = 0; i < count - selected.length && i < topTier.length; i++) {
      selected.push(topTier[i].word);
    }
  }

  if (selected.length < count && Object.keys(charWeights).length > 0) {
    const weightedChars = Object.entries(charWeights).flatMap(([c, n]) => Array(n).fill(c) as string[]);
    const vowels = "aeiou";
    while (selected.length < count) {
      let w = "";
      const len = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < len; j++) {
        w +=
          j % 2 !== 0
            ? vowels[Math.floor(Math.random() * vowels.length)]
            : weightedChars[Math.floor(Math.random() * weightedChars.length)];
      }
      selected.push(w);
    }
  }

  return selected;
}

export interface CodeMistakeDrillParams {
  /** The snippet the mistakes were made on, kept exactly as the code mode types it. */
  snippet: string;
  /** Space-delimited runs the mistakes landed in, lowercased the way the engine records them. */
  mistakeWords: Set<string>;
  /** Missed letters, used to pick lines when no whole word was missed. */
  mistakeChars: Record<string, number>;
}

/** Most lines a code drill carries: enough to be a test, short of a whole snippet. */
const CODE_DRILL_MAX_LINES = 6;

/** Least lines a code drill carries: a single line on its own is too short to be worth starting. */
const CODE_DRILL_MIN_LINES = 3;

/**
 * The drill a code test leaves behind: the lines the mistakes landed on, copied out of the snippet
 * so a Tab+Space drill is typed as code instead of as prose. A block too short to be a test is
 * widened with the lines that use the missed letters, then with whatever else the snippet has, and
 * the lines stay in the snippet's own order because the drill is typed top to bottom. The block is
 * shifted left to its own shallowest line, so an excerpt keeps its shape but the test never opens
 * on a run of spaces.
 */
export function buildCodeMistakeDrill(params: CodeMistakeDrillParams): string[] {
  const lines = params.snippet.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // A missed word is a whole space-delimited run of the sample, so a token match is exact: a
  // one-character word like "a" must not pull in every line that happens to contain the letter.
  const missedWords = new Set([...params.mistakeWords].map((word) => word.toLowerCase()));
  const picked: number[] = [];
  lines.forEach((line, index) => {
    if (line.split(" ").some((token) => missedWords.has(token.toLowerCase()))) picked.push(index);
  });

  const chars = Object.keys(params.mistakeChars);
  const widen = (matches: (line: string) => boolean): void => {
    lines.forEach((line, index) => {
      if (picked.length >= CODE_DRILL_MIN_LINES) return;
      if (!picked.includes(index) && matches(line)) picked.push(index);
    });
  };
  widen((line) => chars.some((char) => line.toLowerCase().includes(char)));
  widen(() => true);

  const drill = picked
    .sort((a, b) => a - b)
    .slice(0, CODE_DRILL_MAX_LINES)
    .map((index) => lines[index]);

  const indent = (line: string) => /^ */.exec(line)?.[0].length ?? 0;
  const shift = Math.min(...drill.map(indent));
  return shift > 0 ? drill.map((line) => line.slice(shift)) : drill;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function computePracticeResults(
  targetChars: Record<string, number>,
  mistakeChars: Record<string, number>,
  sample: string
): PracticeResult[] {
  return Object.keys(targetChars)
    .map((ch) => {
      // The target character is escaped: a symbol like "(" or "*" would otherwise change what the
      // pattern means, and code practice is full of them.
      const occurrences = (sample.match(new RegExp(escapeRegExp(ch), "gi")) || []).length;
      const misses = mistakeChars[ch] || 0;
      return {
        ch,
        misses,
        occurrences,
        hitRate: occurrences > 0 ? Math.round((1 - misses / occurrences) * 100) : 100,
      };
    })
    .sort((a, b) => a.hitRate - b.hitRate);
}
