import { eq } from "drizzle-orm";
import { db } from "@/db";
import { playerPreferences, players } from "@/db/schema";
import { normalizeAvatar, type AvatarConfig } from "@/lib/avatar";
import {
  DEFAULT_PREFS,
  normalizeBgIntensity,
  normalizeCasinoTable,
  normalizePrefs,
  toServerPrefs,
  type ServerPrefs,
} from "@/lib/prefs";
import { ApiError, UUID_RE, api, ok, readJson } from "@/lib/server";
import { normalizeWorldTheme } from "@/lib/worldThemes";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const dto = (row: typeof playerPreferences.$inferSelect): ServerPrefs => ({
  theme: normalizeWorldTheme(row.theme),
  masterVolume: row.masterVolume,
  musicVolume: row.musicVolume,
  sfxVolume: row.sfxVolume,
  musicEnabled: row.musicEnabled,
  sfxEnabled: row.sfxEnabled,
  shakeEnabled: row.shakeEnabled,
  shakeIntensity: row.shakeIntensity,
  bgAnimations: row.bgAnimations,
  bgIntensity: normalizeBgIntensity(row.bgIntensity),
  matchAnimations: row.matchAnimations,
  casinoSfxEnabled: row.casinoSfxEnabled,
  casinoTable: normalizeCasinoTable(row.casinoTable),
});

async function assertPlayer(id: string) {
  if (!UUID_RE.test(id)) throw new ApiError("NOT_FOUND", "اللاعب غير موجود.", 404);
  const [p] = await db.select({ id: players.id, name: players.name }).from(players).where(eq(players.id, id)).limit(1);
  if (!p) throw new ApiError("NOT_FOUND", "اللاعب غير موجود.", 404);
  return p;
}

const clamp = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
};
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/**
 * Preferences are personal, not administrative: any visitor can read/save the
 * preferences of a player that exists. They are stored in their own table and
 * can never modify players, matches, seasons, points or rankings.
 */
export const GET = api<Ctx>({}, async (_req, ctx) => {
  const { id } = await ctx.params;
  await assertPlayer(id);
  const [row] = await db.select().from(playerPreferences).where(eq(playerPreferences.playerId, id)).limit(1);
  if (!row) {
    // Safe defaults for existing players that never customised anything.
    return ok({
      prefs: toServerPrefs(normalizePrefs(DEFAULT_PREFS)),
      avatar: DEFAULT_PREFS.avatar,
      isDefault: true,
    });
  }
  return ok({ prefs: dto(row), avatar: normalizeAvatar(row.avatar), isDefault: false });
});

export const PUT = api<Ctx>({}, async (req, ctx) => {
  const { id } = await ctx.params;
  const player = await assertPlayer(id);
  const body = await readJson(req);
  const [existing] = await db
    .select()
    .from(playerPreferences)
    .where(eq(playerPreferences.playerId, id))
    .limit(1);
  const base = existing ? dto(existing) : toServerPrefs(normalizePrefs(DEFAULT_PREFS));

  const next = {
    playerId: player.id,
    theme: body.theme === undefined ? base.theme : normalizeWorldTheme(body.theme),
    masterVolume: body.masterVolume === undefined ? base.masterVolume : clamp(body.masterVolume, base.masterVolume),
    musicVolume: body.musicVolume === undefined ? base.musicVolume : clamp(body.musicVolume, base.musicVolume),
    sfxVolume: body.sfxVolume === undefined ? base.sfxVolume : clamp(body.sfxVolume, base.sfxVolume),
    musicEnabled: body.musicEnabled === undefined ? base.musicEnabled : bool(body.musicEnabled, base.musicEnabled),
    sfxEnabled: body.sfxEnabled === undefined ? base.sfxEnabled : bool(body.sfxEnabled, base.sfxEnabled),
    shakeEnabled: body.shakeEnabled === undefined ? base.shakeEnabled : bool(body.shakeEnabled, base.shakeEnabled),
    shakeIntensity:
      body.shakeIntensity === undefined ? base.shakeIntensity : clamp(body.shakeIntensity, base.shakeIntensity),
    bgAnimations: body.bgAnimations === undefined ? base.bgAnimations : bool(body.bgAnimations, base.bgAnimations),
    bgIntensity: body.bgIntensity === undefined ? base.bgIntensity : normalizeBgIntensity(body.bgIntensity),
    matchAnimations:
      body.matchAnimations === undefined ? base.matchAnimations : bool(body.matchAnimations, base.matchAnimations),
    casinoSfxEnabled:
      body.casinoSfxEnabled === undefined
        ? base.casinoSfxEnabled
        : bool(body.casinoSfxEnabled, base.casinoSfxEnabled),
    casinoTable: body.casinoTable === undefined ? base.casinoTable : normalizeCasinoTable(body.casinoTable),
    avatar: body.avatar === undefined ? normalizeAvatar(existing?.avatar) : normalizeAvatar(body.avatar),
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(playerPreferences)
    .values(next)
    .onConflictDoUpdate({ target: playerPreferences.playerId, set: next })
    .returning();

  return ok({ prefs: dto(row), avatar: normalizeAvatar(row.avatar) });
});

/** Avatar-only save (used by the editor's Save button). */
export const PATCH = api<Ctx>({}, async (req, ctx) => {
  const { id } = await ctx.params;
  const player = await assertPlayer(id);
  const body = await readJson(req);
  const avatar: AvatarConfig = normalizeAvatar(body.avatar);
  const [existing] = await db
    .select()
    .from(playerPreferences)
    .where(eq(playerPreferences.playerId, id))
    .limit(1);
  if (!existing) {
    const [row] = await db
      .insert(playerPreferences)
      .values({ playerId: player.id, avatar })
      .returning();
    return ok({ prefs: dto(row), avatar: normalizeAvatar(row.avatar) });
  }
  const [row] = await db
    .update(playerPreferences)
    .set({ avatar, updatedAt: new Date() })
    .where(eq(playerPreferences.playerId, id))
    .returning();
  return ok({ prefs: dto(row), avatar: normalizeAvatar(row.avatar) });
});
