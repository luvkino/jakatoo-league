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
