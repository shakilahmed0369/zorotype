import { useEngine } from "@/hooks/useEngine";

export function Toast() {
  const { ui } = useEngine();
  const toast = ui.toast;
  return (
    <div
      className={`fixed top-5 left-1/2 z-[9999] -translate-x-1/2 px-5 py-[10px] rounded-md text-sm font-bold pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        toast.visible ? "translate-y-0" : "-translate-y-[100px]"
      } ${toast.error ? "bg-error text-white" : "bg-accent text-bg"}`}
    >
      {toast.msg}
    </div>
  );
}
