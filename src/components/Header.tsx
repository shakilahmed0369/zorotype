import { useEngine } from "@/hooks/useEngine";
import {
  handleLogoClick,
  openTextModal,
  setMode,
  setPref,
  setTimed,
  setWordCount,
  toggleHistory,
  toggleSettings,
} from "@/lib/engine";

const CARD = "flex items-center gap-[2px] bg-key px-2 py-[4px] rounded-lg";
const BTN =
  "bg-transparent border-none font-[inherit] text-[13px] cursor-pointer px-2 py-1 rounded-md transition-colors duration-300 outline-none";
const WORD_COUNTS = ["10", "25", "50", "100"];
const TIME_LENGTHS = ["15", "30", "60", "120"];

export function Header() {
  const { config, game, ui } = useEngine();
  const typingFocus = game.testStarted && !game.testCompleted;
  const btnColor = (active: boolean) =>
    active ? (typingFocus ? "text-muted" : "text-accent") : "text-muted hover:text-correct";

  const timed = parseInt(config.timed) > 0;
  const mode = config.mode;
  const middleMode = mode === "news";
  const showMiddle = config.lang === "en";
  const middleLabel = ui.newsLoading ? "loading..." : "news";

  return (
    <header className="w-full max-w-[1050px] flex flex-wrap justify-between items-center gap-[15px] py-[25px] mb-5 shrink-0 transition-all duration-300">
      <div
        className={`text-[2.2rem] font-brand font-normal tracking-[-1px] cursor-pointer transition-colors duration-300 leading-none ${
          typingFocus ? "text-muted" : "text-correct hover:text-accent"
        }`}
        onClick={handleLogoClick}
        title="Home / Exit Settings"
      >
        zorotype
      </div>

      <div className="flex flex-wrap items-center gap-[10px] text-[13px] text-muted">
        <div className={CARD}>
          <button
            className={`${BTN} ${btnColor(config.punctuation)}`}
            onClick={() => setPref("punctuation", !config.punctuation)}
            title="Capitals and , . ; : ? ! — capitals need Shift"
          >
            @ punctuation
          </button>
          <button
            className={`${BTN} ${btnColor(config.numbers)}`}
            onClick={() => setPref("numbers", !config.numbers)}
            title="Mix numbers into the test"
          >
            # numbers
          </button>
        </div>

        <div className={CARD}>
          <button
            className={`${BTN} ${btnColor(mode === "words" && timed)}`}
            onClick={() => setMode("time")}
            title="Timed test"
          >
            time
          </button>
          <button
            className={`${BTN} ${btnColor((mode === "words" && !timed) || mode === "mistakes")}`}
            onClick={() => setMode("words")}
            title="Words test"
          >
            words
          </button>
          {showMiddle && (
            <button
              className={`${BTN} ${btnColor(middleMode)}`}
              onClick={() => setMode("news")}
              title="Live news text"
            >
              {middleLabel}
            </button>
          )}
          <button
            className={`${BTN} ${btnColor(mode === "custom")}`}
            onClick={() => setMode("custom")}
            title="Paste your own text"
          >
            custom
          </button>
        </div>

        <div className={CARD}>
          {mode === "custom" ? (
            <button className={`${BTN} text-muted hover:text-correct`} onClick={openTextModal} title="Edit custom text">
              change
            </button>
          ) : middleMode ? (
            <button
              className={`${BTN} text-muted hover:text-correct`}
              onClick={() => setMode("news")}
              title="Load another set"
            >
              {ui.newsLoading ? "loading..." : "change"}
            </button>
          ) : timed ? (
            TIME_LENGTHS.map((seconds) => (
              <button
                key={seconds}
                className={`${BTN} ${btnColor(config.timed === seconds)}`}
                onClick={() => setTimed(seconds)}
                title={`${seconds} second test`}
              >
                {seconds}
              </button>
            ))
          ) : (
            WORD_COUNTS.map((count) => (
              <button
                key={count}
                className={`${BTN} ${btnColor(config.wordCount === count)}`}
                onClick={() => setWordCount(count)}
                title={`${count} words`}
              >
                {count}
              </button>
            ))
          )}
        </div>

        <button
          className={`bg-transparent border-none cursor-pointer transition-colors duration-300 outline-none p-[5px] flex items-center ${
            ui.historyOpen ? "text-accent" : "text-muted hover:text-accent"
          }`}
          onClick={toggleHistory}
          title="Personal bests and history"
          aria-label="Personal bests and history"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 block" fill="currentColor" aria-hidden="true">
            <path d="M7 3.4h10v5.2a5 5 0 0 1-10 0V3.4z" />
            <rect x="4.6" y="4.6" width="2.6" height="4.4" rx="1.3" />
            <rect x="16.8" y="4.6" width="2.6" height="4.4" rx="1.3" />
            <rect x="11.1" y="13" width="1.8" height="4.4" />
            <rect x="8.2" y="17" width="7.6" height="1.8" rx="0.9" />
            <rect x="7" y="19.6" width="10" height="1.6" rx="0.8" />
          </svg>
        </button>

        <button
          className="bg-transparent border-none text-muted cursor-pointer transition-all duration-300 outline-none p-[5px] flex items-center hover:text-accent hover:rotate-90"
          onClick={toggleSettings}
          title="Settings"
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 block" fill="currentColor" aria-hidden="true">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <rect
                key={angle}
                x="10.7"
                y="3.2"
                width="2.6"
                height="3.6"
                rx="0.7"
                transform={`rotate(${angle} 12 12)`}
              />
            ))}
            <path
              fillRule="evenodd"
              d="M12 6.2a5.8 5.8 0 1 0 0 11.6 5.8 5.8 0 0 0 0-11.6zm0 3.4a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
