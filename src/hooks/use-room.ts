import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GameState } from "@/lib/game-reducer";

export type RoomRow = {
  id: string;
  code: string;
  host_id: string;
  max_players: number;
  status: "lobby" | "playing" | "finished";
  state: GameState | null;
  turn_started_at: string | null;
};

export type PlayerRow = {
  id: string;
  room_id: string;
  seat: number;
  player_id: string;
  name: string;
  is_bot: boolean;
  last_seen: string;
};

export function useRoom(code: string | null) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let stopped = false;
    let roomId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: r, error: re } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code!.toUpperCase())
        .maybeSingle();
      if (stopped) return;
      if (re) { setError(re.message); return; }
      if (!r) { setError("Sala não encontrada"); return; }
      setRoom(r as RoomRow);
      roomId = r.id;
      const { data: ps } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", r.id)
        .order("seat");
      if (stopped) return;
      setPlayers((ps || []) as PlayerRow[]);
    }

    load().then(() => {
      if (stopped || !roomId) return;
      channel = supabase
        .channel(`room:${roomId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
          (payload) => {
            if (payload.eventType === "DELETE") setRoom(null);
            else setRoom(payload.new as RoomRow);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
          async () => {
            const { data: ps } = await supabase
              .from("room_players")
              .select("*")
              .eq("room_id", roomId!)
              .order("seat");
            setPlayers((ps || []) as PlayerRow[]);
          }
        )
        .subscribe();
    });

    return () => {
      stopped = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  return { room, players, error };
}
