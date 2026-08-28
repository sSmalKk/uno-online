
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id text not null,
  max_players int not null check (max_players in (2,4)),
  status text not null default 'lobby' check (status in ('lobby','playing','finished')),
  state jsonb,
  turn_started_at timestamptz,
  created_at timestamptz not null default now()
);

create index rooms_code_idx on public.rooms (code);

create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  seat int not null check (seat between 0 and 3),
  player_id text not null,
  name text not null,
  is_bot boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (room_id, seat)
);

create index room_players_room_idx on public.room_players (room_id);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- Acesso público (jogadores anônimos, validação no server-fn)
create policy "rooms public read" on public.rooms for select using (true);
create policy "rooms public write" on public.rooms for insert with check (true);
create policy "rooms public update" on public.rooms for update using (true);

create policy "room_players public read" on public.room_players for select using (true);
create policy "room_players public write" on public.room_players for insert with check (true);
create policy "room_players public update" on public.room_players for update using (true);
create policy "room_players public delete" on public.room_players for delete using (true);

-- Realtime
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter table public.rooms replica identity full;
alter table public.room_players replica identity full;
