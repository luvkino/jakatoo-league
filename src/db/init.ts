import { pool } from "@/db";

/**
 * Idempotent runtime initialisation. It guarantees the tables and a default
 * season exist BEFORE any API handler touches the database, so the first
 * "add player" can never hit a missing table. It never drops or resets data.
 */
const DDL = `
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  t1p1 uuid not null references players(id),
  t1p2 uuid not null references players(id),
  t2p1 uuid not null references players(id),
  t2p2 uuid not null references players(id),
  winning_team smallint not null,
  stones smallint not null,
  comeback boolean not null default false,
  note text,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint matches_stones_range check (stones between 0 and 8),
  constraint matches_winner check (winning_team in (1,2))
);
create index if not exists matches_season_idx on matches(season_id);
create index if not exists matches_played_idx on matches(played_at);
create table if not exists player_preferences (
  player_id uuid primary key,
  theme text not null default 'classic',
  avatar jsonb not null default '{}'::jsonb,
  master_volume integer not null default 80,
  music_volume integer not null default 40,
  sfx_volume integer not null default 70,
  music_enabled boolean not null default true,
  sfx_enabled boolean not null default false,
  shake_enabled boolean not null default true,
  shake_intensity integer not null default 35,
  match_animations boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint prefs_volumes check (
    master_volume between 0 and 100 and music_volume between 0 and 100 and sfx_volume between 0 and 100
  ),
  constraint prefs_shake check (shake_intensity between 0 and 100)
);
alter table player_preferences add column if not exists theme text not null default 'classic';
alter table player_preferences add column if not exists avatar jsonb not null default '{}'::jsonb;
alter table player_preferences add column if not exists master_volume integer not null default 80;
alter table player_preferences add column if not exists music_volume integer not null default 40;
alter table player_preferences add column if not exists sfx_volume integer not null default 70;
alter table player_preferences add column if not exists music_enabled boolean not null default true;
alter table player_preferences add column if not exists sfx_enabled boolean not null default false;
alter table player_preferences add column if not exists shake_enabled boolean not null default true;
alter table player_preferences add column if not exists shake_intensity integer not null default 35;
alter table player_preferences add column if not exists match_animations boolean not null default true;
alter table player_preferences add column if not exists updated_at timestamptz not null default now();
create unique index if not exists player_preferences_player_idx on player_preferences(player_id);
-- Idempotent for pre-existing preference tables (no plpgsql / DO blocks needed).
alter table player_preferences drop constraint if exists prefs_volumes;
alter table player_preferences add constraint prefs_volumes check (
  master_volume between 0 and 100 and music_volume between 0 and 100 and sfx_volume between 0 and 100
);
alter table player_preferences drop constraint if exists prefs_shake;
alter table player_preferences add constraint prefs_shake check (shake_intensity between 0 and 100);
create table if not exists audit_log (
  id serial primary key,
  action text not null,
  entity text not null,
  entity_id text,
  admin text not null default 'المشرف',
  previous jsonb,
  next jsonb,
  at timestamptz not null default now()
);
`;

let ready: Promise<void> | null = null;

export function ensureDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await pool.query(DDL);
      const { rows } = await pool.query("select count(*)::int as n from seasons");
      if (rows[0].n === 0) {
        await pool.query(
          "insert into seasons (name, status) values ('الموسم الأول', 'active')",
        );
      }
    })().catch((e) => {
      ready = null; // allow retry on next request
      throw e;
    });
  }
  return ready;
}
