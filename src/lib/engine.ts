import { fetchNewsText, loadDictionary, loadLangDictionary, wordPool } from "./dictionary";
import { isCharCorrect, isInputBlocked } from "./input-rules";
import { buildMap, buildScriptLayouts, currentTargetMap, getMirroredMap, mirrorPos } from "./keyboard";
import { LANGUAGES, langHasPhrases } from "./languages";
import { applyTextModifiers } from "./modifiers";
import { buildMistakePractice, computePracticeResults, countStrictCorrectChars, evaluateTest } from "./scoring";
import { playErrorSound } from "./sound";
import {
  APP_VERSION,
  CONFIG_KEY,
  DEFAULT_CONFIG,
  HISTORY_KEY,
  VER_KEY,
  loadConfig as loadStoredConfig,
  loadHistory,
  saveConfig as persistConfig,
  saveResult,
} from "./storage";
import { parseZmkJson } from "./zmk";
import { applyTheme, getTheme } from "./themes";
import type { Config, GameState, HardwareId, HistoryEntry, LanguageCode, UiState } from "./types";

/* ==========================================================================
   STORE (external, framework-agnostic)
   ========================================================================== */

let version = 0;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVersion(): number {
  return version;
}

export function getServerVersion(): number {
  return 0;
}

function notify(): void {
  version++;
  listeners.forEach((listener) => listener());
}

const config: Config = { ...DEFAULT_CONFIG };

const game: GameState = {
  typed: "",
  sample: "",
  currentMap: {},
  sourceMap: {},
  testStarted: false,
  testCompleted: false,
  startTime: null,
  mistakes: 0,
  correctPresses: 0,
  totalPresses: 0,
  mistakeChars: {},
  mistakeWords: new Set(),
  practiceTargetChars: {},
  wpmSnapshots: [],
  currentStreak: 0,
  bestStreak: 0,
  fingerHits: {},
  timerSeconds: 0,
  timerRemaining: 0,
  tabActive: false,
};

const ui: UiState = {
  ready: false,
  setupOpen: false,
  textModalOpen: false,
  themeModalOpen: false,
  toast: { msg: "Notification", error: false, visible: false },
  newsLoading: false,
  debugText: "debug info: ready...",
  keyFlash: null,
  heatmap: null,
  result: null,
  bestScores: [],
  historySummary: null,
  practiceResults: null,
};

export function getConfigState(): Config {
  return config;
}

export function getGameState(): GameState {
  return game;
}

export function getUiState(): UiState {
  return ui;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;
let snapshotInterval: ReturnType<typeof setInterval> | null = null;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

let initialized = false;

export async function init(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const cachedVer = localStorage.getItem(VER_KEY);
  const isReturningUser = cachedVer === APP_VERSION;

  if (!isReturningUser) {
    localStorage.clear();
    localStorage.setItem(VER_KEY, APP_VERSION);
  }

  buildScriptLayouts(); // derive the hebrew/arabic target layouts for every board

  Object.assign(config, loadStoredConfig());
  if (!LANGUAGES[config.lang]) config.lang = "en";
  config.theme = getTheme(config.theme).name;
  applyTheme(config.theme);
  ui.bestScores = loadHistory();
  notify();

  // Load word lists: Monkeytype's English list, plus the active language's list if non-English.
  await loadDictionary();
  await loadLangDictionary(config.lang);

  if (config.showKb && !ui.setupOpen) {
    refreshMaps();
  } else {
    setupNewTest(game.sample || wordPool(config.lang).slice(0, parseInt(config.wordCount) || 25).join(" "));
  }

  restartCurrentMode();

  ui.ready = true;
  notify();
}

function refreshMaps(): void {
  game.currentMap = currentTargetMap(config);
  game.sourceMap = buildMap(config.hw, config.sourceKey, "source", config);
}

/* ==========================================================================
   STORAGE & CONFIGURATION
   ========================================================================== */

export function setPref<K extends keyof Config>(key: K, val: Config[K]): void {
  config[key] = val;
  persistConfig(config);
  if (key === "hw" || key === "tgt" || key === "sourceKey" || key === "mirror" || key === "homerow") {
    refreshMaps();
  }
  // Content modifiers rebuild the current test so the change is visible right away.
  if ((key === "punctuation" || key === "numbers") && config.mode === "words" && !game.testStarted) {
    generateWords();
    return;
  }
  notify();
}

export function clearAllData(): void {
  if (window.confirm("Are you sure you want to clear all settings and history?")) {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(VER_KEY);
    location.reload();
  }
}

/* ==========================================================================
   UI ACTIONS
   ========================================================================== */

export function showToast(msg: string, isError = false): void {
  ui.toast = { msg, error: isError, visible: true };
  notify();
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    ui.toast = { ...ui.toast, visible: false };
    notify();
  }, 3000);
}

