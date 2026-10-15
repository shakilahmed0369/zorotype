// The engine is the one piece of the app that lives in the browser, so the two browser APIs it
// touches are stubbed: storage is a no-op and there is nothing focused to blur. Everything else is
// the real store, driven the way a keydown drives it.
import { describe, expect, it } from "vitest";
import { getGameState, handleKeyDown, setPref, setupNewTest } from "./engine";

(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
(globalThis as unknown as Record<string, unknown>).document = { activeElement: null };
(globalThis as unknown as Record<string, unknown>).HTMLElement = class {};

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
