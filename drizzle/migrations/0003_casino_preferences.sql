-- ---------------------------------------------------------------------------
-- Casino preferences live with the other player preferences so a player's
-- selected table and casino-sound switch follow them across devices.
--
-- ADDITIVE ONLY: two new columns with safe defaults. Existing rows, players,
-- matches, points, rankings and stats are untouched. No data is deleted.
-- ---------------------------------------------------------------------------
alter table "player_preferences"
  add column if not exists "casino_sfx_enabled" boolean not null default true;

alter table "player_preferences"
  add column if not exists "casino_table" text not null default 'classic';

-- Only the virtual casino table ids are accepted; anything else falls back to
-- 'classic' instead of erroring, so an old client can never break a row.
alter table "player_preferences" drop constraint if exists "prefs_casino_table";
alter table "player_preferences" add constraint "prefs_casino_table"
  check ("casino_table" in ('classic', 'vegas', 'atlantic', 'european', 'highroller', 'custom'));
