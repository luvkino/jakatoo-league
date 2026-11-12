import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, seasons } from "@/db/schema";
import { checkPlayers, parseMatch } from "@/lib/matchInput";
import { ApiError, api, audit, ok, readJson, toMatchRec } from "@/lib/server";

export const dynamic = "force-dynamic";

export const POST = api({ admin: true }, async (req) => {
  const input = parseMatch(await readJson(req));
  await checkPlayers(input);
  const [season] = await db.select().from(seasons).where(eq(seasons.status, "active")).limit(1);
  if (!season) {
    throw new ApiError("NO_ACTIVE_SEASON", "لا يوجد موسم نشط. أنشئ موسماً جديداً من صفحة المواسم أولاً.", 409);
  }
  const row = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(matches)
      .values({
        seasonId: season.id,
        t1p1: input.t1[0],
        t1p2: input.t1[1],
        t2p1: input.t2[0],
        t2p2: input.t2[1],
        winningTeam: input.winningTeam,
        stones: input.stones,
        comeback: input.comeback,
        note: input.note,
      })
      .returning();
    await audit(tx, "match.create", "match", m.id, null, { ...input, seasonId: season.id });
    return m;
  });
  return ok({ match: toMatchRec(row) }, 201);
});
