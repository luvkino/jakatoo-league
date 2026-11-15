-- ============================================================================
-- JACKAROO LEAGUE — multiverse themes / avatar / audio / shake preferences
--
-- Purely additive Drizzle migration: it only CREATES a new table. No existing
-- table (players, seasons, matches, audit_log) is altered, deleted or reset,
-- so all records, points, rankings and statistics stay exactly as they are.
--
-- Apply with:  npx drizzle-kit migrate   (or psql -f this file)
-- ============================================================================

create table if not exists "player_preferences" (
  "player_id" uuid primary key,
  "theme" text not null default 'classic',
  "avatar" jsonb not null default '{}'::jsonb,
  "master_volume" integer not null default 80,
  "music_volume" integer not null default 40,
  "sfx_volume" integer not null default 70,
  "music_enabled" boolean not null default true,
  "sfx_enabled" boolean not null default false,
  "shake_enabled" boolean not null default true,
  "shake_intensity" integer not null default 35,
  "match_animations" boolean not null default true,
  "updated_at" timestamp with time zone not null default now(),
  constraint "prefs_volumes" check (
    "master_volume" between 0 and 100
    and "music_volume" between 0 and 100
    and "sfx_volume" between 0 and 100
  ),
  constraint "prefs_shake" check ("shake_intensity" between 0 and 100)
);

create unique index if not exists "player_preferences_player_idx"
  on "player_preferences" ("player_id");
