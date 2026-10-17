<div align="center">

# zorotype

**The typing trainer for split, ergonomic and matrix keyboards.**

Practise on your own keymap — every layer of it — with layer-aware keycaps,
Monkeytype-style scoring, and 187 themes. No account, no backend: your settings and results stay in
your browser.

[**Launch Zorotype →**](https://zorotype.vercel.app) &nbsp;·&nbsp; [GitHub Pages mirror](https://shakilahmed0369.github.io/zorotype/)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tested with Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)

</div>

![Zorotype — the typing trainer for split, ergonomic and matrix keyboards](https://zorotype.vercel.app/og.png)

---

## Why Zorotype

Typing trainers assume a flat 60-key board. Split and columnar keyboards are not that: the letters
sit under different fingers, half the alphabet lives behind a thumb key, and `1` is a layer away
from `Q`. Zorotype draws **your** board while you type — the layout your computer actually outputs,
layer by layer — and scores every press the way Monkeytype does, so the numbers match the keyboard
under your hands.

---

## What it does

### The board

- **Layer-aware keycaps.** The firmware layer key never reaches the browser, so Zorotype infers the
  layer instead: it redraws the keycaps for the layer your next character needs, marks the key to
  hold with `↑`, and follows the layer a press came from for a moment after you type it. Every
  layer is drawn the way the keymap writes it, so a key the layer leaves empty — `&trans`, `&none`,
  a position it never binds — shows empty instead of borrowing the character underneath it.
- **Settings → Layout** draws the board you picked, exactly like the typing page, so you can check
  a new keyboard or keymap without leaving the panel — and it follows you when you change the
  keyboard.
- **87 boards to choose from.** Five built-ins (MoErgo Glove80, MoErgo Go60, Corne, ZSA Voyager,
  ANSI 60%) plus a searchable library of community layouts — Lily58, Sofle, Kyria, Iris, ErgoDox,
  Planck, Preonic and more.
- **Your keymap, parsed properly.** Import a ZMK `.keymap`/`.dtsi`, a Keymap Editor `.json`, or a
  QMK `info.json` for the hardware. Behaviours are unpacked (`&kp`, `&mt`, `&lt`, `&mo`, `&sl`,
  `&to`, `&trans`, `&none`, inline macros), modifiers are stripped to the base character, every
  layer is read, and layer/bluetooth/reset keys become inert labels so they never pollute your stats.
- **Drag to match your keymap.** If a keycap came through wrong, drag it onto the right key: the
  board and the scoring both follow your correction (base layer).
- **Derived starting point.** A board with no imported keymap still works: Zorotype derives a
  standard QWERTY from the key geometry, so the on-screen board is useful immediately.

### Training

- **Modes** — `time` (15/30/60/120s), `words` (10/25/50/100), `news` (live text from NPR and NYT),
  `code` (real source snippets) and `custom` (paste your own text). A timed run keeps drawing fresh
  words as you type, so the lines under the caret never run out before the clock does.
- **Coding practice** — 64 snippets across 8 languages (JavaScript, TypeScript, Python, Rust, Go,
  Java, C# and C++), chosen in Settings. Code is drawn with its real line breaks and indentation;
  press `Enter` at the end of a line and the next line's indent is filled in for you, so only the
  visible characters are typed. Between them the snippets use every character a standard board can
  type — the number row, the shifted symbols, both cases and every digit — with a test enforcing it,
  so coding practice trains the whole keyboard. A fresh snippet is picked for every new test, and
  never the one you just typed.
- **Input rules** — *normal*, *expert* (backspace locked) and *master* (frozen until you fix the
  error), plus stop-on-error for letters or words. Difficulty is recorded with every result.
- **Scoring** — net WPM, raw WPM, real keypress accuracy, streaks, a per-finger accuracy breakdown,
  and a heatmap of the keys you missed.
- **Mistake practice** — the algorithm builds a drill from your weakest characters and fingers; from
  the result screen, `Tab` then `Space` starts it. A drill made after a code test stays code: it
  replays the snippet's own lines — the ones the mistakes landed on, indentation and all — and
  `Enter` fills in the next line's indent just like a code test.
- **Focus when you want it** — blind mode hides the board entirely once you trust your hands;
  homerow highlighting, next-key hints and sound are each a toggle.

### Around the test

- **History page.** The trophy in the header opens your personal bests (top 5), all-time best and
  average speed and accuracy, and every saved test — ten per page, newest first.
- **187 Monkeytype themes**, searchable with live swatches, applied instantly and remembered.
- **Six languages** — English, Spanish, French, Italian, Portuguese and Arabic. Arabic renders
  right-to-left through its standard (101) script layout; the Latin languages keep your layout so
  you can drill it with foreign text. Words come from Monkeytype's language files with offline
  fallbacks.
- **Installable.** A web app manifest and icons make it installable on desktop and mobile. The
  service worker is deliberately a pass-through — there is no offline cache yet.
- **Local by default.** Settings and your last 20 results live in `localStorage`. Word lists are
  fetched from Monkeytype's repository (with bundled fallbacks) and news mode pulls headlines
  through a public RSS proxy — nothing about you is ever sent, and there is no account to create.

---

## Quick start

1. Open [zorotype.vercel.app](https://zorotype.vercel.app) — nothing to install.
2. **Settings (⚙)** → pick your **Hardware**, then your **Keyboard Layout**: a standard one, or
   `load file` for your own `.keymap` / `.json` (layers and all).
3. Choose a mode and a length in the nav bar; `@ punctuation` and `# numbers` weave real symbols and
   capitals into the pool. `code` swaps the pool for real source snippets — pick the language in
   **Settings → Coding**.
4. Start typing. The board shows where your fingers should go; the caret waits for you.
5. Finish the test for WPM, accuracy and a heatmap — or `Escape` to stop early.
6. `Tab` `Enter` restarts at any time.

---

## Shortcuts

| Keys | What it does |
| --- | --- |
| `Tab` `Enter` | Restart the current test — on the result screen, start the next one |
| `Tab` `Space` | Drill your mistakes from the result screen |
| `Escape` | End a running test early |
| `Ctrl`/`Alt`/`⌘` + `Backspace` | Delete the whole word you are typing |
| `Escape` / `Enter` | Leave the Settings or History page |

On the result screen `Enter` and `Space` do nothing on their own: a test can end mid-word, and the
key already on its way must not throw the result away.

Unmodified browser shortcuts still work — `F5`, `F12` and your window shortcuts are not swallowed;
`Ctrl`+`Backspace` is the one combination Zorotype claims for itself.

---

## Development

Requires Node 20 or newer (what Next.js 16 asks for).

```bash
npm install
npm run dev            # dev server on http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Static export into `out/` |
| `npm run build:pages` | Export with the `/zorotype` basePath used by the Pages mirror |
| `npm run preview` | Serve the exported `out/` locally |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run boards:update` | Regenerate the bundled keyboard library |
| `npm run themes:update` | Refresh the bundled Monkeytype palettes |

### Tech

Next.js 16 (App Router) with `output: "export"`, React 19, TypeScript (strict), Tailwind CSS v4 and
Vitest. Everything runs client-side: no server, no database, no analytics.

### How it is put together

```
src/
  app/            # layout (fonts, metadata, theme bootstrap), page, Tailwind theme
  components/     # Header, SettingsMenu, TypingArea, Keyboard, BoardSvg, LayoutPreview,
                  # HistoryPanel, StatsPanel and the modals/overlays
  hooks/          # useEngine — subscribes React to the game store
  lib/            # engine.ts (store + game logic), keyboard.ts, zmk.ts, layers.ts, scoring.ts,
                  # dictionary.ts, languages.ts, hardware.ts, board-library.ts, code-snippets.ts,
                  # storage.ts, themes.ts + theme-data.ts, seo.ts
public/           # manifest, service worker, icons
scripts/          # generators for the board library and the theme palettes
```

- **The game lives outside React.** `src/lib/engine.ts` is an external store; components subscribe
  through `useSyncExternalStore`, so typing never re-mounts the tree.
- **One renderer for the board.** The practice board and the Settings preview both draw through
  `BoardSvg` — same geometry, same legends, one place to change them.
- **Pure modules, tested.** ZMK parsing, layer resolution, keyboard geometry, scoring, input rules
  and the themes each have Vitest coverage; the modals only mount while open, so none of that work
  happens while you type.

### Deployment

`npm run build` produces a static `out/`. The canonical copy is
**[zorotype.vercel.app](https://zorotype.vercel.app)**; the
**[GitHub Pages mirror](https://shakilahmed0369.github.io/zorotype/)** is built with
`npm run build:pages` for the `/zorotype` basePath.

SEO lives in `src/lib/seo.ts` — canonical origin, titles, description and the JSON-LD entity graph
(the app, its author, and the company behind it) — so the origin appears exactly once. The social
card is rendered at build time to `/og.png` from the app's own palette, and `robots.txt` plus
`sitemap.xml` are exported alongside it.

---

## Credits

- **Word lists, themes and scoring conventions** come from [Monkeytype](https://monkeytype.com)
  (GPL-3.0); the 187 palettes are regenerated with `npm run themes:update`.
- **Keyboard library data** comes from
  [keymap-editor-contrib](https://github.com/nickcoutsos/keymap-editor-contrib) (ISC).
- **Fonts** — Lexend Deca, Poppins and Roboto Mono, served through `next/font`.

<div align="center">

Built by [algovar.com](https://algovar.com)

</div>
