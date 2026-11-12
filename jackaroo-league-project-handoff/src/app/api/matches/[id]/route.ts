import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { checkPlayers, parseMatch } from "@/lib/matchInput";
import { ApiError, UUID_RE, api, audit, ok, readJson, toMatchRec } from "@/lib/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!UUID_RE.test(id)) throw new ApiError("NOT_FOUND", "المباراة غير موجودة.", 404);
  const [m] = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  if (!m) throw new ApiError("NOT_FOUND", "المباراة غير موجودة.", 404);
  return m;
}

export const PATCH = api<Ctx>({ admin: true }, async (req, ctx) => {
  const { id } = await ctx.params;
  const prev = await load(id);
  const body = await readJson(req);
  const input = parseMatch(body);
  await checkPlayers(input, [prev.t1p1, prev.t1p2, prev.t2p1, prev.t2p2]);
  let playedAt = prev.playedAt;
  if (typeof body.playedAt === "string") {
    const d = new Date(body.playedAt);
    if (Number.isNaN(d.getTime())) throw new ApiError("INVALID_DATE", "التاريخ غير صالح.", 400);
    playedAt = d;
  }
  const row = await db.transaction(async (tx) => {
    const [m] = await tx
      .update(matches)
      .set({
        t1p1: input.t1[0],
        t1p2: input.t1[1],
        t2p1: input.t2[0],
        t2p2: input.t2[1],
        winningTeam: input.winningTeam,
        stones: input.stones,
        comeback: input.comeback,
        note: input.note,
        playedAt,
      })
      .where(eq(matches.id, id))
      .returning();
    await audit(tx, "match.update", "match", id, toMatchRec(prev), toMatchRec(m));
    return m;
  });
  return ok({ match: toMatchRec(row) });
});

export const DELETE = api<Ctx>({ admin: true }, async (_req, ctx) => {
  const { id } = await ctx.params;
  const prev = await load(id);
  await db.transaction(async (tx) => {
    await tx.delete(matches).where(eq(matches.id, id));
    await audit(tx, "match.delete", "match", id, toMatchRec(prev), null);
  });
  return ok({ id });
});
