import { useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { HelpCircle, Music, Maximize2 } from "lucide-react";
import { UnoCard } from "@/components/UnoCard";
import { GoldButton } from "@/components/GoldButton";
import {
  createInitialState,
  currentHandHasPlayable,
  getTopValue,
  HUMAN,
  PLAYERS,
  reduce,
} from "@/lib/game-reducer";
import { COLOR_HEX, isPlayable, type Card, type CardColor } from "@/lib/uno";
import { playerStore, usePlayer } from "@/lib/player-store";
import { useScreen } from "@/lib/screen-store";
import avatar1 from "@/assets/avatar-1.png";
import avatar2 from "@/assets/avatar-2.png";
import avatar3 from "@/assets/avatar-3.png";
import avatarMe from "@/assets/avatar-me.png";
import { cn } from "@/lib/utils";

import { PagedHand } from "@/components/PagedHand";
import { MiniHand } from "@/components/MiniHand";

const AVATARS = [avatarMe, avatar1, avatar2, avatar3];
const NAMES = ["Você", "Ligo4710", "Zenmlsto", "Ligo8119"];

export function Mesa() {
  const { mode, ingresso, go } = useScreen();
  const { coins } = usePlayer();
  const [state, dispatch] = useReducer(reduce, undefined, () => createInitialState());
  const cpuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);
  const handRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const discardRef = useRef<HTMLDivElement | null>(null);
  const pendingAnim = useRef<{ from: DOMRect } | null>(null);
  const topCardKey = state.discardPile[state.discardPile.length - 1]?.id ?? "";

  useLayoutEffect(() => {
    const p = pendingAnim.current;
    if (!p) return;
    const el = discardRef.current;
    if (!el) return;
    const to = el.getBoundingClientRect();
    const dx = p.from.left - to.left;
    const dy = p.from.top - to.top;
    el.style.transformOrigin = "top left";
    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transition = "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.transform = "translate(0,0)";
    });
    pendingAnim.current = null;
  }, [topCardKey]);

  const pot = mode === "batalha" ? ingresso * PLAYERS : 0;

  useEffect(() => {
    if (mode === "batalha") playerStore.addCoins(-ingresso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.finished) return;
    if (state.awaitingColorChoice) return;
    if (state.turn !== HUMAN) {
      cpuTimer.current = setTimeout(() => dispatch({ type: "CPU_TURN" }), 900 + Math.random() * 700);
      return () => {
        if (cpuTimer.current) clearTimeout(cpuTimer.current);
      };
    }
  }, [state.turn, state.finished, state.awaitingColorChoice, state.discardPile.length]);

  useEffect(() => {
    if (state.finished && !settledRef.current) {
      settledRef.current = true;
      if (state.winner === HUMAN) {
        const prize = mode === "batalha" ? Math.floor(pot * 0.95) : 0;
        if (prize) playerStore.addCoins(prize);
        playerStore.addPoints(2);
      } else if (mode === "batalha") {
        playerStore.addPoints(2);
      }
    }
  }, [state.finished, state.winner, mode, pot]);

  function captureFlight(card: Card) {
    const el = handRefs.current.get(card.id);
    if (!el) return;
    pendingAnim.current = { from: el.getBoundingClientRect() };
  }

  function handleCardClick(card: Card) {
    if (state.turn !== HUMAN || state.finished) return;
    if (!isPlayable(card, state.currentColor, getTopValue(state))) return;
    if (card.value === "wild" || card.value === "wild4") {
      // pede cor
      dispatch({ type: "PLAY", player: HUMAN, cardId: card.id });
      return;
    }
    captureFlight(card);
    dispatch({ type: "PLAY", player: HUMAN, cardId: card.id });
  }

  function pickColor(color: Exclude<CardColor, "wild">) {
    if (!state.awaitingColorChoice) return;
    // jogar a última carta selecionada (precisa achar a wild que está pendente)
    // Como o reducer guarda apenas { player, isWild4 }, a carta ainda está na mão.
    // Vamos pegar a primeira wild/wild4 disponível do humano que casa com isWild4.
    const player = state.awaitingColorChoice.player;
    const wantWild4 = state.awaitingColorChoice.isWild4;
    const card = state.hands[player].find((c) =>
      wantWild4 ? c.value === "wild4" : c.value === "wild",
    );
    if (!card) {
      dispatch({ type: "CANCEL_COLOR" });
      return;
    }
    captureFlight(card);
    dispatch({ type: "PLAY", player, cardId: card.id, chosenColor: color });
  }

  const seats = [
    { i: 1, pos: "left" as const },
    { i: 2, pos: "top" as const },
    { i: 3, pos: "right" as const },
  ];

  const top = state.discardPile[state.discardPile.length - 1];
  const myHand = state.hands[HUMAN];
  const canPlayAnything = currentHandHasPlayable(state, HUMAN);

  return (
    <>
      <div className="shrink-0 h-[48px] px-3 pt-2 flex items-center justify-between text-white">
        <div className="flex items-center gap-2 pl-12">
          <div className="leading-tight">
            <div className="text-[11px] font-bold">{mode === "batalha" ? "Batalha" : "Livre"} • 💰 {coins}</div>
            <div className="text-[9px] opacity-70">Baralho: {state.drawPile.length}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ColorBadge color={state.currentColor} />
          <button onClick={() => go("regras")} className="h-7 w-7 rounded-full bg-gradient-gold border border-[oklch(0.55_0.18_40)] grid place-items-center text-primary-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          <button className="h-7 w-7 rounded-full bg-gradient-gold border border-[oklch(0.55_0.18_40)] grid place-items-center text-primary-foreground">
            <Music className="h-3.5 w-3.5" />
          </button>
          <button className="h-7 w-7 rounded-full bg-gradient-gold border border-[oklch(0.55_0.18_40)] grid place-items-center text-primary-foreground">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 mx-2 rounded-2xl border-2 border-dashed border-white/30 relative overflow-hidden">
        {seats.map((s) => (
          <Seat
            key={s.i}
            pos={s.pos}
            name={NAMES[s.i]}
            avatar={AVATARS[s.i]}
            count={state.hands[s.i].length}
            active={state.turn === s.i && !state.finished}
          />
        ))}

        <div className="absolute inset-0 flex items-center justify-center gap-3">
          {/* Pilha de compra */}
          <button
            type="button"
            onClick={() => {
              if (state.turn === HUMAN && !state.finished && !canPlayAnything) {
                dispatch({ type: "DRAW", player: HUMAN });
              }
            }}
            disabled={state.turn !== HUMAN || state.finished || canPlayAnything}
            className="relative active:scale-95 transition disabled:opacity-80"
            aria-label="Comprar carta"
          >
            <UnoCard variant="back" size="md" />
            <span className="absolute -bottom-2 -right-2 text-[9px] font-extrabold text-white bg-secondary/90 rounded-full px-1 leading-tight border border-white/50">
              {state.drawPile.length}
            </span>
          </button>

          {/* Descarte */}
          <div ref={discardRef}>
            {top && <UnoCard card={top} size="md" />}
          </div>
        </div>

        {state.finished && (
          <ResultOverlay
            won={state.winner === HUMAN}
            prize={state.winner === HUMAN && mode === "batalha" ? Math.floor(pot * 0.95) : 0}
            mode={mode}
            onPlayAgain={() => {
              settledRef.current = false;
              if (mode === "batalha") {
                if (playerStore.get().coins < ingresso) {
                  go("lobby");
                  return;
                }
                playerStore.addCoins(-ingresso);
              }
              dispatch({ type: "RESET" });
            }}
            onExit={() => go("lobby")}
          />
        )}

        {state.awaitingColorChoice && (
          <div className="absolute inset-0 bg-black/60 grid place-items-center z-30">
            <div className="bg-gradient-card-light rounded-2xl p-3 text-secondary text-center">
              <p className="font-bold mb-2 text-sm">Escolha uma cor</p>
              <div className="grid grid-cols-2 gap-2">
                {(["red", "yellow", "green", "blue"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => pickColor(c)}
                    className="h-10 w-20 rounded-lg border-2 border-white/40 active:scale-95"
                    style={{ background: COLOR_HEX[c] }}
                    aria-label={c}
                  />
                ))}
              </div>
              <button
                onClick={() => dispatch({ type: "CANCEL_COLOR" })}
                className="mt-2 text-[10px] underline opacity-70"
              >
                cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 h-[70px] mx-2 my-2 border-y-2 border-emerald-500/40 px-1 py-1">
        <PagedHand
          cards={myHand}
          canInteract={state.turn === HUMAN && !state.finished && !state.awaitingColorChoice}
          isPlayable={(c) => isPlayable(c, state.currentColor, getTopValue(state))}
          onCardClick={handleCardClick}
          registerRef={(id, el) => { handRefs.current.set(id, el); }}
        />
      </div>
    </>
  );
}

