import { getLeagueSpotlight } from "./chaos";
import type { League, MatchRec, PlayerRec, PStat } from "./stats";

export type TrashContext =
  | "leader"
  | "lastPlace"
  | "winner"
  | "loser"
  | "comeback"
  | "dominant"
  | "clean"
  | "streak"
  | "general"
  | "rare";

export interface TrashMessage {
  id: string;
  text: string;
  category: TrashContext;
  rare?: boolean;
  targetPlayerId?: string;
}

interface Template {
  id: string;
  cat: TrashContext;
  rare?: boolean;
  build: (ctx: BuildCtx) => string | null;
}

interface BuildCtx {
  leader?: { name: string; stat: PStat; gap: number };
  last?: { name: string; stat: PStat };
  hotWinner?: { name: string; stat: PStat };
  coldPlayer?: { name: string; stat: PStat };
  latestMatch?: {
    winners: [string, string];
    losers: [string, string];
    stones: number;
    comeback: boolean;
  };
  anyPlayer?: { name: string; stat: PStat };
  totalMatches: number;
}

const TEMPLATES: Template[] = [
  // ---- Leader messages
  { id: "ldr_1", cat: "leader", build: (c) => (c.leader ? `«${c.leader.name}» ملك الدوري بلا منازع.` : null) },
  { id: "ldr_2", cat: "leader", build: (c) => (c.leader ? `يبدو أن البقية يتنافسون على المركز الثاني خلف «${c.leader.name}».` : null) },
  { id: "ldr_3", cat: "leader", build: (c) => (c.leader ? `«${c.leader.name}» يلعب في دوري مختلف تماماً (${c.leader.stat.points} نقطة).` : null) },
  { id: "ldr_4", cat: "leader", build: (c) => (c.leader ? `يبدو أن أحداً لم يخبر «${c.leader.name}» أن المنافسة جماعية!` : null) },
  { id: "ldr_5", cat: "leader", build: (c) => (c.leader ? `الزعيم «${c.leader.name}» وصل، انتهى النقاش.` : null) },
  { id: "ldr_6", cat: "leader", build: (c) => (c.leader && c.leader.gap >= 3 ? `فارق ${c.leader.gap} نقاط في الصدارة! «${c.leader.name}» يوسّع المسافة.` : null) },
  { id: "ldr_7", cat: "leader", build: (c) => (c.leader ? `التاج الذهبي يلتصق برأس «${c.leader.name}» حالياً.` : null) },
  { id: "ldr_8", cat: "leader", build: (c) => (c.leader ? `تحذير للجميع: «${c.leader.name}» ما زال يجمع النقاط.` : null) },

  // ---- Last place messages
  { id: "lst_1", cat: "lastPlace", build: (c) => (c.last ? `الحصالة رجعت لمكانها… أهلاً بـ«${c.last.name}» في القاع.` : null) },
  { id: "lst_2", cat: "lastPlace", build: (c) => (c.last ? `الدوري يطالب «${c.last.name}» باسترجاع النقاط.` : null) },
  { id: "lst_3", cat: "lastPlace", build: (c) => (c.last ? `محاولة أخرى لتجنب النجاح من «${c.last.name}».` : null) },
  { id: "lst_4", cat: "lastPlace", build: (c) => (c.last ? `وزارة الهزائم تفتح أبوابها برئاسة «${c.last.name}».` : null) },
  { id: "lst_5", cat: "lastPlace", build: (c) => (c.last ? `«${c.last.name}» يحتفظ بالمقعد الدائم في ذيل الترتيب بكل أناقة.` : null) },
  { id: "lst_6", cat: "lastPlace", build: (c) => (c.last ? `يُشاع أن الحصالة أصبحت باسم «${c.last.name}» رسمياً.` : null) },
  { id: "lst_7", cat: "lastPlace", build: (c) => (c.last ? `«${c.last.name}» يثبت أن التواضع في النقاط أسلوب حياة.` : null) },
  { id: "lst_8", cat: "lastPlace", build: (c) => (c.last ? `المركز الأخير مريح جداً بالنسبة لـ«${c.last.name}»!` : null) },

  // ---- Winner & streak messages
  { id: "win_1", cat: "winner", build: (c) => (c.latestMatch ? `بدأنا نشوف بوادر حياة بعد فوز «${c.latestMatch.winners[0]}» و«${c.latestMatch.winners[1]}»!` : null) },
  { id: "win_2", cat: "winner", build: (c) => (c.latestMatch ? `«${c.latestMatch.winners[0]}» و«${c.latestMatch.winners[1]}» غادرا الطاولة بابتسامة عريضة.` : null) },
  { id: "win_3", cat: "winner", build: (c) => (c.hotWinner ? `«${c.hotWinner.name}» يجمع الانتصارات وكأنها عملات 8-بت!` : null) },
  { id: "win_4", cat: "streak", build: (c) => (c.hotWinner && c.hotWinner.stat.curWin >= 2 ? `سلسلة مشتعلة! «${c.hotWinner.name}» حقق ${c.hotWinner.stat.curWin} انتصارات متتالية.` : null) },
  { id: "win_5", cat: "streak", build: (c) => (c.hotWinner && c.hotWinner.stat.curWin >= 3 ? `لا أحد يستطيع إيقاف قطار «${c.hotWinner.name}» الآن!` : null) },
  { id: "win_6", cat: "winner", build: (c) => (c.latestMatch ? `انتصار محسوب بدقة من «${c.latestMatch.winners[0]}» و«${c.latestMatch.winners[1]}».` : null) },
  { id: "win_7", cat: "winner", build: (c) => (c.anyPlayer && c.anyPlayer.stat.wins > 0 ? `«${c.anyPlayer.name}» يذكّر الجميع بأن الفوز عادة جميلة.` : null) },

  // ---- Loser & cold streak messages
  { id: "los_1", cat: "loser", build: (c) => (c.latestMatch ? `بعض اللاعبين وجودهم إحصائية فقط… تحية لـ«${c.latestMatch.losers[0]}» و«${c.latestMatch.losers[1]}».` : null) },
  { id: "los_2", cat: "loser", build: (c) => (c.coldPlayer ? `«${c.coldPlayer.name}» يبحث عن زر إعادة التشغيل بعد ${c.coldPlayer.stat.curLose} خسائر متتالية.` : null) },
  { id: "los_3", cat: "loser", build: (c) => (c.latestMatch ? `هل كان «${c.latestMatch.losers[0]}» و«${c.latestMatch.losers[1]}» يلعبان بيدٍ واحدة؟` : null) },
  { id: "los_4", cat: "loser", build: (c) => (c.coldPlayer ? `محاولة أخرى لتجنب النجاح… حظاً أوفر يا «${c.coldPlayer.name}».` : null) },
  { id: "los_5", cat: "loser", build: (c) => (c.latestMatch ? `«${c.latestMatch.losers[0]}» و«${c.latestMatch.losers[1]}» قدّما درساً في الكرم الكروي… عفواً الجاكاروي!` : null) },
  { id: "los_6", cat: "loser", build: (c) => (c.coldPlayer ? `أوراق اللعب تعاند «${c.coldPlayer.name}» بشكل درامي اليوم.` : null) },

  // ---- Comeback / Dominant / Clean match specials
  { id: "cmb_1", cat: "comeback", build: (c) => (c.latestMatch?.comeback ? `سجلوا التاريخ، صار شيء غير متوقع! ريمونتادا من «${c.latestMatch.winners[0]}» و«${c.latestMatch.winners[1]}»!` : null) },
  { id: "cmb_2", cat: "comeback", build: (c) => (c.latestMatch?.comeback ? `عودة أسطورية من حافة الهزيمة! البطاقة الأخيرة غيرت كل شيء.` : null) },
  { id: "dom_1", cat: "dominant", build: (c) => (c.latestMatch && c.latestMatch.stones >= 5 ? `فوز ساحق بـ${c.latestMatch.stones} أحجار متبقية! الخصم ما زال يبحث عن طريقته للخروج.` : null) },
  { id: "dom_2", cat: "dominant", build: (c) => (c.latestMatch && c.latestMatch.stones >= 6 ? `هل نسي الفريق الخاسر أن يحرك أحجاره؟ فرق ${c.latestMatch.stones} أحجار!` : null) },
  { id: "cln_1", cat: "clean", build: (c) => (c.latestMatch && c.latestMatch.stones === 0 ? `فوز نظيف! ولا حجر بقي مع الخصم على اللوح.` : null) },

  // ---- General playful commentary (always works)
  { id: "gen_1", cat: "general", build: () => "بعض اللاعبين وجودهم إحصائية فقط." },
  { id: "gen_2", cat: "general", build: () => "محاولة أخرى لتجنب النجاح." },
  { id: "gen_3", cat: "general", build: () => "سجلوا التاريخ، صار شيء غير متوقع." },
  { id: "gen_4", cat: "general", build: () => "بدأنا نشوف بوادر حياة في الجدول!" },
  { id: "gen_5", cat: "general", build: () => "يبدو أن المنافسة ليست للجميع." },
  { id: "gen_6", cat: "general", build: () => "الدوري يطالب باسترجاع النقاط." },
  { id: "gen_7", cat: "general", build: () => "في الجاكارو… الجوكر يضحك أخيراً." },
  { id: "gen_8", cat: "general", build: () => "الأرقام لا تجامل أحداً في جدول الترتيب." },
  { id: "gen_9", cat: "general", build: () => "نصيحة اليوم: راقب شريكك قبل أن تراقب خصمك." },
  { id: "gen_10", cat: "general", build: () => "بعض الشراكات تحتاج إلى عقد صلح عاجل." },
  { id: "gen_11", cat: "general", build: () => "الحظ يزور الطاولة أحياناً… لكنه يغادر بسرعة." },
  { id: "gen_12", cat: "general", build: (c) => (c.totalMatches > 0 ? `${c.totalMatches} مباراة مسجلة، وما زالت الدراما في بدايتها.` : "الطاولة جاهزة… من يفتح سجل الانتصارات؟") },
  { id: "gen_13", cat: "general", build: () => "كروت الجاكارو تُوزّع الآن في وضع 8-بت الكلاسيكي!" },
  { id: "gen_14", cat: "general", build: () => "فارق الأحجار هو العدو الصامت في نهاية الموسم." },
  { id: "gen_15", cat: "general", build: () => "الخسارة بـ8 أحجار يجب أن تُدرّس في قاعة المشاهير!" },
  { id: "gen_16", cat: "general", build: () => "كل لاعب يظن أنه الضحية الأولى لسوء توزيع الأوراق." },
  { id: "gen_17", cat: "general", build: () => "صوت تحريك الأحجار يرتفع مع اشتداد المنافسة." },
  { id: "gen_18", cat: "general", build: () => "هل هناك لاعب يخطط لانقلاب على الصدارة؟" },
  { id: "gen_19", cat: "general", build: () => "تذكير: الأعذار لا تمنح 3 نقاط!" },
  { id: "gen_20", cat: "general", build: () => "أفضل طريقة لتجنب الحصالة هي الفوز بمباراة واحدة على الأقل!" },

  // ---- Rare dramatic trash talk
  { id: "rare_1", cat: "rare", rare: true, build: (c) => (c.leader && c.last ? `⚡ تقرير نادر: المسافة بين «${c.leader.name}» و«${c.last.name}» تُقاس بالسنوات الضوئية!` : null) },
  { id: "rare_2", cat: "rare", rare: true, build: () => "👾 رسالة سرية من جهاز الأركيد: الجوكر يراقب كل حركة على الطاولة!" },
  { id: "rare_3", cat: "rare", rare: true, build: (c) => (c.hotWinner ? `🔥 حالة طوارئ في الدوري: من يوقف «${c.hotWinner.name}» قبل فوات الأوان؟` : "🔥 حالة طوارئ في الدوري: جولة حاسمة على الأبواب!") },
  { id: "rare_4", cat: "rare", rare: true, build: (c) => (c.last ? `🐷 إنذار الحصالة الأسطوري: تم رصد «${c.last.name}» يحاول الفرار من القاع!` : null) },
  { id: "rare_5", cat: "rare", rare: true, build: () => "💎 سجلوا التاريخ: تعليق نادر من كابينة المعلق الكلاسيكي!" },
];

