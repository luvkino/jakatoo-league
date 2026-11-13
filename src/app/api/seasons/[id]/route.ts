import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { cleanName } from "@/lib/normalize";
import { ApiError, UUID_RE, api, audit, ok, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = api<Ctx>({ admin: true }, async (req, ctx) => {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) throw new ApiError("NOT_FOUND", "الموسم غير موجود.", 404);
  const [prev] = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
  if (!prev) throw new ApiError("NOT_FOUND", "الموسم غير موجود.", 404);
  const body = await readJson(req);
  const patch: Partial<typeof seasons.$inferInsert> = {};

  if (typeof body.name === "string") {
    const name = cleanName(body.name);
    if (!name) throw new ApiError("EMPTY_NAME", "اكتب اسم الموسم.", 400);
    patch.name = name;
  }
  if (typeof body.startDate === "string" && body.startDate) {
    const d = new Date(body.startDate);
    if (Number.isNaN(d.getTime())) throw new ApiError("INVALID_DATE", "تاريخ البداية غير صالح.", 400);
    patch.startDate = d;
  }
  if (typeof body.status === "string") {
    if (!["active", "closed", "archived"].includes(body.status)) throw new ApiError("BAD_REQUEST", "حالة الموسم غير صالحة.");
    if (body.status === "active" && prev.status !== "active") {
      const [other] = await db.select().from(seasons).where(eq(seasons.status, "active")).limit(1);
      if (other) throw new ApiError("ACTIVE_EXISTS", "يوجد موسم نشط بالفعل. أغلقه أولاً.", 409);
      patch.endDate = null;
    }
    if (body.status !== "active" && prev.status === "active") patch.endDate = new Date();
    patch.status = body.status;
  }
  if (Object.keys(patch).length === 0) return ok({ season: prev });

  const row = await db.transaction(async (tx) => {
    const [s] = await tx.update(seasons).set(patch).where(eq(seasons.id, id)).returning();
    await audit(tx, "season.update", "season", id, { name: prev.name, status: prev.status }, { name: s.name, status: s.status });
    return s;
  });
  return ok({
    season: {
      id: row.id,
      name: row.name,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate ? row.endDate.toISOString() : null,
      status: row.status,
    },
  });
});
