# UNO Online

UNO card game with online multiplayer: lobby, 4-character room codes, a waiting
room and a live table updated in real time. It also has a local mode against
bots.

**Stack:** TypeScript · React 19 · TanStack Start (server functions) · Supabase
(PostgreSQL + Realtime) · zod · Tailwind CSS

## How it works

```text
client ──server fn (zod-validated)──▶ room.server.ts ──service role──▶ rooms / room_players
   ▲                                   (applies game-reducer)                │
   └──────────── Supabase Realtime (postgres_changes) ◀──────────────────────┘
```

- **Game rules are a pure reducer.** `src/lib/uno.ts` (deck, dealing, playable
  cards) and `src/lib/game-reducer.ts` (turns, direction, +2/+4, wild colors,
  bot moves) have no I/O, so the same code runs the local mode and the server.
- **The server is authoritative for moves.** Clients can only read the tables;
  the insert/update policies were dropped, so every change goes through the
  server functions in `src/lib/room.functions.ts` (create, join, start, play,
  draw, heartbeat, reset). Inputs are validated with zod and the write uses the
  service-role client on the server only.
- **Realtime updates.** `src/hooks/use-room.ts` subscribes to `postgres_changes`
  on the room and its players and re-renders the table.
- **Turn timeout.** The host's client polls `tickTurn`. When a player lets the
  turn time out, the seat becomes a bot and the move is made by the same
  reducer; the player takes the seat back with `deactivateBot`.

## Running locally

Requirements: Node.js 20+ and a Supabase project.

```sh
npm install
cp .env.example .env          # fill in the values from your Supabase project
supabase link --project-ref <your-project-ref>
supabase db push              # creates rooms and room_players
npm run dev
```

## Known limitations

This is a casual game, and some trade-offs were made on purpose. They would
have to change before it held anything of value:

- **Hands are public.** The whole game state, including every hand and the draw
  pile, lives in `rooms.state`, which is readable and broadcast to everyone in
  the room. Fix: keep hands in a private table and send each seat only its own
  projection.
- **No authentication.** A player is identified by a UUID generated in the
  browser. Fix: Supabase anonymous sign-in, and check `auth.uid()` in the server
  functions.
- **Last write wins.** Moves read, apply and save the state without a version
  check, so two simultaneous actions can overwrite each other. Fix: a `version`
  column and a conditional update.
- **Bot turns depend on the host's browser.** Fix: move `tickTurn` to a
  scheduled job.
- **No tests yet**, although the pure reducer is the natural place to start.
