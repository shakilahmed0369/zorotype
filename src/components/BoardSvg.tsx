import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import type { KeyboardLayout } from "@/lib/keyboard";
import { isHomerow } from "@/lib/keyboard";
import { shortKeyLabel } from "@/lib/key-labels";
import { isBlankLabel } from "@/lib/layers";
import type { HardwareId } from "@/lib/types";

const BRAILLE_BLANK = "\u2800";

// Heat colours are read from the theme once per render, so the board can blend a key towards
// the error colour on its own.
export interface BoardHeat {
  counts: Record<string, number>;
  max: number;
  base: [number, number, number];
  peak: [number, number, number];
}

export interface BoardSvgProps {
  hw: HardwareId;
  layout: KeyboardLayout;
  /** Already mirrored by the caller. */
  map: Record<string, string>;
  ready?: boolean;
  homerow?: boolean;
  expectedPos?: string | null;
  /** Positions of the keys that reach the layer being drawn. */
  holds?: Set<string>;
  flash?: { pos: string; kind: "active" | "active-error" } | null;
  heat?: BoardHeat | null;
  draggable?: boolean;
  onKeyMouseDown?: (e: ReactMouseEvent, pos: string) => void;
}

/**
 * One board of a keymap, drawn the way the typing page draws it. Shared by the practice board
 * (with highlights, hints and drag-remap) and by the layer preview in Settings, which only
 * needs the plain keycaps.
 */
export function BoardSvg({
  hw,
  layout,
  map,
  ready = true,
  homerow = false,
  expectedPos = null,
  holds,
  flash = null,
  heat = null,
  draggable = false,
  onKeyMouseDown,
}: BoardSvgProps) {
  return (
    <svg
      viewBox={layout.viewBox}
      className="w-full h-auto overflow-visible block select-none"
      style={{ maxWidth: layout.maxWidth }}
    >
      {ready &&
        layout.keys.map((k) => {
          const label = map[k.pos];
          const isHidden = label === BRAILLE_BLANK || label === "ø";
          const isBlank = isHidden || isBlankLabel(label);
          const displayLabel = isBlank ? "" : shortKeyLabel(label === " " ? "Space" : (label ?? ""));
          const flashKind = flash && flash.pos === k.pos ? flash.kind : null;
          const isExpected = !!expectedPos && k.pos === expectedPos;
          const onHomerow = homerow && isHomerow(hw, k.pos);

          const errCount = heat && label && !isHidden ? heat.counts[label.toLowerCase()] || 0 : 0;

          const fillClass = flashKind
            ? flashKind === "active"
              ? "fill-correct"
              : "fill-error"
            : onHomerow && !isExpected
              ? "fill-homerow"
              : "fill-key";
          const strokeClass = flashKind
            ? flashKind === "active"
              ? "stroke-correct"
              : "stroke-error"
            : isExpected || onHomerow
              ? "stroke-accent"
              : "stroke-edge";
          const textClass = isExpected
            ? "fill-expected font-extrabold"
            : onHomerow
              ? "fill-accent"
              : "fill-keytext font-medium";

          const rectStyle: CSSProperties = { opacity: isHidden ? 0 : 1 };
          if (!flashKind && errCount > 0 && heat) {
            const intensity = Math.min(errCount / heat.max, 1);
            const r = Math.round(heat.base[0] + intensity * (heat.peak[0] - heat.base[0]));
            const g = Math.round(heat.base[1] + intensity * (heat.peak[1] - heat.base[1]));
            const b = Math.round(heat.base[2] + intensity * (heat.peak[2] - heat.base[2]));
            rectStyle.fill = `rgb(${r},${g},${b})`;
          }

          const fontSize = displayLabel.length > 2 ? 12 : displayLabel.length > 1 ? 14 : 18;

          return (
            <g
              key={k.pos}
              id={`key-${k.pos}`}
              className={`key-group ${draggable ? "cursor-grab" : "cursor-default"}`}
              transform={k.transform}
              onMouseDown={onKeyMouseDown ? (e) => onKeyMouseDown(e, k.pos) : undefined}
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
                style={{ opacity: onHomerow && !isExpected ? 0.8 : 1 }}
                className={`pointer-events-none font-key ${textClass}`}
              >
                {displayLabel}
              </text>
              {holds?.has(k.pos) && (
                <text
                  x={k.w - 8}
                  y={11}
                  fontSize={11}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="fill-accent font-bold animate-pulse pointer-events-none"
                >
                  ↑
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
}
