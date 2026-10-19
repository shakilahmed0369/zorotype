import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useEngine } from "@/hooks/useEngine";
import { setPinnedLayer, swapKeys } from "@/lib/engine";
import { buildKeyRects, getMirroredMap, mirrorPos } from "@/lib/keyboard";
import { shortKeyLabel } from "@/lib/key-labels";
import { activatorPositions, layerToMap, visibleLayer } from "@/lib/layers";
import { getTheme, hexToRgb } from "@/lib/themes";
import { BoardSvg } from "./BoardSvg";

const BRAILLE_BLANK = "\u2800";

export function Keyboard() {
  const { config, game, ui } = useEngine();
  // `config.hw` alone is not enough: a library board keeps the same id before and after it is
  // resolved, so the memo would stay on the fallback geometry. `customBoard` changes when it lands.
  const layout = useMemo(() => buildKeyRects(config.hw), [config.hw, config.customBoard]);
  const dragPosRef = useRef<string | null>(null);
  const [ghost, setGhost] = useState<{ label: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragPosRef.current) return;
      setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
    };
    const onUp = (e: MouseEvent) => {
      const src = dragPosRef.current;
      if (!src) return;
      dragPosRef.current = null;
      const target = (e.target as Element | null)?.closest?.(".key-group") ?? null;
      if (target) {
        swapKeys(src, target.id.replace("key-", ""));
      }
      setGhost(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!config.showKb || config.blindMode || ui.setupOpen || ui.historyOpen) return null;

  const statsActive = game.testCompleted;
  const stack = game.currentLayers;
  const layer = visibleLayer(stack, ui);
  const layerMap = stack ? layerToMap(stack, layer) : game.currentMap;
  const workingMap = config.mirror ? getMirroredMap(layerMap) : layerMap;
  // Layer keys on screen tell you which thumb to hold for the layer being drawn.
  const holds = new Set(
    stack && layer > 0 ? activatorPositions(stack, layer).map((pos) => (config.mirror ? mirrorPos(pos) : pos)) : []
  );

  const nextChar = (game.sample[game.typed.length] || "").toUpperCase();
  const expectedPos = config.hints
    ? Object.keys(workingMap).find((p) => {
        const val = (workingMap[p] || "").toUpperCase();
        return (nextChar === " " && val === "SPACE") || val === nextChar;
      })
    : undefined;

  const heat = ui.heatmap && Object.keys(ui.heatmap).length > 0 ? ui.heatmap : null;
  const heatMax = heat ? Math.max(...Object.values(heat), 1) : 1;
  const heatTheme = getTheme(config.theme);
  const heatBase = hexToRgb(heatTheme.subAlt);
  const heatPeak = hexToRgb(heatTheme.error);

  const startDrag = (e: ReactMouseEvent, pos: string) => {
    // Drag-remap edits the base layer only; upper layers are shown, not edited.
    if (statsActive || ui.setupOpen || ui.historyOpen || layer !== 0) return;
    const label = workingMap[pos];
    if (!label || label === BRAILLE_BLANK || label === "ø") return;
    dragPosRef.current = pos;
    setGhost({ label: shortKeyLabel(label), x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={`w-full relative flex flex-col items-center transition-[max-width] duration-300 ${
        statsActive ? "max-w-[800px]" : "max-w-[1050px]"
      }`}
    >
      {stack && stack.names.length > 1 && !statsActive && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[10px] uppercase tracking-[1px] text-muted">Layer</span>
          {stack.names.map((name, index) => (
            <button
              key={`${name}-${index}`}
              onClick={() => setPinnedLayer(ui.pinnedLayer === index ? null : index)}
              aria-pressed={layer === index}
              data-tooltip={`Peek at ${name}${ui.pinnedLayer === index ? " (pinned)" : ""}`}
              className={`px-[10px] py-[3px] rounded-md text-[11px] font-bold font-[inherit] cursor-pointer transition-colors duration-200 border-none ${
                layer === index ? "bg-accent text-bg" : "bg-key text-muted hover:text-correct"
              } ${ui.pinnedLayer === index ? "ring-1 ring-accent" : ""}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <BoardSvg
        hw={config.hw}
        layout={layout}
        map={workingMap}
        ready={ui.ready}
        homerow={config.homerow}
        expectedPos={expectedPos}
        holds={holds}
        flash={ui.keyFlash}
        heat={heat ? { counts: heat, max: heatMax, base: heatBase, peak: heatPeak } : null}
        draggable={layer === 0}
        onKeyMouseDown={startDrag}
      />

      {!statsActive && (
        <div className="text-xs text-muted transition-opacity duration-300 opacity-60 mt-[15px]">
          {!Object.values(workingMap).some((value) => value)
            ? "No letters for this board — import your .keymap (Settings → Matrix & Layout) or pick a built-in board"
            : stack && stack.names.length > 1
              ? `Showing ${stack.names[layer]} — the board follows the layer you type in • Esc to restart`
              : "Drag keys to match your keymap • Esc to restart"}
        </div>
      )}

      {ghost && (
        <svg
          width={54}
          height={54}
          className="pointer-events-none fixed z-[1000] drop-shadow-[0_10px_15px_rgba(0,0,0,0.4)]"
          style={{ left: ghost.x - 27, top: ghost.y - 27 }}
        >
          <rect width={54} height={54} rx={8} ry={8} className="fill-accent opacity-90" />
          <text
            x={27}
            y={27}
            fontSize={18}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-bg font-bold font-key"
          >
            {ghost.label}
          </text>
        </svg>
      )}
    </div>
  );
}
