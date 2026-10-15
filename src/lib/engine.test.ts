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
});
