import type { ChangeEvent } from "react";
import { useEngine } from "@/hooks/useEngine";
import { applyKeyboardLayout, applyLayoutFile, clearAllData, openBoardModal, openThemeModal, setLang, setPref } from "@/lib/engine";
import { BOARD_CATALOG } from "@/lib/board-catalog";
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
  "bg-bg text-muted font-[inherit] text-[13px] cursor-pointer px-3 py-[6px] rounded-md border-none outline-none transition-colors duration-300 hover:text-correct";
const UPLOAD =
  "bg-bg text-correct px-3 py-[6px] rounded-md text-[11px] cursor-pointer text-center transition-all duration-300 border-none font-[inherit] font-bold hover:text-accent";
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

export function SettingsMenu() {
  const { config, ui } = useEngine();
  const best = [...ui.bestScores].sort((a, b) => b.wpm - a.wpm).slice(0, 5);
  const theme = getTheme(config.theme);

  const handleLayoutUpload = (e: ChangeEvent<HTMLInputElement>, type: "source" | "target") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => applyLayoutFile(String(ev.target?.result ?? ""), type);
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
      {best.length > 0 && (
        <div>
          <div className={SECTION_TITLE}>Personal Bests (Top 5)</div>
          <div className={`${SECTION} mb-[10px]`}>
            {best.map((h, i) => (
              <div
                key={i}
                className="flex justify-between px-5 py-[10px] border-b-2 border-bg last:border-b-0 text-correct text-sm"
              >
                <div className="text-accent text-lg font-bold min-w-[80px]">{h.wpm} wpm</div>
                <div className="text-muted text-xs flex gap-[15px] items-center">
                  <span>{h.acc}% acc</span>
                  <span>{h.mode}</span>
                  <span>{new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className={SECTION_TITLE}>Input Language</div>
        <div className={SECTION}>
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className={LABEL_TITLE}>Practice Language</span>
              <span className={LABEL_DESC}>Letters shown on the keyboard, and the words/phrases to type</span>
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
              <span className={LABEL_TITLE}>Source Layout (OS)</span>
              <span className={LABEL_DESC}>The physical layout your computer outputs — upload a .json / .keymap (layers included)</span>
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
                onChange={(e) => handleLayoutUpload(e, "source")}
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
          <div className={ROW}>
            <div className={LABEL_WRAP}>
              <span className={LABEL_TITLE}>Target Layout</span>
              <span className={LABEL_DESC}>The visual layout you want to test drive — upload a .json / .keymap (layers included)</span>
            </div>
            <div className={ACTION}>
              <label htmlFor="targetJsonUpload" className={UPLOAD}>
                load file
              </label>
              <input
                type="file"
                id="targetJsonUpload"
                accept=".json,.keymap,.dtsi,.dts,.overlay"
                className="hidden"
                onChange={(e) => handleLayoutUpload(e, "target")}
              />
              <select value={config.tgt} onChange={(e) => setPref("tgt", e.target.value)} className={SELECT}>
                <option value="default" className={OPTION}>
                  Default (Same as Source)
                </option>
                {LAYOUTS.map((k) => (
                  <option key={k} value={k} className={OPTION}>
                    {k.toUpperCase()}
                  </option>
                ))}
                {config.targetJsonMap && (
                  <option value="custom_json" className={OPTION}>
                    Imported
                  </option>
                )}
                {config.draggedMap && (
                  <option value="custom_dragged" className={OPTION}>
                    Custom (Dragged)
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
    </div>
  );
}
