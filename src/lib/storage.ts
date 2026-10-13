import { DEFAULT_THEME } from "./themes";
import type { Config, GameMode, HistoryEntry } from "./types";

export const APP_VERSION = "1.3.0";
export const CONFIG_KEY = "zorotype_cfg";
export const HISTORY_KEY = "zorotype_history";
export const VER_KEY = "zorotype_ver";

/** Modes a stored config may carry; anything else (a retired mode) falls back to words. */
export const GAME_MODES: readonly GameMode[] = ["words", "news", "custom", "mistakes"];

export const DEFAULT_CONFIG: Config = {
  lang: "en",
  theme: DEFAULT_THEME,
  hw: "go60",
  customBoard: null,
  sourceKey: "qwerty",
  wordCount: "25",
  timed: "0",
  mode: "words",
  difficulty: "normal",
  stopOnError: "off",
  blindMode: false,
  punctuation: false,
  numbers: false,
  showKb: true,
  homerow: false,
  keypress: true,
  hints: true,
  mirror: false,
  sound: true,
  debug: false,
  sourceJsonMap: null,
  draggedMap: null,
  sourceLayers: null,
  layerFollow: true,
  sourceKeymapText: null,
};

export function loadConfig(): Config {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (!saved) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Config): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveResult(entry: HistoryEntry): void {
  const history = loadHistory();
  history.push(entry);
  if (history.length > 200) history.splice(0, history.length - 200);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