export function handleLogoClick(): void {
  if (ui.setupOpen) toggleSettings();
  else restartCurrentMode();
}

export function toggleSettings(): void {
  ui.setupOpen = !ui.setupOpen;
  ui.keyFlash = null;
  if (!ui.setupOpen) {
    window.focus();
    if (config.showKb) refreshMaps();
  }
  notify();
}

export function openTextModal(): void {
  ui.textModalOpen = true;
  notify();
}

export function closeTextModal(): void {
  ui.textModalOpen = false;
  notify();
}

export function setTheme(name: string): void {
  config.theme = getTheme(name).name;
  persistConfig(config);
  applyTheme(config.theme);
  notify();
}

export function openThemeModal(): void {
  ui.themeModalOpen = true;
  notify();
}

export function closeThemeModal(): void {
  ui.themeModalOpen = false;
  notify();
}

export function applyCustomText(text: string): void {
  if (text) {
    config.mode = "custom";
    persistConfig(config);
    setupNewTest(text, { raw: true });
    closeTextModal();
  }
}

/* ==========================================================================
   ZMK JSON (LayerForge AST Engine)
   ========================================================================== */

export function applyZmkJson(jsonString: string, type: "source" | "target"): void {
  let parsed: { hw: HardwareId; map: Record<string, string> };
  try {
    parsed = parseZmkJson(jsonString, config.hw);
  } catch (err) {
    console.error("JSON Parse Error:", err);
    showToast("Error parsing ZMK JSON.", true);
    return;
  }

  config.hw = parsed.hw;
  if (type === "source") {
    config.sourceJsonMap = parsed.map;
    config.sourceKey = "custom_json";
  } else {
    config.targetJsonMap = parsed.map;
    config.tgt = "custom_json";
  }

  persistConfig(config);
  refreshMaps();
  notify();
  showToast(`ZMK JSON loaded for ${type}!`);
}

/* ==========================================================================
   LANGUAGE
   ========================================================================== */

export async function setLang(lang: LanguageCode): Promise<void> {
  if (!LANGUAGES[lang]) return;
  config.lang = lang;
  persistConfig(config);

  // Reconcile the current mode with the sources available in the new language.
  if (config.mode === "news" && lang !== "en") config.mode = LANGUAGES[lang].phrases ? "phrases" : "words";
  if (config.mode === "phrases" && !LANGUAGES[lang].phrases) config.mode = "words";

  await loadLangDictionary(lang);

  refreshMaps(); // rebuilds source/target maps (non-Latin scripts force their layout)
  restartCurrentMode();
}

/* ==========================================================================
   TEST GENERATION
   ========================================================================== */

// Nav test-config bar actions.
export function setMode(mode: "time" | "words" | "news" | "custom"): void {
  if (mode === "time") {
    config.mode = "words";
    if (parseInt(config.timed) <= 0) config.timed = "30";
    persistConfig(config);
    generateWords();
    return;
  }
  if (mode === "words") {
    config.timed = "0";
    persistConfig(config);
    generateWords();
    return;
  }
  if (mode === "news") {
    if (langHasPhrases(config.lang)) generatePhrases();
    else void fetchNews();
    return;
  }
  openTextModal();
}

export function setTimed(seconds: string): void {
  config.timed = seconds;
  persistConfig(config);
  generateWords();
}

export function setWordCount(count: string): void {
  config.wordCount = count;
  persistConfig(config);
  if (config.mode === "phrases") generatePhrases();
  else if (config.mode === "custom") notify();
  else generateWords();
}

