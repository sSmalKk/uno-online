import {
  buildDeck,
  type Card,
  type CardColor,
  type CardValue,
  COLORS,
  deal,
  drawN,
  hasPlayable,
  isPlayable,
  nextIndex,
  shuffle,
} from "./uno";

export type GameState = {
  hands: Card[][];
  drawPile: Card[];
  discardPile: Card[]; // topo é o último
  currentColor: Exclude<CardColor, "wild">;
  turn: number;
  direction: 1 | -1;
  finished: boolean;
  winner: number | null;
  // quando jogador humano joga um wild, precisamos esperar a cor.
  // Para bot/local resolução automática, isso fica null.
  awaitingColorChoice: { player: number; isWild4: boolean } | null;
  log: string[];
};

export const PLAYERS = 4;
export const HUMAN = 0;

export type Action =
  | { type: "PLAY"; player: number; cardId: string; chosenColor?: Exclude<CardColor, "wild"> }
  | { type: "DRAW"; player: number }
  | { type: "CHOOSE_COLOR"; player: number; color: Exclude<CardColor, "wild"> }
  | { type: "CANCEL_COLOR" }
  | { type: "CPU_TURN" }
  | { type: "RESET" };

function topValue(state: GameState): CardValue {
  return state.discardPile[state.discardPile.length - 1].value;
}

export function getTopValue(state: GameState): CardValue {
  return topValue(state);
}

export function createInitialState(players = PLAYERS): GameState {
  const deck = shuffle(buildDeck());
  const { hands, drawPile, starter } = deal(deck, players, 7);
  const currentColor: Exclude<CardColor, "wild"> =
    starter.color === "wild" ? "red" : starter.color;
  let direction: 1 | -1 = 1;
  let turn = 0;
  let dp = drawPile;
  const newHands = hands.map((h) => [...h]);

  // efeitos da carta inicial
  if (starter.value === "skip") {
    turn = nextIndex(turn, players, direction);
  } else if (starter.value === "reverse") {
    direction = -1;
    if (players === 2) turn = nextIndex(turn, players, direction);
  } else if (starter.value === "draw2") {
    const r = drawN(dp, [starter], 2);
    newHands[0].push(...r.drawn);
    dp = r.drawPile;
    turn = nextIndex(turn, players, direction);
  }

  return {
    hands: newHands,
    drawPile: dp,
    discardPile: [starter],
    currentColor,
    turn,
    direction,
    finished: false,
    winner: null,
    awaitingColorChoice: null,
    log: [`Partida iniciada — carta ${starter.color} ${starter.value}`],
  };
}

function pickColorForBot(hand: Card[]): Exclude<CardColor, "wild"> {
  const counts: Record<Exclude<CardColor, "wild">, number> = {
    red: 0, yellow: 0, green: 0, blue: 0,
  };
  for (const c of hand) if (c.color !== "wild") counts[c.color]++;
  let best: Exclude<CardColor, "wild"> = "red";
  let bestN = -1;
  for (const c of COLORS) {
    if (counts[c] > bestN) { bestN = counts[c]; best = c; }
  }
  return best;
}

function applyPlay(
  state: GameState,
  player: number,
  card: Card,
  chosenColor: Exclude<CardColor, "wild"> | undefined,
): GameState {
  const total = state.hands.length;
  const newHand = state.hands[player].filter((c) => c.id !== card.id);
  const hands = state.hands.map((h, i) => (i === player ? newHand : h));
  const discardPile = [...state.discardPile, card];

  // venceu?
  if (newHand.length === 0) {
    return {
      ...state,
      hands,
      discardPile,
      finished: true,
      winner: player,
      currentColor: card.color === "wild" ? (chosenColor ?? "red") : card.color,
      awaitingColorChoice: null,
      log: [...state.log, `🏆 Jogador ${player + 1} venceu!`],
    };
  }

  let direction = state.direction;
  let turn = state.turn;
  let currentColor = state.currentColor;
  let drawPile = state.drawPile;
  let newHands = hands;

  if (card.color !== "wild") currentColor = card.color;

  switch (card.value) {
    case "skip": {
      turn = nextIndex(player, total, direction, 1);
      break;
    }
    case "reverse": {
      direction = (direction === 1 ? -1 : 1) as 1 | -1;
      if (total === 2) {
        turn = nextIndex(player, total, direction, 1);
      } else {
        turn = nextIndex(player, total, direction);
      }
      break;
    }
    case "draw2": {
      const victim = nextIndex(player, total, direction);
      const r = drawN(drawPile, discardPile, 2);
      newHands = hands.map((h, i) => (i === victim ? [...h, ...r.drawn] : h));
      drawPile = r.drawPile;
      // discardPile dentro de drawN só muda no reshuffle; manter o atual
      turn = nextIndex(player, total, direction, 1);
      break;
    }
    case "wild": {
      currentColor = chosenColor ?? pickColorForBot(state.hands[player]);
      turn = nextIndex(player, total, direction);
      break;
    }
    case "wild4": {
      currentColor = chosenColor ?? pickColorForBot(state.hands[player]);
      const victim = nextIndex(player, total, direction);
      const r = drawN(drawPile, discardPile, 4);
      newHands = hands.map((h, i) => (i === victim ? [...h, ...r.drawn] : h));
      drawPile = r.drawPile;
      turn = nextIndex(player, total, direction, 1);
      break;
    }
    default: {
      turn = nextIndex(player, total, direction);
    }
  }

  return {
    ...state,
    hands: newHands,
    drawPile,
    discardPile,
    currentColor,
    direction,
    turn,
    awaitingColorChoice: null,
    log: [...state.log, `Jogador ${player + 1} jogou ${card.color} ${card.value}`],
  };
}

