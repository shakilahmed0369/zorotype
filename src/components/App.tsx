"use client";

import { useEffect } from "react";
import { useEngine } from "@/hooks/useEngine";
import { handleKeyDown, handleKeyUp, init } from "@/lib/engine";
import { COMPANY_LABEL, COMPANY_URL } from "@/lib/seo";
import { BoardModal } from "./BoardModal";
import { CustomTextModal } from "./CustomTextModal";
import { Header } from "./Header";
import { HistoryPanel } from "./HistoryPanel";
import { SettingsMenu } from "./SettingsMenu";
import { TabRestartOverlay } from "./TabRestartOverlay";
import { ThemeModal } from "./ThemeModal";
import { Toast } from "./Toast";
import { TypingArea } from "./TypingArea";

export default function App() {
  const { ui } = useEngine();

  useEffect(() => {
    void init();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => handleKeyDown(e);
    const onKeyUp = (e: KeyboardEvent) => handleKeyUp(e);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // --- PWA SERVICE WORKER REGISTRATION ---
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.log("Service worker registration failed: ", err);
    });
  }, []);

  return (
    <>
      <Toast />
      <TabRestartOverlay />
      <Header />
      {ui.setupOpen && <SettingsMenu />}
      {ui.historyOpen && <HistoryPanel />}
      <main className="flex w-full flex-1 flex-col items-center">
        <TypingArea />
      </main>
      {/* Sits where the trainer's bottom padding used to, so the page still fits one screen. */}
      <footer className="w-full max-w-[1050px] flex justify-center items-center py-[12px] text-[11px] text-muted shrink-0">
        built by{" "}
        <a
          href={COMPANY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-[5px] text-correct transition-colors duration-300 hover:text-accent"
        >
          {COMPANY_LABEL}
        </a>
      </footer>
      {ui.textModalOpen && <CustomTextModal />}
      {ui.themeModalOpen && <ThemeModal />}
      {ui.boardModalOpen && <BoardModal />}
    </>
  );
}
