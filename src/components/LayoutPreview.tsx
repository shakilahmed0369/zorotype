import { useMemo } from "react";
import { useEngine } from "@/hooks/useEngine";
import { setPref } from "@/lib/engine";
import { buildKeyRects, currentLayoutMap, getMirroredMap, sourceLayersFor } from "@/lib/keyboard";
import { BoardSvg } from "./BoardSvg";

const NOTE = "text-[11px] text-muted";
const TURN_ON =
  "bg-bg text-correct px-3 py-[6px] rounded-md text-[11px] cursor-pointer border-none font-[inherit] font-bold transition-colors duration-300 hover:text-accent";

/**
 * The layout of the selected keyboard, drawn the way the typing page draws it — so picking a board
 * or importing a keymap can be checked without closing Settings. Read-only: it never changes what
 * the practice board shows.
 */
export function LayoutPreview() {
  const { config, ui } = useEngine();

  const layout = useMemo(() => buildKeyRects(config.hw), [config.hw]);
  const map = currentLayoutMap(config);
  const layerCount = sourceLayersFor(config)?.maps.length ?? 0;

  if (!Object.values(map).some((label) => label)) {
    return (
      <div className={`${NOTE} text-center`}>
        No letters for this board — load a .keymap above or pick a built-in board.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <BoardSvg
        hw={config.hw}
        layout={layout}
        map={config.mirror ? getMirroredMap(map) : map}
        ready={ui.ready}
        homerow={config.homerow}
      />

      {(layerCount > 1 || !config.layerFollow) && (
        <div className="flex w-full flex-col items-center gap-2 text-center">
          {layerCount > 1 && (
            <div className={NOTE}>
              Base layer — your keymap has {layerCount} layers, and the typing page follows the layer you type.
            </div>
          )}
          {!config.layerFollow && (
            <div className={`${NOTE} flex flex-wrap items-center justify-center gap-3`}>
              Layer following is off, so the board on the typing page stays on Base.
              <button className={TURN_ON} onClick={() => setPref("layerFollow", true)}>
                turn on
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
