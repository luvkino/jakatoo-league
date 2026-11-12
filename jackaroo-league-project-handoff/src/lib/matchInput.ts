import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { ApiError, UUID_RE } from "@/lib/server";

export interface MatchInput {
  t1: [string, string];
  t2: [string, string];
  winningTeam: 1 | 2;
  stones: number;
  comeback: boolean;
  note: string | null;
}

/** Validates a match payload with clear Arabic messages. */
export function parseMatch(body: Record<string, unknown>): MatchInput {
  const t1 = Array.isArray(body.t1) ? body.t1 : [];
  const t2 = Array.isArray(body.t2) ? body.t2 : [];
  const ids = [...t1, ...t2];
  if (t1.length !== 2 || t2.length !== 2 || ids.some((x) => typeof x !== "string" || !x)) {
    throw new ApiError("INVALID_MATCH", "يجب اختيار لاعبين اثنين في كل فريق (أربعة لاعبين في المجموع).");
  }
  if (ids.some((x) => !UUID_RE.test(x as string))) throw new ApiError("INVALID_MATCH", "أحد اللاعبين غير صالح.");
  if (new Set(ids).size !== 4) throw new ApiError("DUPLICATE_PLAYERS", "يجب أن يكون اللاعبون الأربعة مختلفين.");
  const w = Number(body.winningTeam);
  if (w !== 1 && w !== 2) throw new ApiError("NO_WINNER", "اختر الفريق الفائز (لا يوجد تعادل).");
  const stones = body.stones;
  if (typeof stones !== "number" || !Number.isInteger(stones) || stones < 0 || stones > 8) {
    throw new ApiError("INVALID_STONES", "عدد الأحجار المتبقية مع الفريق الخاسر يجب أن يكون رقماً صحيحاً من 0 إلى 8.");
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;
  return {
    t1: [t1[0] as string, t1[1] as string],
    t2: [t2[0] as string, t2[1] as string],
    winningTeam: w,
    stones,
    comeback: body.comeback === true,
    note,
  };
}

/** Ensures the players exist; archived players are only allowed if `allowArchived` contains them. */
export async function checkPlayers(input: MatchInput, allowArchived: string[] = []) {
  const ids = [...input.t1, ...input.t2];
  const rows = await db.select().from(players).where(inArray(players.id, ids));
  if (rows.length !== 4) throw new ApiError("INVALID_MATCH", "أحد اللاعبين غير موجود.", 400);
  for (const r of rows) {
    if (r.archived && !allowArchived.includes(r.id)) {
      throw new ApiError("ARCHIVED_PLAYER", `اللاعب «${r.name}» مؤرشف ولا يمكن إضافته إلى مباراة جديدة.`, 400);
    }
  }
}
