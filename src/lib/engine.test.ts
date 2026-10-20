// The engine is the one piece of the app that lives in the browser, so the two browser APIs it
// touches are stubbed: storage is a no-op and there is nothing focused to blur. Everything else is
// the real store, driven the way a keydown drives it.
import { describe, expect, it } from "vitest";
import { getConfigState, getGameState, handleKeyDown, init, setPref, setupNewTest } from "./engine";

(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
(globalThis as unknown as Record<string, unknown>).document = { activeElement: null };
(globalThis as unknown as Record<string, unknown>).HTMLElement = class {};

// Sound is the third browser API the engine reaches for: a mistake would build an AudioContext,
// which Node has not got. None of these tests are about sound.
await init();
setPref("sound", false);

/** A keydown the way the browser sends it: the character, its physical code, no modifiers. */
function press(ch: string): void {
  const code = ch === " " ? "Space" : /[a-z]/i.test(ch) ? `Key${ch.toUpperCase()}` : `Digit${ch}`;
  pressRaw({ key: ch, code });
}

/** A keydown with every part of the event spelled out — for the shapes `press` cannot make. */
function pressRaw(event: Partial<KeyboardEvent>): void {
  handleKeyDown({
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: () => {},
    ...event,
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

  it("types the grave key as the backtick the event carries", () => {
    setPref("timed", "0");
    setupNewTest("`a");
    pressRaw({ key: "`", code: "Backquote" });
    expect(getGameState().typed).toBe("`");
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

  it("starts the next test on escape", () => {
    finish("one two");
    const game = getGameState();

    press("Escape");

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

// The grave key of a US-International or European layout is a dead key: the OS holds the character
// back until the next press and reports `Dead`, so a trainer that reads only the event has nothing
// to score. The physical key is the one thing left that says what was pressed.
describe("a dead key", () => {
  it("types its character when the text is waiting for it", () => {
    setPref("mode", "code");
    setPref("timed", "0");
    setupNewTest("`a");

    pressRaw({ key: "Dead", code: "Backquote" });

    expect(getGameState().typed).toBe("`");
  });

  it("reads the shifted character off the same key", () => {
    setPref("timed", "0");
    setupNewTest("~a");

    pressRaw({ key: "Dead", code: "Backquote", shiftKey: true });

    expect(getGameState().typed).toBe("~");
  });

  it("is left to the OS when the text wants another character, so composition still works", () => {
    setPref("timed", "0");
    setupNewTest("ea");

    pressRaw({ key: "Dead", code: "Quote" }); // "´" on the way to "é"
    expect(getGameState().typed).toBe("");

    // and the composed character arrives on the key that finishes it
    press("e");
    expect(getGameState().typed).toBe("e");
  });
});

describe("AltGr", () => {
  it("types the character AltGr put on the key", () => {
    setPref("timed", "0");
    setupNewTest("`a");

    pressRaw({ key: "`", code: "Backquote", ctrlKey: true, altKey: true, getModifierState: () => true });

    expect(getGameState().typed).toBe("`");
  });

  it("still lets a window shortcut through to the browser", () => {
    setPref("timed", "0");
    setupNewTest("copy");

    pressRaw({ key: "c", code: "KeyC", ctrlKey: true, getModifierState: () => false });

    expect(getGameState().typed).toBe("");
  });
});
