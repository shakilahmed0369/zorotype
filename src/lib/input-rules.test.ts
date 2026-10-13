import { describe, expect, it } from "vitest";
import { controlKey, deletePreviousWord, isCharCorrect, isInputBlocked, keyLabelToChar, pressedChar } from "./input-rules";

describe("pressedChar", () => {
  it("takes a shifted symbol from what the OS delivered, not from the unshifted label", () => {
    expect(pressedChar(";", ":", true, false)).toBe(":");
    expect(pressedChar("1", "!", true, false)).toBe("!");
    expect(pressedChar("9", "(", true, false)).toBe("(");
    expect(pressedChar("'", '"', true, false)).toBe('"');
    expect(pressedChar("=", "+", true, false)).toBe("+");
  });

  it("keeps letters label-driven, so a test-drive still follows the target layout", () => {
    expect(pressedChar("Q", "Q", true, true)).toBe("Q");
    expect(pressedChar("Q", "q", false, false)).toBe("q");
    expect(pressedChar("A", "A", false, false)).toBe("a");
  });

  it("leaves unshifted symbols and behavior labels alone", () => {
    expect(pressedChar(";", ";", false, false)).toBe(";");
    expect(pressedChar("MO", "m", true, false)).toBe("MO");
    expect(pressedChar("Lower", "l", true, false)).toBe("LOWER");
    expect(pressedChar("SPACE", " ", true, false)).toBe(" ");
  });

  it("ignores a multi-character delivery", () => {
    expect(pressedChar(";", "ArrowUp", true, false)).toBe(";");
  });
});

describe("controlKey", () => {
  it("recognises every spelling of the keys that type nothing", () => {
    expect(controlKey("BSPC")).toBe("Backspace");
    expect(controlKey("Backspace")).toBe("Backspace");
    expect(controlKey("Backsp")).toBe("Backspace"); // the built-in boards' short label
    expect(controlKey("RET")).toBe("Enter");
    expect(controlKey("Enter")).toBe("Enter");
    expect(controlKey("ESC")).toBe("Escape");
    expect(controlKey("Tab")).toBe("Tab");
    expect(controlKey("Space")).toBe(" ");
  });

  it("leaves characters and behavior labels alone", () => {
    expect(controlKey("A")).toBeNull();
    expect(controlKey(";")).toBeNull();
    expect(controlKey("MO")).toBeNull();
    expect(controlKey("Lower")).toBeNull();
    expect(controlKey("")).toBeNull();
    expect(controlKey(null)).toBeNull();
    expect(controlKey("ArrowUp")).toBeNull();
  });
});

describe("keyLabelToChar", () => {
  it("reads control labels as their key, not as a character", () => {
    expect(keyLabelToChar("Backsp", false)).toBe("Backspace");
    expect(keyLabelToChar("RET", false)).toBe("Enter");
    expect(keyLabelToChar("SPC", false)).toBe(" ");
  });

  it("follows the Shift state for single characters", () => {
    expect(keyLabelToChar("a", false)).toBe("a");
    expect(keyLabelToChar("A", true)).toBe("A");
    expect(keyLabelToChar("a", true)).toBe("A");
    expect(keyLabelToChar("4", false)).toBe("4");
  });

  it("keeps multi-character labels inert", () => {
    expect(keyLabelToChar("MO", false)).toBe("MO");
    expect(keyLabelToChar("LShift", false)).toBe("LSHIFT");
  });
});

describe("isCharCorrect", () => {
  it("requires an exact match, so capitals need Shift", () => {
    expect(isCharCorrect("a", "a")).toBe(true);
    expect(isCharCorrect("A", "A")).toBe(true);
    expect(isCharCorrect("a", "A")).toBe(false);
    expect(isCharCorrect("A", "a")).toBe(false);
    expect(isCharCorrect("a", undefined)).toBe(false);
  });
});

describe("deletePreviousWord", () => {
  it("clears the word being typed and keeps the space before it", () => {
    expect(deletePreviousWord("the quick brow")).toBe("the quick ");
    expect(deletePreviousWord("the quick ")).toBe("the quick");
  });

  it("takes a lone word back to the start of the line", () => {
    expect(deletePreviousWord("quick")).toBe("");
    expect(deletePreviousWord("")).toBe("");
  });

  it("treats runs of whitespace as the boundary", () => {
    expect(deletePreviousWord("the   quick")).toBe("the   ");
    expect(deletePreviousWord("the   ")).toBe("the");
  });
});

describe("isInputBlocked", () => {
  const sample = "the cat sat";

  it("never blocks with normal difficulty and stop-on-error off", () => {
    expect(
      isInputBlocked({ typed: "thex", sample, mappedChar: " ", difficulty: "normal", stopOnError: "off" })
    ).toBe(false);
  });

  it("master difficulty freezes while the last character is wrong", () => {
    const master = { difficulty: "master", stopOnError: "off" } as const;
    expect(isInputBlocked({ typed: "thex", sample, mappedChar: "c", ...master })).toBe(true);
    expect(isInputBlocked({ typed: "the", sample, mappedChar: " ", ...master })).toBe(false);
  });

  it("stop-on-error letter blocks until the wrong character is fixed", () => {
    const letter = { difficulty: "normal", stopOnError: "letter" } as const;
    expect(isInputBlocked({ typed: "thex", sample, mappedChar: "c", ...letter })).toBe(true);
    expect(isInputBlocked({ typed: "the", sample, mappedChar: " ", ...letter })).toBe(false);
  });

  it("stop-on-error word lets you finish a word but not leave it wrong", () => {
    const word = { difficulty: "normal", stopOnError: "word" } as const;
    // still inside a word: typing through the mistake is allowed
    expect(isInputBlocked({ typed: "th", sample, mappedChar: "x", ...word })).toBe(false);
    // an incomplete or wrong word cannot be closed with a space
    expect(isInputBlocked({ typed: "th", sample, mappedChar: " ", ...word })).toBe(true);
    expect(isInputBlocked({ typed: "thx", sample, mappedChar: " ", ...word })).toBe(true);
    // and you cannot type past the end of a wrong word
    expect(isInputBlocked({ typed: "thx", sample, mappedChar: "c", ...word })).toBe(true);
    // a complete, correct word can advance
    expect(isInputBlocked({ typed: "the", sample, mappedChar: " ", ...word })).toBe(false);
  });
});
