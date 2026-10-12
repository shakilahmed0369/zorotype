const NUMBER_CHANCE = 0.12;
const PUNCTUATION_CHANCE = 0.35;

const PUNCTUATION: Array<[string, number]> = [
  [",", 0.35],
  [".", 0.3],
  [";", 0.1],
  [":", 0.1],
  ["?", 0.08],
  ["!", 0.07],
];

export interface TextModifierOptions {
  punctuation: boolean;
  numbers: boolean;
  capitalizeFirst: boolean;
  rand?: () => number;
}

function pickPunctuation(rand: () => number): string {
  const roll = rand();
  let acc = 0;
  for (const [char, weight] of PUNCTUATION) {
    acc += weight;
    if (roll < acc) return char;
  }
  return ".";
}

export function randomNumberToken(rand: () => number): string {
  const kind = rand();
  const digits = 1 + Math.floor(rand() * 4);
  const value = Math.floor(rand() * 10 ** digits);
  if (kind < 0.7) return String(value);
  if (kind < 0.85) return `${value}.${Math.floor(rand() * 100)}`;
  return `${value}%`;
}

// Monkeytype-style punctuation/numbers modifiers: punctuation appends , . ; : ? ! to some
// words and capitalizes sentence starts (capitals then have to be typed with Shift),
// numbers swaps some words for digits, decimals or percentages.
export function applyTextModifiers(text: string, options: TextModifierOptions): string {
  if (!options.punctuation && !options.numbers) return text;

  const rand = options.rand ?? Math.random;
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let sentenceStart = options.capitalizeFirst;

  for (const word of words) {
    let token = word;
    if (options.numbers && rand() < NUMBER_CHANCE) {
      token = randomNumberToken(rand);
    } else if (options.punctuation && rand() < PUNCTUATION_CHANCE) {
      token = word + pickPunctuation(rand);
    }
    if (options.punctuation) {
      if (sentenceStart) token = token.charAt(0).toUpperCase() + token.slice(1);
      sentenceStart = /[.?!]$/.test(token);
    }
    out.push(token);
  }

  return out.join(" ");
}
