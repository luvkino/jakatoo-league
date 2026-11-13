import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// NOTE: there is intentionally NO player-count limit anywhere in this schema.
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // normalized name (trimmed, Arabic-normalized, lowercase) -> duplicate prevention
  nameKey: text("name_key").notNull().unique(),
  archived: boolean("archived").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: text("status").notNull().default("active"), // active | closed | archived
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id),
    t1p1: uuid("t1p1").notNull().references(() => players.id),
    t1p2: uuid("t1p2").notNull().references(() => players.id),
    t2p1: uuid("t2p1").notNull().references(() => players.id),
    t2p2: uuid("t2p2").notNull().references(() => players.id),
    winningTeam: smallint("winning_team").notNull(),
    stones: smallint("stones").notNull(),
    comeback: boolean("comeback").notNull().default(false),
    note: text("note"),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("matches_stones_range", sql`${t.stones} between 0 and 8`),
    check("matches_winner", sql`${t.winningTeam} in (1,2)`),
    index("matches_season_idx").on(t.seasonId),
    index("matches_played_idx").on(t.playedAt),
  ],
);

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  admin: text("admin").notNull().default("المشرف"),
  previous: jsonb("previous"),
  next: jsonb("next"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});
