import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { applyAndSave, freshState, generateCode, loadRoom } from "@/lib/room.server";
import type { GameState } from "@/lib/game-reducer";
import { reduce } from "@/lib/game-reducer";

const colorSchema = z.union([
  z.literal("red"),
  z.literal("yellow"),
  z.literal("green"),
  z.literal("blue"),
]);

const BOT_NAMES = ["Bot Léo", "Bot Maju", "Bot Tito", "Bot Nina"];
const UNCONFIRMED_LAST_SEEN = "1970-01-01T00:00:00.000Z";

export const createRoom = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      hostId: z.string().min(1).max(64),
      hostName: z.string().min(1).max(40),
      maxPlayers: z.union([z.literal(2), z.literal(4)]),
    }).parse
  )
  .handler(async ({ data }) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateCode();
      const { data: room, error } = await supabaseAdmin
        .from("rooms")
        .insert({
          code,
          host_id: data.hostId,
          max_players: data.maxPlayers,
          status: "lobby",
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") continue;
        throw new Error(error.message);
      }
      const { error: pe } = await supabaseAdmin.from("room_players").insert({
        room_id: room.id,
        seat: 0,
        player_id: data.hostId,
        name: data.hostName,
        is_bot: false,
      });
      if (pe) throw new Error(pe.message);
      return { code: room.code, roomId: room.id };
    }
    throw new Error("Não foi possível gerar código único");
  });

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(3).max(8),
      playerId: z.string().min(1).max(64),
      name: z.string().min(1).max(40),
    }).parse
  )
  .handler(async ({ data }) => {
    const { room, players } = await loadRoom(data.code);
    if (room.status !== "lobby") throw new Error("Sala já começou");

    const existing = players.find((p) => p.player_id === data.playerId);
    if (existing) return { roomId: room.id, seat: existing.seat };

    if (players.length >= room.max_players) throw new Error("Sala cheia");

    const used = new Set(players.map((p) => p.seat));
    let seat = 0;
    while (used.has(seat)) seat++;

    const { error } = await supabaseAdmin.from("room_players").insert({
      room_id: room.id,
      seat,
      player_id: data.playerId,
      name: data.name,
      is_bot: false,
      last_seen: UNCONFIRMED_LAST_SEEN,
    });
    if (error) throw new Error(error.message);
    return { roomId: room.id, seat };
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(3).max(8),
      playerId: z.string().min(1).max(64),
    }).parse
  )
  .handler(async ({ data }) => {
    const { room } = await loadRoom(data.code);
    if (room.status === "lobby") {
      await supabaseAdmin
        .from("room_players")
        .delete()
        .eq("room_id", room.id)
        .eq("player_id", data.playerId);
      const { count } = await supabaseAdmin
        .from("room_players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id);
      if (!count) await supabaseAdmin.from("rooms").delete().eq("id", room.id);
    }
    return { ok: true };
  });

export const startGame = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(3).max(8),
      hostId: z.string().min(1).max(64),
    }).parse
  )
  .handler(async ({ data }) => {
    const { room, players } = await loadRoom(data.code);
    if (room.host_id !== data.hostId) throw new Error("Só o host pode iniciar");
    if (room.status === "playing") return { ok: true };
    if (room.status !== "lobby") throw new Error("Sala já finalizou");

    const humansToBot = players.filter((p) => !p.is_bot && p.player_id !== room.host_id);
    const botUpdates = await Promise.all(humansToBot.map((p) => supabaseAdmin
      .from("room_players")
      .update({ is_bot: true, name: BOT_NAMES[p.seat % BOT_NAMES.length] })
      .eq("id", p.id)));
    const botUpdateError = botUpdates.find((result) => result.error)?.error;
    if (botUpdateError) throw new Error(botUpdateError.message);

    const used = new Set(players.map((p) => p.seat));
    const inserts = [];
    for (let s = 0; s < room.max_players; s++) {
      if (!used.has(s)) {
        inserts.push({
          room_id: room.id,
          seat: s,
          player_id: `bot-${room.id}-${s}`,
          name: BOT_NAMES[s % BOT_NAMES.length],
          is_bot: true,
        });
      }
    }
    if (inserts.length) {
      const { error } = await supabaseAdmin.from("room_players").insert(inserts);
      if (error) throw new Error(error.message);
    }

    const state = freshState(room.max_players);

    const { error } = await supabaseAdmin
      .from("rooms")
      .update({
        state,
        status: "playing",
        turn_started_at: new Date().toISOString(),
      })
      .eq("id", room.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const playCard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(3).max(8),
      playerId: z.string().min(1).max(64),
      cardId: z.string().min(1).max(64),
      chosenColor: colorSchema.optional(),
    }).parse
  )
  .handler(async ({ data }) => {
    const { room, players } = await loadRoom(data.code);
    const me = players.find((p) => p.player_id === data.playerId);
    if (!me) throw new Error("Você não está nessa sala");
    const state = room.state as GameState | null;
    if (!state) throw new Error("Partida não iniciada");
    if (state.turn !== me.seat) return { state, stale: true as const };

    const newState = await applyAndSave(data.code, {
      type: "PLAY",
      player: me.seat,
      cardId: data.cardId,
      chosenColor: data.chosenColor,
    });
    return { state: newState };
  });

