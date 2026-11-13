import { asc } from "drizzle-orm";
import { db } from "@/db";
import { matches, players, seasons } from "@/db/schema";
import { api, ok, toMatchRec } from "@/lib/server";

export const dynamic = "force-dynamic";

export const GET = api({}, async (_req, _ctx, isAdmin) => {
  const [p, s, m] = await Promise.all([
    db.select().from(players).orderBy(asc(players.createdAt)),
    db.select().from(seasons).orderBy(asc(seasons.startDate)),
    db.select().from(matches).orderBy(asc(matches.playedAt)),
  ]);
  return ok({
    isAdmin,
    players: p.map((x) => ({
      id: x.id,
      name: x.name,
      archived: x.archived,
      createdAt: x.createdAt.toISOString(),
    })),
    seasons: s.map((x) => ({
      id: x.id,
      name: x.name,
      startDate: x.startDate.toISOString(),
      endDate: x.endDate ? x.endDate.toISOString() : null,
      status: x.status,
    })),
    matches: m.map(toMatchRec),
  });
});
