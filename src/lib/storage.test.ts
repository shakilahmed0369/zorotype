// storage.ts is the one lib module that talks to the browser, so a plain object stands in for
// localStorage and the rest is the real module.
import { describe, expect, it } from "vitest";
import { HISTORY_KEY, MAX_HISTORY, loadHistory, saveResult } from "./storage";
import type { HistoryEntry } from "./types";

let stored: Record<string, string> = {};
(globalThis as unknown as Record<string, unknown>).localStorage = {
  getItem: (key: string) => stored[key] ?? null,
  setItem: (key: string, value: string) => {
    stored[key] = value;
  },
  removeItem: (key: string) => {
    delete stored[key];
  },
};

function entry(wpm: number): HistoryEntry {
  return { wpm, acc: wpm, time: 30, mode: "time 30", date: wpm, chars: {} };
}

function seed(count: number): HistoryEntry[] {
  return Array.from({ length: count }, (_, index) => entry(index + 1));
}

describe("history", () => {
  it("keeps the twenty latest results", () => {
    expect(MAX_HISTORY).toBe(20);
    stored = {};
    for (let wpm = 1; wpm <= 25; wpm++) saveResult(entry(wpm));

    const history = loadHistory();
    expect(history).toHaveLength(20);
    expect(history[0].wpm).toBe(6); // the five oldest dropped off
    expect(history[19].wpm).toBe(25);
  });

  it("drops what a longer store already held", () => {
    stored = { [HISTORY_KEY]: JSON.stringify(seed(50)) };
    const history = loadHistory();
    expect(history).toHaveLength(20);
    expect(history[0].wpm).toBe(31);
    expect(history[19].wpm).toBe(50);
  });

  it("starts empty with nothing stored", () => {
    stored = {};
    expect(loadHistory()).toEqual([]);
  });

  it("keeps the newest results in the order they were typed", () => {
    stored = {};
    saveResult(entry(30));
    saveResult(entry(40));
    expect(loadHistory().map((saved) => saved.wpm)).toEqual([30, 40]);
  });
});