export const drawCard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(3).max(8),
      playerId: z.string().min(1).max(64),
    }).parse
  )
  .handler(async ({ data }) => {
    const { room, players } = await loadRoom(data.code);
    const me = players.find((p) => p.player_id === data.playerId);
    if (!me) throw new Error("Você não está nessa sala");
    const state = room.state as GameState | null;
    if (!state) throw new Error("Partida não iniciada");
    if (state.turn !== me.seat) return { state, stale: true as const };

    const newState = await applyAndSave(data.code, {
      type: "DRAW",
      player: me.seat,
    });
    return { state: newState };
  });

export const heartbeat = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(3).max(8),
      playerId: z.string().min(1).max(64),
    }).parse
  )
  .handler(async ({ data }) => {
    const { room } = await loadRoom(data.code);
    await supabaseAdmin
      .from("room_players")
      .update({ last_seen: new Date().toISOString() })
      .eq("room_id", room.id)
      .eq("player_id", data.playerId);
    return { ok: true };
  });

export const deactivateBot = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(3).max(8),
      playerId: z.string().min(1).max(64),
      name: z.string().min(1).max(40),
    }).parse
  )
  .handler(async ({ data }) => {
    const { room, players } = await loadRoom(data.code);
    const me = players.find((p) => p.player_id === data.playerId);
    if (!me) throw new Error("Você não está nessa sala");

    const state = room.state as GameState | null;
    const isCurrentTurn = !!state && !state.finished && state.turn === me.seat;
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("room_players")
      .update({ is_bot: false, name: data.name, last_seen: now })
      .eq("id", me.id);
    if (error) throw new Error(error.message);

    if (isCurrentTurn) {
      const { error: roomError } = await supabaseAdmin
        .from("rooms")
        .update({ turn_started_at: now })
        .eq("id", room.id);
      if (roomError) throw new Error(roomError.message);
    }

    return { ok: true };
  });

export const tickTurn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(3).max(8),
      hostId: z.string().min(1).max(64),
      afkSeconds: z.number().min(5).max(300).default(60),
    }).parse
  )
  .handler(async ({ data }) => {
    const { room, players } = await loadRoom(data.code);
    if (room.host_id !== data.hostId) return { ok: false };
    if (room.status !== "playing") return { ok: false };
    const state = room.state as GameState | null;
    if (!state || state.finished) return { ok: false };

    const turnPlayer = players.find((p) => p.seat === state.turn);
    if (!turnPlayer) return { ok: false };

    const startedAt = room.turn_started_at ? new Date(room.turn_started_at).getTime() : Date.now();
    const elapsed = (Date.now() - startedAt) / 1000;
    const timedOut = elapsed > data.afkSeconds;

    const botThinkSeconds = 1 + ((startedAt + state.turn) % 3000) / 1000;

    if (!turnPlayer.is_bot && !timedOut) return { ok: false, waiting: true };
    if (turnPlayer.is_bot && elapsed < botThinkSeconds) return { ok: false, thinking: true };

    if (!turnPlayer.is_bot && timedOut) {
      const botName = BOT_NAMES[turnPlayer.seat % BOT_NAMES.length];
      const { error: botErr } = await supabaseAdmin
        .from("room_players")
        .update({ is_bot: true, name: botName })
        .eq("id", turnPlayer.id);
      if (botErr) throw new Error(botErr.message);
    }

    const newState = reduce(state, { type: "CPU_TURN" });
    const { error } = await supabaseAdmin
      .from("rooms")
      .update({
        state: newState,
        turn_started_at: new Date().toISOString(),
        status: newState.finished ? "finished" : "playing",
      })
      .eq("id", room.id);
    if (error) throw new Error(error.message);
    return { ok: true, played: true };
  });

export const resetGame = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(3).max(8),
      hostId: z.string().min(1).max(64),
    }).parse
  )
  .handler(async ({ data }) => {
    const { room } = await loadRoom(data.code);
    if (room.host_id !== data.hostId) throw new Error("Só host");
    const state = freshState(room.max_players);
    await supabaseAdmin
      .from("rooms")
      .update({ state, status: "playing", turn_started_at: new Date().toISOString() })
      .eq("id", room.id);
    return { ok: true };
  });
