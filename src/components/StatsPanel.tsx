import { useEngine } from "@/hooks/useEngine";
import { getFingerName } from "@/lib/keyboard";
import type { FingerHit, PracticeResult } from "@/lib/types";
import { Sparkline } from "./Sparkline";

const FINGER_ORDER = [
  "L pinky",
  "L ring",
  "L mid",
  "L index",
  "L thumb",
  "R thumb",
  "R index",
  "R mid",
  "R ring",
  "R pinky",
];

function FingerStats({ fingerHits }: { fingerHits: Record<string, FingerHit> }) {
  const fingers: Record<string, { correct: number; total: number }> = {};
  Object.keys(fingerHits).forEach((pos) => {
    const name = getFingerName(pos);
    if (!fingers[name]) fingers[name] = { correct: 0, total: 0 };
    fingers[name].correct += fingerHits[pos].correct;
    fingers[name].total += fingerHits[pos].total;
  });

  return (
    <div className="flex flex-wrap gap-2 w-full">
      {FINGER_ORDER.filter((f) => fingers[f]).map((f) => {
        const d = fingers[f];
        const acc = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 100;
        const color = acc >= 95 ? "text-correct" : acc >= 80 ? "text-accent" : "text-error";
        return (
          <div key={f} className="flex items-center gap-[6px] px-[10px] py-1 rounded-md bg-key border border-edge">
            <div className="text-[11px] text-muted uppercase">{f}</div>
            <div className={`text-base font-bold ${color}`}>{acc}%</div>
          </div>
        );
      })}
    </div>
  );
}

function PracticeImprovement({ results }: { results: PracticeResult[] }) {
  if (results.length === 0) return null;
  const flawless = results.every((r) => r.hitRate === 100);
  const avgHitRate = Math.round(results.reduce((s, r) => s + r.hitRate, 0) / results.length);
  const msg = flawless
    ? "Nailed it! Ready to move on 🎯"
    : avgHitRate >= 90
      ? "Almost there, one more round!"
      : avgHitRate >= 70
        ? "Getting better, keep at it!"
        : avgHitRate >= 50
          ? "Warming up, stay with it"
          : "Tough chars — keep practicing!";

  return (
    <>
      Practicing:{" "}
      {flawless ? (
        <span className="text-correct">Flawless execution!</span>
      ) : (
        results.map((r) => (
          <span key={r.ch} className="whitespace-nowrap">
            <span className={r.hitRate === 100 ? "text-correct" : r.hitRate >= 80 ? "text-accent" : "text-error"}>
              {r.ch}
            </span>{" "}
            {r.hitRate}%&nbsp;&nbsp;
          </span>
        ))
      )}
      <span className="text-muted text-xs ml-[10px]">{msg}</span>
    </>
  );
}

export function StatsPanel() {
  const { game, ui } = useEngine();
  if (!ui.result || !game.testCompleted || ui.setupOpen) return null;
  const result = ui.result;
  const mistakeChars = Object.keys(game.mistakeChars).sort((a, b) => game.mistakeChars[b] - game.mistakeChars[a]);

  return (
    <div className="w-full text-left animate-fade-in mb-[30px]">
      <div className="flex gap-10 items-stretch mb-5 w-full">
        <div className="flex flex-col justify-center gap-[10px] shrink-0">
          <div className="flex flex-col justify-start">
            <div className="text-muted text-[32px] leading-none -mb-[5px]">wpm</div>
            <div className="text-accent text-[64px] font-medium leading-none">{result.wpm}</div>
          </div>
          <div className="flex flex-col justify-start">
            <div className="text-muted text-[32px] leading-none -mb-[5px]">acc</div>
            <div className="text-accent text-[64px] font-medium leading-none">{result.acc}%</div>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-end">
          <Sparkline points={game.wpmSnapshots} />
        </div>
      </div>

      <div className="flex flex-col gap-[15px] w-full">
        <div className="flex gap-[30px] flex-wrap">
          <div className="flex flex-col text-muted text-sm leading-[1.2]">
            raw
            <br />
            <span className="text-accent text-2xl font-normal">{result.raw}</span>
          </div>
          <div className="flex flex-col text-muted text-sm leading-[1.2]">
            test type
            <br />
            <span className="text-accent text-2xl font-normal">{result.testType}</span>
          </div>
          <div className="flex flex-col text-muted text-sm leading-[1.2]">
            time
            <br />
            <span className="text-accent text-2xl font-normal">{result.time}s</span>
          </div>
          <div className="flex flex-col text-muted text-sm leading-[1.2]">
            words
            <br />
            <span className="text-accent text-2xl font-normal">{result.words}</span>
          </div>
          <div className="flex flex-col text-muted text-sm leading-[1.2]">
            streak
            <br />
            <span className="text-accent text-2xl font-normal">{result.streak}</span>
          </div>
        </div>

        <FingerStats fingerHits={game.fingerHits} />

        <div className="flex flex-col gap-[10px] mt-[5px]">
          <div className="flex flex-wrap gap-2 items-center">
            {game.mistakes > 0 ? (
              mistakeChars.map((c) => (
                <span key={c} className="text-base font-bold bg-error/15 text-error px-[10px] py-1 rounded-md">
                  {c}
                </span>
              ))
            ) : (
              <span className="text-correct">Clean run!</span>
            )}
          </div>
          <div className="text-muted text-sm flex items-center gap-[10px]">
            {result.historyMode === "history" ? (
              ui.historySummary && (
                <>
                  Last {Math.min(3, ui.historySummary.count)} tests avg:{" "}
                  <span className="text-correct">{ui.historySummary.avgWpm} wpm</span> /{" "}
                  <span className="text-correct">{ui.historySummary.avgAcc}%</span> · {ui.historySummary.count} total
                </>
              )
            ) : (
              <PracticeImprovement results={ui.practiceResults ?? []} />
            )}
          </div>
        </div>
      </div>

      <div className="text-muted text-sm mt-[30px] text-center w-full">
        press <span className="text-accent">Tab</span> then <span className="text-accent">Enter</span> to restart
        {game.mistakes > 0 ? (
          <>
            {" "}
            · <span className="text-accent">Space</span> practice mistakes · <span className="text-accent">Enter</span>{" "}
            next test
          </>
        ) : (
          <>
            {" "}
            · <span className="text-accent">Enter</span> to start next session
          </>
        )}
      </div>
    </div>
  );
}
