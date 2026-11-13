// Pure statistics engine. Match records are the single source of truth:
// everything here is derived from them and can always be rebuilt.
// No ELO, no minimum-match rules, no official/provisional split.

export interface PlayerRec {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
}
export interface SeasonRec {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: "active" | "closed" | "archived";
}
export interface MatchRec {
  id: string;
  seasonId: string;
  t1: [string, string];
  t2: [string, string];
  winningTeam: 1 | 2;
  stones: number;
  comeback: boolean;
  note: string | null;
  playedAt: string;
}

export const POINTS_PER_WIN = 3;
export const SMALL_SAMPLE = 3;

export interface PartnerStat {
  partnerId: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number | null;
  stoneDiff: number;
  avgStoneDiff: number | null;
}
export interface PairStat {
  a: string;
  b: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number | null;
  stoneDiff: number;
  avgStoneDiff: number | null;
}
export interface H2H {
  games: number;
  wins: number;
  losses: number;
  winRate: number | null;
  stoneDiff: number;
}
export interface ResultEntry {
  matchId: string;
  win: boolean;
  stones: number;
  partner: string;
  opponents: [string, string];
  playedAt: string;
}
export interface PStat {
  id: string;
  rank: number; // 0 when not ranked in this scope
  games: number;
  wins: number;
  losses: number;
  points: number;
  winRate: number | null;
  stoneDiff: number;
  avgStoneDiff: number | null;
  curWin: number;
  maxWin: number;
  curLose: number;
  maxLose: number;
  last5: ("W" | "L")[];
  dominantWins: number;
  comebackWins: number;
  partnerCount: number;
  partners: PartnerStat[];
  results: ResultEntry[];
}

function blank(id: string): PStat {
  return {
    id,
    rank: 0,
    games: 0,
    wins: 0,
    losses: 0,
    points: 0,
    winRate: null,
    stoneDiff: 0,
    avgStoneDiff: null,
    curWin: 0,
    maxWin: 0,
    curLose: 0,
    maxLose: 0,
    last5: [],
    dominantWins: 0,
    comebackWins: 0,
    partnerCount: 0,
    partners: [],
    results: [],
  };
}

export function sortMatches(ms: MatchRec[]): MatchRec[] {
  return [...ms].sort(
    (x, y) =>
      new Date(x.playedAt).getTime() - new Date(y.playedAt).getTime() ||
      x.id.localeCompare(y.id),
  );
}

export interface League {
  stats: Map<string, PStat>;
  ranking: PStat[];
  pairs: PairStat[];
  h2h: Map<string, Map<string, H2H>>;
}

