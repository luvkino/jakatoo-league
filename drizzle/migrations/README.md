# Migrations

Runtime bootstrap (`src/db/init.ts`) already creates every table with
idempotent `create table if not exists` / `alter table … add column if not
exists` statements, so deployed environments self-heal on the first request.

This folder keeps the same change as an explicit Drizzle migration for
pipelines that prefer versioned SQL:

- `0001_player_preferences.sql` — adds the **new** `player_preferences` table
  used by the multiverse themes, avatar creator, audio settings, screen shake
  and match-animation preferences.

Nothing in this migration touches `players`, `seasons`, `matches` or
`audit_log`: existing records, points, rankings and statistics are never
modified.

```bash
# preferred (drizzle-kit)
npx drizzle-kit migrate

# or directly
psql "$DATABASE_URL" -f drizzle/migrations/0001_player_preferences.sql
```
