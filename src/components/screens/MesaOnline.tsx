import { useEffect, useRef, useState } from "react";
import { HelpCircle, UserRoundCheck } from "lucide-react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { UnoCard } from "@/components/UnoCard";
import { GoldButton } from "@/components/GoldButton";
import { PagedHand } from "@/components/PagedHand";
import { MiniHand } from "@/components/MiniHand";
import { useScreen } from "@/lib/screen-store";
import { useRoom } from "@/hooks/use-room";
import { useServerFn } from "@tanstack/react-start";
import {
  deactivateBot,
  drawCard,
  heartbeat,
  playCard,
  resetGame,
  tickTurn,
} from "@/lib/room.functions";
import { getLocalPlayerId, getLocalPlayerName } from "@/lib/local-id";
import { COLOR_HEX, isPlayable, type Card, type CardColor } from "@/lib/uno";
import { getTopValue } from "@/lib/game-reducer";
import { cn } from "@/lib/utils";


const AFK_SECONDS = 60;
const RING_COLORS: ["#F7B801", "#F7B801", "#A30000"] = ["#F7B801", "#F7B801", "#A30000"];
const RING_COLORS_TIME: [number, number, number] = [60, 20, 0];

function TurnRing({
  startedAt,
  duration,
  size,
  stroke,
  children,
}: {
  startedAt: number;
  duration: number;
  size: number;
  stroke: number;
  children: React.ReactNode;
}) {
  const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
  const initialRemaining = Math.max(0, duration - elapsed);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <CountdownCircleTimer
        key={startedAt}
        isPlaying
        duration={duration}
        initialRemainingTime={initialRemaining}
        size={size}
        strokeWidth={stroke}
        trailColor="rgba(247,184,1,0.18)"
        colors={RING_COLORS}
        colorsTime={RING_COLORS_TIME}
      >
        {() => null}
      </CountdownCircleTimer>
      <div className="absolute inset-0 grid place-items-center" style={{ padding: stroke + 2 }}>
        <div className="h-full w-full rounded-full bg-purple-mid grid place-items-center text-white font-extrabold">
          {children}
        </div>
      </div>
    </div>
  );
}

