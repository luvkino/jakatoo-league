# Migrations

Runtime bootstrap (`src/db/init.ts`) already creates every table with
idempotent `create table if not exists` / `alter table … add column if not
exists` statements, so deployed environments self-heal on the first request.

This folder keeps the same change as an explicit Drizzle migration for
pipelines that prefer versioned SQL:

- `0001_player_preferences.sql` — adds the **new** `player_preferences` table
  used by the multiverse themes, avatar creator, audio settings, screen shake
  and match-animation preferences.

- `0002_world_environments_and_casino.sql` — living-world preferences
  (`bg_animations`, `bg_intensity`), the opt-in screen-shake defaults and the
  new `casino_local` table for optional casino backup.
- `0003_casino_preferences.sql` — adds `casino_sfx_enabled` and `casino_table`
  to `player_preferences` (additive, defaulted; no row is rewritten).

Nothing in these migrations touches `players`, `seasons`, `matches` or
`audit_log`: existing records, points, rankings and statistics are never
modified.

```bash
# preferred (drizzle-kit)
npx drizzle-kit migrate

# or directly
psql "$DATABASE_URL" -f drizzle/migrations/0001_player_preferences.sql
```
