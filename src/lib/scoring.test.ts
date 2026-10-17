import { describe, expect, it } from "vitest";
import { buildMap } from "./keyboard";
import {
  buildCodeMistakeDrill,
  buildMistakePractice,
  computePracticeResults,
  countStrictCorrectChars,
  evaluateTest,
} from "./scoring";

describe("countStrictCorrectChars", () => {
  it("counts fully correct words plus their trailing space", () => {
    expect(countStrictCorrectChars("the cat", "the cat")).toBe(7); // 4 + 3
  });

  it("does not count a word whose following character was mistyped", () => {
    expect(countStrictCorrectChars("the cat", "thexcat")).toBe(3); // only "cat"
  });

  it("stops counting once the typed text ends", () => {
    expect(countStrictCorrectChars("the cat sat", "the cat")).toBe(4); // only "the "
  });

  it("drops a mistyped word but keeps the surrounding words", () => {
    expect(countStrictCorrectChars("the cat sat", "the cxt sat")).toBe(7); // "the " + "sat"
  });

  it("is stricter than positional character matching", () => {
    const sample = "the cat sat";
    const typed = "the cxt sat";
    let positional = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === sample[i]) positional++;
    }
    expect(countStrictCorrectChars(sample, typed)).toBeLessThan(positional);
  });

  it("scores a correct code snippet line by line", () => {
    const sample = "const a = 1;\n  return a;"; // 24 characters, six words
    // Every whitespace run counts once, so the newline plus the two-space indent scores as one
    // separator instead of three characters: 24 - 2.
    expect(countStrictCorrectChars(sample, sample)).toBe(22);
  });

  it("drops only the wrong line of a snippet", () => {
    const sample = "const a = 1;\n  return a;";
    const typed = "const a = 1;\n  return b;";
    expect(countStrictCorrectChars(sample, typed)).toBe(20); // everything up to "return "
  });
});

describe("evaluateTest", () => {
  it("keeps the strict word-by-word wpm", () => {
    const r = evaluateTest({ sample: "the cat", typed: "the cat", correctPresses: 7, totalPresses: 7, elapsedMs: 1000 });
    expect(r.timeSec).toBe(1);
    expect(r.acc).toBe(100);
    expect(r.wpm).toBe(84); // (4 + 3) chars / 5 per word in 1 second
  });

  it("does not count a word whose following character was mistyped", () => {
    const r = evaluateTest({
      sample: "the cat",
      typed: "thexcat",
      correctPresses: 6,
      totalPresses: 7,
      elapsedMs: 1000,
    });
    expect(r.wpm).toBe(36); // only "cat" counts (3 chars)
  });

  it("stops counting once the typed text ends", () => {
    const r = evaluateTest({
      sample: "the cat sat",
      typed: "the cat",
      correctPresses: 7,
      totalPresses: 7,
      elapsedMs: 1000,
    });
    expect(r.wpm).toBe(48); // only "the " counts (4 chars)
  });

  it("computes accuracy from real keypresses instead of double counting typos", () => {
    // An all-wrong run must report 0%, not 50% (the old formula's failure mode).
    expect(
      evaluateTest({ sample: "cat", typed: "xyz", correctPresses: 0, totalPresses: 100, elapsedMs: 1000 }).acc
    ).toBe(0);
    expect(
      evaluateTest({ sample: "cat", typed: "xyz", correctPresses: 60, totalPresses: 100, elapsedMs: 1000 }).acc
    ).toBe(60);
    // A typo that was backspaced and retyped still counts as one wrong press.
    expect(
      evaluateTest({ sample: "cat", typed: "cat", correctPresses: 11, totalPresses: 12, elapsedMs: 1000 }).acc
    ).toBe(92);
  });

  it("reports raw wpm from every typed character", () => {
    const r = evaluateTest({
      sample: "the cat",
      typed: "thexcat",
      correctPresses: 6,
      totalPresses: 7,
      elapsedMs: 1000,
    });
    expect(r.raw).toBe(84); // all 7 typed chars
    expect(r.wpm).toBe(36); // only "cat" counts
  });

  it("floors the elapsed time and treats a zero-press run as perfect", () => {
    const r = evaluateTest({ sample: "cat", typed: "", correctPresses: 0, totalPresses: 0, elapsedMs: 0 });
    expect(r.timeSec).toBe(0.1);
    expect(r.acc).toBe(100);
  });
});