export function MesaOnline() {
  const { roomCode, go } = useScreen();
  const { room, players, error } = useRoom(roomCode);
  const play = useServerFn(playCard);
  const draw = useServerFn(drawCard);
  const beat = useServerFn(heartbeat);
  const tick = useServerFn(tickTurn);
  const reset = useServerFn(resetGame);
  const disableBot = useServerFn(deactivateBot);
  const handRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const [pendingWild, setPendingWild] = useState<Card | null>(null);

  const myId = getLocalPlayerId();
  const me = players.find((p) => p.player_id === myId);
  const isHost = room?.host_id === myId;
  const state = room?.state ?? null;
  const mySeat = me?.seat ?? -1;
  const isMySeatTurn = !!state && state.turn === mySeat && !state.finished;
  const isMyTurn = isMySeatTurn && !me?.is_bot;
  const isBotActiveForMe = !!me?.is_bot && !!state && !state.finished;

  useEffect(() => {
    if (!roomCode) return;
    try { localStorage.setItem("activeRoomCode", roomCode); } catch {}
    const id = setInterval(() => { beat({ data: { code: roomCode, playerId: myId } }).catch(() => {}); }, 15000);
    return () => clearInterval(id);
  }, [roomCode, myId, beat]);

  useEffect(() => {
    if (state?.finished) {
      try { localStorage.removeItem("activeRoomCode"); } catch {}
    }
  }, [state?.finished]);

  useEffect(() => {
    if (!isHost || !roomCode) return;
    const id = setInterval(() => {
      tick({ data: { code: roomCode, hostId: myId, afkSeconds: AFK_SECONDS } }).catch(() => {});
    }, 1500);
    return () => clearInterval(id);
  }, [isHost, roomCode, myId, tick]);

  const turnPlayer = state ? players.find((p) => p.seat === state.turn) : null;
  const turnStarted = room?.turn_started_at ? new Date(room.turn_started_at).getTime() : 0;
  const timerActive = !!turnPlayer && !state?.finished && turnStarted > 0;

  async function handleCardClick(c: Card) {
    if (!roomCode || !state || !isMyTurn) return;
    if (!isPlayable(c, state.currentColor, getTopValue(state))) return;
    if (c.value === "wild" || c.value === "wild4") {
      setPendingWild(c);
      return;
    }
    try { await play({ data: { code: roomCode, playerId: myId, cardId: c.id } }); } catch {}
  }

  async function pickColor(color: Exclude<CardColor, "wild">) {
    if (!roomCode || !pendingWild) return;
    const card = pendingWild;
    setPendingWild(null);
    try {
      await play({ data: { code: roomCode, playerId: myId, cardId: card.id, chosenColor: color } });
    } catch {}
  }

  async function handleDraw() {
    if (!roomCode || !isMyTurn) return;
    try { await draw({ data: { code: roomCode, playerId: myId } }); } catch {}
  }

  async function handleDeactivateBot() {
    if (!roomCode) return;
    try {
      await disableBot({ data: { code: roomCode, playerId: myId, name: getLocalPlayerName() || "Jogador" } });
    } catch {}
  }

  if (error || !room) {
    return (
      <div className="flex-1 grid place-items-center text-white">
        <div className="text-center space-y-2">
          <div>{error ?? "Carregando..."}</div>
          <GoldButton size="sm" onClick={() => go("lobby", { roomCode: null, mode: "batalha" })}>Sair</GoldButton>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex-1 grid place-items-center text-white">
        <div>Preparando partida...</div>
      </div>
    );
  }

  const myHand: Card[] = mySeat >= 0 ? state.hands[mySeat] ?? [] : [];
  const top = state.discardPile[state.discardPile.length - 1];
  const hasAnyPlay = myHand.some((c) => isPlayable(c, state.currentColor, getTopValue(state)));

  const otherSeats = players
    .filter((p) => p.seat !== mySeat)
    .map((p, idx, arr) => ({
      ...p,
      pos: (arr.length === 1 ? "top" : idx === 0 ? "left" : idx === 1 ? "top" : "right") as "top" | "left" | "right",
    }));

  return (
    <>
      <div className="relative shrink-0 h-[48px] px-3 pt-2 flex items-center justify-between text-white">
        <div className="flex items-center gap-2 pl-12">
          <div className="leading-tight">
            <div className="text-[11px] font-bold">Sala {room.code}</div>
            <div className="text-[9px] opacity-70">Baralho: {state.drawPile.length}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ColorBadge color={state.currentColor} />
          <button onClick={() => go("regras")} className="h-7 w-7 rounded-full bg-gradient-gold border border-[oklch(0.55_0.18_40)] grid place-items-center text-primary-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 mx-2 overflow-visible">
        {isBotActiveForMe && (
          <div className="absolute inset-0 z-30 flex items-center justify-center px-3 pointer-events-none">
            <button
              type="button"
              onClick={handleDeactivateBot}
              className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-gradient-gold px-6 text-base font-extrabold text-primary-foreground shadow-gold active:translate-y-1"
            >
              <UserRoundCheck className="h-5 w-5" />
              Bot ativo — desativar
            </button>
          </div>
        )}

        {otherSeats.map((p) => {
          const seatActive = state.turn === p.seat && !state.finished;
          return (
            <SeatLite
              key={p.id}
              pos={p.pos}
              name={p.name}
              count={state.hands[p.seat]?.length ?? 0}
              active={seatActive}
              isBot={p.is_bot}
              turnStarted={seatActive && timerActive ? turnStarted : 0}
            />
          );
        })}

        <div className="absolute inset-x-2 top-12 bottom-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleDraw}
            disabled={!isMyTurn || hasAnyPlay}
            className="relative active:scale-95 transition disabled:opacity-70"
            aria-label="Comprar carta"
          >
            <UnoCard variant="back" size="md" />
            <span className="absolute -bottom-2 -right-2 text-[9px] font-extrabold text-white bg-secondary/90 rounded-full px-1 leading-tight border border-white/50">
              {state.drawPile.length}
            </span>
          </button>

          {top && <UnoCard card={top} size="md" />}
        </div>


        {state.finished && (
          <div className="absolute inset-0 bg-black/70 grid place-items-center z-40 p-3">
            <div className="bg-gradient-card-light rounded-2xl p-4 w-full max-w-[240px] text-center text-secondary">
              <h2 className="text-lg font-extrabold mb-1">
                {state.winner === mySeat ? "Vitória! 🏆" : `${players.find((p) => p.seat === state.winner)?.name ?? "Alguém"} venceu`}
              </h2>
              <div className="flex gap-2 justify-center mt-2">
                {isHost && (
                  <GoldButton size="sm" onClick={() => roomCode && reset({ data: { code: roomCode, hostId: myId } })}>
                    Nova partida
                  </GoldButton>
                )}
                <GoldButton size="sm" onClick={() => go("lobby", { roomCode: null, mode: "batalha" })}>Sair</GoldButton>
              </div>
            </div>
          </div>
        )}

        {pendingWild && (
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
                onClick={() => setPendingWild(null)}
                className="mt-2 text-[10px] underline opacity-70"
              >
                cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 h-[70px] mx-2 my-2 px-1 py-1 relative rounded-xl bg-black/40 border border-white/10">
        {isMySeatTurn && !state.finished && timerActive && (
          <div className="absolute -top-7 right-2 z-20">
            <TurnRing startedAt={turnStarted} duration={AFK_SECONDS} size={52} stroke={4}>
              <span className="text-[10px]">EU</span>
            </TurnRing>
          </div>
        )}
        <div className="relative z-10 h-full w-full">
          <PagedHand
            cards={myHand}
            canInteract={isMyTurn && !pendingWild}
            isPlayable={(c) => isPlayable(c, state.currentColor, getTopValue(state))}
            onCardClick={handleCardClick}
            registerRef={(id, el) => { handRefs.current.set(id, el); }}
          />
        </div>
      </div>
    </>
  );
}

function ColorBadge({ color }: { color: Exclude<CardColor, "wild"> }) {
  return (
    <div
      className="h-6 w-6 rounded-full border border-white/60 shadow"
      style={{ background: COLOR_HEX[color] }}
      title={`Cor atual: ${color}`}
    />
  );
}

function SeatLite({
  pos, name, count, active, isBot, turnStarted,
}: { pos: "top" | "left" | "right"; name: string; count: number; active: boolean; isBot: boolean; turnStarted: number }) {
  const posClasses = {
    top: "top-1 left-1/2 -translate-x-1/2 flex-row",
    left: "left-1 top-1/2 -translate-y-1/2 flex-col",
    right: "right-1 top-1/2 -translate-y-1/2 flex-col",
  }[pos];
  const label = isBot ? "🤖" : name.slice(0, 2).toUpperCase();
  return (
    <div className={cn("absolute flex items-center gap-1 z-10", posClasses)}>
      {active && turnStarted > 0 ? (
        <TurnRing startedAt={turnStarted} duration={AFK_SECONDS} size={44} stroke={3}>
          <span className="text-[10px]">{label}</span>
        </TurnRing>
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-full p-1 bg-white/20">
          <div className="h-full w-full rounded-full bg-purple-mid grid place-items-center text-[10px] font-bold text-white">
            {label}
          </div>
        </div>
      )}
      <MiniHand count={count} />
    </div>
  );
}
