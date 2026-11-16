import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
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

/**
 * Per-player customization, kept in its own table so existing player rows,
 * matches, seasons, points and rankings are never touched. A missing row simply
 * means "this player uses the safe defaults".
 *
 * The `playerId` column is text (not a uuid FK) on purpose: preferences are
 * written by an unauthenticated personalization endpoint, so they must never
 * be able to violate or cascade into league data. Ownership is validated in
 * the API by checking the player exists before writing.
 */
export const playerPreferences = pgTable(
  "player_preferences",
  {
    playerId: uuid("player_id").primaryKey(),
    theme: text("theme").notNull().default("classic"),
    avatar: jsonb("avatar").notNull().default({}),
    masterVolume: integer("master_volume").notNull().default(80),
    musicVolume: integer("music_volume").notNull().default(40),
    sfxVolume: integer("sfx_volume").notNull().default(70),
    musicEnabled: boolean("music_enabled").notNull().default(true),
    sfxEnabled: boolean("sfx_enabled").notNull().default(false),
    // Screen shake is opt-in (off by default) and starts at 15 % once enabled.
    shakeEnabled: boolean("shake_enabled").notNull().default(false),
    shakeIntensity: integer("shake_intensity").notNull().default(15),
    // Living world environments (full-page animated backgrounds).
    bgAnimations: boolean("bg_animations").notNull().default(true),
    bgIntensity: integer("bg_intensity").notNull().default(2),
    matchAnimations: boolean("match_animations").notNull().default(true),
    // Casino preferences (virtual chips are stored separately, never here).
    casinoSfxEnabled: boolean("casino_sfx_enabled").notNull().default(true),
    casinoTable: text("casino_table").notNull().default("classic"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("prefs_volumes", sql`${t.masterVolume} between 0 and 100 and ${t.musicVolume} between 0 and 100 and ${t.sfxVolume} between 0 and 100`),
    check("prefs_shake", sql`${t.shakeIntensity} between 0 and 100`),
    check("prefs_bg", sql`${t.bgIntensity} between 0 and 3`),
    uniqueIndex("player_preferences_player_idx").on(t.playerId),
  ],
);

/**
 * Optional cloud backup of the virtual casino state.
 *
 * The authoritative game state is the browser store (`src/lib/casino/store.ts`);
 * this table only lets a player continue on another device. It is deliberately
 * disconnected from every league table: chips are virtual, have no monetary
 * value and can never be converted into league points, rankings or stats.
 */
export const casinoLocal = pgTable(
  "casino_local",
  {
    playerId: uuid("player_id").primaryKey(),
    chips: integer("chips").notNull().default(2000),
    practiceChips: integer("practice_chips").notNull().default(5000),
    tableId: text("table_id").notNull().default("classic"),
    customRules: jsonb("custom_rules").notNull().default({}),
    stats: jsonb("stats").notNull().default({}),
    history: jsonb("history").notNull().default([]),
    soundEnabled: boolean("sound_enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("casino_chips_non_negative", sql`${t.chips} >= 0`),
    check("casino_practice_chips_non_negative", sql`${t.practiceChips} >= 0`),
  ],
);
