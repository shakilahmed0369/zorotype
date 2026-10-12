import { useLayoutEffect, useRef } from "react";
import { useEngine } from "@/hooks/useEngine";
import { isRTL } from "@/lib/languages";
import { Keyboard } from "./Keyboard";
import { StatsPanel } from "./StatsPanel";

export function TypingArea() {
  const { config, game, ui } = useEngine();
  const rtl = isRTL(config.lang);
  const caretRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeCharRef = useRef<HTMLSpanElement | null>(null);

  const showSample = !ui.setupOpen && !game.testCompleted;
  const showStatsBlock = !ui.setupOpen && !game.testCompleted;
  const showTimer = parseInt(config.timed) > 0 && game.testStarted && !game.testCompleted && !ui.setupOpen;
  const showStreak = game.testStarted && !game.testCompleted && !ui.setupOpen;
  const showDebug = config.debug && !game.testCompleted && !ui.setupOpen;

  const sampleLen = game.sample.length;
  const typedLen = game.typed.length;

  let progress = "0/0";
  if (sampleLen > 0) {
    const totalWords = game.sample.split(/\s+/).length;
    let currentWord = game.typed.split(/\s+/).length;
    if (typedLen === sampleLen) currentWord = totalWords;
    else if (typedLen === 0) currentWord = 1;
    progress = `${currentWord}/${totalWords}`;
  }

  useLayoutEffect(() => {
    const caret = caretRef.current;
    const wrapper = wrapperRef.current;
    const activeChar = activeCharRef.current;
    if (!caret || !wrapper || !activeChar) return;
    const caretX = rtl ? activeChar.offsetLeft + activeChar.offsetWidth : activeChar.offsetLeft;
    caret.style.transform = `translate(${caretX}px, ${activeChar.offsetTop}px)`;
    const lineHeight = 51.2;
    const currentLine = Math.round(activeChar.offsetTop / lineHeight);
    wrapper.style.transform = currentLine > 1 ? `translateY(-${(currentLine - 1) * lineHeight}px)` : "translateY(0px)";
  }, [game.typed, game.sample, rtl, showSample]);

  useLayoutEffect(() => {
    const caret = caretRef.current;
    if (!caret) return;
    caret.classList.remove("animate-caret");
    const t = setTimeout(() => caret.classList.add("animate-caret"), 500);
    return () => clearTimeout(t);
  }, [game.typed, game.sample]);

  return (
    <div className="w-full max-w-[1050px] flex flex-col flex-1 items-center justify-start pb-[5vh] transition-[width] duration-300">
      {showDebug && (
        <div className="w-full bg-black/20 px-3 py-2 rounded-lg mb-[10px] text-xs text-correct border border-white/5">
          {ui.debugText}
        </div>
      )}

      {showStatsBlock && (
        <div className="w-full text-left text-2xl text-accent mb-[5px] leading-none">
          {config.mode === "mistakes" && sampleLen > 0 ? (
            <>
              {progress}{" "}
              <span className="text-base text-error font-normal ml-[10px]">(practice mistakes)</span>
            </>
          ) : (
            progress
          )}
        </div>
      )}

      {showTimer && (
        <div className="w-full text-left text-2xl text-accent mb-[5px] leading-none">{game.timerRemaining}s</div>
      )}

      {showStreak && (
        <div className="fixed top-5 right-[30px] text-sm text-muted z-[100]">
          streak <span className="text-accent text-2xl">{game.currentStreak}</span>
        </div>
      )}

      {showSample && (
        <div
          className={`relative w-full text-[32px] leading-[1.6em] text-muted text-left [word-break:break-word] h-[calc(32px*1.6*3)] overflow-hidden tracking-[1px] mb-10 ${
            rtl ? "[direction:rtl] text-right" : ""
          }`}
        >
          <div ref={wrapperRef} className="relative w-full transition-transform duration-200 ease-out">
            <div
              ref={caretRef}
              className="absolute w-[3px] h-[1.1em] bg-caret rounded-[2px] z-10 mt-[0.25em] left-0 top-0 transition-transform duration-100 ease-[cubic-bezier(0.2,0,0,1)] animate-caret"
            />
            <div>
              {game.sample.split("").map((char, i) => {
                const isTyped = i < typedLen;
                const isActive = i === typedLen;
                return (
                  <span
                    key={i}
                    ref={
                      isActive
                        ? (el) => {
                            activeCharRef.current = el;
                          }
                        : undefined
                    }
                    className={
                      isTyped
                        ? game.typed[i] === char
                          ? "text-correct"
                          : "text-error border-b-[3px] border-error bg-error/15"
                        : ""
                    }
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <StatsPanel />
      <Keyboard />
    </div>
  );
}
