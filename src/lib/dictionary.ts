import { LANGUAGES, MT_LANG_BASE } from "./languages";
import type { LanguageCode } from "./types";

const MT_ENGLISH_URL = `${MT_LANG_BASE}english.json`;

let commonWords: string[] = ["the","be","to","of","and","a","in","that","have","I","it","for","not","on","with","he","as","you","do","at","this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take","people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us"];

const wordCache: Partial<Record<LanguageCode, string[]>> = {};

// Fetch exact Monkeytype dictionary
export async function loadDictionary(): Promise<void> {
  try {
    const res = await fetch(MT_ENGLISH_URL);
    if (res.ok) {
      const data = await res.json();
      // Monkeytype defaults to the first 200 words for normal English mode
      if (data.words && data.words.length >= 200) {
        commonWords = data.words.slice(0, 200);
      }
    }
  } catch {
    console.warn("Using offline fallback dictionary.");
  }
}

export async function loadLangDictionary(lang: LanguageCode): Promise<void> {
  const spec = LANGUAGES[lang];
  if (lang === "en" || !spec || !spec.files || wordCache[lang]) return;
  for (const file of spec.files) {
    try {
      const res = await fetch(MT_LANG_BASE + file);
      const data = await res.json();
      if (data && Array.isArray(data.words) && data.words.length) {
        let words: string[] = data.words.slice(0, 600);
        if (spec.normalize) words = words.map(spec.normalize).filter((w) => w.length > 0);
        wordCache[lang] = words;
        return;
      }
    } catch {
      /* try next source */
    }
  }
  console.warn(`Using offline fallback word list for '${lang}'.`);
}

// Pool of practice words for the active language.
export function wordPool(lang: LanguageCode): string[] {
  if (lang === "en") return commonWords;
  return wordCache[lang] || LANGUAGES[lang].fallback || commonWords;
}

const NEWS_FEEDS = [
  "https://feeds.npr.org/1001/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
];

export async function fetchNewsText(): Promise<string> {
  const cacheBuster = new Date().getTime();
  const feed = NEWS_FEEDS[Math.floor(Math.random() * NEWS_FEEDS.length)];
  const response = await fetch(
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}&t=${cacheBuster}`
  );
  const data = await response.json();
  if (data.status === "ok" && data.items && data.items.length > 0) {
    return data.items
      .sort(() => Math.random() - 0.5)
      .map((item: { title: string; description: string }) =>
        (item.title + " " + item.description)
          .toLowerCase()
          .replace(/<[^>]*>/g, "")
          .replace(/[^a-z\s]/g, "")
          .replace(/\s+/g, " ")
      )
      .join(" ")
      .trim()
      .slice(0, 2000);
  }
  throw new Error("newsfeed unavailable");
}
