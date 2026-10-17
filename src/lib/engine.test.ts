// The engine is the one piece of the app that lives in the browser, so the two browser APIs it
// touches are stubbed: storage is a no-op and there is nothing focused to blur. Everything else is
// the real store, driven the way a keydown drives it.
import { describe, expect, it } from "vitest";
import { getConfigState, getGameState, handleKeyDown, setPref, setupNewTest } from "./engine";

(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
(globalThis as unknown as Record<string, unknown>).document = { activeElement: null };
(globalThis as unknown as Record<string, unknown>).HTMLElement = class {};

// Sound is the third browser API the engine reaches for: a mistake would build an AudioContext,
// which Node has not got. None of these tests are about sound.
setPref("sound", false);

/** A keydown the way the browser sends it: the character, its physical code, no modifiers. */
function press(ch: string): void {
  const code = ch === " " ? "Space" : /[a-z]/i.test(ch) ? `Key${ch.toUpperCase()}` : `Digit${ch}`;
  handleKeyDown({
    key: ch,
    code,
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: () => {},
  } as unknown as KeyboardEvent);
}

/** Types the sample in order, up to `count` characters. */
function typeSample(count: number): void {
  const game = getGameState();
  for (let i = 0; i < count; i++) {
    const char = game.sample[game.typed.length];
    if (!char) break;
    press(char);
  }
}

describe("typing", () => {
  it("types a space on the space bar", () => {
    setPref("timed", "0");
    setupNewTest("ab cd");
    press("a");
    press("b");
    press(" ");
    expect(getGameState().typed).toBe("ab ");
  });
});

describe("how a test ends", () => {
  it("keeps a timed run stocked instead of letting its text run out", () => {
    setPref("mode", "words");
    setPref("timed", "30");
    // A short opening text, the way a 10-word run starts.
    setupNewTest("one two three four five six seven eight nine ten");
    const game = getGameState();
    const opening = game.sample.length - game.typed.length;
    expect(opening).toBeGreaterThanOrEqual(150); // the lines under the caret are filled from the start

    let leastAhead = Infinity;
    for (let i = 0; i < 500; i++) {
      const char = game.sample[game.typed.length];
      if (!char) break;
      press(char);
      leastAhead = Math.min(leastAhead, game.sample.length - game.typed.length);
    }

    expect(game.typed.length).toBeGreaterThan(400); // the run outlasts its opening text
    expect(leastAhead).toBeGreaterThanOrEqual(80); // and never leaves a blank gap under the caret
    expect(game.testCompleted).toBe(false); // the clock ends a timed run, never the text
  });

  it("still ends a words run when its text is finished", () => {
    setPref("timed", "0");
    setupNewTest("one two three");
    const game = getGameState();
    typeSample(100);
    expect(game.typed).toBe(game.sample);
    expect(game.testCompleted).toBe(true);
  });
});

describe("the result screen", () => {
  /** Types the sample out, so the test finishes and its result is on screen. */
  function finish(text: string): void {
    setPref("mode", "words");
    setPref("timed", "0");
    setupNewTest(text);
    typeSample(100);
  }

  it("keeps the result when a stray space or enter lands after the last word", () => {
    finish("one two");
    const game = getGameState();
    const { sample, typed } = game;

    press(" ");
    press("Enter");

    expect(game.testCompleted).toBe(true);
    expect(game.sample).toBe(sample);
    expect(game.typed).toBe(typed);
  });

  it("starts the next test on tab then enter", () => {
    finish("one two");
    const game = getGameState();

    press("Tab");
    press("Enter");

    expect(game.testCompleted).toBe(false);
    expect(game.typed).toBe("");
    expect(game.sample).not.toBe("");
  });

  it("drills the mistakes on tab then space", () => {
    setPref("mode", "words");
    setPref("timed", "0");
    setupNewTest("abc");
    press("a");
    press("x"); // wrong: the sample wanted "b"
    press("b");
    const game = getGameState();
    expect(game.testCompleted).toBe(true);
    expect(game.mistakes).toBeGreaterThan(0);

    press("Tab");
    press("Space");

    expect(getConfigState().mode).toBe("mistakes");
    expect(getGameState().testCompleted).toBe(false);
  });

  it("drills fumbled code as code, not as a paragraph", () => {
    const snippet = "function sum(rows) {\n  let total = 0;\n  return total;\n}";
    setPref("mode", "code");
    setPref("timed", "0");
    setPref("codeLastSnippet", snippet);
    setPref("mistakesCode", false);
    setupNewTest(snippet, { raw: true });

    // Type the snippet out with one slip: a wrong key where the "=" of the second line sits.
    const game = getGameState();
    while (game.typed.length < snippet.length) {
      const char = snippet[game.typed.length];
      if (char === "\n") press("Enter");
      else press(game.typed.length === snippet.indexOf("=") ? "z" : char);
    }
    expect(game.testCompleted).toBe(true);
    expect(game.mistakes).toBeGreaterThan(0);

    press("Tab");
    press("Space");

    expect(getConfigState().mode).toBe("mistakes");
    expect(getConfigState().mistakesCode).toBe(true);
    // The drill is the snippet's own lines — not a space-joined paragraph of drill words.
    expect(game.sample).toBe("function sum(rows) {\n  let total = 0;\n  return total;");
    expect(game.typed).toBe("");
    expect(game.testCompleted).toBe(false);

    // Enter still advances through the drill the way code does: newline plus the line's indent.
    while (game.sample[game.typed.length] !== "\n") press(game.sample[game.typed.length]);
    press("Enter");
    expect(game.typed.endsWith("\n  ")).toBe(true);
  });

  it("remembers a fumbled token at the start of a line on its own", () => {
    setPref("mode", "code");
    setPref("timed", "0");
    setupNewTest("first;\nsecond;\nthird;", { raw: true });

    // Type the first line, break it, then fumble the very first key of the second.
    const game = getGameState();
    while (game.sample[game.typed.length] !== "\n") press(game.sample[game.typed.length]);
    press("Enter");
    press("z"); // the second line wanted an "s"

    // The run stops at the line break, so a drill can find that line on its own instead of the
    // first line's tail being remembered with the second line's head.
    expect([...game.mistakeWords]).toEqual(["second;"]);
  });
});
