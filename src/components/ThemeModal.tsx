import { useMemo, useState } from "react";
import { useEngine } from "@/hooks/useEngine";
import { closeThemeModal, setTheme } from "@/lib/engine";
import { listThemes } from "@/lib/themes";

export function ThemeModal() {
  const { config } = useEngine();
  const [query, setQuery] = useState("");

  const themes = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!q) return listThemes();
    return listThemes().filter((t) => t.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape") closeThemeModal();
      }}
      // Only a press that starts on the backdrop dismisses: releasing a drag from inside the panel
      // out here reports the backdrop as the click target too.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeThemeModal();
      }}
      className="fixed inset-0 bg-black/80 flex justify-center items-center z-[2100]"
    >
      <div className="bg-key p-[30px] rounded-xl w-[90%] max-w-[900px] flex flex-col max-h-[85vh]">
        <div className="flex items-center gap-4 mb-5">
          <h2 className="m-0 text-[20px] text-accent font-bold whitespace-nowrap">Themes</h2>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${listThemes().length} themes...`}
            className="flex-1 min-w-0 bg-edge text-correct border-2 border-muted px-3 py-2 rounded-lg font-[inherit] text-sm outline-none transition-all duration-200 focus:border-accent"
          />
          <button
            onClick={closeThemeModal}
            className="bg-transparent text-muted font-[inherit] text-[13px] cursor-pointer px-2 py-1 rounded-md transition-colors duration-300 outline-none hover:text-correct border border-solid border-muted"
          >
            Close
          </button>
        </div>

        {themes.length > 0 ? (
          <div className="overflow-y-auto grid gap-2 pr-2 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
            {themes.map((t) => {
              const active = t.name === config.theme;
              return (
                <button
                  key={t.name}
                  onClick={() => setTheme(t.name)}
                  style={{
                    backgroundColor: t.bg,
                    color: t.main,
                    borderColor: active ? t.main : "transparent",
                  }}
                  className="rounded-lg px-3 py-2 text-left border-2 cursor-pointer font-[inherit] transition-transform duration-150 hover:scale-[1.03]"
                >
                  <div className="text-[13px] font-bold truncate">{t.name}</div>
                  <div className="flex gap-1 mt-[6px]">
                    {[t.main, t.sub, t.subAlt, t.text, t.error].map((color, i) => (
                      <span
                        key={i}
                        style={{ backgroundColor: color }}
                        className="w-3 h-3 rounded-full border border-black/20"
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-muted text-sm py-8 text-center">No themes match &ldquo;{query}&rdquo;</div>
        )}
      </div>
    </div>
  );
}