export function generateWords(): void {
  config.mode = "words";
  persistConfig(config);
  const count = parseInt(config.wordCount) || 25;
  const selected: string[] = [];
  const shuffled = [...wordPool(config.lang)].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) selected.push(shuffled[i % shuffled.length]);
  setupNewTest(selected.join(" "), { modify: true });
}

// "phrases" mode: whole curated sentences from the active language (currently Hebrew).
// Occupies the middle mode button where English shows live "news".
export function generatePhrases(): void {
  const phrases = LANGUAGES[config.lang].phrases || [];
  if (phrases.length === 0) {
    generateWords();
    return;
  }
  config.mode = "phrases";
  persistConfig(config);
  const count = parseInt(config.wordCount) || 25;
  const pool = [...phrases].sort(() => Math.random() - 0.5);
  const out: string[] = [];
  let wc = 0;
  let i = 0;
  while (wc < count) {
    const p = pool[i % pool.length];
    out.push(p);
    wc += p.split(" ").length;
    i++;
  }
  setupNewTest(out.join(" "));
}

export async function fetchNews(): Promise<void> {
  config.mode = "news";
  persistConfig(config);
  ui.newsLoading = true;
  notify();
  try {
    const text = await fetchNewsText();
    setupNewTest(text);
  } catch {
    setupNewTest("newsfeed unavailable please try again later");
  } finally {
    ui.newsLoading = false;
    notify();
  }
}

export function restartCurrentMode(): void {
  if (config.mode === "mistakes") {
    generateWords();
    return;
  }
  if (config.mode === "words") generateWords();
  else if (config.mode === "phrases") generatePhrases();
  else if (config.mode === "news") void fetchNews();
  else setupNewTest(game.sample, { raw: config.mode === "custom" });
}

