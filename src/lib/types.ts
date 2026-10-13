// Known boards, while still allowing ids registered at runtime from an imported layout file.
export type HardwareId = "ansi60" | "glove80" | "go60" | "corne" | "voyager" | (string & {});

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

// A board description imported at runtime from a layout definition file (QMK info.json /
// Keymap Editor keyboard json): visual geometry plus the binding order.
export interface BoardLayout {
  id: string;
  name: string;
  geo: KeyGeo[];
  pos: string[];
  /** Where the board came from: a loaded layout file, or the bundled keyboard library. */
  origin: "file" | "library";
}

// A keymap import that carries every layer of the file it came from: the board shows one
// layer at a time, so the labels have to be kept per layer rather than flattened.
export interface ImportedLayers {
  names: string[];
  /** One position-aligned label map per layer, in file order (index 0 = base). */
  maps: string[][];
  /** Per layer: position -> index of the layer that key switches to (layer holds, `&mo` …). */
  activators: Array<Record<string, number>>;
}

/** An imported stack whose transparency (`&trans` / `&none`) has been resolved once. */
export interface LayerStack {
  pos: string[];
  names: string[];
  raw: string[][];
  resolved: string[][];
  activators: Array<Record<string, number>>;
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
  customBoard: BoardLayout | null;
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
  // Every layer of an imported keymap, so the on-screen board can follow the layer in use.
  sourceLayers: ImportedLayers | null;
  targetLayers: ImportedLayers | null;
  layerFollow: boolean;
  // Raw imported keymap files, kept so they can be re-parsed when the board changes.
  sourceKeymapText: string | null;
  targetKeymapText: string | null;
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
  currentLayers: LayerStack | null;
  sourceStack: LayerStack | null;
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
  setupOpen: boolean;
  textModalOpen: boolean;
  themeModalOpen: boolean;
  boardModalOpen: boolean;
  toast: { msg: string; error: boolean; visible: boolean };
  newsLoading: boolean;
  debugText: string;
  keyFlash: { pos: string; kind: "active" | "active-error" } | null;
  // Layer the board is drawing (0 = base). `activeLayer` is the layer the next character needs
  // (null = nothing to go on), `pinnedLayer` the manual chip override, `typedLayer` the layer
  // the last press came from until `typedLayerUntil`.
  activeLayer: number | null;
  pinnedLayer: number | null;
  typedLayer: number | null;
  typedLayerUntil: number;
  heatmap: Record<string, number> | null;
  result: TestResult | null;
  bestScores: HistoryEntry[];
  historySummary: HistorySummary | null;
  practiceResults: PracticeResult[] | null;
}
