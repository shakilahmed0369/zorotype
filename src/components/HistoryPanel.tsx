import { useState } from "react";
import { useEngine } from "@/hooks/useEngine";
import type { HistoryEntry } from "@/lib/types";

const CARD = "bg-key rounded-xl overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.15)]";
const SECTION_TITLE = "text-xs text-muted uppercase tracking-[1px] mb-[10px] pl-[5px]";
const ROW = "flex justify-between items-center gap-[15px] px-5 py-[10px] border-b-2 border-bg last:border-b-0 text-correct text-sm";
const META = "text-muted text-xs flex flex-wrap items-center justify-end gap-[15px]";
const PAGER =
  "bg-bg text-correct h-8 px-3 rounded-lg text-[12px] font-[inherit] font-bold cursor-pointer border-none transition-colors duration-300 hover:text-accent disabled:opacity-40 disabled:cursor-default disabled:hover:text-correct";

/** How many past tests one page of the list holds. */
const PER_PAGE = 10;

const when = (date: number) =>
  new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[70px]">
      <span className="text-accent text-lg font-bold leading-none">{value}</span>
      <span className="text-[11px] text-muted uppercase tracking-[1px]">{label}</span>
    </div>
  );
}

function average(history: HistoryEntry[], pick: (entry: HistoryEntry) => number): number {
  return Math.round(history.reduce((sum, entry) => sum + pick(entry), 0) / history.length);
}

/** Personal bests and every saved test, as a page of its own — the trophy in the header opens it. */
export function HistoryPanel() {
  const { ui } = useEngine();
  const [page, setPage] = useState(0);
  const history = ui.history;
  const best = [...history].sort((a, b) => b.wpm - a.wpm).slice(0, 5);
  const recent = [...history].reverse();
  const pageCount = Math.max(1, Math.ceil(recent.length / PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const start = current * PER_PAGE;
  const rows = recent.slice(start, start + PER_PAGE);

  if (history.length === 0) {
    return (
      <div className="w-full max-w-[1050px] flex flex-col gap-[30px] animate-slide-down shrink-0">
        <div>
          <div className={SECTION_TITLE}>Personal Bests</div>
          <div className={`${CARD} px-5 py-[25px] text-sm text-muted`}>
            No finished tests yet — type one and its score lands here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1050px] flex flex-col gap-[30px] animate-slide-down shrink-0">
      <div>
        <div className={SECTION_TITLE}>History</div>
        <div className={`${CARD} flex flex-wrap items-center justify-around gap-[15px] px-5 py-[15px]`}>
          <Stat value={`${Math.max(...history.map((entry) => entry.wpm))}`} label="best wpm" />
          <Stat value={`${average(history, (entry) => entry.wpm)}`} label="avg wpm" />
          <Stat value={`${average(history, (entry) => entry.acc)}%`} label="avg acc" />
          <Stat value={`${history.length}`} label={history.length === 1 ? "test" : "tests"} />
        </div>
      </div>

      <div>
        <div className={SECTION_TITLE}>Personal Bests (Top 5)</div>
        <div className={CARD}>
          {best.map((entry, index) => (
            <div key={`${entry.date}-${index}`} className={ROW}>
              <div className="flex items-center gap-4">
                <span className="text-muted text-xs w-4">{index + 1}</span>
                <span className="text-accent text-lg font-bold min-w-[80px]">{entry.wpm} wpm</span>
              </div>
              <div className={META}>
                <span>{entry.acc}% acc</span>
                <span>{entry.mode}</span>
                <span>{when(entry.date)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className={SECTION_TITLE}>All Tests ({history.length})</div>
        <div className={CARD}>
          {rows.map((entry, index) => (
            <div key={`${entry.date}-${index}`} className={ROW}>
              <span className="text-accent text-lg font-bold min-w-[80px]">{entry.wpm} wpm</span>
              <div className={META}>
                <span>{entry.acc}% acc</span>
                <span>{entry.mode}</span>
                <span>{entry.time}s</span>
                <span>{when(entry.date)}</span>
              </div>
            </div>
          ))}

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-[15px] px-5 py-[10px] border-t-2 border-bg">
              <span className="text-[11px] text-muted">
                {start + 1}–{start + rows.length} of {recent.length}
              </span>
              <div className="flex items-center gap-[10px]">
                <button className={PAGER} disabled={current === 0} onClick={() => setPage(current - 1)}>
                  prev
                </button>
                <span className="text-[11px] text-muted">
                  {current + 1} / {pageCount}
                </span>
                <button className={PAGER} disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
                  next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
