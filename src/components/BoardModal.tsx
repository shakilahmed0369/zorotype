import { useMemo, useState } from "react";
import { useEngine } from "@/hooks/useEngine";
import { closeBoardModal, setHardware } from "@/lib/engine";
import { searchBoards } from "@/lib/board-library";
import { HARDWARE } from "@/lib/hardware";

const BUILT_IN = ["ansi60", "glove80", "go60", "corne", "voyager"];

export function BoardModal() {
  const { config } = useEngine();
  const [query, setQuery] = useState("");

  const builtIn = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BUILT_IN.map((id) => ({ id, name: HARDWARE[id].name })).filter(
      (board) => !q || board.name.toLowerCase().includes(q) || board.id.includes(q)
    );
  }, [query]);

  const library = useMemo(() => searchBoards(query), [query]);
  const current = config.customBoard;

  const pick = (id: string) => {
    void setHardware(id);
    closeBoardModal();
  };

  const row = (id: string, name: string, hint: string) => {
    const active = config.hw === id;
    return (
      <button
        key={id}
        onClick={() => pick(id)}
        className={`flex items-baseline justify-between gap-3 text-left rounded-lg px-3 py-2 border-2 cursor-pointer font-[inherit] transition-colors duration-150 ${
          active ? "border-accent text-accent" : "border-transparent text-correct hover:border-muted"
        }`}
      >
        <span className="text-[13px] font-bold truncate">{name}</span>
        <span className="text-[11px] text-muted truncate shrink-0">{hint}</span>
      </button>
    );
  };

  const nothingMatches = builtIn.length === 0 && library.length === 0;

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape") closeBoardModal();
      }}
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-[2100]"
    >
      <div className="bg-key p-[30px] rounded-xl w-[90%] max-w-[620px] flex flex-col max-h-[85vh]">
        <div className="flex items-center gap-4 mb-5">
          <h2 className="m-0 text-[20px] text-accent font-bold whitespace-nowrap">Keyboard</h2>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${library.length} boards...`}
            className="flex-1 min-w-0 bg-edge text-correct border-2 border-muted px-3 py-2 rounded-lg font-[inherit] text-sm outline-none transition-all duration-200 focus:border-accent"
          />
          <button
            onClick={closeBoardModal}
            className="bg-transparent text-muted font-[inherit] text-[13px] cursor-pointer px-2 py-1 rounded-md transition-colors duration-300 outline-none hover:text-correct border border-solid border-muted"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto pr-2 flex flex-col gap-4">
          {current && (
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted uppercase tracking-[1px] pl-1">
                {current.origin === "file" ? "Loaded file" : "Selected board"}
              </div>
              {row(current.id, current.name, `${current.pos.length} keys`)}
            </div>
          )}

          {builtIn.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted uppercase tracking-[1px] pl-1">Built-in</div>
              {builtIn.map((board) => row(board.id, board.name, ""))}
            </div>
          )}

          {library.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted uppercase tracking-[1px] pl-1">Keyboard library</div>
              {library.map((entry) => row(entry.id, entry.name, entry.id))}
            </div>
          )}

          {nothingMatches && (
            <div className="text-muted text-sm py-8 text-center">
              No keyboards match &ldquo;{query}&rdquo; — use <span className="text-accent">load file</span> for a
              hand-made layout
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
