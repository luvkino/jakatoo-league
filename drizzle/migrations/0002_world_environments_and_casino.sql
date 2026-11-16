-- ============================================================================
-- JACKAROO LEAGUE — living world environments + casino preferences
--
-- STRICTLY ADDITIVE. This migration only:
--   • adds two columns to the existing (additive) `player_preferences` table,
--   • relaxes the default screen-shake values to the new opt-in defaults,
--   • creates a brand-new `casino_local` table for optional cloud backup of the
--     virtual chip balance and round history.
--
-- Nothing here touches players, seasons, matches, audit_log, league points,
-- rankings or statistics. No existing column is dropped, retyped or renamed,
-- and no row is deleted. Casino chips live in their own table and can never be
-- confused with league points.
--
-- Apply with:  npx drizzle-kit migrate
--         or:  psql "$DATABASE_URL" -f drizzle/migrations/0002_world_environments_and_casino.sql
-- ============================================================================

alter table "player_preferences"
  add column if not exists "bg_animations" boolean not null default true,
  add column if not exists "bg_intensity" integer not null default 2;

-- Screen shake is now opt-in: new players get OFF at 15 % (existing saved
-- preference rows in local storage / the DB are untouched).
alter table "player_preferences" alter column "shake_enabled" set default false;
alter table "player_preferences" alter column "shake_intensity" set default 15;

alter table "player_preferences" drop constraint if exists "prefs_bg";
alter table "player_preferences" add constraint "prefs_bg"
  check ("bg_intensity" between 0 and 3);

-- ---------------------------------------------------------------------------
-- Casino: virtual chips only. No real money, no payments, no league coupling.
-- The authoritative game state lives in the browser; this table is an optional
-- backup so a player can continue on another device.
-- ---------------------------------------------------------------------------
create table if not exists "casino_local" (
  "player_id" uuid primary key,
  "chips" integer not null default 2000,
  "practice_chips" integer not null default 5000,
  "table_id" text not null default 'classic',
  "custom_rules" jsonb not null default '{}'::jsonb,
  "stats" jsonb not null default '{}'::jsonb,
  "history" jsonb not null default '[]'::jsonb,
  "sound_enabled" boolean not null default true,
  "updated_at" timestamptz not null default now(),
  constraint "casino_chips_non_negative" check ("chips" >= 0),
  constraint "casino_practice_chips_non_negative" check ("practice_chips" >= 0)
);

create index if not exists "casino_local_player_idx" on "casino_local" ("player_id");
