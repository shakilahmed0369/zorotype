import { fetchNewsText, loadDictionary, loadLangDictionary, wordPool } from "./dictionary";
import { BOARD_CATALOG } from "./board-catalog";
import { defaultLayoutsFor, libraryBoardLayout } from "./board-library";
import { autoIndentAfter, codeLanguage, DEFAULT_CODE_LANGUAGE, pickSnippet } from "./code-snippets";
import { registerCustomBoard, HARDWARE } from "./hardware";
import { controlKey, deletePreviousWord, isCharCorrect, isInputBlocked, pressedChar } from "./input-rules";
import { buildScriptLayouts, currentLayoutMap, currentMatchMap, getMirroredMap, importedLayersFrom, mirrorPos, sourceLayersFor, usesScriptLayout } from "./keyboard";
import {
  LAYER_HOLD_MS,
  buildLayerStack,
  findChar,
  isBlankLabel,
  predictedLayer,
  resolvedLayerMap,
  visibleLayer,
  withLayerOverride,
} from "./layers";
import { LANGUAGES } from "./languages";
import { applyTextModifiers } from "./modifiers";
import { buildCodeMistakeDrill, buildMistakePractice, computePracticeResults, countStrictCorrectChars, evaluateTest } from "./scoring";
import { playErrorSound } from "./sound";
import {
  APP_VERSION,
  CONFIG_KEY,
  DEFAULT_CONFIG,
  GAME_MODES,
  HISTORY_KEY,
  VER_KEY,
  loadConfig as loadStoredConfig,
  loadHistory,
  saveConfig as persistConfig,
  saveResult,
} from "./storage";
import { parseKeyboardLayout, parseZmkLayout } from "./zmk";
import type { ParsedZmk } from "./zmk";
import { applyTheme, getTheme } from "./themes";
import type { BoardLayout, Config, GameState, HardwareId, HistoryEntry, LanguageCode, UiState } from "./types";

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
  currentLayers: null,
  sourceStack: null,
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
  historyOpen: false,
  textModalOpen: false,
  themeModalOpen: false,
  boardModalOpen: false,
  toast: { msg: "Notification", error: false, visible: false },
  newsLoading: false,
  debugText: "debug info: ready...",
  keyFlash: null,
  activeLayer: null,
  pinnedLayer: null,
  typedLayer: null,
  typedLayerUntil: 0,
  heatmap: null,
  result: null,
  history: [],
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
let layerTimeout: ReturnType<typeof setTimeout> | null = null;

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
    if (typeof localStorage.clear === "function") localStorage.clear();
    localStorage.setItem(VER_KEY, APP_VERSION);
  }

  Object.assign(config, loadStoredConfig());
  const restoredBoard = config.customBoard
    ? registerCustomBoard(config.customBoard, defaultLayoutsFor(config.customBoard))
    : null;
  // A default (or stored) hardware id may name a library board, whose geometry is loaded on
  // demand. Resolve it here so the board is registered before the fallback check below.
  if (!HARDWARE[config.hw]) {
    const entry = BOARD_CATALOG.find((candidate) => candidate.id === config.hw);
    if (entry) {
      const board = await libraryBoardLayout(entry.id, entry.name);
      if (board) {
        const registeredId = registerCustomBoard(board, defaultLayoutsFor(board));
        config.customBoard = { ...board, id: registeredId };
        config.hw = registeredId;
        persistConfig(config);
      }
    }
  }
  if (!LANGUAGES[config.lang]) config.lang = "en";
  if (!GAME_MODES.includes(config.mode)) config.mode = "words";
  if (!codeLanguage(config.codeLang)) config.codeLang = DEFAULT_CODE_LANGUAGE;
  // A saved hardware id can outlive the board it named — a library board whose data is gone, or a
  // layout file imported by an older build — and nothing can draw a board that is not registered.
  if (!HARDWARE[config.hw]) config.hw = restoredBoard ?? "go60";

  // Derive script layouts (e.g. arabic) for every registered board, including any just restored
  // or resolved above.
  buildScriptLayouts();
  // The stored labels are a cache of the parser, so re-read the keymap text that produced them:
  // a change to how bindings are read reaches a keymap imported before it.
  reapplyStoredKeymaps();
  config.theme = getTheme(config.theme).name;
  applyTheme(config.theme);
  ui.history = loadHistory();
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
  game.currentMap = currentLayoutMap(config);
  game.sourceMap = currentMatchMap(config);
  refreshLayerStacks();
}

