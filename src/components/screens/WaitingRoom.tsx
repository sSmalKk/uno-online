import { useEffect } from "react";
import { useScreen } from "@/lib/screen-store";
import { useRoom } from "@/hooks/use-room";
import { useServerFn } from "@tanstack/react-start";
import { startGame, leaveRoom, heartbeat } from "@/lib/room.functions";
import { getLocalPlayerId } from "@/lib/local-id";
import { GoldButton } from "@/components/GoldButton";
import { Copy, Bot, UserRound } from "lucide-react";

export function WaitingRoom() {
  const { roomCode, go } = useScreen();
  const { room, players, error } = useRoom(roomCode);
  const start = useServerFn(startGame);
  const leave = useServerFn(leaveRoom);
  const beat = useServerFn(heartbeat);

  const myId = getLocalPlayerId();
  const isHost = room?.host_id === myId;

  useEffect(() => {
    if (!roomCode) return;
    try { localStorage.setItem("activeRoomCode", roomCode); } catch {}
    const send = () => { beat({ data: { code: roomCode, playerId: myId } }).catch(() => {}); };
    send();
    const id = setInterval(send, 5000);
    return () => clearInterval(id);
  }, [roomCode, myId, beat]);

  // se sala já começou, vai pra mesa
  useEffect(() => {
    if (room?.status === "playing") {
      go("mesa-online", { mode: "sala", roomCode: room.code });
    }
  }, [room?.status, room?.code, go]);

  async function handleStart() {
    if (!roomCode) return;
    await start({ data: { code: roomCode, hostId: myId } });
    go("mesa-online", { mode: "sala", roomCode });
  }

  async function handleLeave() {
    try { localStorage.removeItem("activeRoomCode"); } catch {}
    if (roomCode) await leave({ data: { code: roomCode, playerId: myId } });
    go("lobby", { mode: "batalha", roomCode: null });
  }

  function copyCode() {
    if (room?.code) navigator.clipboard?.writeText(room.code);
  }

  if (error) {
    return (
      <div className="flex-1 grid place-items-center text-white p-4">
        <div className="text-center space-y-2">
          <div className="text-red-300">{error}</div>
          <GoldButton size="sm" onClick={handleLeave}>Voltar</GoldButton>
        </div>
      </div>
    );
  }

  const maxSeats = room?.max_players ?? 4;
  const seats = Array.from({ length: maxSeats }, (_, i) => players.find((p) => p.seat === i));

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-4 gap-3 text-white">
      <h1 className="text-2xl font-extrabold text-gold text-stroke-purple">Sala</h1>

      <button onClick={copyCode} className="flex items-center gap-2 bg-black/40 rounded-xl px-4 py-2">
        <span className="text-3xl font-extrabold tracking-[0.3em] text-gold">{room?.code ?? "..."}</span>
        <Copy className="h-4 w-4 opacity-70" />
      </button>
      <div className="text-[10px] opacity-70">toque pra copiar e compartilhar</div>

      <div className="w-full max-w-xs grid grid-cols-2 gap-2 mt-2">
        {seats.map((p, i) => (
          <div
            key={i}
            className={`rounded-xl border-2 p-2 flex items-center gap-2 ${p ? "border-gold/60 bg-white/10" : "border-dashed border-white/30 bg-black/20"}`}
          >
            <div className="h-8 w-8 rounded-full bg-white/20 grid place-items-center">
              {p ? (p.is_bot ? <Bot className="h-4 w-4" /> : <UserRound className="h-4 w-4" />) : <span className="text-xs opacity-60">{i + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{p?.name ?? "vazio"}</div>
              <div className="text-[9px] opacity-70">
                {p?.player_id === room?.host_id ? "host" : p ? (p.is_bot ? "bot" : "jogador") : "aguardando..."}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pb-2">
        {isHost ? (
          <GoldButton onClick={handleStart}>Começar partida</GoldButton>
        ) : (
          <div className="text-xs opacity-70">aguardando host iniciar...</div>
        )}
        <button onClick={handleLeave} className="text-[11px] underline opacity-70">sair da sala</button>
      </div>
    </div>
  );
}
