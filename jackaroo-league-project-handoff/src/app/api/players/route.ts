import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { MAX_NAME_LENGTH, cleanName, nameKey } from "@/lib/normalize";
import { ApiError, api, audit, ok, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

// Creating a player needs ONLY a name. There is no player-count limit.
export const POST = api({ admin: true }, async (req) => {
  const body = await readJson(req);
  const name = cleanName(typeof body.name === "string" ? body.name : "");
  if (!name) throw new ApiError("EMPTY_NAME", "اكتب اسم اللاعب أولاً.", 400);
  if (name.length > MAX_NAME_LENGTH)
    throw new ApiError("NAME_TOO_LONG", `الاسم طويل جداً (الحد الأقصى ${MAX_NAME_LENGTH} حرفاً).`, 400);
  const key = nameKey(name);

  const [existing] = await db.select().from(players).where(eq(players.nameKey, key)).limit(1);
  if (existing) {
    throw new ApiError(
      "DUPLICATE",
      existing.archived
        ? `اللاعب «${existing.name}» موجود بالفعل في الأرشيف. يمكنك استعادته من قائمة اللاعبين المؤرشفين.`
        : `اللاعب «${existing.name}» موجود بالفعل.`,
      409,
    );
  }

  const created = await db.transaction(async (tx) => {
    const rows = await tx.insert(players).values({ name, nameKey: key }).onConflictDoNothing().returning();
    if (!rows[0]) throw new ApiError("DUPLICATE", `اللاعب «${name}» موجود بالفعل.`, 409);
    await audit(tx, "player.create", "player", rows[0].id, null, { name });
    return rows[0];
  });

  return ok(
    {
      player: {
        id: created.id,
        name: created.name,
        archived: created.archived,
        createdAt: created.createdAt.toISOString(),
      },
    },
    201,
  );
});