export function setupNewTest(text: string, options: { raw?: boolean; modify?: boolean } = {}): void {
  if (options.raw) {
    game.sample = text || "";
  } else {
    let cleanText = (text || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (cleanText.endsWith(" ")) cleanText = cleanText.slice(0, -1);
    game.sample = options.modify
      ? applyTextModifiers(cleanText, {
          punctuation: config.punctuation,
          numbers: config.numbers,
          capitalizeFirst: true,
        })
      : cleanText;
  }

  game.typed = "";
  game.testStarted = false;
  game.testCompleted = false;
  game.startTime = null;
  game.mistakes = 0;
  game.correctPresses = 0;
  game.totalPresses = 0;
  game.mistakeChars = {};
  game.mistakeWords = new Set();
  game.wpmSnapshots = [];
  game.currentStreak = 0;
  game.bestStreak = 0;
  game.fingerHits = {};

  stopTimer();
  stopSnapshots();

  ui.result = null;
  ui.heatmap = null;
  ui.practiceResults = null;
  ui.historySummary = null;
  ui.keyFlash = null;

  refreshMaps();

  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  notify();
}

/* ==========================================================================
   TEST END & SCORING
   ========================================================================== */

export function checkTestEnd(): void {
  if (parseInt(config.timed) > 0 && game.timerRemaining > 0) {
    const shuffled = [...wordPool(config.lang)].sort(() => Math.random() - 0.5);
    const extra: string[] = [];
    for (let i = 0; i < 15; i++) extra.push(shuffled[i % shuffled.length]);
    const continuation = applyTextModifiers(extra.join(" "), {
      punctuation: config.punctuation,
      numbers: config.numbers,
      capitalizeFirst: !/[.?!]$/.test(game.sample),
    });
    game.sample += " " + continuation;
    notify();
    return;
  }
  endTest(false);
}

export function endTest(earlyExit = false): void {
  if (game.testCompleted) return;
  game.testCompleted = true;
  stopSnapshots();
  stopTimer();
  ui.keyFlash = null;

  const elapsedMs = Date.now() - (game.startTime ?? Date.now());
  const { wpm, raw, acc, timeSec } = evaluateTest({
    sample: game.sample,
    typed: game.typed,
    correctPresses: game.correctPresses,
    totalPresses: game.totalPresses,
    elapsedMs,
  });

  let testTypeStr: string = config.mode;
  if (config.mode === "words") testTypeStr += " " + config.wordCount;
  else if (parseInt(config.timed) > 0) testTypeStr = "time " + config.timed;
  if (config.difficulty !== "normal") testTypeStr += " " + config.difficulty;

  ui.result = {
    wpm,
    raw,
    acc,
    time: Math.round(timeSec),
    words: game.typed.trim().split(/\s+/).filter((w) => w.length > 0).length,
    streak: game.bestStreak,
    testType: testTypeStr,
    historyMode: config.mode !== "mistakes" && !earlyExit ? "history" : "improvement",
  };

  if (config.mode !== "mistakes" && !earlyExit) {
    saveResult({
      wpm,
      acc,
      time: Math.round(timeSec),
      mode: testTypeStr,
      date: Date.now(),
      chars: { ...game.mistakeChars },
    });
    ui.historySummary = summarizeHistory(loadHistory());
    ui.heatmap = game.mistakeChars;
    ui.bestScores = loadHistory();
  } else {
    ui.heatmap = game.mistakeChars;
    ui.practiceResults = computePracticeResults(game.practiceTargetChars, game.mistakeChars, game.sample);
  }

  notify();
}

function summarizeHistory(history: HistoryEntry[]) {
  if (history.length < 1) return null;
  const last3 = history.slice(-3);
  return {
    avgWpm: Math.round(last3.reduce((s, h) => s + h.wpm, 0) / last3.length),
    avgAcc: Math.round(last3.reduce((s, h) => s + h.acc, 0) / last3.length),
    count: history.length,
  };
}

/* ==========================================================================
   MISTAKE PRACTICE
   ========================================================================== */

export function practiceMistakes(): void {
  const mistakeKeys = Object.keys(game.mistakeChars);
  if (mistakeKeys.length === 0) {
    generateWords();
    return;
  }
  game.practiceTargetChars = { ...game.mistakeChars };
  config.mode = "mistakes";
  persistConfig(config);

  const count = parseInt(config.wordCount) || 25;
  const workingMap = config.mirror ? getMirroredMap(game.currentMap) : game.currentMap;

  const selected = buildMistakePractice({
    mistakeChars: game.mistakeChars,
    mistakeWords: game.mistakeWords,
    fingerHits: game.fingerHits,
    workingMap,
    hw: config.hw,
    lang: config.lang,
    count,
    pool: wordPool(config.lang),
  });

  setupNewTest(selected.sort(() => Math.random() - 0.5).join(" "));
}

/* ==========================================================================
   DRAG REMAP
   ========================================================================== */

export function swapKeys(sourcePos: string, targetPos: string): void {
  const src = config.mirror ? mirrorPos(sourcePos) : sourcePos;
  const trg = config.mirror ? mirrorPos(targetPos) : targetPos;

  if (config.tgt !== "custom_dragged") {
    config.draggedMap = { ...currentTargetMap(config) }; // seed from the effective layout
    config.tgt = "custom_dragged";
  }

  const dragged = config.draggedMap as Record<string, string>;
  const temp = dragged[src];
  dragged[src] = dragged[trg];
  dragged[trg] = temp;

  persistConfig(config);
  game.currentMap = currentTargetMap(config);
  notify();
}

/* ==========================================================================
   TIMERS & SNAPSHOTS
   ========================================================================== */

function startSnapshots(): void {
  game.wpmSnapshots = [];
  let lastMistakes = 0;
  snapshotInterval = setInterval(() => {
    if (!game.testStarted || game.testCompleted) return;
    const elapsed = (Date.now() - (game.startTime ?? Date.now())) / 1000;
    const minutes = Math.max(0.1, elapsed) / 60;
    const errors = game.mistakes - lastMistakes;
    lastMistakes = game.mistakes;
    game.wpmSnapshots.push({
      time: Math.round(elapsed),
      wpm: Math.round(countStrictCorrectChars(game.sample, game.typed) / 5 / minutes) || 0,
      raw: Math.round(game.typed.length / 5 / minutes) || 0,
      errors,
    });
  }, 1000);
}

function stopSnapshots(): void {
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = null;
  }
}