function applyDraw(state: GameState, player: number): GameState {
  const total = state.hands.length;
  const r = drawN(state.drawPile, state.discardPile, 1);
  const drawn = r.drawn[0];
  if (!drawn) {
    // baralho seco e sem reshuffle possível — passa a vez
    return {
      ...state,
      turn: nextIndex(player, total, state.direction),
      log: [...state.log, `Jogador ${player + 1} passou`],
    };
  }
  const hands = state.hands.map((h, i) => (i === player ? [...h, drawn] : h));
  const tv = topValue(state);
  if (isPlayable(drawn, state.currentColor, tv)) {
    // mantém a vez para jogar a carta comprada (ou outra)
    return {
      ...state,
      hands,
      drawPile: r.drawPile,
      discardPile: r.discardPile,
      log: [...state.log, `Jogador ${player + 1} comprou uma carta`],
    };
  }
  // carta comprada não joga → passa a vez
  return {
    ...state,
    hands,
    drawPile: r.drawPile,
    discardPile: r.discardPile,
    turn: nextIndex(player, total, state.direction),
    log: [...state.log, `Jogador ${player + 1} comprou e passou`],
  };
}

function cpuChoose(state: GameState, player: number): Card | null {
  const hand = state.hands[player];
  const tv = topValue(state);
  const playable = hand.filter((c) => isPlayable(c, state.currentColor, tv));
  if (playable.length === 0) return null;
  // prioriza action cards, segura wild4 para o final
  const nonWild = playable.filter((c) => c.color !== "wild");
  if (nonWild.length > 0) {
    nonWild.sort((a, b) => {
      const score = (c: Card) =>
        c.value === "draw2" || c.value === "skip" || c.value === "reverse" ? 2 : 1;
      return score(b) - score(a);
    });
    return nonWild[0];
  }
  const wildOnly = playable.find((c) => c.value === "wild");
  if (wildOnly) return wildOnly;
  return playable[0];
}

export function reduce(state: GameState, action: Action): GameState {
  if (state.finished && action.type !== "RESET") return state;
  switch (action.type) {
    case "RESET":
      return createInitialState(state.hands.length || PLAYERS);
    case "CANCEL_COLOR":
      return { ...state, awaitingColorChoice: null };
    case "CHOOSE_COLOR": {
      // Sem suporte direto a CHOOSE_COLOR isolado: a UI envia PLAY com chosenColor.
      // Mantido por compat futura.
      if (!state.awaitingColorChoice) return state;
      return { ...state, currentColor: action.color, awaitingColorChoice: null };
    }
    case "PLAY": {
      if (state.turn !== action.player) return state;
      const card = state.hands[action.player].find((c) => c.id === action.cardId);
      if (!card) return state;
      const tv = topValue(state);
      if (!isPlayable(card, state.currentColor, tv)) return state;
      if ((card.value === "wild" || card.value === "wild4") && !action.chosenColor) {
        // humano precisa escolher a cor
        return {
          ...state,
          awaitingColorChoice: {
            player: action.player,
            isWild4: card.value === "wild4",
          },
          log: state.log,
        };
      }
      return applyPlay(state, action.player, card, action.chosenColor);
    }
    case "DRAW": {
      if (state.turn !== action.player) return state;
      return applyDraw(state, action.player);
    }
    case "CPU_TURN": {
      const p = state.turn;
      const card = cpuChoose(state, p);
      if (!card) {
        // não pode jogar → comprar
        return applyDraw(state, p);
      }
      const chosenColor =
        card.color === "wild" ? pickColorForBot(state.hands[p]) : undefined;
      return applyPlay(state, p, card, chosenColor);
    }
  }
}

export function currentHandHasPlayable(state: GameState, player: number): boolean {
  return hasPlayable(state.hands[player], state.currentColor, topValue(state));
}
