import { useMemo, useState } from "react";
import { useEngine } from "@/hooks/useEngine";
import { closeBoardModal, setHardware } from "@/lib/engine";
import { searchBoards } from "@/lib/board-library";
import { HARDWARE } from "@/lib/hardware";
import { buildKeyRects, currentLayoutMap, getMirroredMap } from "@/lib/keyboard";
import { BoardSvg } from "./BoardSvg";

const BUILT_IN = ["ansi60", "glove80", "go60", "corne", "voyager"];
const NOTE = "text-[11px] text-muted text-center";

/**
 * Every keyboard the trainer knows how to draw: the built-ins, the library, and whatever was loaded
 * from a file — with the current board drawn underneath, so a switch can be judged by its shape.
 */
export function BoardModal() {
  const { config, ui } = useEngine();
  const [query, setQuery] = useState("");

  const builtIn = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BUILT_IN.map((id) => ({ id, name: HARDWARE[id].name })).filter(
      (board) => !q || board.name.toLowerCase().includes(q) || board.id.includes(q)
    );
  }, [query]);

  const library = useMemo(() => searchBoards(query), [query]);
  const current = config.customBoard;

  const layout = useMemo(() => buildKeyRects(config.hw), [config.hw]);
  const map = currentLayoutMap(config);
  const hasLetters = Object.values(map).some((label) => label);

  // Picking a board only switches it: the modal stays open so boards can be compared against the
  // preview before it is closed.
  const pick = (id: string) => {
    void setHardware(id);
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
      // Only a press that starts on the backdrop dismisses: releasing a drag from inside the panel
      // out here reports the backdrop as the click target too.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeBoardModal();
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
            className="flex-1 min-w-0 h-10 bg-edge text-correct border-2 border-muted px-3 rounded-lg font-[inherit] text-sm outline-none transition-all duration-200 focus:border-accent"
          />
          <button
            onClick={closeBoardModal}
            className="h-10 bg-transparent text-muted font-[inherit] text-[13px] cursor-pointer px-3 rounded-lg transition-colors duration-300 outline-none hover:text-correct border-2 border-muted"
          >
            Close
          </button>
        </div>

        <div className="shrink-0 flex flex-col items-center gap-2 mb-4 [&>svg]:max-h-[240px]">
          {hasLetters ? (
            <BoardSvg
              hw={config.hw}
              layout={layout}
              map={config.mirror ? getMirroredMap(map) : map}
              ready={ui.ready}
              homerow={config.homerow}
            />
          ) : (
            <div className={`${NOTE} py-6`}>
              No letters for this board — load a .keymap in Settings to give it keycaps.
            </div>
          )}
          <div className={NOTE}>
            {HARDWARE[config.hw]?.name ?? config.hw} · the typing board draws this keyboard
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges] flex flex-col gap-4">
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
