import { useEngine } from "@/hooks/useEngine";
import { startApp } from "@/lib/engine";
import { LogoIcon } from "./LogoIcon";

export function StartOverlay() {
  const { ui } = useEngine();
  if (ui.overlay === "hidden") return null;
  return (
    <div
      onClick={startApp}
      className={`fixed inset-0 bg-bg z-[3000] flex flex-col justify-center items-center cursor-pointer transition-opacity duration-300 ${
        ui.overlay === "fading" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-[3rem] text-correct mb-[5px] font-brand font-normal tracking-[-2px] pointer-events-none flex items-center justify-center gap-3 leading-none">
        <LogoIcon className="text-accent w-[50px] h-[50px] block" />
        zorotype
      </div>
      <div className="text-sm text-muted font-body mb-[30px] pointer-events-none text-center translate-x-[31px]">
        To love is to recognize
      </div>
      <p className="text-base text-accent m-0 pointer-events-none animate-pulse-soft text-center translate-x-[31px]">
        Click to continue
      </p>
    </div>
  );
}
