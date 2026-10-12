import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useEngine } from "@/hooks/useEngine";
import { swapKeys } from "@/lib/engine";
import { buildKeyRects, getMirroredMap, isHomerow } from "@/lib/keyboard";
import { getTheme, hexToRgb } from "@/lib/themes";

const BRAILLE_BLANK = "\u2800";

export function Keyboard() {
  const { config, game, ui } = useEngine();
  const layout = useMemo(() => buildKeyRects(config.hw), [config.hw]);
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

  if (!config.showKb || config.blindMode || ui.setupOpen) return null;

  const statsActive = game.testCompleted;
  const workingMap = config.mirror ? getMirroredMap(game.currentMap) : game.currentMap;

  const nextChar = (game.sample[game.typed.length] || "").toUpperCase();
  const expectedPos = config.hints
    ? Object.keys(workingMap).find((p) => {
        const val = (workingMap[p] || "").toUpperCase();
        return (nextChar === " " && val === "SPACE") || val === nextChar;
      })
    : undefined;

  const heat = ui.heatmap;
  const heatActive = !!heat && Object.keys(heat).length > 0;
  const heatMax = heatActive ? Math.max(...Object.values(heat as Record<string, number>), 1) : 1;
  const heatTheme = getTheme(config.theme);
  const heatBase = hexToRgb(heatTheme.subAlt);
  const heatPeak = hexToRgb(heatTheme.error);

  const startDrag = (e: ReactMouseEvent, pos: string) => {
    if (statsActive || ui.setupOpen) return;
    const label = workingMap[pos];
    if (!label || label === BRAILLE_BLANK || label === "ø") return;
    dragPosRef.current = pos;
    setGhost({ label: label.toUpperCase() === "SPACE" ? "Space" : label, x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={`w-full relative flex flex-col items-center transition-[max-width] duration-300 ${
        statsActive ? "max-w-[800px]" : "max-w-[1050px]"
      }`}
    >
      <svg
        viewBox={layout.viewBox}
        className="w-full h-auto overflow-visible block"
        style={{ maxWidth: layout.maxWidth }}
      >
        {ui.ready &&
          layout.keys.map((k) => {
            const label = workingMap[k.pos];
            const isHidden = label === BRAILLE_BLANK || label === "ø";
            const isBlank = label === "NONE" || label === "TRANS" || label === "TRNS" || isHidden;
            const displayLabel = label === "SPACE" || label === " " ? "Space" : isBlank ? "" : (label ?? "");
            const flash = ui.keyFlash && ui.keyFlash.pos === k.pos ? ui.keyFlash.kind : null;
            const isExpected = !!expectedPos && k.pos === expectedPos;
            const homerow = config.homerow && isHomerow(config.hw, k.pos);

            const errCount = heatActive && label && !isHidden ? (heat as Record<string, number>)[label.toLowerCase()] || 0 : 0;

            const fillClass = flash
              ? flash === "active"
                ? "fill-correct"
                : "fill-error"
              : homerow && !isExpected
                ? "fill-homerow"
                : "fill-key";
            const strokeClass = flash
              ? flash === "active"
                ? "stroke-correct"
                : "stroke-error"
              : isExpected || homerow
                ? "stroke-accent"
                : "stroke-edge";
            const textClass = isExpected
              ? "fill-expected font-extrabold"
              : homerow
                ? "fill-accent"
                : "fill-keytext font-medium";

            const rectStyle: CSSProperties = { opacity: isHidden ? 0 : 1 };
            if (!flash && errCount > 0) {
              const intensity = Math.min(errCount / heatMax, 1);
              const r = Math.round(heatBase[0] + intensity * (heatPeak[0] - heatBase[0]));
              const g = Math.round(heatBase[1] + intensity * (heatPeak[1] - heatBase[1]));
              const b = Math.round(heatBase[2] + intensity * (heatPeak[2] - heatBase[2]));
              rectStyle.fill = `rgb(${r},${g},${b})`;
            }

            const fontSize = displayLabel.length > 2 ? 12 : displayLabel.length > 1 ? 14 : 18;

            return (
              <g
                key={k.pos}
                id={`key-${k.pos}`}
                className="key-group cursor-grab"
                transform={k.transform}
                onMouseDown={(e) => startDrag(e, k.pos)}
              >
                <rect
                  width={k.w}
                  height={k.h}
                  rx={8}
                  ry={8}
                  strokeWidth={isExpected ? 3 : 2}
                  className={`transition-[fill,stroke] duration-150 ${fillClass} ${strokeClass}`}
                  style={rectStyle}
                />
                <text
                  x={k.w / 2}
                  y={k.h / 2 + 1}
                  fontSize={fontSize}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ opacity: homerow && !isExpected ? 0.8 : 1 }}
                  className={`pointer-events-none font-key ${textClass}`}
                >
                  {displayLabel}
                </text>
              </g>
            );
          })}
      </svg>

      {!statsActive && (
        <div className="text-xs text-muted transition-opacity duration-300 opacity-60 mt-[15px]">
          Drag keys to tweak target layout • Tab+Enter to restart
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
