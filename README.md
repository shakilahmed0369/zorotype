<div align="center">

# zorotype
**ZMK Matrix Training with a familiar, buttery-smooth feel**

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](#)
[![Monkeytype Math](https://img.shields.io/badge/Monkeytype_WPM-Strict-e2b714?style=for-the-badge)](#)
[![Zoro Research](https://img.shields.io/badge/Zoro_Research-2026-00E5FF?style=for-the-badge)](#)

*To love is to recognize. Master your split ergonomic keyboard with interactive visual aids.*

<br>

<a href="https://shakilahmed0369.github.io/zorotype/" target="_blank">
  <img 
    src="https://img.shields.io/badge/🚀%20LAUNCH%20ZOROTYPE-CLICK%20TO%20START-e2b714?style=for-the-badge"
    alt="Launch Zorotype"
  />
</a>

<br><br>

</div>

---

## 🌐 Overview

Zorotype is a simple typing trainer built specifically for split, ergonomic, and columnar keyboards. 

Instead of making you guess where your keys are, it shows a live, interactive map of your exact keyboard on the screen. As you type, it highlights the keys you need to hit next. It also lets you test-drive new layouts like Colemak-DH or Dvorak to build up your muscle memory *before* you actually flash them to your hardware.

---

## ✨ Key Highlights

* **Visualize Your Split Keyboard:** Map your Glove80, Go60, Corne, or Voyager in QWERTY, Colemak-DH, Dvorak, or any custom layout.
* **Layer-Aware Keycaps:** The firmware layer key never reaches the browser, so Zorotype infers the layer instead — it redraws the keycaps for the layer your next character needs, marks the thumb to hold, and follows the layer a press came from for a moment after you type it. **Settings → Layout** draws the board you picked, exactly like the typing page, so a new keyboard or keymap can be checked without leaving the panel.
* **Test Drive Before Flashing:** Practice any QWERTY alternative safely in your browser *before* flashing it to your keyboard's firmware.
* **Monkeytype-Inspired Experience:** Train inside a clean, beautiful, and instantly familiar fluid interface.
* **Training Discipline:** Monkeytype-style input rules — *normal*, *expert* (backspace locked) and *master* (frozen until the error is fixed) difficulties, stop-on-error for letters or words, and a blind mode that hides the on-screen keyboard once you want to prove the muscle memory unprompted. Difficulty is recorded on each result.
* **Symbol & Number Drill:** the punctuation and numbers modifiers weave capitals, `, . ; : ? !`, decimals and percentages into the word pool — the real-world test for layered keyboards. Capitals are enforced, so Shift comes from the correct hand.
* **Algorithmic Mistake Tracking:** Automatically generate targeted practice sessions to isolate and fix your weakest keys.
* **Open Source & Local:** Free, transparent, and private. Everything runs in your browser with zero backend — settings and history stay in `localStorage`.
* **Multi-Language:** An input-language selector (English, Spanish, French, Italian, Portuguese, Hebrew, Arabic) teaches blind typing in each language, with words sourced from Monkeytype. Hebrew and Arabic switch the on-screen keyboard to their standard script layout (SI-1452 / Arabic 101) and render right-to-left; the Latin languages keep your chosen layout so you can drill it with foreign-language text.
* **Every Monkeytype Theme:** All 187 Monkeytype color palettes are bundled and selectable from a searchable picker in the settings — applied instantly, remembered between sessions. The default is Monkeytype's `github` palette (green on slate).

---

## 🧱 Tech & Project Structure

Next.js 16 (App Router) + React 19, TypeScript, Tailwind CSS v4. Built as a fully static export (`output: 'export'`) and deployed to GitHub Pages.

```
src/
  app/            # layout (fonts + metadata + theme bootstrap), page, Tailwind theme (globals.css)
  components/     # Header, SettingsMenu, TypingArea, Keyboard, StatsPanel, ThemeModal, overlays, modal, toast
  hooks/          # useEngine — subscribes React to the game store
  lib/            # engine.ts (game state store), keyboard.ts, zmk.ts, scoring.ts,
                  # dictionary.ts, languages.ts, hardware.ts, storage.ts, sound.ts,
                  # themes.ts + theme-data.ts (Monkeytype palettes)
public/           # manifest.json, sw.js, icons (PWA shell)
scripts/          # update-themes.mjs — regenerates the bundled Monkeytype palettes
```

The game state lives outside React in `src/lib/engine.ts` (an external store with all the original
typing logic), and components subscribe via `useSyncExternalStore`. Keyboard geometry, ZMK parsing,
dictionary loading, and Monkeytype scoring are pure modules covered by Vitest unit tests.

Themes are applied by swapping the CSS variables behind every Tailwind token (background, main,
caret, sub, sub-alt, text, error), with a few derived values (key border, homerow tint,
expected-key text) computed per palette so light and dark themes both stay readable. The chosen
theme is cached in `localStorage` and re-applied by a tiny inline script before first paint.

---

## 🛠️ Development

```bash
npm install
npm run dev          # local dev server at http://localhost:3000
npm test             # unit tests (Vitest)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # static export into out/
npm run build:pages  # export with the /zorotype basePath used on GitHub Pages
npm run preview      # serve the exported out/ locally
npm run themes:update # refresh the bundled Monkeytype theme palettes
```

Deployment: pushing to `main` runs `.github/workflows/deploy.yml` (test → build → deploy to Pages).
One-time repo setting: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Canonical URLs, Open Graph tags, the social card and the sitemap all name
`https://zorotype.vercel.app/` — one place to change it is `src/lib/seo.ts`. The Pages mirror
keeps its own icons and manifest so it stays installable, while its canonical tags point
search engines at the Vercel copy. The `og:image` is rendered at build time to `/og.png` from
`src/app/og.png/route.tsx`, so the card can never drift from the app's own palette.

`src/lib/seo.ts` also carries the entity graph the page publishes in JSON-LD: the app, its
author (`Person`, linked to the portfolio and GitHub) and the company behind it
(`Organization`, linked as publisher and copyright holder). Those are metadata only — nothing
about them appears in the interface.

---

## ⌨️ Supported Keyboards

* MoErgo Glove80  
* MoErgo Go60  
* Corne (42-key)  
* ZSA Voyager  
* Standard ANSI 60%  

---

### ⌨️ Keyboard Library & Custom Layouts

The Hardware row ships a **library of 86 keyboards** — Lily58, Sofle, Kyria, Iris, ErgoDox, Corne, Aurora variants, Planck, Preonic and more — so most users just pick their board and start typing. Anything else is one file away:

- **Hardware → load file** — a keyboard layout definition (QMK `info.json` / Keymap Editor keyboard json). Hand-wired boards work this way.
- **Source / Target Layout → load file** — a Keymap Editor style `.json` export, or your raw `.keymap` / `.dtsi` source.

A board with no imported keymap starts from a **derived standard QWERTY** — a number row plus QWERTY / ASDF / ZXCV rows and Space on a thumb, worked out from the key geometry — so the on-screen keyboard is useful immediately. Importing your `.keymap` (or dragging keys) replaces it.

Zorotype's built-in LayerForge AST Engine will:
- Deep-parse ZMK behaviors (`&kp`, `&mt`, `&lt`, inline macros, `&trans`) and strip modifiers to find the base character  
- Read **every layer** of a `.keymap` — thumb layer holds (`&mo`, `&sl`, `&to`) and layer-taps included — skip combos and macro definitions, and line each layer up with the board you loaded  
- Redraw the on-screen keycaps for the layer your next key needs, and follow the layer a press came from, so the board matches the layer your hands are in (`&trans` keys inherit from the layer below)  
- Turn layer, bluetooth and reset keys into inert labels so they never pollute your stats  
- Allow you to drag-and-drop keys manually to tweak your matrix on the fly  

No manual coding or manual mapping required. The bundled library data comes from [keymap-editor-contrib](https://github.com/nickcoutsos/keymap-editor-contrib) (ISC) and is regenerated with `npm run boards:update`.

---

## 🕹️ How to Practice

1. Select your **Hardware**, **Source OS Layout**, and **Target Layout** in the settings (⚙️)  
2. Pick a mode in the nav test bar: **time** (15/30/60/120s), **words** (10/25/50/100), **news** / **phrases**, or **custom** — the same bar toggles **punctuation** and **numbers** and swaps the length buttons to match the mode
3. Start typing. The UI will instantly fade into a distraction-free Focus Mode  
4. Use the visual keyboard map if you forget where a key is located on your new layout  
5. Finish the test to see your exact Net WPM, Accuracy, and a Heatmap of missed keys  
6. Press `Enter` to instantly start a custom practice run targeting your specific mistakes  
7. Use `Tab + Enter` at any time to quick-restart the session  

---

## ⚠️ Training Modes

* **Words:** Practice raw muscle-memory with the standard English dictionary (10, 25, 50, or 100 words).  
* **News:** Type real, live sentences fetched from NPR and NYT to practice natural punctuation and capitalization.  
* **Custom:** Paste specific code snippets, books, or scripts to practice real-world typing scenarios.  
* **Mistakes:** An algorithmically generated mode that forces you to drill the specific characters you just failed in the previous run.
