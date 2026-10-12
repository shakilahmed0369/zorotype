export type HardwareId = "ansi60" | "glove80" | "go60" | "corne" | "voyager";

export type LanguageCode = "en" | "es" | "fr" | "it" | "pt" | "he" | "ar";

export type GameMode = "words" | "news" | "phrases" | "custom" | "mistakes";

export type Difficulty = "normal" | "expert" | "master";

export type StopOnError = "off" | "letter" | "word";

export type ScriptKind = "latin" | "hebrew" | "arabic";

export interface KeyGeo {
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  rx?: number;
  ry?: number;
}

export interface HardwareDef {
  name: string;
  geo: KeyGeo[];
  pos: string[];
  layouts: Record<string, string[]>;
}

export interface LanguageDef {
  name: string;
  dir: "ltr" | "rtl";
  script: ScriptKind;
  files?: string[];
  fallback?: string[];
  normalize?: (word: string) => string;
  phrases?: string[];
}

export interface Config {
  lang: LanguageCode;
  theme: string;
  hw: HardwareId;
  sourceKey: string;
  tgt: string;
  wordCount: string;
  timed: string;
  mode: GameMode;
  difficulty: Difficulty;
  stopOnError: StopOnError;
  blindMode: boolean;
  punctuation: boolean;
  numbers: boolean;
  showKb: boolean;
  homerow: boolean;
  keypress: boolean;
  hints: boolean;
  mirror: boolean;
  sound: boolean;
  debug: boolean;
  sourceJsonMap: Record<string, string> | null;
  targetJsonMap: Record<string, string> | null;
  draggedMap: Record<string, string> | null;
}

export interface FingerHit {
  correct: number;
  total: number;
}

export interface WpmSnapshot {
  time: number;
  wpm: number;
  raw: number;
  errors: number;
}

export interface GameState {
  typed: string;
  sample: string;
  currentMap: Record<string, string>;
  sourceMap: Record<string, string>;
  testStarted: boolean;
  testCompleted: boolean;
  startTime: number | null;
  mistakes: number;
  correctPresses: number;
  totalPresses: number;
  mistakeChars: Record<string, number>;
  mistakeWords: Set<string>;
  practiceTargetChars: Record<string, number>;
  wpmSnapshots: WpmSnapshot[];
  currentStreak: number;
  bestStreak: number;
  fingerHits: Record<string, FingerHit>;
  timerSeconds: number;
  timerRemaining: number;
  tabActive: boolean;
}

export interface HistoryEntry {
  wpm: number;
  acc: number;
  time: number;
  mode: string;
  date: number;
  chars: Record<string, number>;
}

export interface TestResult {
  wpm: number;
  raw: number;
  acc: number;
  time: number;
  words: number;
  streak: number;
  testType: string;
  historyMode: "history" | "improvement";
}

export interface PracticeResult {
  ch: string;
  misses: number;
  occurrences: number;
  hitRate: number;
}

export interface HistorySummary {
  avgWpm: number;
  avgAcc: number;
  count: number;
}

export interface UiState {
  ready: boolean;
  overlay: "visible" | "fading" | "hidden";
  setupOpen: boolean;
  textModalOpen: boolean;
  themeModalOpen: boolean;
  toast: { msg: string; error: boolean; visible: boolean };
  newsLoading: boolean;
  debugText: string;
  keyFlash: { pos: string; kind: "active" | "active-error" } | null;
  heatmap: Record<string, number> | null;
  result: TestResult | null;
  bestScores: HistoryEntry[];
  historySummary: HistorySummary | null;
  practiceResults: PracticeResult[] | null;
}
