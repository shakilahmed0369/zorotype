import { THEME_DATA } from "./theme-data";
import type { ThemeData } from "./theme-data";

export const DEFAULT_THEME = "serika_dark";

export const THEME_CACHE_KEY = "zorotype_theme_cache";

const themeByName = new Map<string, ThemeData>(THEME_DATA.map((theme) => [theme.name, theme]));

export function listThemes(): ThemeData[] {
  return THEME_DATA;
}

export function getTheme(name: string): ThemeData {
  return themeByName.get(name) ?? themeByName.get(DEFAULT_THEME) ?? THEME_DATA[0];
}

export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(hex.trim());
  if (!match) return [0, 0, 0];
  let value = match[1];
  if (value.length === 3 || value.length === 4) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  // 8-digit colors carry an alpha channel; derived colors work on RGB only.
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${clamp255(r * (1 - amount))}, ${clamp255(g * (1 - amount))}, ${clamp255(b * (1 - amount))})`;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.5;
}

export type ThemeVars = Record<string, string>;

// Our Tailwind tokens are driven entirely by CSS variables, so applying a
// theme is just swapping these values on <html>. Monkeytype's palette maps
// onto the app like this:
//   bg -> background, main -> accent, caret -> caret, sub -> muted,
//   subAlt -> key caps, text -> typed text + key labels, error -> errors.
// The remaining tokens (key border, homerow tint, expected-key text) are
// derived so they stay readable no matter the theme.
export function themeVars(theme: ThemeData): ThemeVars {
  const dark = isDark(theme.bg);
  return {
    "--color-bg": theme.bg,
    "--color-accent": theme.main,
    "--color-caret": theme.caret,
    "--color-muted": theme.sub,
    "--color-key": theme.subAlt,
    "--color-keytext": theme.text,
    "--color-correct": theme.text,
    "--color-error": theme.error,
    "--color-edge": shade(theme.subAlt, 0.32),
    "--color-homerow": dark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)",
    "--color-expected": dark ? "#f8fafc" : "#111827",
  };
}

export interface CachedTheme {
  vars: ThemeVars;
  scheme: "dark" | "light";
}

export function applyTheme(name: string): void {
  const theme = getTheme(name);
  const scheme: "dark" | "light" = isDark(theme.bg) ? "dark" : "light";
  const vars = themeVars(theme);

  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.style.colorScheme = scheme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.bg);

  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ vars, scheme } satisfies CachedTheme));
  } catch {
    /* storage may be unavailable - theme still applies for this session */
  }
}

export const THEME_BOOTSTRAP_SCRIPT = `try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(
  THEME_CACHE_KEY
)})||"null");if(t){var r=document.documentElement;if(t.scheme)r.style.colorScheme=t.scheme;var v=t.vars||{};for(var k in v)r.style.setProperty(k,v[k]);var m=document.querySelector('meta[name="theme-color"]');if(m&&v["--color-bg"])m.setAttribute("content",v["--color-bg"]);}}catch(e){}`;
