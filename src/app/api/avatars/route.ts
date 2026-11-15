import { db } from "@/db";
import { playerPreferences, players } from "@/db/schema";
import { normalizeAvatar, type AvatarConfig } from "@/lib/avatar";
import { api, ok } from "@/lib/server";

export const dynamic = "force-dynamic";

/**
 * Read-only map of every player's customised avatar so the leaderboard, player
 * profiles and match history can show them without N extra requests.
 * Players without a saved avatar are simply absent (they keep the original
 * deterministic pixel art).
 */
export const GET = api({}, async () => {
  const [rows, known] = await Promise.all([
    db.select({ playerId: playerPreferences.playerId, avatar: playerPreferences.avatar }).from(playerPreferences),
    db.select({ id: players.id }).from(players),
  ]);
  const ids = new Set(known.map((p) => p.id));
  const avatars: Record<string, AvatarConfig> = {};
  for (const r of rows) {
    if (!ids.has(r.playerId)) continue;
    avatars[r.playerId] = normalizeAvatar(r.avatar);
  }
  return ok({ avatars });
});
