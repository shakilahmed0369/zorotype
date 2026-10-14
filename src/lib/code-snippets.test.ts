import { describe, expect, it } from "vitest";
import {
  autoIndentAfter,
  CODE_LANGUAGES,
  codeLanguage,
  DEFAULT_CODE_LANGUAGE,
  pickSnippet,
} from "./code-snippets";

describe("code snippet registry", () => {
  it("ships every language with a handful of snippets", () => {
    expect(CODE_LANGUAGES.length).toBe(8);
    const ids = CODE_LANGUAGES.map((lang) => lang.id);
    expect(new Set(ids).size).toBe(ids.length);
    const shorts = CODE_LANGUAGES.map((lang) => lang.short);
    expect(new Set(shorts).size).toBe(shorts.length);
    for (const lang of CODE_LANGUAGES) {
      expect(lang.name.length, lang.id).toBeGreaterThan(0);
      // The test-config bar only has room for a compact label.
      expect(lang.short.length, lang.id).toBeGreaterThan(0);
      expect(lang.short.length, lang.id).toBeLessThanOrEqual(4);
      expect(lang.snippets.length, lang.id).toBeGreaterThanOrEqual(6);
    }
  });

  it("keeps every snippet in the shape the renderer and the engine expect", () => {
    for (const lang of CODE_LANGUAGES) {
      for (const snippet of lang.snippets) {
        const at = `${lang.id}: ${snippet.split("\n")[0]}`;
        expect(snippet.length, at).toBeGreaterThan(0);
        expect(snippet.startsWith("\n"), at).toBe(false);
        expect(snippet.endsWith("\n"), at).toBe(false);
        expect(snippet.includes("\t"), at).toBe(false);
        expect(snippet.includes("\r"), at).toBe(false);
        // ASCII only: the sample is drawn in a monospace face and measured by hand.
        expect(/^[\x20-\x7e\n]*$/.test(snippet), at).toBe(true);

        const lines = snippet.split("\n");
        expect(lines.length, at).toBeGreaterThanOrEqual(4);
        expect(lines.length, at).toBeLessThanOrEqual(10);
        for (const line of lines) {
          // A line longer than this would wrap in the three-line window.
          expect(line.length, at).toBeLessThanOrEqual(64);
          expect(line, at).toBe(line.replace(/\s+$/, ""));
          const indent = /^ */.exec(line)?.[0].length ?? 0;
          expect(indent % 2, at).toBe(0);
        }
      }
    }
  });

  it("finds a language by id and falls back to the default for an unknown one", () => {
    expect(codeLanguage("python")?.name).toBe("Python");
    expect(codeLanguage("cobol")).toBeUndefined();
    expect(codeLanguage(DEFAULT_CODE_LANGUAGE)?.snippets).toContain(pickSnippet("cobol"));
  });

  it("picks a snippet from the language that was asked for", () => {
    const rust = codeLanguage("rust")?.snippets ?? [];
    expect(rust).toContain(pickSnippet("rust", null, () => 0));
    expect(rust).toContain(pickSnippet("rust", null, () => 0.99));
  });

  it("never hands back the snippet it was told to avoid", () => {
    const rust = codeLanguage("rust")?.snippets ?? [];
    const inUse = rust[0];
    expect(pickSnippet("rust", inUse, () => 0)).not.toBe(inUse);
    expect(pickSnippet("rust", inUse, () => 0.99)).not.toBe(inUse);
    // An unknown exclusion or a single-snippet language still has to answer with something.
    expect(rust).toContain(pickSnippet("rust", "not a snippet", () => 0));
    expect(pickSnippet("rust", null, () => 0)).toBe(rust[0]);
  });
});

describe("auto indent", () => {
  const sample = "one\ntwo\n    three";

  it("fills in the indentation of the line the cursor lands on", () => {
    expect(autoIndentAfter(sample, 3)).toBe("\n");
    expect(autoIndentAfter(sample, 7)).toBe("\n    ");
  });

  it("takes the coming line's indent even when Enter is pressed mid-line", () => {
    expect(autoIndentAfter(sample, 1)).toBe("\n");
  });

  it("adds nothing when there is no line left to break", () => {
    expect(autoIndentAfter(sample, sample.length)).toBe("");
    expect(autoIndentAfter("single line", 4)).toBe("");
  });
});
