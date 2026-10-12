import { useSyncExternalStore } from "react";
import {
  getConfigState,
  getGameState,
  getServerVersion,
  getUiState,
  getVersion,
  subscribe,
} from "@/lib/engine";

export function useEngine() {
  useSyncExternalStore(subscribe, getVersion, getServerVersion);
  return {
    config: getConfigState(),
    game: getGameState(),
    ui: getUiState(),
  };
}
