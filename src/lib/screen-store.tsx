import { createContext, useContext, useState, type ReactNode } from "react";

export type Screen = "lobby" | "selecao" | "regras" | "mesa" | "sala-entry" | "waiting" | "mesa-online";
export type Mode = "batalha" | "livre" | "sala";

type ScreenState = {
  screen: Screen;
  mode: Mode;
  ingresso: number;
  room: number;
  roomCode: string | null;
};

type ScreenContextValue = ScreenState & {
  go: (screen: Screen, patch?: Partial<ScreenState>) => void;
  set: (patch: Partial<ScreenState>) => void;
};

const DEFAULT: ScreenState = {
  screen: "lobby",
  mode: "batalha",
  ingresso: 100,
  room: 1,
  roomCode: null,
};

const ScreenContext = createContext<ScreenContextValue | null>(null);

export function ScreenProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScreenState>(DEFAULT);
  const value: ScreenContextValue = {
    ...state,
    go: (screen, patch = {}) => setState((s) => ({ ...s, ...patch, screen })),
    set: (patch) => setState((s) => ({ ...s, ...patch })),
  };
  return <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>;
}

export function useScreen() {
  const ctx = useContext(ScreenContext);
  if (!ctx) throw new Error("useScreen must be used within ScreenProvider");
  return ctx;
}
