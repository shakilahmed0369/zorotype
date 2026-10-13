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
      className="flex items-center h-9 px-3 bg-key rounded-full border-none cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-[1.06]"
    >
      <span className="flex gap-1">
        {[theme.main, theme.subAlt, theme.text, theme.error].map((color, i) => (
          <span
            key={i}
            style={{ backgroundColor: color }}
            className="w-3.5 h-3.5 rounded-full border border-black/20"
          />
        ))}
      </span>
    </button>
  );
}
