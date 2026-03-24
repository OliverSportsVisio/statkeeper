-- ============================================
-- Supabase Schema for Manual Stat Keeping App
-- Run this in the Supabase SQL editor
-- ============================================

-- Boards table
create table if not exists boards (
  id text primary key,
  created_at timestamptz default now(),
  status text not null default 'setup' check (status in ('setup', 'live', 'final')),
  admin_token text not null unique,
  keeper_token text not null unique,
  home_team jsonb not null, -- TeamSetup
  away_team jsonb not null, -- TeamSetup
  settings jsonb not null,  -- GameSettings
  state jsonb not null      -- GameState
);

-- Game events table
create table if not exists game_events (
  id text primary key,
  board_id text not null references boards(id) on delete cascade,
  timestamp timestamptz default now(),
  game_clock numeric not null,
  period integer not null,
  team text not null check (team in ('home', 'away')),
  player_id text not null,
  stat_type text not null,
  points integer not null default 0,
  shot_location jsonb,     -- ShotLocation | null
  play_type text,          -- PlayType | null
  linked_event_id text     -- reference to another event
);

-- Indexes
create index if not exists idx_events_board on game_events(board_id);
create index if not exists idx_events_player on game_events(player_id);
create index if not exists idx_boards_admin on boards(admin_token);
create index if not exists idx_boards_keeper on boards(keeper_token);

-- Enable realtime on both tables
alter publication supabase_realtime add table boards;
alter publication supabase_realtime add table game_events;

-- Row level security (public read, token-based write)
alter table boards enable row level security;
alter table game_events enable row level security;

-- Anyone can read boards and events (public URLs)
create policy "Public read boards" on boards for select using (true);
create policy "Public read events" on game_events for select using (true);

-- Anyone can insert boards (no auth needed to create a game)
create policy "Anyone can create boards" on boards for insert with check (true);

-- Anyone can update boards (keeper/admin token checked in app layer)
create policy "Anyone can update boards" on boards for update using (true);

-- Anyone can insert events
create policy "Anyone can insert events" on game_events for insert with check (true);

-- Anyone can delete events (for undo)
create policy "Anyone can delete events" on game_events for delete using (true);