type Live = Map<string, PStat>;
interface Hooks {
  before?: (m: MatchRec, live: Live) => void;
  after?: (m: MatchRec, live: Live, pairLive: Map<string, PairStat>) => void;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const rate = (w: number, g: number) => (g > 0 ? w / g : null);

function refresh(s: PStat) {
  s.points = s.wins * POINTS_PER_WIN;
  s.winRate = rate(s.wins, s.games);
  s.avgStoneDiff = s.games > 0 ? s.stoneDiff / s.games : null;
}

/** Single chronological pass over matches. */
function run(
  players: PlayerRec[],
  matches: MatchRec[],
  hooks?: Hooks,
): { live: Live; pairs: Map<string, PairStat>; h2h: Map<string, Map<string, H2H>>; partnerMap: Map<string, Map<string, PartnerStat>> } {
  const live: Live = new Map();
  for (const p of players) live.set(p.id, blank(p.id));
  const get = (id: string) => {
    let s = live.get(id);
    if (!s) {
      s = blank(id);
      live.set(id, s);
    }
    return s;
  };
  const pairs = new Map<string, PairStat>();
  const h2h = new Map<string, Map<string, H2H>>();
  const partnerMap = new Map<string, Map<string, PartnerStat>>();

  const h2hGet = (a: string, b: string) => {
    let row = h2h.get(a);
    if (!row) h2h.set(a, (row = new Map()));
    let e = row.get(b);
    if (!e) row.set(b, (e = { games: 0, wins: 0, losses: 0, winRate: null, stoneDiff: 0 }));
    return e;
  };
  const partnerGet = (a: string, b: string) => {
    let row = partnerMap.get(a);
    if (!row) partnerMap.set(a, (row = new Map()));
    let e = row.get(b);
    if (!e)
      row.set(
        b,
        (e = { partnerId: b, games: 0, wins: 0, losses: 0, winRate: null, stoneDiff: 0, avgStoneDiff: null }),
      );
    return e;
  };

  for (const m of sortMatches(matches)) {
    hooks?.before?.(m, live);
    const winners = m.winningTeam === 1 ? m.t1 : m.t2;
    const losers = m.winningTeam === 1 ? m.t2 : m.t1;
    const stones = m.stones;

    const apply = (id: string, partner: string, opp: [string, string], win: boolean) => {
      const s = get(id);
      s.games++;
      if (win) {
        s.wins++;
        s.stoneDiff += stones;
        s.curWin++;
        s.curLose = 0;
        s.maxWin = Math.max(s.maxWin, s.curWin);
        if (stones >= 5) s.dominantWins++;
        if (m.comeback) s.comebackWins++;
      } else {
        s.losses++;
        s.stoneDiff -= stones;
        s.curLose++;
        s.curWin = 0;
        s.maxLose = Math.max(s.maxLose, s.curLose);
      }
      s.last5.push(win ? "W" : "L");
      if (s.last5.length > 5) s.last5.shift();
      s.results.push({ matchId: m.id, win, stones, partner, opponents: opp, playedAt: m.playedAt });
      const p = partnerGet(id, partner);
      p.games++;
      if (win) {
        p.wins++;
        p.stoneDiff += stones;
      } else {
        p.losses++;
        p.stoneDiff -= stones;
      }
      p.winRate = rate(p.wins, p.games);
      p.avgStoneDiff = p.stoneDiff / p.games;
      s.partnerCount = partnerMap.get(id)!.size;
      refresh(s);
    };

    apply(winners[0], winners[1], [losers[0], losers[1]], true);
    apply(winners[1], winners[0], [losers[0], losers[1]], true);
    apply(losers[0], losers[1], [winners[0], winners[1]], false);
    apply(losers[1], losers[0], [winners[0], winners[1]], false);

    // pairs (teammates)
    for (const [team, win] of [
      [winners, true],
      [losers, false],
    ] as const) {
      const k = pairKey(team[0], team[1]);
      let e = pairs.get(k);
      if (!e) {
        const [a, b] = team[0] < team[1] ? [team[0], team[1]] : [team[1], team[0]];
        pairs.set(k, (e = { a, b, games: 0, wins: 0, losses: 0, winRate: null, stoneDiff: 0, avgStoneDiff: null }));
      }
      e.games++;
      if (win) {
        e.wins++;
        e.stoneDiff += stones;
      } else {
        e.losses++;
        e.stoneDiff -= stones;
      }
      e.winRate = rate(e.wins, e.games);
      e.avgStoneDiff = e.stoneDiff / e.games;
    }

    // head-to-head: only opponents, never teammates
    for (const w of winners)
      for (const l of losers) {
        const a = h2hGet(w, l);
        a.games++;
        a.wins++;
        a.stoneDiff += stones;
        a.winRate = rate(a.wins, a.games);
        const b = h2hGet(l, w);
        b.games++;
        b.losses++;
        b.stoneDiff -= stones;
        b.winRate = rate(b.wins, b.games);
      }

    hooks?.after?.(m, live, pairs);
  }
  return { live, pairs, h2h, partnerMap };
}

function metricCmp(a: PStat, b: PStat): number {
  if (b.points !== a.points) return b.points - a.points;
  const wa = a.winRate ?? -1;
  const wb = b.winRate ?? -1;
  if (wb !== wa) return wb - wa;
  if (b.stoneDiff !== a.stoneDiff) return b.stoneDiff - a.stoneDiff;
  if (b.wins !== a.wins) return b.wins - a.wins;
  const aa = a.avgStoneDiff ?? -Infinity;
  const ab = b.avgStoneDiff ?? -Infinity;
  if (ab !== aa) return ab > aa ? 1 : -1;
  return 0;
}

/** Best partnership ordering used across the app. */
export function bestPairCmp<T extends { winRate: number | null; games: number; stoneDiff: number }>(a: T, b: T): number {
  const wa = a.winRate ?? -1;
  const wb = b.winRate ?? -1;
  if (wb !== wa) return wb - wa;
  if (b.games !== a.games) return b.games - a.games;
  return b.stoneDiff - a.stoneDiff;
}

export function computeLeague(players: PlayerRec[], matches: MatchRec[]): League {
  const { live, pairs, h2h, partnerMap } = run(players, matches);
  const names = new Map(players.map((p) => [p.id, p.name]));
  for (const [id, s] of live) {
    s.partners = [...(partnerMap.get(id)?.values() ?? [])];
  }
  const included = [...live.values()].filter((s) => {
    const p = players.find((x) => x.id === s.id);
    return s.games > 0 || (p && !p.archived);
  });
  included.sort((a, b) => {
    const c = metricCmp(a, b);
    if (c) return c;
    const h = h2h.get(a.id)?.get(b.id);
    if (h) {
      const net = h.wins - h.losses;
      if (net) return -net;
    }
    return (names.get(a.id) ?? "").localeCompare(names.get(b.id) ?? "", "ar");
  });
  included.forEach((s, i) => (s.rank = i + 1));
  return { stats: live, ranking: included, pairs: [...pairs.values()], h2h };
}

export function headToHead(matches: MatchRec[], a: string, b: string) {
  let aWins = 0;
  let bWins = 0;
  let aStone = 0;
  const list: MatchRec[] = [];
  for (const m of sortMatches(matches)) {
    const aIn1 = m.t1.includes(a);
    const aIn2 = m.t2.includes(a);
    const bIn1 = m.t1.includes(b);
    const bIn2 = m.t2.includes(b);
    if (!((aIn1 && bIn2) || (aIn2 && bIn1))) continue; // teammates are never opponents
    list.push(m);
    const aWon = (aIn1 && m.winningTeam === 1) || (aIn2 && m.winningTeam === 2);
    if (aWon) {
      aWins++;
      aStone += m.stones;
    } else {
      bWins++;
      aStone -= m.stones;
    }
  }
  const games = list.length;
  return { games, aWins, bWins, aWinRate: rate(aWins, games), bWinRate: rate(bWins, games), aStoneDiff: aStone, matches: list.reverse() };
}

// ---------------------------------------------------------------- achievements

export interface AchievementDef {
  key: string;
  title: string;
  desc: string;
  icon: string;
  seasonal?: boolean; // awarded to current leaders of a season
}
export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_victory", title: "أول انتصار", desc: "تحقيق أول فوز في مسيرتك", icon: "🥇" },
  { key: "first_season_victory", title: "أول فوز في الموسم", desc: "الفوز في أول مباراة تلعبها في الموسم", icon: "🌱" },
  { key: "win3", title: "ثلاثة انتصارات متتالية", desc: "الفوز في 3 مباريات متتالية", icon: "🔥" },
  { key: "win5", title: "خمسة انتصارات متتالية", desc: "الفوز في 5 مباريات متتالية", icon: "⚡" },
  { key: "win10", title: "عشرة انتصارات متتالية", desc: "الفوز في 10 مباريات متتالية", icon: "🚀" },
  { key: "comeback", title: "العودة", desc: "الفوز في مباراة مسجلة كعودة", icon: "🔄" },
  { key: "dominant", title: "فوز ساحق", desc: "الفوز بينما بقي مع الخصم 5 أحجار أو أكثر", icon: "💪" },
  { key: "close", title: "فوز بشق الأنفس", desc: "الفوز بينما بقي مع الخصم حجر واحد فقط", icon: "😅" },
  { key: "clean", title: "فوز نظيف", desc: "الفوز بينما لم يبقَ مع الخصم أي حجر", icon: "✨" },
  { key: "regular", title: "لاعب منتظم", desc: "لعب 10 مباريات", icon: "🎯" },
  { key: "veteran", title: "لاعب مخضرم", desc: "لعب 25 مباراة", icon: "🎖️" },
  { key: "explorer", title: "مستكشف الشركاء", desc: "اللعب مع 5 شركاء مختلفين", icon: "🧭" },
  { key: "perfect_partner", title: "شراكة مثالية", desc: "الفوز في 3 مباريات متتالية مع الشريك نفسه", icon: "🤝" },
  { key: "most_wins", title: "الأكثر فوزاً", desc: "صاحب أكبر عدد انتصارات في الموسم", icon: "👑", seasonal: true },
  { key: "best_partnership", title: "أفضل شراكة", desc: "ضمن أفضل ثنائي في الموسم", icon: "💞", seasonal: true },
  { key: "most_improved", title: "الأكثر تحسناً", desc: "أكبر تحسن في نسبة الفوز بين نصفَي مباريات الموسم", icon: "📈", seasonal: true },
  { key: "iron_wall", title: "الجدار الحديدي", desc: "أفضل متوسط فارق أحجار في المباريات الخاسرة", icon: "🛡️", seasonal: true },
  { key: "giant_killer", title: "قاتل العمالقة", desc: "الفوز على لاعبَين ترتيبهما أعلى وقت المباراة", icon: "🗡️" },
];
export const ACH_MAP = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

