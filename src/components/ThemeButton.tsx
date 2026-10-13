import { useEngine } from "@/hooks/useEngine";
import { openThemeModal } from "@/lib/engine";
import { getTheme } from "@/lib/themes";

/**
 * The typing page's way into the theme list, sitting with the keyboard picker so both the board and
 * the palette can be changed without opening Settings. The dots are the current theme's colours,
 * the same swatch the Settings row shows.
 */
export function ThemeButton() {
  const { config } = useEngine();
  const theme = getTheme(config.theme);

  return (
    <button
      onClick={openThemeModal}
      title="Theme — pick from every palette"
      aria-label={`Theme: ${theme.name}`}
      className="flex items-center gap-2 max-w-[220px] bg-key text-muted font-[inherit] text-[13px] px-3 py-2 rounded-full border-none cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.35)] transition-colors duration-300 hover:text-accent"
    >
      <span className="flex gap-1 shrink-0">
        {[theme.main, theme.subAlt, theme.text, theme.error].map((color, i) => (
          <span
            key={i}
            style={{ backgroundColor: color }}
            className="w-3 h-3 rounded-full border border-black/20"
          />
        ))}
      </span>
      <span className="truncate">{theme.name}</span>
    </button>
  );
}
