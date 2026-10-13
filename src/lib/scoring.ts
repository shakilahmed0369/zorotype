import { HARDWARE } from "./hardware";
import { getFingerName } from "./keyboard";
import type { FingerHit, HardwareId, PracticeResult } from "./types";

export interface TestEvaluation {
  wpm: number;
  raw: number;
  acc: number;
  timeSec: number;
}

// Strict Monkeytype word-by-word evaluation: a word only counts (plus its trailing
// space) when the typed word matches the sample word exactly. Used for both the final
// result and the in-test wpm graph so the two can never disagree.
export function countStrictCorrectChars(sample: string, typed: string): number {
  let correctChars = 0;
  let currentWordStart = 0;

  for (let i = 0; i <= sample.length; i++) {
    if (sample[i] === " " || i === sample.length) {
      const sampleWord = sample.slice(currentWordStart, i);
      const typedWord = typed.slice(currentWordStart, i);

      // If the user hasn't typed this far yet (e.g. timed mode ended early), stop
      if (typedWord.length === 0) break;

      // Monkeytype rule: the word MUST match exactly
      if (sampleWord === typedWord) {
        // AND the space following it MUST be a space (unless it's the very last word)
        const typedSpace = typed[i];
        if (i === sample.length || typedSpace === " ") {
          correctChars += sampleWord.length + (typedSpace === " " ? 1 : 0);
        }
      }
      currentWordStart = i + 1;
    }
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

export function computePracticeResults(
  targetChars: Record<string, number>,
  mistakeChars: Record<string, number>,
  sample: string
): PracticeResult[] {
  return Object.keys(targetChars)
    .map((ch) => {
      const occurrences = (sample.match(new RegExp(ch, "gi")) || []).length;
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
