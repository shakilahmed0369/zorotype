import { useEngine } from "@/hooks/useEngine";

const KEY = "bg-bg text-correct px-3 py-[5px] rounded-md font-bold";
const LABEL = "text-muted font-bold ml-[10px]";

export function TabRestartOverlay() {
  const { game } = useEngine();
  // The result screen hands its second action to Tab too, so Enter and Space stay inert there.
  const canDrill = game.testCompleted && game.mistakes > 0;
  return (
    <div
      className={`fixed inset-0 bg-bg/85 z-[2500] flex flex-col justify-center items-center transition-opacity duration-[150ms] ease-in backdrop-blur-[2px] ${
        game.tabActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-key px-10 py-5 rounded-xl flex flex-col gap-[15px] shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-[15px]">
          <span className={KEY}>Tab</span> +
          <span className={KEY}>Enter</span>
          <span className={LABEL}>Restart Test</span>
        </div>
        {canDrill && (
          <div className="flex items-center gap-[15px]">
            <span className={KEY}>Tab</span> +
            <span className={KEY}>Space</span>
            <span className={LABEL}>Practice Mistakes</span>
          </div>
        )}
      </div>
    </div>
  );
}
