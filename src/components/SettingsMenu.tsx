import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { useEngine } from "@/hooks/useEngine";
import { applyKeyboardLayout, applyLayoutFile, clearAllData, openBoardModal, openThemeModal, setCodeLanguage, setLang, setPref } from "@/lib/engine";
import { BOARD_CATALOG } from "@/lib/board-catalog";
import { CODE_LANGUAGES } from "@/lib/code-snippets";
import { HARDWARE } from "@/lib/hardware";
import { LANGUAGES } from "@/lib/languages";
import { getTheme, listThemes } from "@/lib/themes";
import type { Difficulty, LanguageCode, StopOnError } from "@/lib/types";
import { LayoutPreview } from "./LayoutPreview";

const SECTION_TITLE = "text-xs text-muted uppercase tracking-[1px] mb-[10px] pl-[5px]";
const SECTION = "flex flex-col bg-key rounded-xl overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.15)]";
const ROW = "flex justify-between items-center px-5 py-[15px] border-b-2 border-bg last:border-b-0";
const LABEL_WRAP = "flex flex-col gap-1";
const LABEL_TITLE = "text-sm text-correct font-bold";
const LABEL_DESC = "text-[11px] text-muted";
const ACTION = "flex gap-[10px] items-center";
const SELECT =
  "bg-bg text-muted font-[inherit] text-[12px] cursor-pointer px-3 h-8 rounded-lg border-none outline-none transition-colors duration-300 hover:text-correct";
const UPLOAD =
  "bg-bg text-correct h-8 inline-flex items-center justify-center px-3 rounded-lg text-[12px] cursor-pointer text-center transition-all duration-300 border-none font-[inherit] font-bold hover:text-accent";
const OPTION = "bg-bg text-correct";
const LAYOUTS = ["qwerty", "colemak-dh", "dvorak"];

function PrefRow({
  title,
  desc,
  value,
  onChange,
}: {
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const btn = (on: boolean) =>
    `border-2 border-transparent px-3 py-[6px] rounded-lg cursor-pointer font-[inherit] text-xs transition-all duration-300 font-bold ${
      on ? "bg-accent text-bg" : "bg-bg text-muted hover:text-correct"
    }`;
  return (
    <div className={ROW}>
      <div className={LABEL_WRAP}>
        <span className={LABEL_TITLE}>{title}</span>
        <span className={LABEL_DESC}>{desc}</span>
      </div>
      <div className={ACTION}>
        <button className={btn(!value)} onClick={() => onChange(false)}>
          off
        </button>
        <button className={btn(value)} onClick={() => onChange(true)}>
          on
        </button>
      </div>
    </div>
  );
}

// The panel is long enough to lose your place in, so the way back up sits in the corner and
// only appears once there is something to scroll back from.
function ScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Go to top"
      title="Go to top"
      className={`fixed bottom-[30px] right-[30px] z-[900] w-11 h-11 rounded-full bg-key text-correct font-[inherit] text-lg font-bold border-none cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.35)] transition-all duration-300 hover:text-accent ${
        visible ? "opacity-100" : "pointer-events-none opacity-0 translate-y-2"
      }`}
    >
      ↑
    </button>
  );
}

