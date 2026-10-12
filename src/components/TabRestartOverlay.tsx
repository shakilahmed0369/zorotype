import { useEngine } from "@/hooks/useEngine";

export function TabRestartOverlay() {
  const { game } = useEngine();
  return (
    <div
      className={`fixed inset-0 bg-bg/85 z-[2500] flex flex-col justify-center items-center transition-opacity duration-[150ms] ease-in backdrop-blur-[2px] ${
        game.tabActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-key px-10 py-5 rounded-xl flex items-center gap-[15px] shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        <span className="bg-bg text-correct px-3 py-[5px] rounded-md font-bold">Tab</span> +
        <span className="bg-bg text-correct px-3 py-[5px] rounded-md font-bold">Enter</span>
        <span className="text-muted font-bold ml-[10px]">Restart Test</span>
      </div>
    </div>
  );
}