export interface Unlock {
  playerId: string;
  key: string;
  seasonId: string;
  at: string;
  matchId: string | null;
}

function strictlyHigher(x: PStat, y: PStat): boolean {
  return metricCmp(x, y) < 0;
}

/** Achievements are computed per season (no duplicates within a season). */
export function computeAchievements(
  players: PlayerRec[],
  matches: MatchRec[],
  seasons: SeasonRec[],
): Unlock[] {
  const out: Unlock[] = [];
  const everWon = new Set<string>();
  const order = [...seasons].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const bySeason = new Map<string, MatchRec[]>();
  for (const m of matches) {
    const arr = bySeason.get(m.seasonId) ?? [];
    arr.push(m);
    bySeason.set(m.seasonId, arr);
  }
  const ids = new Set(order.map((s) => s.id));
  const seasonIds = [...order.map((s) => s.id), ...[...bySeason.keys()].filter((k) => !ids.has(k))];

  for (const sid of seasonIds) {
    const ms = bySeason.get(sid);
    if (!ms || ms.length === 0) continue;
    const seen = new Set<string>();
    const unlock = (playerId: string, key: string, at: string, matchId: string | null) => {
      const k = `${playerId}|${key}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ playerId, key, seasonId: sid, at, matchId });
    };
    const pp = new Map<string, { partner: string; count: number }>();
    const gk = new Set<string>(); // giant killers evaluated in `before`

    const r = run(players, ms, {
      before(m, live) {
        const winners = m.winningTeam === 1 ? m.t1 : m.t2;
        const losers = m.winningTeam === 1 ? m.t2 : m.t1;
        const l0 = live.get(losers[0]);
        const l1 = live.get(losers[1]);
        if (!l0 || !l1) return;
        for (const w of winners) {
          const ws = live.get(w);
          if (ws && strictlyHigher(l0, ws) && strictlyHigher(l1, ws)) gk.add(`${w}|${m.id}`);
        }
      },
      after(m, live) {
        const winners = m.winningTeam === 1 ? m.t1 : m.t2;
        const losers = m.winningTeam === 1 ? m.t2 : m.t1;
        for (const w of winners) {
          const s = live.get(w)!;
          const partner = winners[0] === w ? winners[1] : winners[0];
          if (!everWon.has(w)) {
            everWon.add(w);
            unlock(w, "first_victory", m.playedAt, m.id);
          }
          if (s.games === 1) unlock(w, "first_season_victory", m.playedAt, m.id);
          if (s.curWin >= 3) unlock(w, "win3", m.playedAt, m.id);
          if (s.curWin >= 5) unlock(w, "win5", m.playedAt, m.id);
          if (s.curWin >= 10) unlock(w, "win10", m.playedAt, m.id);
          if (m.comeback) unlock(w, "comeback", m.playedAt, m.id);
          if (m.stones >= 5) unlock(w, "dominant", m.playedAt, m.id);
          if (m.stones === 1) unlock(w, "close", m.playedAt, m.id);
          if (m.stones === 0) unlock(w, "clean", m.playedAt, m.id);
          const cur = pp.get(w);
          const next = cur && cur.partner === partner ? { partner, count: cur.count + 1 } : { partner, count: 1 };
          pp.set(w, next);
          if (next.count >= 3) unlock(w, "perfect_partner", m.playedAt, m.id);
          if (gk.has(`${w}|${m.id}`)) unlock(w, "giant_killer", m.playedAt, m.id);
        }
        for (const l of losers) pp.set(l, { partner: "", count: 0 });
        for (const id of [...winners, ...losers]) {
          const s = live.get(id)!;
          if (s.games >= 10) unlock(id, "regular", m.playedAt, m.id);
          if (s.games >= 25) unlock(id, "veteran", m.playedAt, m.id);
          if (s.partnerCount >= 5) unlock(id, "explorer", m.playedAt, m.id);
        }
      },
    });

    // Season-level awards (given to the current leaders of the season).
    const lastAt = sortMatches(ms)[ms.length - 1].playedAt;
    const all = [...r.live.values()].filter((s) => s.games > 0);
    const maxWins = Math.max(0, ...all.map((s) => s.wins));
    if (maxWins > 0) for (const s of all) if (s.wins === maxWins) unlock(s.id, "most_wins", lastAt, null);

    const bestPair = [...r.pairs.values()].filter((p) => p.wins > 0).sort(bestPairCmp)[0];
    if (bestPair) {
      unlock(bestPair.a, "best_partnership", lastAt, null);
      unlock(bestPair.b, "best_partnership", lastAt, null);
    }

    let bestImp = 0;
    const imp = new Map<string, number>();
    for (const s of all) {
      if (s.results.length < 4) continue;
      const half = Math.floor(s.results.length / 2);
      const first = s.results.slice(0, half);
      const second = s.results.slice(half);
      const wr = (a: ResultEntry[]) => a.filter((x) => x.win).length / a.length;
      const d = wr(second) - wr(first);
      imp.set(s.id, d);
      bestImp = Math.max(bestImp, d);
    }
    if (bestImp > 0) for (const [id, d] of imp) if (d === bestImp) unlock(id, "most_improved", lastAt, null);

    const walls = all
      .filter((s) => s.losses > 0)
      .map((s) => ({
        id: s.id,
        avg: s.results.filter((x) => !x.win).reduce((t, x) => t + x.stones, 0) / s.losses,
      }));
    if (walls.length) {
      const min = Math.min(...walls.map((w) => w.avg));
      for (const w of walls) if (w.avg === min) unlock(w.id, "iron_wall", lastAt, null);
    }
  }
  return out;
}

// ---------------------------------------------------------------- hall of fame

export interface RecordEntry {
  playerId: string;
  value: number;
  games?: number;
}
export interface ChampionEntry {
  season: SeasonRec;
  first: PStat | null;
  second: PStat | null;
  matches: number;
}
export interface HallOfFame {
  champions: ChampionEntry[];
  titles: { playerId: string; titles: number }[];
  mostPoints: RecordEntry[];
  bestWinRate: RecordEntry[];
  bestStone: RecordEntry[];
  longestWin: RecordEntry[];
  dominant: RecordEntry[];
  comebacks: RecordEntry[];
  bestPairs: (PairStat & { value: number })[];
}

export function computeHallOfFame(players: PlayerRec[], matches: MatchRec[], seasons: SeasonRec[]): HallOfFame {
  const champions: ChampionEntry[] = [];
  const titleCount = new Map<string, number>();
  const sorted = [...seasons].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  for (const s of sorted) {
    if (s.status === "active") continue;
    const ms = matches.filter((m) => m.seasonId === s.id);
    if (!ms.length) continue;
    const lg = computeLeague(players, ms);
    const played = lg.ranking.filter((p) => p.games > 0);
    champions.push({ season: s, first: played[0] ?? null, second: played[1] ?? null, matches: ms.length });
    if (played[0]) titleCount.set(played[0].id, (titleCount.get(played[0].id) ?? 0) + 1);
  }
  const all = computeLeague(players, matches);
  const played = all.ranking.filter((p) => p.games > 0);
  const top = (arr: PStat[], val: (p: PStat) => number, filter: (p: PStat) => boolean = () => true, tie?: (a: PStat, b: PStat) => number): RecordEntry[] =>
    arr
      .filter(filter)
      .sort((a, b) => val(b) - val(a) || (tie ? tie(a, b) : 0))
      .slice(0, 3)
      .map((p) => ({ playerId: p.id, value: val(p), games: p.games }));
  return {
    champions,
    titles: [...titleCount.entries()].map(([playerId, titles]) => ({ playerId, titles })).sort((a, b) => b.titles - a.titles),
    mostPoints: top(played, (p) => p.points, (p) => p.points > 0),
    bestWinRate: top(played, (p) => p.winRate ?? 0, (p) => p.games > 0, (a, b) => b.games - a.games),
    bestStone: top(played, (p) => p.stoneDiff, (p) => p.games > 0),
    longestWin: top(played, (p) => p.maxWin, (p) => p.maxWin > 0),
    dominant: top(played, (p) => p.dominantWins, (p) => p.dominantWins > 0),
    comebacks: top(played, (p) => p.comebackWins, (p) => p.comebackWins > 0),
    bestPairs: [...all.pairs]
      .filter((p) => p.wins > 0)
      .sort(bestPairCmp)
      .slice(0, 3)
      .map((p) => ({ ...p, value: p.winRate ?? 0 })),
  };
}

// ---------------------------------------------------------------- formatting

export function fmtRate(r: number | null): string {
  if (r === null) return "لم يلعب";
  return `${Number((r * 100).toFixed(2))}%`;
}
export function fmtSigned(n: number): string {
  const v = Number.isInteger(n) ? n : Number(n.toFixed(2));
  return `\u200e${v > 0 ? "+" : ""}${v}`;
}
export function fmtAvg(n: number | null): string {
  return n === null ? "—" : fmtSigned(n);
}
