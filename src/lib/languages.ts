import {
  AR_FALLBACK,
  ES_FALLBACK,
  FR_FALLBACK,
  HE_PHRASES,
  HE_WORDS_FALLBACK,
  IT_FALLBACK,
  PT_FALLBACK,
  QWERTY_TO_ARABIC,
  QWERTY_TO_HEBREW,
} from "./language-data";
import type { LanguageCode, LanguageDef } from "./types";

export const SCRIPT_MAPS: Record<string, Record<string, string>> = {
  hebrew: QWERTY_TO_HEBREW,
  arabic: QWERTY_TO_ARABIC,
};

// Latin: decompose and drop combining diacritics (é→e, ñ→n, ç→c, à→a ...). Matches Monkeytype lazy mode.
export function stripLatinAccents(w: string): string {
  return w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2019\u2018]/g, "'");
}

// Arabic: drop tashkeel/tatweel/superscript-alef and fold hamzated-alef forms to plain alef.
export function normalizeArabic(w: string): string {
  return w.replace(/[\u064B-\u0652\u0640\u0670]/g, "").replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627");
}

// `script:'latin'` keeps the user's target layout; hebrew/arabic force theirs.
export const LANGUAGES: Record<LanguageCode, LanguageDef> = {
  en: { name: "English", dir: "ltr", script: "latin" },
  es: {
    name: "Español (Spanish)",
    dir: "ltr",
    script: "latin",
    files: ["spanish_1k.json"],
    fallback: ES_FALLBACK,
    normalize: stripLatinAccents,
  },
  fr: {
    name: "Français (French)",
    dir: "ltr",
    script: "latin",
    files: ["french_1k.json"],
    fallback: FR_FALLBACK,
    normalize: stripLatinAccents,
  },
  it: {
    name: "Italiano (Italian)",
    dir: "ltr",
    script: "latin",
    files: ["italian_1k.json"],
    fallback: IT_FALLBACK,
    normalize: stripLatinAccents,
  },
  pt: {
    name: "Português (Portuguese)",
    dir: "ltr",
    script: "latin",
    files: ["portuguese_1k.json"],
    fallback: PT_FALLBACK,
    normalize: stripLatinAccents,
  },
  he: {
    name: "עברית (Hebrew)",
    dir: "rtl",
    script: "hebrew",
    files: ["hebrew_1k.json", "hebrew.json"],
    fallback: HE_WORDS_FALLBACK,
    phrases: HE_PHRASES,
  },
  ar: {
    name: "العربية (Arabic)",
    dir: "rtl",
    script: "arabic",
    files: ["arabic.json", "arabic_10k.json"],
    fallback: AR_FALLBACK,
    normalize: normalizeArabic,
  },
};

export const MT_LANG_BASE =
  "https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/static/languages/";

export function isRTL(lang: LanguageCode): boolean {
  return LANGUAGES[lang]?.dir === "rtl";
}

export function langHasPhrases(lang: LanguageCode): boolean {
  return !!LANGUAGES[lang]?.phrases;
}
