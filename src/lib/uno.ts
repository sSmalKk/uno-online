export type CardColor = "red" | "yellow" | "green" | "blue" | "wild";
export type CardValue =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "reverse" | "draw2" | "wild" | "wild4";

export type Card = { id: string; color: CardColor; value: CardValue };

export const COLORS: Exclude<CardColor, "wild">[] = ["red", "yellow", "green", "blue"];

let cardIdCounter = 0;
function nextId() {
  cardIdCounter += 1;
  return `c${cardIdCounter}`;
}

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const color of COLORS) {
    deck.push({ id: nextId(), color, value: "0" });
    for (let n = 1; n <= 9; n++) {
      const v = String(n) as CardValue;
      deck.push({ id: nextId(), color, value: v });
      deck.push({ id: nextId(), color, value: v });
    }
    for (const v of ["skip", "reverse", "draw2"] as CardValue[]) {
      deck.push({ id: nextId(), color, value: v });
      deck.push({ id: nextId(), color, value: v });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: nextId(), color: "wild", value: "wild" });
    deck.push({ id: nextId(), color: "wild", value: "wild4" });
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isPlayable(
  card: Card,
  topColor: Exclude<CardColor, "wild">,
  topValue: CardValue,
): boolean {
  if (card.color === "wild") return true;
  if (card.color === topColor) return true;
  if (card.value === topValue) return true;
  return false;
}

export function hasPlayable(
  hand: Card[],
  topColor: Exclude<CardColor, "wild">,
  topValue: CardValue,
): boolean {
  return hand.some((c) => isPlayable(c, topColor, topValue));
}

export function reshuffleIfNeeded(
  drawPile: Card[],
  discardPile: Card[],
): { drawPile: Card[]; discardPile: Card[] } {
  if (drawPile.length > 0) return { drawPile, discardPile };
  if (discardPile.length <= 1) return { drawPile, discardPile };
  const top = discardPile[discardPile.length - 1];
  const rest = discardPile.slice(0, -1).map((c) =>
    c.value === "wild" || c.value === "wild4"
      ? { ...c, color: "wild" as const }
      : c,
  );
  return { drawPile: shuffle(rest), discardPile: [top] };
}

export function drawN(
  drawPile: Card[],
  discardPile: Card[],
  n: number,
): { drawn: Card[]; drawPile: Card[]; discardPile: Card[] } {
  const drawn: Card[] = [];
  let dp = drawPile;
  let cp = discardPile;
  for (let i = 0; i < n; i++) {
    if (dp.length === 0) {
      const r = reshuffleIfNeeded(dp, cp);
      dp = r.drawPile;
      cp = r.discardPile;
      if (dp.length === 0) break;
    }
    drawn.push(dp.pop()!);
  }
  return { drawn, drawPile: dp, discardPile: cp };
}

export function nextIndex(
  current: number,
  total: number,
  direction: 1 | -1,
  skip = 0,
): number {
  return ((current + direction * (1 + skip)) % total + total) % total;
}

export function deal(
  deck: Card[],
  players: number,
  perHand = 7,
): { hands: Card[][]; drawPile: Card[]; starter: Card } {
  const hands: Card[][] = Array.from({ length: players }, () => []);
  const dp = [...deck];
  for (let i = 0; i < perHand; i++) {
    for (let p = 0; p < players; p++) {
      const c = dp.pop();
      if (c) hands[p].push(c);
    }
  }
  // virar carta inicial — não pode ser wild4
  let starter: Card | undefined;
  while (dp.length) {
    const c = dp.pop()!;
    if (c.value === "wild4") {
      dp.unshift(c);
      continue;
    }
    starter = c;
    break;
  }
  return { hands, drawPile: dp, starter: starter! };
}

export const VALUE_LABEL: Record<CardValue, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  skip: "⊘",
  reverse: "⇄",
  draw2: "+2",
  wild: "★",
  wild4: "+4",
};

export const COLOR_HEX: Record<Exclude<CardColor, "wild">, string> = {
  red: "#dc2626",
  yellow: "#f59e0b",
  green: "#16a34a",
  blue: "#2563eb",
};
