import { useState } from "react";
import { useScreen } from "@/lib/screen-store";
import { GoldButton } from "@/components/GoldButton";
import { useServerFn } from "@tanstack/react-start";
import { createRoom, joinRoom } from "@/lib/room.functions";
import { getLocalPlayerId, getLocalPlayerName, setLocalPlayerName } from "@/lib/local-id";

export function SalaEntry() {
  const { go } = useScreen();
  const create = useServerFn(createRoom);
  const join = useServerFn(joinRoom);
  const [tab, setTab] = useState<"criar" | "entrar">("criar");
  const [maxPlayers, setMaxPlayers] = useState<2 | 4>(4);
  const [name, setName] = useState(getLocalPlayerName());
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    setErr(null); setLoading(true);
    try {
      setLocalPlayerName(name);
      const res = await create({
        data: { hostId: getLocalPlayerId(), hostName: name || "Host", maxPlayers },
      });
      try { localStorage.setItem("activeRoomCode", res.code); } catch {}
      go("waiting", { mode: "sala", roomCode: res.code });
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    setErr(null); setLoading(true);
    try {
      setLocalPlayerName(name);
      const c = code.trim().toUpperCase();
      await join({ data: { code: c, playerId: getLocalPlayerId(), name: name || "Jogador" } });
      try { localStorage.setItem("activeRoomCode", c); } catch {}
      go("waiting", { mode: "sala", roomCode: c });
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3 text-white">
      <h1 className="text-3xl font-extrabold text-gold text-stroke-purple">Sala</h1>

      <div className="flex gap-1 bg-black/30 rounded-full p-1">
        <button
          onClick={() => setTab("criar")}
          className={`px-4 py-1 rounded-full text-sm font-bold ${tab === "criar" ? "bg-gradient-gold text-primary-foreground" : "text-white/70"}`}
        >Criar</button>
        <button
          onClick={() => setTab("entrar")}
          className={`px-4 py-1 rounded-full text-sm font-bold ${tab === "entrar" ? "bg-gradient-gold text-primary-foreground" : "text-white/70"}`}
        >Entrar</button>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Seu nome"
        maxLength={20}
        className="w-56 rounded-lg bg-white/10 border border-white/30 px-3 py-2 text-center"
      />

      {tab === "criar" ? (
        <>
          <div className="text-xs opacity-80">Jogadores na sala</div>
          <div className="flex gap-2">
            {[2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setMaxPlayers(n as 2 | 4)}
                className={`h-12 w-12 rounded-xl font-extrabold ${maxPlayers === n ? "bg-gradient-gold text-primary-foreground" : "bg-white/10 text-white"}`}
              >{n}</button>
            ))}
          </div>
          <GoldButton onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "..." : "Criar sala"}
          </GoldButton>
        </>
      ) : (
        <>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            maxLength={6}
            className="w-40 rounded-lg bg-white/10 border border-white/30 px-3 py-2 text-center text-2xl font-extrabold tracking-widest"
          />
          <GoldButton onClick={handleJoin} disabled={loading || !code.trim() || !name.trim()}>
            {loading ? "..." : "Entrar"}
          </GoldButton>
        </>
      )}

      {err && <div className="text-red-300 text-xs">{err}</div>}
    </div>
  );
}
