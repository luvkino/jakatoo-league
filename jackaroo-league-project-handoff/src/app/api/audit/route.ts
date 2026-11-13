import { desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { api, ok } from "@/lib/server";

export const dynamic = "force-dynamic";

export const GET = api({ admin: true }, async () => {
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.at), desc(auditLog.id)).limit(200);
  return ok({
    entries: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      admin: r.admin,
      previous: r.previous,
      next: r.next,
      at: r.at.toISOString(),
    })),
  });
});
