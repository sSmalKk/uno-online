const KEY = "uno:player-id";
const NAME_KEY = "uno:player-name";

export function getLocalPlayerId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getLocalPlayerName(): string {
  if (typeof window === "undefined") return "Jogador";
  return localStorage.getItem(NAME_KEY) || `Você`;
}

export function setLocalPlayerName(name: string) {
  if (typeof window !== "undefined") localStorage.setItem(NAME_KEY, name);
}
