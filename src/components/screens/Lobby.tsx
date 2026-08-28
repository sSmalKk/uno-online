import { useState } from "react";
import { HelpCircle, Volume2 } from "lucide-react";
import { useScreen } from "@/lib/screen-store";
import { useServerFn } from "@tanstack/react-start";
import { createRoom } from "@/lib/room.functions";
import { getLocalPlayerId, getLocalPlayerName } from "@/lib/local-id";

export function Lobby() {
  const { go } = useScreen();
  const create = useServerFn(createRoom);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handlePlayNow() {
    if (loading) return;
    setErr(null);
    setLoading(true);
    try {
      const name = getLocalPlayerName() || "Host";
      const res = await create({
        data: { hostId: getLocalPlayerId(), hostName: name, maxPlayers: 4 },
      });
      try { localStorage.setItem("activeRoomCode", res.code); } catch {}
      go("waiting", { mode: "sala", roomCode: res.code });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <UnoBigLogo className="absolute left-1/2 -translate-x-1/2 -top-12 z-10 pointer-events-none" />

      <div className="shrink-0 h-[100px]" />

      <div className="flex-1 flex items-center justify-center px-6">
        <h1
          className="text-center text-6xl font-extrabold italic text-gold text-stroke-purple"
          style={{ letterSpacing: 4 }}
        >
          UNO
        </h1>
      </div>

      <div className="flex flex-col items-center justify-end gap-2 pb-3">
        <button
          onClick={handlePlayNow}
          disabled={loading}
          className="rounded-full font-extrabold text-primary-foreground bg-gradient-gold border-2 border-[oklch(0.55_0.18_40)] shadow-gold active:translate-y-1 h-14 px-12 text-lg grid place-items-center disabled:opacity-70"
        >
          {loading ? "Criando sala..." : "Jogar agora"}
        </button>
        <button
          onClick={() => go("sala-entry")}
          className="rounded-full font-bold text-white bg-purple-mid/80 border-2 border-purple-mid h-10 px-6 text-sm grid place-items-center active:translate-y-0.5"
        >
          Sala com amigos
        </button>
        {err && <div className="text-red-300 text-xs">{err}</div>}
      </div>

      <div className="shrink-0 h-[60px] flex items-center justify-evenly px-4 gap-2">
        <button
          onClick={() => go("regras")}
          className="flex items-center gap-2 text-white text-sm bg-[#2e211d] rounded-full px-4 h-10 active:translate-y-0.5"
        >
          <HelpCircle className="h-4 w-4" />
          Como jogar
        </button>
        <button
          aria-label="Som"
          className="h-10 w-10 rounded-full bg-[#2e211d] text-white grid place-items-center active:translate-y-0.5"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function UnoBigLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div
        className="h-32 w-32 grid place-items-center rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 30%, #f59e0b 0%, #dc2626 70%)",
          border: "6px solid white",
          boxShadow: "0 10px 30px rgba(0,0,0,.55), inset 0 0 0 8px #b91c1c",
        }}
      >
        <span
          className="font-extrabold italic text-white"
          style={{ fontSize: 36, letterSpacing: 3, transform: "rotate(-14deg)", textShadow: "0 3px 0 #7f1d1d" }}
        >
          UNO
        </span>
      </div>
    </div>
  );
}