function startTimer(): void {
  const secs = parseInt(config.timed);
  if (secs <= 0) return;
  game.timerSeconds = secs;
  game.timerRemaining = secs;
  timerInterval = setInterval(() => {
    game.timerRemaining--;
    if (game.timerRemaining <= 0) {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      endTest(false);
      return;
    }
    notify();
  }, 1000);
}

function stopTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/* ==========================================================================
   KEYBOARD EVENT MATRIX TRANSLATION ENGINE
   ========================================================================== */

const OS_TO_ZMK: Record<string, string> = {
  Escape: "ESC",
  Minus: "-",
  Equal: "=",
  Backspace: "BSPC",
  Tab: "TAB",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Enter: "RET",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: "SPACE",
  ShiftLeft: "LSHFT",
  ShiftRight: "RSHFT",
  ControlLeft: "LCTRL",
  ControlRight: "RCTRL",
  AltLeft: "LALT",
  AltRight: "RALT",
  MetaLeft: "LGUI",
  MetaRight: "RGUI",
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  Backquote: "GRAVE",
};

function getCurrentWord(text: string, pos: number): string | null {
  let start = pos;
  let end = pos;
  while (start > 0 && text[start - 1] !== " ") start--;
  while (end < text.length && text[end] !== " ") end++;
  const w = text.slice(start, end).toLowerCase();
  return w.length > 0 ? w : null;
}

function flashKey(pos: string | undefined, kind: "active" | "active-error" = "active"): void {
  if (pos && config.showKb && config.keypress) {
    ui.keyFlash = { pos, kind };
    setTimeout(() => {
      if (ui.keyFlash && ui.keyFlash.pos === pos) {
        ui.keyFlash = null;
        notify();
      }
    }, 150);
  }
}

