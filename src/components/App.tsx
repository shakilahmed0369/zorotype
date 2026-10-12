"use client";

import { useEffect } from "react";
import { useEngine } from "@/hooks/useEngine";
import { handleKeyDown, handleKeyUp, init } from "@/lib/engine";
import { BoardModal } from "./BoardModal";
import { CustomTextModal } from "./CustomTextModal";
import { Header } from "./Header";
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
      <TypingArea />
      {ui.textModalOpen && <CustomTextModal />}
      {ui.themeModalOpen && <ThemeModal />}
      {ui.boardModalOpen && <BoardModal />}
    </>
  );
}