export function SettingsMenu() {
  const { config } = useEngine();
  const theme = getTheme(config.theme);

  const handleLayoutUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => applyLayoutFile(String(ev.target?.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleKeyboardUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => applyKeyboardLayout(String(ev.target?.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="w-full max-w-[1050px] bg-transparent p-0 mb-[30px] flex flex-col gap-[30px] animate-slide-down shrink-0">
      <div>
        <div className={SECTION_TITLE}>Input Language</div>
        <div className={SECTION}>
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className={LABEL_TITLE}>Practice Language</span>
              <span className={LABEL_DESC}>Letters shown on the keyboard, and the words to type</span>
            </div>
            <div className={ACTION}>
              <select
                value={config.lang}
                onChange={(e) => void setLang(e.target.value as LanguageCode)}
                className={SELECT}
              >
                {Object.entries(LANGUAGES).map(([code, spec]) => (
                  <option key={code} value={code} className={OPTION}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className={SECTION_TITLE}>Coding</div>
        <div className={SECTION}>
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className={LABEL_TITLE}>Code Language</span>
              <span className={LABEL_DESC}>
                Snippets for the code mode — {CODE_LANGUAGES.length} languages, three snippets each
              </span>
            </div>
            <div className={ACTION}>
              <select
                value={config.codeLang}
                onChange={(e) => setCodeLanguage(e.target.value)}
                className={SELECT}
              >
                {CODE_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id} className={OPTION}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className={SECTION_TITLE}>Test & Input</div>
        <div className={SECTION}>
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className={LABEL_TITLE}>Difficulty</span>
              <span className={LABEL_DESC}>Expert disables backspace · Master freezes until you fix the error</span>
            </div>
            <div className={ACTION}>
              <select
                value={config.difficulty}
                onChange={(e) => setPref("difficulty", e.target.value as Difficulty)}
                className={SELECT}
              >
                {(["normal", "expert", "master"] as Difficulty[]).map((d) => (
                  <option key={d} value={d} className={OPTION}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className={LABEL_TITLE}>Stop on Error</span>
              <span className={LABEL_DESC}>Letter blocks the next key · Word blocks leaving a wrong word</span>
            </div>
            <div className={ACTION}>
              <select
                value={config.stopOnError}
                onChange={(e) => setPref("stopOnError", e.target.value as StopOnError)}
                className={SELECT}
              >
                {(["off", "letter", "word"] as StopOnError[]).map((v) => (
                  <option key={v} value={v} className={OPTION}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <PrefRow
            title="Blind Mode"
            desc="Hide the on-screen keyboard and trust your muscle memory"
            value={config.blindMode}
            onChange={(v) => setPref("blindMode", v)}
          />
          <PrefRow
            title="Punctuation"
            desc="Capitals and , . ; : ? ! — capitals must be typed with Shift"
            value={config.punctuation}
            onChange={(v) => setPref("punctuation", v)}
          />
          <PrefRow
            title="Numbers"
            desc="Mix random numbers, decimals and percentages into the test"
            value={config.numbers}
            onChange={(v) => setPref("numbers", v)}
          />
        </div>
      </div>

      <div>
        <div className={SECTION_TITLE}>Theme</div>
        <div className={SECTION}>
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className={LABEL_TITLE}>Theme</span>
              <span className={LABEL_DESC}>All {listThemes().length} Monkeytype palettes</span>
            </div>
            <div className={ACTION}>
              <button onClick={openThemeModal} className={`${SELECT} flex items-center gap-2`}>
                <span className="flex gap-1">
                  {[theme.main, theme.subAlt, theme.text, theme.error].map((color, i) => (
                    <span
                      key={i}
                      style={{ backgroundColor: color }}
                      className="w-3 h-3 rounded-full border border-black/20"
                    />
                  ))}
                </span>
                {config.theme}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className={SECTION_TITLE}>Matrix & Layout</div>
        <div className={SECTION}>
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className={LABEL_TITLE}>Hardware</span>
              <span className={LABEL_DESC}>Search {BOARD_CATALOG.length} keyboards, or load a layout .json</span>
            </div>
            <div className={ACTION}>
              <label htmlFor="keyboardLayoutUpload" className={UPLOAD}>
                load file
              </label>
              <input
                type="file"
                id="keyboardLayoutUpload"
                accept=".json"
                className="hidden"
                onChange={handleKeyboardUpload}
              />
              <button onClick={openBoardModal} className={`${SELECT} flex items-center gap-2`}>
                {HARDWARE[config.hw]?.name ?? config.hw}
              </button>
            </div>
          </div>
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className={LABEL_TITLE}>Keyboard Layout</span>
              <span className={LABEL_DESC}>
                The layout your computer outputs — pick a standard one, or load a .json / .keymap (layers included)
              </span>
            </div>
            <div className={ACTION}>
              <label htmlFor="sourceJsonUpload" className={UPLOAD}>
                load file
              </label>
              <input
                type="file"
                id="sourceJsonUpload"
                accept=".json,.keymap,.dtsi,.dts,.overlay"
                className="hidden"
                onChange={handleLayoutUpload}
              />
              <select value={config.sourceKey} onChange={(e) => setPref("sourceKey", e.target.value)} className={SELECT}>
                {LAYOUTS.map((k) => (
                  <option key={k} value={k} className={OPTION}>
                    {k.toUpperCase()}
                  </option>
                ))}
                {config.sourceJsonMap && (
                  <option value="custom_json" className={OPTION}>
                    Imported
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className={SECTION_TITLE}>Layout</div>
        <LayoutPreview />
      </div>

      <div>
        <div className={SECTION_TITLE}>Preferences</div>
        <div className={SECTION}>
          <PrefRow
            title="Show Keyboard"
            desc="Display the interactive SVG keyboard"
            value={config.showKb}
            onChange={(v) => setPref("showKb", v)}
          />
          <PrefRow
            title="Follow Layers"
            desc="Redraw the keycaps for the layer your next key needs — uses the layers in your imported .keymap"
            value={config.layerFollow}
            onChange={(v) => setPref("layerFollow", v)}
          />
          <PrefRow
            title="Show Homerow"
            desc="Highlight the resting row keys"
            value={config.homerow}
            onChange={(v) => setPref("homerow", v)}
          />
          <PrefRow
            title="Show Next Key Hint"
            desc="Outline the expected key"
            value={config.hints}
            onChange={(v) => setPref("hints", v)}
          />
          <PrefRow
            title="Mirror Layout"
            desc="Swap left and right hands visually"
            value={config.mirror}
            onChange={(v) => setPref("mirror", v)}
          />
          <PrefRow
            title="Error Sound"
            desc="Incorrect key feedback"
            value={config.sound}
            onChange={(v) => setPref("sound", v)}
          />
          <PrefRow
            title="Debug Mode"
            desc="Show raw keycodes and OS signals"
            value={config.debug}
            onChange={(v) => setPref("debug", v)}
          />
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className="text-sm text-error font-bold">Reset App</span>
              <span className={LABEL_DESC}>Wipe all local storage and reset defaults</span>
            </div>
            <div className={ACTION}>
              <button
                onClick={clearAllData}
                className="bg-accent text-error border-2 border-[rgba(202,71,84,0.3)] px-3 py-[6px] rounded-lg cursor-pointer font-[inherit] text-xs transition-all duration-300 font-bold hover:bg-error hover:text-white"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      </div>

      <ScrollTop />
    </div>
  );
}