export function handleKeyDown(e: KeyboardEvent): void {
  if (ui.textModalOpen || ui.themeModalOpen || e.repeat) return;

  // 1. Settings Exit Interception
  if (ui.setupOpen) {
    e.preventDefault();
    if (e.key === "Escape" || e.key === "Enter") {
      toggleSettings();
    }
    return;
  }

  // --- MATRIX TRANSLATION ENGINE ---
  // Map Physical OS Key -> Source Matrix Pos -> Target Char

  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key !== "F12" && e.key !== "F5") {
    e.preventDefault();
  }

  let osKey = OS_TO_ZMK[e.code] || e.code.replace("Key", "").replace("Digit", "").toUpperCase();
  if (e.key.length === 1) osKey = e.key.toUpperCase();

  let mappedChar = e.key;
  const sourceMap = game.sourceMap;

  const pos = Object.keys(sourceMap).find((p) => {
    const s = (sourceMap[p] || "").toUpperCase();
    return s === osKey || s === e.key.toUpperCase() || s === OS_TO_ZMK[e.code];
  });

  const isUpperCase = e.key === e.key.toUpperCase() && e.key !== e.key.toLowerCase();

  if (pos) {
    const workingMap = config.mirror ? getMirroredMap(game.currentMap) : game.currentMap;
    if (workingMap[pos] !== undefined) {
      const rawVal = workingMap[pos].toUpperCase();
      mappedChar = rawVal;
      if (mappedChar === "SPACE" || mappedChar === "SPC") mappedChar = " ";
      else if (mappedChar === "RET" || mappedChar === "ENTER") mappedChar = "Enter";
      else if (mappedChar === "ESC" || mappedChar === "ESCAPE") mappedChar = "Escape";
      else if (mappedChar === "BSPC" || mappedChar === "BACKSPACE") mappedChar = "Backspace";
      else if (mappedChar === "TAB") mappedChar = "Tab";
      else if (mappedChar.length === 1) mappedChar = isUpperCase ? mappedChar : mappedChar.toLowerCase();
    }
  }

  if (config.debug) {
    ui.debugText = `debug: OS[${e.code}] | Pos[${pos || "none"}] | Mapped[${mappedChar}]`;
  }

  // 2. SHORTCUTS (EVALUATED USING MAPPED CHARACTERS)
  if (mappedChar === "Tab") {
    e.preventDefault();
    game.tabActive = true;
    notify();
    return;
  }
  if (game.tabActive && mappedChar === "Enter") {
    e.preventDefault();
    game.tabActive = false;
    restartCurrentMode();
    return;
  }
  if (mappedChar === "Escape" && game.testStarted && !game.testCompleted) {
    e.preventDefault();
    endTest(true);
    return;
  }
  if (game.testCompleted) {
    if (mappedChar === "Enter") {
      // Enter always starts a fresh test
      e.preventDefault();
      restartCurrentMode();
    } else if (mappedChar === "Space" || mappedChar === " ") {
      // Space deliberately triggers mistake practice
      e.preventDefault();
      if (game.mistakes > 0) practiceMistakes();
    }
    notify();
    return;
  }

  if (mappedChar === "Backspace") {
    e.preventDefault();
    if (config.difficulty === "expert") {
      flashKey(pos, "active-error");
      notify();
      return;
    }
    game.typed = game.typed.slice(0, -1);
    notify();
    return;
  }

  // Catch blank keys from JSON (&none / &trans)
  if (mappedChar === "NONE" || mappedChar === "TRNS" || mappedChar === "TRANS") {
    flashKey(pos);
    notify();
    return;
  }

  // Block modifiers from scoring
  if (mappedChar.length > 1 && mappedChar !== " " && mappedChar !== "Space") {
    flashKey(pos);
    notify();
    return;
  }

  // Master difficulty / stop-on-error: refuse the press until the error is corrected
  if (
    isInputBlocked({
      typed: game.typed,
      sample: game.sample,
      mappedChar,
      difficulty: config.difficulty,
      stopOnError: config.stopOnError,
    })
  ) {
    e.preventDefault();
    notify();
    return;
  }

  // 3. START TEST & FOCUS FADE
  if (!game.testStarted && mappedChar.length === 1) {
    game.testStarted = true;
    game.startTime = Date.now();
    startSnapshots();
    if (parseInt(config.timed) > 0) startTimer();
  }

  // 4. CORE TYPING EVALUATOR
  if (mappedChar.length === 1 && game.typed.length < game.sample.length) {
    e.preventDefault();
    const targetChar = game.sample[game.typed.length];
    const isCorrect = isCharCorrect(mappedChar, targetChar);

    ui.keyFlash =
      pos && config.keypress && config.showKb ? { pos, kind: isCorrect ? "active" : "active-error" } : null;

    const expectedLabel = targetChar === " " ? "Space" : targetChar.toUpperCase();
    const workingMapForFinger = config.mirror ? getMirroredMap(game.currentMap) : game.currentMap;
    const expectedPos = Object.keys(workingMapForFinger).find(
      (p) => (workingMapForFinger[p] || "").toUpperCase() === expectedLabel
    );

    if (expectedPos) {
      if (!game.fingerHits[expectedPos]) game.fingerHits[expectedPos] = { correct: 0, total: 0 };
      game.fingerHits[expectedPos].total++;
      if (isCorrect) game.fingerHits[expectedPos].correct++;
    }

    if (isCorrect) {
      game.currentStreak++;
      if (game.currentStreak > game.bestStreak) game.bestStreak = game.currentStreak;
    } else {
      game.mistakes++;
      game.currentStreak = 0;
      if (config.sound) playErrorSound();
      const expected = targetChar?.toLowerCase();
      if (expected && expected.match(/[a-z\u05D0-\u05EA\u0621-\u064A]/)) {
        game.mistakeChars[expected] = (game.mistakeChars[expected] || 0) + 1;
      }
      const cw = getCurrentWord(game.sample, game.typed.length);
      if (cw) game.mistakeWords.add(cw);
    }

    game.totalPresses++;
    if (isCorrect) game.correctPresses++;
    game.typed += mappedChar;
    if (game.typed.length === game.sample.length && game.sample.length > 0) {
      checkTestEnd();
    }
  }

  notify();
}

export function handleKeyUp(e: KeyboardEvent): void {
  if (e.key === "Tab") {
    game.tabActive = false;
  }
  ui.keyFlash = null;
  notify();
}
