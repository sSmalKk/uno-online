import { useSyncExternalStore } from "react";

type PlayerState = {
  name: string;
  id: string;
  coins: number;
  points: number;
};

const KEY = "uno:player-v2";
const DEFAULT: PlayerState = { name: "SHAMPOO", id: "82095529", coins: 999_999_999, points: 0 };

let state: PlayerState = load();
const listeners = new Set<() => void>();

function load(): PlayerState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

export const playerStore = {
  get: () => state,
  set: (patch: Partial<PlayerState>) => {
    state = { ...state, ...patch };
    persist();
  },
  addCoins: (delta: number) => {
    state = { ...state, coins: Math.max(0, state.coins + delta) };
    persist();
  },
  addPoints: (delta: number) => {
    state = { ...state, points: state.points + delta };
    persist();
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function usePlayer() {
  return useSyncExternalStore(
    playerStore.subscribe,
    () => state,
    () => DEFAULT
  );
}