/* ==========================================================================
   LAYERS
   The firmware layer key never reaches the browser, so the board is driven by inference:
   the layer the next character needs, plus a short window after a press that shows the
   layer the character came from. Everything below is inert for single-layer layouts.
   ========================================================================== */

function refreshLayerStacks(): void {
  if (!config.layerFollow) {
    game.currentLayers = null;
    game.sourceStack = null;
    ui.activeLayer = 0;
    ui.pinnedLayer = null;
    ui.typedLayer = null;
    return;
  }

  // Presses are traced against what the computer outputs, and the board draws those same layers —
  // with any dragged keys overriding the base one.
  const matchStack = buildLayerStack(config.hw, sourceLayersFor(config));
  game.sourceStack = matchStack;
  game.currentLayers = matchStack && config.draggedMap ? withLayerOverride(matchStack, 0, config.draggedMap) : matchStack;

  const available = game.currentLayers?.resolved.length ?? 1;
  if (ui.activeLayer !== null && ui.activeLayer >= available) ui.activeLayer = 0;
  if (ui.pinnedLayer !== null && ui.pinnedLayer >= available) ui.pinnedLayer = null;
}

/** Layer index the board is drawing right now. */
function shownLayer(): number {
  return visibleLayer(game.currentLayers, ui);
}

/** Layer the next sample character needs, so the board can show it before the press. */
function updatePredictedLayer(): void {
  if (!config.layerFollow) return;
  const stack = game.currentLayers;
  if (!stack) {
    ui.activeLayer = 0;
    return;
  }
  ui.activeLayer = predictedLayer(stack, game.sample[game.typed.length] ?? null, ui.activeLayer ?? 0);
}

// Drops the press layer and re-reads what the next character needs. The board is back on the
// predicted layer immediately; this only clears the fallback.
function scheduleLayerRevert(): void {
  if (layerTimeout) clearTimeout(layerTimeout);
  layerTimeout = setTimeout(() => {
    layerTimeout = null;
    ui.typedLayer = null;
    updatePredictedLayer();
    notify();
  }, LAYER_HOLD_MS + 80);
}

/** Manual layer peek from the chips under the board. `null` hands control back to inference. */
export function setPinnedLayer(layer: number | null): void {
  const available = game.currentLayers?.resolved.length ?? 1;
  ui.pinnedLayer = layer !== null && layer >= 0 && layer < available ? layer : null;
  notify();
}

/** Position of a label: the drawn layer first, then the layers underneath it. */
function posForLabel(layer: number, label: string): string | undefined {
  const stack = game.currentLayers;
  if (!stack) {
    const map = config.mirror ? getMirroredMap(game.currentMap) : game.currentMap;
    return Object.keys(map).find((p) => (map[p] || "").toUpperCase() === label);
  }

  const order = [layer, ...stack.resolved.map((_, index) => index).filter((index) => index !== layer)];
  for (const target of order) {
    const index = stack.resolved[target].findIndex((value) => (value || "").toUpperCase() === label);
    if (index >= 0) {
      const found = stack.pos[index];
      return config.mirror ? mirrorPos(found) : found;
    }
  }
  return undefined;
}

// The map for the layer a press came from: a layered keymap is read on that layer, a flat layout
// keeps its base map, and a label that types nothing stays the character the computer delivered.
// The board draws a layer literally, but a press has to be read through `&trans`: the key really
// does type whatever the layer below has, so the character arrives and has to be scored.
function layoutMapFor(srcLayer: number): Record<string, string> | null {
  const stack = game.currentLayers;
  if (stack) {
    if (!stack.resolved[srcLayer]) return null;
    const map = resolvedLayerMap(stack, srcLayer);
    return config.mirror ? getMirroredMap(map) : map;
  }
  if (srcLayer !== 0) return null;
  return config.mirror ? getMirroredMap(game.currentMap) : game.currentMap;
}

/* ==========================================================================
   STORAGE & CONFIGURATION
   ========================================================================== */