const recentIds: string[] = [];
const MAX_RECENT = 18;

export function buildTrashContext(
  league: League,
  matches: MatchRec[],
  nameOf: (id: string) => string,
  focusPlayerId?: string,
): BuildCtx {
  const spot = getLeagueSpotlight(league);
  const played = league.ranking.filter((r) => r.games > 0);
  const focusStat = focusPlayerId ? league.stats.get(focusPlayerId) : undefined;

  const hotWinnerStat =
    (focusStat && focusStat.curWin > 0 ? focusStat : undefined) ??
    [...played].sort((a, b) => b.curWin - a.curWin || b.wins - a.wins)[0];

  const coldStat =
    (focusStat && focusStat.curLose > 0 ? focusStat : undefined) ??
    [...played].filter((p) => p.curLose > 0).sort((a, b) => b.curLose - a.curLose || a.stoneDiff - b.stoneDiff)[0];

  const lastM = matches.length > 0 ? matches[matches.length - 1] : undefined;
  const latestMatch = lastM
    ? {
        winners: (lastM.winningTeam === 1 ? lastM.t1 : lastM.t2).map(nameOf) as [string, string],
        losers: (lastM.winningTeam === 1 ? lastM.t2 : lastM.t1).map(nameOf) as [string, string],
        stones: lastM.stones,
        comeback: lastM.comeback,
      }
    : undefined;

  const anyStat = focusStat ?? played[0];

  return {
    leader: spot.leader ? { name: nameOf(spot.leader.id), stat: spot.leader, gap: spot.leaderGap } : undefined,
    last: spot.lastPlace ? { name: nameOf(spot.lastPlace.id), stat: spot.lastPlace } : undefined,
    hotWinner: hotWinnerStat && hotWinnerStat.wins > 0 ? { name: nameOf(hotWinnerStat.id), stat: hotWinnerStat } : undefined,
    coldPlayer: coldStat ? { name: nameOf(coldStat.id), stat: coldStat } : undefined,
    latestMatch,
    anyPlayer: anyStat ? { name: nameOf(anyStat.id), stat: anyStat } : undefined,
    totalMatches: matches.length,
  };
}

