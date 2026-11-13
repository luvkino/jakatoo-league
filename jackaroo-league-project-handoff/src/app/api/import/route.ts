import { sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, players, seasons } from "@/db/schema";
import { cleanName, nameKey } from "@/lib/normalize";
import { ApiError, UUID_RE, api, audit, ok, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

const isDate = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(new Date(v).getTime());

function bad(msg: string): never {
  throw new ApiError("INVALID_IMPORT", `ملف غير صالح: ${msg}`, 400);
}

/** Strictly validates a backup file before anything is touched. */
function validate(data: unknown) {
  if (!data || typeof data !== "object") bad("المحتوى ليس كائن JSON.");
  const d = data as Record<string, unknown>;
  if (d.version !== 1) bad("إصدار النسخة الاحتياطية غير مدعوم.");
  if (!Array.isArray(d.players) || !Array.isArray(d.seasons) || !Array.isArray(d.matches))
    bad("يجب أن يحتوي الملف على اللاعبين والمواسم والمباريات.");

  const pIds = new Set<string>();
  const keys = new Set<string>();
  const ps = (d.players as Record<string, unknown>[]).map((p, i) => {
    if (!p || typeof p.id !== "string" || !UUID_RE.test(p.id)) bad(`معرّف اللاعب رقم ${i + 1} غير صالح.`);
    const name = cleanName(typeof p.name === "string" ? p.name : "");
    if (!name) bad(`اسم اللاعب رقم ${i + 1} فارغ.`);
    if (pIds.has(p.id)) bad(`معرّف لاعب مكرر: ${p.id}`);
    const key = nameKey(name);
    if (keys.has(key)) bad(`اسم لاعب مكرر: ${name}`);
    pIds.add(p.id);
    keys.add(key);
    return {
      id: p.id,
      name,
      nameKey: key,
      archived: p.archived === true,
      archivedAt: p.archived === true ? new Date() : null,
      createdAt: isDate(p.createdAt) ? new Date(p.createdAt) : new Date(),
    };
  });

  const sIds = new Set<string>();
  const ss = (d.seasons as Record<string, unknown>[]).map((s, i) => {
    if (!s || typeof s.id !== "string" || !UUID_RE.test(s.id)) bad(`معرّف الموسم رقم ${i + 1} غير صالح.`);
    if (sIds.has(s.id)) bad(`معرّف موسم مكرر: ${s.id}`);
    const name = cleanName(typeof s.name === "string" ? s.name : "");
    if (!name) bad(`اسم الموسم رقم ${i + 1} فارغ.`);
    if (!["active", "closed", "archived"].includes(String(s.status))) bad(`حالة الموسم «${name}» غير صالحة.`);
    if (!isDate(s.startDate)) bad(`تاريخ بداية الموسم «${name}» غير صالح.`);
    sIds.add(s.id);
    return {
      id: s.id,
      name,
      status: String(s.status),
      startDate: new Date(s.startDate as string),
      endDate: isDate(s.endDate) ? new Date(s.endDate) : null,
    };
  });
  if (ss.filter((s) => s.status === "active").length > 1) bad("يوجد أكثر من موسم نشط.");

  const mIds = new Set<string>();
  const ms = (d.matches as Record<string, unknown>[]).map((m, i) => {
    const n = i + 1;
    if (!m || typeof m.id !== "string" || !UUID_RE.test(m.id)) bad(`معرّف المباراة رقم ${n} غير صالح.`);
    if (mIds.has(m.id)) bad(`معرّف مباراة مكرر: ${m.id}`);
    mIds.add(m.id);
    if (typeof m.seasonId !== "string" || !sIds.has(m.seasonId)) bad(`المباراة رقم ${n} تشير إلى موسم غير موجود.`);
    const t1 = m.t1 as unknown[];
    const t2 = m.t2 as unknown[];
    if (!Array.isArray(t1) || !Array.isArray(t2) || t1.length !== 2 || t2.length !== 2) bad(`فرق المباراة رقم ${n} غير صالحة.`);
    const all = [...t1, ...t2] as string[];
    if (all.some((x) => typeof x !== "string" || !pIds.has(x))) bad(`المباراة رقم ${n} تشير إلى لاعب غير موجود.`);
    if (new Set(all).size !== 4) bad(`لاعبو المباراة رقم ${n} غير مختلفين.`);
    if (m.winningTeam !== 1 && m.winningTeam !== 2) bad(`الفريق الفائز في المباراة رقم ${n} غير صالح.`);
    if (typeof m.stones !== "number" || !Number.isInteger(m.stones) || m.stones < 0 || m.stones > 8)
      bad(`عدد الأحجار في المباراة رقم ${n} يجب أن يكون من 0 إلى 8.`);
    if (!isDate(m.playedAt)) bad(`تاريخ المباراة رقم ${n} غير صالح.`);
    return {
      id: m.id,
      seasonId: m.seasonId as string,
      t1p1: all[0],
      t1p2: all[1],
      t2p1: all[2],
      t2p2: all[3],
      winningTeam: m.winningTeam as number,
      stones: m.stones as number,
      comeback: m.comeback === true,
      note: typeof m.note === "string" && m.note ? m.note.slice(0, 500) : null,
      playedAt: new Date(m.playedAt as string),
    };
  });
  return { ps, ss, ms };
}

// Two-step restore. confirm=false only validates and returns a summary.
// confirm=true replaces the current league data (inside one transaction,
// so a failure leaves the existing data untouched). The audit log is kept.
export const POST = api({ admin: true }, async (req) => {
  const body = await readJson(req);
  const { ps, ss, ms } = validate(body.data);
  const summary = { players: ps.length, seasons: ss.length, matches: ms.length };
  if (body.confirm !== true) return ok({ validated: true, summary });

  await db.transaction(async (tx) => {
    const cur = await tx.execute(
      sql`select (select count(*) from players)::int p, (select count(*) from seasons)::int s, (select count(*) from matches)::int m`,
    );
    await tx.delete(matches);
    await tx.delete(seasons);
    await tx.delete(players);
    for (let i = 0; i < ps.length; i += 500) await tx.insert(players).values(ps.slice(i, i + 500));
    for (let i = 0; i < ss.length; i += 500) await tx.insert(seasons).values(ss.slice(i, i + 500));
    for (let i = 0; i < ms.length; i += 500) await tx.insert(matches).values(ms.slice(i, i + 500));
    await audit(tx, "data.restore", "data", null, cur.rows[0], summary);
  });
  // make sure a season exists so the app keeps working
  await db.execute(sql`insert into seasons (name, status) select 'الموسم الأول','active' where not exists (select 1 from seasons)`);
  return ok({ restored: true, summary });
});