export function setPref<K extends keyof Config>(key: K, val: Config[K]): void {
  config[key] = val;
  persistConfig(config);
  if (key === "hw" || key === "sourceKey" || key === "mirror" || key === "homerow" || key === "layerFollow") {
    if (key === "hw") reapplyStoredKeymaps();
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
  else if (ui.historyOpen) toggleHistory();
  else restartCurrentMode();
}

export function toggleSettings(): void {
  ui.historyOpen = false;
  ui.setupOpen = !ui.setupOpen;
  ui.keyFlash = null;
  if (!ui.setupOpen) {
    window.focus();
    if (config.showKb) refreshMaps();
  }
  notify();
}

/** Personal bests and every saved test — a page of its own, the way Settings is. */
export function toggleHistory(): void {
  ui.setupOpen = false;
  ui.historyOpen = !ui.historyOpen;
  ui.keyFlash = null;
  if (!ui.historyOpen) window.focus();
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

export function openBoardModal(): void {
  ui.boardModalOpen = true;
  notify();
}

export function closeBoardModal(): void {
  ui.boardModalOpen = false;
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
   KEYBOARD LAYOUT IMPORT (QMK info.json / Keymap Editor keyboard json)
   ========================================================================== */

export function applyKeyboardLayout(fileText: string): void {
  let parsed: BoardLayout;
  try {
    parsed = parseKeyboardLayout(fileText);
  } catch (err) {
    console.error("Keyboard layout parse error:", err);
    showToast(err instanceof Error && err.message ? err.message : "Could not read that layout file.", true);
    return;
  }

  const registeredId = registerCustomBoard(parsed, defaultLayoutsFor(parsed));
  config.customBoard = { ...parsed, id: registeredId };
  config.hw = registeredId;
  config.draggedMap = null; // a new board means new positions, so the old arrangement is void
  reapplyStoredKeymaps();
  persistConfig(config);
  refreshMaps();
  notify();
  showToast(`${parsed.name} loaded — ${parsed.pos.length} keys`);
}

// Board selection from the Hardware row: built-ins switch directly, library entries resolve
// their geometry on demand (and persist, so later visits don't need the library chunk).
export async function setHardware(id: string): Promise<void> {
  if (config.customBoard && config.customBoard.id === id) {
    setPref("hw", id as HardwareId);
    return;
  }

  if (HARDWARE[id]) {
    setPref("hw", id as HardwareId);
    return;
  }

  const entry = BOARD_CATALOG.find((candidate) => candidate.id === id);
  if (!entry) {
    // Neither registered nor in the library: nothing could draw it.
    showToast(`Keyboard "${id}" is not available.`, true);
    return;
  }

  const board = await libraryBoardLayout(entry.id, entry.name);
  if (!board) {
    showToast(`Could not load ${entry.name}.`, true);
    return;
  }

  const registeredId = registerCustomBoard(board, defaultLayoutsFor(board));
  config.customBoard = { ...board, id: registeredId };
  config.hw = registeredId;
  config.draggedMap = null; // a new board means new positions, so the old arrangement is void
  reapplyStoredKeymaps();
  persistConfig(config);
  refreshMaps();
  notify();
}

// Imported keymaps are stored as text and re-parsed for whatever board is active, so the
// position ids always line up (a map built for one board means nothing to another).
function reapplyStoredKeymaps(): boolean {
  const text = config.sourceKeymapText;
  if (!text) return false;
  try {
    const parsed = parseZmkLayout(text, config.hw);
    config.sourceJsonMap = parsed.map;
    config.sourceLayers = importedLayersFrom(parsed);
    return true;
  } catch {
    return false; // keep the previous map if the stored text no longer parses
  }
}

/* ==========================================================================
   ZMK LAYOUT IMPORT (JSON export or raw .keymap / .dtsi source)
   ========================================================================== */

export function applyLayoutFile(fileText: string): void {
  let parsed: ParsedZmk;
  try {
    parsed = parseZmkLayout(fileText, config.hw);
  } catch (err) {
    console.error("Layout parse error:", err);
    showToast(err instanceof Error && err.message ? err.message : "Could not read that layout file.", true);
    return;
  }

  config.hw = parsed.hw;
  config.sourceJsonMap = parsed.map;
  config.sourceLayers = importedLayersFrom(parsed);
  config.sourceKey = "custom_json";
  config.sourceKeymapText = fileText;
  config.draggedMap = null; // the old arrangement belongs to the keymap it was made on

  persistConfig(config);
  refreshMaps();
  notify();
  showToast(`Layout loaded — ${parsed.layers.length} layer${parsed.layers.length === 1 ? "" : "s"}!`);
}

/* ==========================================================================
   LANGUAGE
   ========================================================================== */

export async function setLang(lang: LanguageCode): Promise<void> {
  if (!LANGUAGES[lang]) return;
  // A blind-typed script replaces the layout's letters, so an arrangement dragged on the old
  // layout no longer applies.
  const scriptBefore = usesScriptLayout(config);
  config.lang = lang;
  if (usesScriptLayout(config) !== scriptBefore) config.draggedMap = null;
  persistConfig(config);

  // Reconcile the current mode with the sources available in the new language.
  if (config.mode === "news" && lang !== "en") config.mode = "words";

  await loadLangDictionary(lang);

  refreshMaps(); // rebuilds the layout and its layers (a script language forces its letters)
  restartCurrentMode();
}

/* ==========================================================================
   TEST GENERATION
   ========================================================================== */

// Nav test-config bar actions.
export function setMode(mode: "time" | "words" | "news" | "custom" | "code"): void {
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
    void fetchNews();
    return;
  }
  if (mode === "code") {
    // A code test is never timed: the timer's continuation appends word-pool prose to the sample.
    config.timed = "0";
    generateCode();
    return;
  }
  openTextModal();
}

export function setTimed(seconds: string): void {
  if (config.mode === "code") return;
  config.timed = seconds;
  persistConfig(config);
  generateWords();
}

export function setWordCount(count: string): void {
  config.wordCount = count;
  persistConfig(config);
  if (config.mode === "custom" || config.mode === "code") notify();
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

/** Code mode: one snippet from the selected language, kept verbatim so its layout survives. */
export function generateCode(): void {
  config.mode = "code";
  const snippet = pickSnippet(config.codeLang, config.codeLastSnippet);
  config.codeLastSnippet = snippet;
  persistConfig(config);
  setupNewTest(snippet, { raw: true });
}

/** Choosing a language starts code practice straight away, the way applying custom text does. */
export function setCodeLanguage(id: string): void {
  if (!codeLanguage(id)) return;
  config.codeLang = id;
  generateCode();
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
    practiceMistakes(); // rebuild the drill from the mistakes just made, still as code when it was code
    return;
  }
  if (config.mode === "words") generateWords();
  else if (config.mode === "news") void fetchNews();
  else if (config.mode === "code") {
    // Every snippet has line breaks, so a one-line sample means there is nothing to replay yet —
    // the boot path arrives here with whatever the word pool left behind. Custom text is replayed.
    if (game.sample.includes("\n")) setupNewTest(game.sample, { raw: true });
    else generateCode();
  } else setupNewTest(game.sample, { raw: config.mode === "custom" });
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
  // A new test starts from the layer its first character needs.
  ui.pinnedLayer = null;
  ui.typedLayer = null;
  ui.typedLayerUntil = 0;

  refreshMaps();
  updatePredictedLayer();
  // A timed run is meant to have its next lines on screen from the first keystroke, rather than
  // only once the opening text has been typed out.
  stockTimedSample();

  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  notify();
}

/* ==========================================================================
   TIMED RUNS
   A timed run has no last word — the clock ends it — so the text is never left to run out. It is
   kept stocked ahead of the caret instead: the typing window holds three lines, and the two under
   the one being typed stay filled while the clock is going.
   ========================================================================== */

/** How much untyped prose to keep ahead of the caret: a little over two lines of the window. */
const TIMED_AHEAD_CHARS = 150;

/** Words drawn per top-up, the same size the word pool uses for an opening sample. */
const TIMED_STOCK_WORDS = 15;

function isTimedRun(): boolean {
  return config.mode === "words" && parseInt(config.timed) > 0;
}

// A chunk of prose for a run that is still going: drawn from the pool, modified the way the
// opening text was, and capitalised to follow whatever the sample currently ends with.
function continueText(count: number): string {
  const shuffled = [...wordPool(config.lang)].sort(() => Math.random() - 0.5);
  const extra: string[] = [];
  for (let i = 0; i < count; i++) extra.push(shuffled[i % shuffled.length]);
  return applyTextModifiers(extra.join(" "), {
    punctuation: config.punctuation,
    numbers: config.numbers,
    capitalizeFirst: !/[.?!]$/.test(game.sample),
  });
}

/** Tops a timed sample back up so there is always prose ahead of the caret. */
function stockTimedSample(): void {
  if (!isTimedRun()) return;
  while (game.sample.length - game.typed.length < TIMED_AHEAD_CHARS) {
    const chunk = continueText(TIMED_STOCK_WORDS);
    if (!chunk) break; // an empty word pool: there is nothing to add, and another round is the same
    game.sample += (game.sample ? " " : "") + chunk;
  }
}

/* ==========================================================================
   TEST END & SCORING
   ========================================================================== */

export function checkTestEnd(): void {
  // A timed run is ended by the clock, never by the text: top it up and keep typing.
  if (isTimedRun() && game.timerRemaining > 0) {
    game.sample += " " + continueText(TIMED_STOCK_WORDS);
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
  // Nothing is being typed any more, so the results come back on the base layer.
  ui.activeLayer = 0;
  ui.pinnedLayer = null;
  ui.typedLayer = null;

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
  else if (config.mode === "code") testTypeStr = "code · " + (codeLanguage(config.codeLang)?.name ?? config.codeLang);
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
    ui.history = loadHistory();
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

/** True while the test on screen is typed as code: the code mode itself, and the drill made from it. */
function isCodeTyping(): boolean {
  return config.mode === "code" || (config.mode === "mistakes" && config.mistakesCode);
}

export function practiceMistakes(): void {
  const wordsMissed = game.mistakeWords.size > 0;
  const charsMissed = Object.keys(game.mistakeChars).length > 0;

  if (isCodeTyping()) {
    // A code drill replays the snippet's own lines — the ones the mistakes landed on — so it
    // stays code, indentation and all, instead of turning into a paragraph of prose words.
    if (!wordsMissed && !charsMissed) {
      generateCode(); // a clean drill has nothing left to replay: move on to a new snippet
      return;
    }
    const drill = buildCodeMistakeDrill({
      snippet: config.codeLastSnippet ?? "",
      mistakeWords: game.mistakeWords,
      mistakeChars: game.mistakeChars,
    });
    if (drill.length === 0) {
      generateCode(); // no snippet to replay (the drill predates one): start a fresh snippet
      return;
    }
    game.practiceTargetChars = { ...game.mistakeChars };
    config.mode = "mistakes";
    config.mistakesCode = true;
    persistConfig(config);
    setupNewTest(drill.join("\n"), { raw: true });
    return;
  }

  config.mistakesCode = false;
  if (!charsMissed) {
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
  const layout = currentLayoutMap(config);
  if (src === trg || !layout[src] || !layout[trg]) return;

  const dragged = { ...layout }; // seed from the layout on screen, then swap the two labels
  dragged[src] = layout[trg];
  dragged[trg] = layout[src];

  config.draggedMap = dragged;
  persistConfig(config);
  refreshMaps();
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

// The run a press landed in, for the mistake drill: it stops at any whitespace, so a token at the
// start of a code line is remembered on its own instead of dragging the line break in with it.
function getCurrentWord(text: string, pos: number): string | null {
  let start = pos;
  let end = pos;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  while (end < text.length && !/\s/.test(text[end])) end++;
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
  if (ui.textModalOpen || ui.themeModalOpen || ui.boardModalOpen) return;

  // 1. Panel Exit Interception — the trainer is behind a full-page panel.
  if (ui.setupOpen || ui.historyOpen) {
    e.preventDefault();
    if (e.key === "Escape" || e.key === "Enter") {
      if (ui.historyOpen) toggleHistory();
      else toggleSettings();
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
  const now = Date.now();

  let pos = Object.keys(sourceMap).find((p) => {
    const s = (sourceMap[p] || "").toUpperCase();
    return s === osKey || s === e.key.toUpperCase() || s === OS_TO_ZMK[e.code];
  });

  // A character only an upper layer can produce (a digit or symbol behind a thumb key) has no
  // key in the base map, so it is traced through the imported stack. The layer it comes from
  // is the only evidence of a held thumb the browser ever gets.
  let srcLayer = 0;
  if (!pos && game.sourceStack && e.key.length === 1) {
    const traced = findChar(game.sourceStack, e.key, shownLayer());
    if (traced) {
      pos = traced.pos;
      srcLayer = traced.layer;
    }
  }

  const isUpperCase = e.key === e.key.toUpperCase() && e.key !== e.key.toLowerCase();

  // Control keys are read from the key that was pressed (and from the event itself as a fallback),
  // so dragging a keycap never turns Backspace or the space bar into whatever sits at that position.
  const control = controlKey(pos ? sourceMap[pos] : null) ?? controlKey(e.key);
  if (control !== null) {
    mappedChar = control;
  } else if (pos) {
    const workingMap = layoutMapFor(srcLayer);
    if (workingMap && workingMap[pos] !== undefined) {
      mappedChar = pressedChar(workingMap[pos], e.key, e.shiftKey, isUpperCase);
    }
  }

  // The browser repeats a held key. That is what Backspace is for — you hold it to clear a word —
  // but a repeated letter would only spam mistakes, so everything else ignores the repeats.
  if (e.repeat && mappedChar !== "Backspace") return;

  if (config.layerFollow && game.sourceStack && srcLayer > 0) {
    // Remember where the press came from: the board only needs it while the next character
    // cannot be placed on any layer.
    ui.typedLayer = srcLayer;
    ui.typedLayerUntil = now + LAYER_HOLD_MS;
    scheduleLayerRevert();
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
  // The result screen's other action is a Tab combination too: Enter and Space on their own stay
  // inert there, so a keystroke that lands just as the clock runs out cannot wipe the result.
  if (game.tabActive && game.testCompleted && (mappedChar === "Space" || mappedChar === " ")) {
    e.preventDefault();
    game.tabActive = false;
    if (game.mistakes > 0) practiceMistakes();
    else notify();
    return;
  }
  if (mappedChar === "Escape" && game.testStarted && !game.testCompleted) {
    e.preventDefault();
    endTest(true);
    return;
  }
  // Everything is ignored on the result screen: typing must not grow a finished test, and a press
  // that lands after the last word must not throw the result away either.
  if (game.testCompleted) {
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
    // Ctrl/Alt/Cmd + Backspace cuts the whole word, the way the OS does.
    game.typed =
      e.ctrlKey || e.altKey || e.metaKey ? deletePreviousWord(game.typed) : game.typed.slice(0, -1);
    updatePredictedLayer();
    notify();
    return;
  }

  // A key with nothing on it (&none, a bare &trans, an unbound key) flashes like any other key
  // but types nothing, so it never scores.
  if (isBlankLabel(mappedChar)) {
    flashKey(pos);
    notify();
    return;
  }

  // Code (and a drill made from it) treats Enter as the newline key, and the indentation of the
  // line you land on is filled in for you. Only a running code test reaches this — Tab+Enter still
  // restarts and Enter on the result screen still starts the next test, both handled above.
  if (isCodeTyping() && mappedChar === "Enter" && game.testStarted && !game.testCompleted) {
    e.preventDefault();
    const atNewline = game.sample[game.typed.length] === "\n";
    game.totalPresses++;
    if (atNewline) game.correctPresses++;
    game.typed += autoIndentAfter(game.sample, game.typed.length);
    flashKey(pos, atNewline ? "active" : "active-error");
    if (game.typed.length >= game.sample.length) {
      checkTestEnd();
    } else {
      updatePredictedLayer();
      notify();
    }
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
      code: isCodeTyping(),
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
    const expectedPos = posForLabel(shownLayer(), expectedLabel);

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
      if (expected && expected.match(/[a-z\u0621-\u064A]/)) {
        game.mistakeChars[expected] = (game.mistakeChars[expected] || 0) + 1;
      }
      // The run the mistake landed in, kept for the drill. Runs stop at any whitespace, so a token
      // at the start of a code line is remembered on its own rather than with the line before it.
      const cw = getCurrentWord(game.sample, game.typed.length);
      if (cw) game.mistakeWords.add(cw);
    }

    game.totalPresses++;
    if (isCorrect) game.correctPresses++;
    game.typed += mappedChar;
    // Feed a timed run as it goes: the lines under the caret are stocked before the caret arrives
    // there, instead of the text appearing only once the current words have all been typed.
    stockTimedSample();
    if (game.typed.length === game.sample.length && game.sample.length > 0) {
      checkTestEnd();
    }
    updatePredictedLayer();
  }

  notify();
}

export function handleKeyUp(e: KeyboardEvent): void {
  let changed = false;
  if (e.key === "Tab" && game.tabActive) {
    game.tabActive = false;
    changed = true;
  }
  if (ui.keyFlash) {
    ui.keyFlash = null;
    changed = true;
  }
  // Only redraw when something actually ended: this used to re-render the whole board on every
  // key release, which doubled the work of fast typing for no visible change.
  if (changed) notify();
}