export function pickTrashTalk(
  league: League,
  matches: MatchRec[],
  nameOf: (id: string) => string,
  opts: {
    focusPlayerId?: string;
    preferredCategories?: TrashContext[];
    allowRare?: boolean;
    trackRecent?: boolean;
  } = {},
): TrashMessage {
  const ctx = buildTrashContext(league, matches, nameOf, opts.focusPlayerId);
  const allowRare = opts.allowRare ?? true;
  const trackRecent = opts.trackRecent ?? true;

  // Build all currently valid messages
  let candidates: { t: Template; text: string }[] = [];
  for (const t of TEMPLATES) {
    if (t.rare && !allowRare) continue;
    const text = t.build(ctx);
    if (text) candidates.push({ t, text });
  }

  // Filter by preferred category if requested and matches exist
  if (opts.preferredCategories?.length) {
    const pref = candidates.filter((c) => opts.preferredCategories!.includes(c.t.cat));
    if (pref.length > 0) candidates = pref;
  }

  // Anti-repeat filtering
  const fresh = candidates.filter((c) => !recentIds.includes(c.t.id));
  const pool = fresh.length > 0 ? fresh : candidates;

  // Give rare templates low selection odds (~7% when mixed) unless explicitly requested
  const nonRare = pool.filter((c) => !c.t.rare);
  const rareOnly = pool.filter((c) => c.t.rare);
  const useRare = rareOnly.length > 0 && (nonRare.length === 0 || Math.random() < 0.08);
  const finalPool = useRare ? rareOnly : nonRare.length > 0 ? nonRare : pool;

  const chosen = finalPool[Math.floor(Math.random() * finalPool.length)] ?? {
    t: TEMPLATES[0],
    text: "يبدو أن المنافسة ليست للجميع.",
  };

  if (trackRecent) {
    recentIds.push(chosen.t.id);
    if (recentIds.length > MAX_RECENT) recentIds.shift();
  }

  return {
    id: chosen.t.id,
    text: chosen.text,
    category: chosen.t.cat,
    rare: chosen.t.rare,
    targetPlayerId: opts.focusPlayerId,
  };
}

export function getPlayerSpecificTrashTalk(
  player: PlayerRec,
  league: League,
  matches: MatchRec[],
  nameOf: (id: string) => string,
): TrashMessage {
  const spot = getLeagueSpotlight(league);
  const stat = league.stats.get(player.id);
  const preferred: TrashContext[] = [];
  if (spot.leader?.id === player.id) preferred.push("leader");
  else if (spot.lastPlace?.id === player.id) preferred.push("lastPlace");
  else if (stat && stat.curWin >= 2) preferred.push("streak", "winner");
  else if (stat && stat.curLose >= 2) preferred.push("loser");
  else if (stat && stat.games === 0) preferred.push("general");
  else preferred.push("winner", "general");

  return pickTrashTalk(league, matches, nameOf, {
    focusPlayerId: player.id,
    preferredCategories: preferred,
    trackRecent: false,
  });
}

export function getTrashPoolSize(): number {
  return TEMPLATES.length;
}
