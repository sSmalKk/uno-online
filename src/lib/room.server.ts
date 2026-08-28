// Helpers SERVIDOR-ONLY pra salas online (importa o cliente admin)
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createInitialState, reduce, type Action, type GameState } from "@/lib/game-reducer";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem ambíguos

export function generateCode(len = 4): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export async function loadRoom(code: string) {
  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!room) throw new Error("Sala não encontrada");

  const { data: players, error: pe } = await supabaseAdmin
    .from("room_players")
    .select("*")
    .eq("room_id", room.id)
    .order("seat");
  if (pe) throw new Error(pe.message);

  return { room, players: players || [] };
}

export async function applyAndSave(code: string, action: Action) {
  const { room } = await loadRoom(code);
  if (!room.state) throw new Error("Partida não iniciada");
  const newState = reduce(room.state as GameState, action);
  const { error } = await supabaseAdmin
    .from("rooms")
    .update({
      state: newState,
      turn_started_at: new Date().toISOString(),
      status: newState.finished ? "finished" : "playing",
    })
    .eq("id", room.id);
  if (error) throw new Error(error.message);
  return newState;
}

export function freshState(players?: number): GameState {
  return createInitialState(players);
}
