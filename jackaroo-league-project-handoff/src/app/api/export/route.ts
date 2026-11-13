import { asc } from "drizzle-orm";
import { db } from "@/db";
import { matches, players, seasons } from "@/db/schema";
import { api, toMatchRec } from "@/lib/server";
import { computeLeague, fmtRate } from "@/lib/stats";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csv = (rows: unknown[][]) => "\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

export const GET = api({ admin: true }, async (req) => {
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const kind = req.nextUrl.searchParams.get("kind") === "players" ? "players" : "matches";
  const [p, s, m] = await Promise.all([
    db.select().from(players).orderBy(asc(players.createdAt)),
    db.select().from(seasons).orderBy(asc(seasons.startDate)),
    db.select().from(matches).orderBy(asc(matches.playedAt)),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const body = {
      app: "JACKAROO LEAGUE",
      version: 1,
      exportedAt: new Date().toISOString(),
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
    };
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="jackaroo-backup-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const name = new Map(p.map((x) => [x.id, x.name]));
  const seasonName = new Map(s.map((x) => [x.id, x.name]));
  let text: string;
  if (kind === "players") {
    const lg = computeLeague(
      p.map((x) => ({ id: x.id, name: x.name, archived: x.archived, createdAt: x.createdAt.toISOString() })),
      m.map(toMatchRec),
    );
    text = csv([
      ["الترتيب", "اللاعب", "نقاط الدوري", "نسبة الفوز", "فارق الأحجار", "الفوز", "الخسارة", "المباريات"],
      ...lg.ranking.map((r) => [r.rank, name.get(r.id), r.points, fmtRate(r.winRate), r.stoneDiff, r.wins, r.losses, r.games]),
    ]);
  } else {
    text = csv([
      ["التاريخ", "الموسم", "الفريق الأول (1)", "الفريق الأول (2)", "الفريق الثاني (1)", "الفريق الثاني (2)", "الفائز", "الأحجار المتبقية", "عودة", "ملاحظة"],
      ...m.map((x) => [
        x.playedAt.toISOString(),
        seasonName.get(x.seasonId),
        name.get(x.t1p1),
        name.get(x.t1p2),
        name.get(x.t2p1),
        name.get(x.t2p2),
        x.winningTeam === 1 ? "الفريق الأول" : "الفريق الثاني",
        x.stones,
        x.comeback ? "نعم" : "لا",
        x.note ?? "",
      ]),
    ]);
  }
  return new Response(text, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jackaroo-${kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
