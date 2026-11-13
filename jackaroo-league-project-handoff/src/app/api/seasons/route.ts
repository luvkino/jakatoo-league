import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { cleanName } from "@/lib/normalize";
import { ApiError, api, audit, ok, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

const dto = (s: typeof seasons.$inferSelect) => ({
  id: s.id,
  name: s.name,
  startDate: s.startDate.toISOString(),
  endDate: s.endDate ? s.endDate.toISOString() : null,
  status: s.status,
});

// Starting a new season closes the active one. Nothing is ever deleted:
// previous seasons and their matches stay available as history.
export const POST = api({ admin: true }, async (req) => {
  const body = await readJson(req);
  const name = cleanName(typeof body.name === "string" ? body.name : "");
  if (!name) throw new ApiError("EMPTY_NAME", "اكتب اسم الموسم.", 400);
  let startDate = new Date();
  if (typeof body.startDate === "string" && body.startDate) {
    const d = new Date(body.startDate);
    if (Number.isNaN(d.getTime())) throw new ApiError("INVALID_DATE", "تاريخ البداية غير صالح.", 400);
    startDate = d;
  }
  const result = await db.transaction(async (tx) => {
    const active = await tx.select().from(seasons).where(eq(seasons.status, "active"));
    for (const a of active) {
      await tx.update(seasons).set({ status: "closed", endDate: new Date() }).where(eq(seasons.id, a.id));
      await audit(tx, "season.close", "season", a.id, { status: "active" }, { status: "closed" });
    }
    const [s] = await tx.insert(seasons).values({ name, startDate, status: "active" }).returning();
    await audit(tx, "season.create", "season", s.id, null, { name, startDate: startDate.toISOString() });
    return s;
  });
  return ok({ season: dto(result) }, 201);
});
