import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { matches, players } from "@/db/schema";
import { MAX_NAME_LENGTH, cleanName, nameKey } from "@/lib/normalize";
import { ApiError, UUID_RE, api, audit, ok, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!UUID_RE.test(id)) throw new ApiError("NOT_FOUND", "اللاعب غير موجود.", 404);
  const [p] = await db.select().from(players).where(eq(players.id, id)).limit(1);
  if (!p) throw new ApiError("NOT_FOUND", "اللاعب غير موجود.", 404);
  return p;
}
const dto = (p: typeof players.$inferSelect) => ({
  id: p.id,
  name: p.name,
  archived: p.archived,
  createdAt: p.createdAt.toISOString(),
});

export const PATCH = api<Ctx>({ admin: true }, async (req, ctx) => {
  const { id } = await ctx.params;
  const prev = await load(id);
  const body = await readJson(req);
  const patch: Partial<typeof players.$inferInsert> = {};
  let action = "player.update";

  if (typeof body.name === "string") {
    const name = cleanName(body.name);
    if (!name) throw new ApiError("EMPTY_NAME", "اكتب اسم اللاعب أولاً.", 400);
    if (name.length > MAX_NAME_LENGTH)
      throw new ApiError("NAME_TOO_LONG", `الاسم طويل جداً (الحد الأقصى ${MAX_NAME_LENGTH} حرفاً).`, 400);
    const key = nameKey(name);
    const [dup] = await db
      .select()
      .from(players)
      .where(and(eq(players.nameKey, key), ne(players.id, id)))
      .limit(1);
    if (dup) throw new ApiError("DUPLICATE", `اللاعب «${dup.name}» موجود بالفعل.`, 409);
    patch.name = name;
    patch.nameKey = key;
  }
  if (typeof body.archived === "boolean" && body.archived !== prev.archived) {
    patch.archived = body.archived;
    patch.archivedAt = body.archived ? new Date() : null;
    action = body.archived ? "player.archive" : "player.restore";
  }
  if (Object.keys(patch).length === 0) return ok({ player: dto(prev) });

  const next = await db.transaction(async (tx) => {
    const [row] = await tx.update(players).set(patch).where(eq(players.id, id)).returning();
    await audit(tx, action, "player", id, { name: prev.name, archived: prev.archived }, { name: row.name, archived: row.archived });
    return row;
  });
  return ok({ player: dto(next) });
});

// Permanent delete is only allowed when the player has no match history.
// Players with history must be archived (soft delete) so history is never lost.
export const DELETE = api<Ctx>({ admin: true }, async (_req, ctx) => {
  const { id } = await ctx.params;
  const prev = await load(id);
  const used = await db
    .select({ id: matches.id })
    .from(matches)
    .where(or(eq(matches.t1p1, id), eq(matches.t1p2, id), eq(matches.t2p1, id), eq(matches.t2p2, id)))
    .limit(1);
  if (used.length > 0) {
    throw new ApiError(
      "HAS_MATCHES",
      "لهذا اللاعب مباريات مسجلة، لذلك لا يمكن حذفه نهائياً. يمكنك أرشفته للحفاظ على السجل التاريخي.",
      409,
    );
  }
  await db.transaction(async (tx) => {
    await tx.delete(players).where(eq(players.id, id));
    await audit(tx, "player.delete", "player", id, { name: prev.name }, null);
  });
  return ok({ id });
});
