/**
 * MATCH RESULT SEQUENCE — pure ranking-movement maths + Arabic copy.
 *
 * The animation NEVER invents or alters a ranking: it receives the official
 * ranking before and after a successfully saved match and only visualises the
 * difference. Ranking calculations themselves live in `src/lib/stats.ts` and
 * are untouched.
 */

export interface RankRow {
  playerId: string;
  rank: number;
}

export interface RankMovement {
  playerId: string;
  /** Previous official rank (null when the player was not ranked before). */
  from: number | null;
  /** New official rank (null when the player left the ranking). */
  to: number | null;
  /** Positive = climbed (handles multi-position jumps). */
  delta: number;
  direction: "up" | "down" | "same" | "new" | "gone";
}

export interface MovementSummary {
  rows: RankMovement[];
  climbers: RankMovement[];
  fallers: RankMovement[];
  newEntry: RankMovement[];
  leader: RankMovement | null;
  /** True only when the official #1 changed because of this match. */
  leaderChanged: boolean;
  previousLeaderId: string | null;
  lastPlaceId: string | null;
  maxClimb: number;
  maxFall: number;
}

export function computeRankMovements(prev: RankRow[], next: RankRow[]): MovementSummary {
  const prevMap = new Map(prev.map((r) => [r.playerId, r.rank]));
  const nextMap = new Map(next.map((r) => [r.playerId, r.rank]));

  const ids = [...next.map((r) => r.playerId), ...prev.map((r) => r.playerId)];
  const seen = new Set<string>();
  const rows: RankMovement[] = [];

  for (const playerId of ids) {
    if (seen.has(playerId)) continue;
    seen.add(playerId);
    const from = prevMap.get(playerId) ?? null;
    const to = nextMap.get(playerId) ?? null;
    let delta = 0;
    let direction: RankMovement["direction"] = "same";
    if (from === null && to !== null) direction = "new";
    else if (from !== null && to === null) direction = "gone";
    else if (from !== null && to !== null) {
      delta = from - to; // smaller rank number = better position
      direction = delta > 0 ? "up" : delta < 0 ? "down" : "same";
    }
    rows.push({ playerId, from, to, delta, direction });
  }

  const ranked = rows.filter((r) => r.to !== null).sort((a, b) => (a.to ?? 0) - (b.to ?? 0));
  const climbers = rows
    .filter((r) => r.direction === "up")
    .sort((a, b) => b.delta - a.delta || (a.to ?? 0) - (b.to ?? 0));
  const fallers = rows
    .filter((r) => r.direction === "down")
    .sort((a, b) => a.delta - b.delta || (a.to ?? 0) - (b.to ?? 0));
  const newEntry = rows.filter((r) => r.direction === "new");
  const leader = ranked.find((r) => r.to === 1) ?? null;
  const previousLeaderId = prev.find((r) => r.rank === 1)?.playerId ?? null;

  return {
    rows,
    climbers,
    fallers,
    newEntry,
    leader,
    leaderChanged: !!leader && leader.playerId !== previousLeaderId && previousLeaderId !== null,
    previousLeaderId,
    lastPlaceId: ranked.length > 0 ? ranked[ranked.length - 1].playerId : null,
    maxClimb: climbers.length > 0 ? climbers[0].delta : 0,
    maxFall: fallers.length > 0 ? -fallers[0].delta : 0,
  };
}

/** Rank helpers on top of the canonical `League` shape (no recalculation here). */
export function rankRowsFrom(ranking: { id: string; rank: number }[]): RankRow[] {
  return ranking.filter((r) => r.rank > 0).map((r) => ({ playerId: r.id, rank: r.rank }));
}

export const FIRST_PLACE_MESSAGES = [
  "الأسطورة وصل، البقية مجرد أرقام.",
  "المركز الأول محجوز.",
  "التاج عاد لصاحبه، لا تبحثوا عنه.",
  "القمة مكان مزدحم… بنفس الشخص دائماً.",
  "من هنا لا يُرى أحد. استمتعوا بالمنظر من بعيد.",
];

export const CLIMB_MESSAGES = [
  "واضح أنه صحى من النوم.",
  "عودة تاريخية!",
  "صعد بسرعة المصعد، والأسفل لا يوجد به أحد.",
  "هذه ليست حظاً، هذه موهبة.",
  "قفز عدة مراكز وأخذ معها الأحجار.",
  "قالوا مستحيل، فصعد درجتين.",
];

export const LAST_PLACE_MESSAGES = [
  "مبروك، تم تعيينك مديرًا لحصالة الدوري.",
  "هذا مو مركز مؤقت، هذا عنوان السكن.",
  "الإدارة تتمنى لك موسمًا أفضل في 2040.",
  "الحصالة لا تزال في عهدتك، ونحن نشكرك على الاستمرارية.",
  "أقل منك؟ لا يوجد. أنت القاع نفسه.",
  "المركز الأخير صار يخصك بالوراثة.",
];

export const FALL_MESSAGES = [
  "البورصة انهارت، نعتذر للمساهمين.",
  "تراجع غير مبرر في الأسواق.",
  "نزول حر، بدون مظلة.",
  "كان في القمة، والآن يبحث عن الطريق.",
  "الدرج ينزل بسرعة أكثر مما يصعد.",
];

const pick = <T,>(list: T[], seed: number): T => list[Math.abs(Math.floor(seed)) % list.length];

export function pickFirstPlaceMessage(seed: number): string {
  return pick(FIRST_PLACE_MESSAGES, seed);
}
export function pickClimbMessage(seed: number): string {
  return pick(CLIMB_MESSAGES, seed);
}
export function pickLastPlaceMessage(seed: number): string {
  return pick(LAST_PLACE_MESSAGES, seed);
}
export function pickFallMessage(seed: number): string {
  return pick(FALL_MESSAGES, seed);
}

/** Formats "−3" / "+2" for the animation chips (RTL-safe, latin digits). */
export function formatDelta(delta: number): string {
  if (delta === 0) return "—";
  return delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`;
}