describe("computePracticeResults", () => {
  it("computes hit rates per practiced char, sorted worst first", () => {
    const results = computePracticeResults({ a: 1, b: 1 }, { a: 1 }, "abab");
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ ch: "a", misses: 1, occurrences: 2, hitRate: 50 });
    expect(results[1]).toMatchObject({ ch: "b", misses: 0, occurrences: 2, hitRate: 100 });
  });

  it("treats unpracticed chars as perfect", () => {
    const results = computePracticeResults({ z: 1 }, {}, "the cat");
    expect(results[0].hitRate).toBe(100);
  });
});

describe("buildMistakePractice", () => {
  it("includes missed words and tops the set up to the requested count", () => {
    const selected = buildMistakePractice({
      mistakeChars: { a: 1 },
      mistakeWords: new Set(["cat", "dog"]),
      fingerHits: {},
      workingMap: buildMap("go60", "qwerty"),
      hw: "go60",
      count: 10,
      pool: ["apple", "banana", "cart", "amber", "zebra"],
    });
    expect(selected).toHaveLength(10);
    expect(selected).toContain("cat");
  });

  it("weights chars from weak fingers", () => {
    const workingMap = buildMap("corne", "qwerty");
    const selected = buildMistakePractice({
      mistakeChars: {},
      mistakeWords: new Set(),
      fingerHits: { L_C0R1: { correct: 1, total: 10 } },
      workingMap,
      hw: "corne",
      count: 5,
      pool: ["qqq", "zzz"],
    });
    // weak pinky adds weight for its label chars, so the pool still fills the set
    expect(selected).toHaveLength(5);
  });
});

describe("buildCodeMistakeDrill", () => {
  const snippet = [
    "function sum(rows) {",
    "  let total = 0;",
    "  for (const row of rows) {",
    "    total += row.value;",
    "  }",
    "  return total;",
    "}",
  ].join("\n");

  it("keeps the lines a mistake landed on, in the snippet's order", () => {
    const drill = buildCodeMistakeDrill({
      snippet,
      mistakeWords: new Set(["row.value;"]),
      mistakeChars: {},
    });
    expect(drill).toEqual([
      "function sum(rows) {",
      "  let total = 0;",
      "    total += row.value;",
    ]);
  });

  it("matches whole missed runs, not every line containing the letter", () => {
    const drill = buildCodeMistakeDrill({
      snippet: "let a = 1;\nlet data = 2;\nlet c = 3;\nlet q = 4;",
      mistakeWords: new Set(["a", "c", "q"]),
      mistakeChars: {},
    });
    // "data" contains an "a" but is not the run that was missed.
    expect(drill).toEqual(["let a = 1;", "let c = 3;", "let q = 4;"]);
  });

  it("widens a wordless drill with the lines that use the missed letters", () => {
    const drill = buildCodeMistakeDrill({
      snippet,
      mistakeWords: new Set(),
      mistakeChars: { v: 1 },
    });
    expect(drill).toHaveLength(3);
    expect(drill).toContain("    total += row.value;");
  });

  it("shifts an excerpt left to its own shallowest line", () => {
    const drill = buildCodeMistakeDrill({
      snippet: "    if (ready) {\n      run();\n    }",
      mistakeWords: new Set(["run();"]),
      mistakeChars: {},
    });
    expect(drill).toEqual(["if (ready) {", "  run();", "}"]);
  });

  it("caps the drill at six lines", () => {
    const long = Array.from({ length: 8 }, (_, i) => `let v${i} = ${i};`).join("\n");
    const drill = buildCodeMistakeDrill({
      snippet: long,
      mistakeWords: new Set(Array.from({ length: 8 }, (_, i) => `v${i}`)),
      mistakeChars: {},
    });
    expect(drill).toHaveLength(6);
    expect(drill[0]).toBe("let v0 = 0;");
  });

  it("drops blank lines while keeping the code shape", () => {
    const drill = buildCodeMistakeDrill({
      snippet: "one;\n\ntwo;\nthree;",
      mistakeWords: new Set(["three;"]),
      mistakeChars: {},
    });
    expect(drill).toEqual(["one;", "two;", "three;"]);
  });

  it("has nothing to drill for an empty snippet", () => {
    expect(buildCodeMistakeDrill({ snippet: "", mistakeWords: new Set(["x"]), mistakeChars: {} })).toEqual([]);
  });
});
