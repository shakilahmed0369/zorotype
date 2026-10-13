import { useEngine } from "@/hooks/useEngine";
import { openBoardModal } from "@/lib/engine";
import { HARDWARE } from "@/lib/hardware";

/**
 * The typing page's way into the keyboard list, kept out of the header so the board can be
 * switched without touching the test controls: it names the board being drawn and opens it for
 * a preview.
 */
export function KeyboardButton() {
  const { config } = useEngine();
  const name = HARDWARE[config.hw]?.name ?? config.hw;

  return (
    <button
      onClick={openBoardModal}
      title="Keyboard — browse every board and preview one"
      aria-label={`Keyboard: ${name}`}
      className="flex items-center gap-2 max-w-[220px] bg-key text-muted font-[inherit] text-[13px] px-3 py-2 rounded-full border-none cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.35)] transition-colors duration-300 hover:text-accent"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 block shrink-0" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M3.5 5.5h17a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM3.9 7h3v2h-3zM8.3 7h3v2h-3zM12.7 7h3v2h-3zM17.1 7h3v2h-3zM3.9 11h3v2h-3zM8.3 11h3v2h-3zM12.7 11h3v2h-3zM17.1 11h3v2h-3zM3.9 15h3v2h-3zM8.3 15h3v2h-3zM12.7 15h7.4v2h-7.4z"
        />
      </svg>
      <span className="truncate">{name}</span>
    </button>
  );
}