function ColorBadge({ color }: { color: Exclude<CardColor, "wild"> }) {
  return (
    <div
      className="h-7 w-7 rounded-full border border-white/60 shadow"
      style={{ background: COLOR_HEX[color] }}
      title={`Cor atual: ${color}`}
    />
  );
}

function Seat({
  pos, name, avatar, count, active,
}: { pos: "top" | "left" | "right"; name: string; avatar: string; count: number; active: boolean }) {
  const posClasses = {
    top: "top-1 left-1/2 -translate-x-1/2 flex-row",
    left: "left-1 top-1/2 -translate-y-1/2 flex-col",
    right: "right-1 top-1/2 -translate-y-1/2 flex-col",
  }[pos];

  return (
    <div className={cn("absolute flex items-center gap-1 z-10", posClasses)}>
      <div className={cn("relative shrink-0", active && "ring-2 ring-gold rounded-full")}>
        <img src={avatar} alt={name} width={32} height={32} className="h-8 w-8 rounded-full object-cover bg-white/20" />
      </div>
      <MiniHand count={count} />
    </div>
  );
}

function ResultOverlay({
  won, prize, mode, onPlayAgain, onExit,
}: { won: boolean; prize: number; mode: string; onPlayAgain: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 bg-black/70 grid place-items-center z-40 p-3">
      <div className="bg-gradient-card-light rounded-2xl p-4 w-full max-w-[240px] text-center text-secondary">
        <h2 className="text-lg font-extrabold mb-1">{won ? "Vitória! 🏆" : "Fim de jogo"}</h2>
        <p className="text-xs mb-1">
          {won
            ? mode === "batalha"
              ? `Você ganhou ${prize} moedas`
              : "Você venceu!"
            : "Mais sorte na próxima."}
        </p>
        <p className="text-[10px] opacity-70 mb-2">+2 Pontos de UNO</p>
        <div className="flex flex-col gap-1 items-center">
          <GoldButton size="sm" onClick={onPlayAgain}>Jogar novamente</GoldButton>
          <button onClick={onExit} className="text-[10px] underline opacity-70">Sair</button>
        </div>
      </div>
    </div>
  );
}
