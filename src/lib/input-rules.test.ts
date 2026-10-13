import { describe, expect, it } from "vitest";
import { deletePreviousWord, isCharCorrect, isInputBlocked } from "./input-rules";

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
