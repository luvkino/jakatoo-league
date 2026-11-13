import { getLeagueSpotlight } from "./chaos";
import type { SfxKind } from "./sound";
import type { League, MatchRec } from "./stats";

export type EventRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type VisualEffect =
  | "confetti"
  | "explosion"
  | "shake"
  | "flash"
  | "crownRain"
  | "piggyBounce"
  | "glitch"
  | "meteor";

export interface ChaosEvent {
  id: string;
  rarity: EventRarity;
  title: string;
  message: string;
  effects: VisualEffect[];
  sound: SfxKind;
  durationMs: number;
  icon: "sparkle" | "fire" | "bolt" | "crown" | "piggy" | "trophy" | "chaos" | "coin";
}

export const RARITY_META: Record<
  EventRarity,
  { labelAr: string; badgeClass: string; color: string; weight: number }
> = {
  COMMON: { labelAr: "عادي · COMMON", badgeClass: "chip", color: "#94a0b8", weight: 66 },
  RARE: { labelAr: "نادر · RARE", badgeClass: "chip chip-accent", color: "#38bdf8", weight: 23 },
  EPIC: { labelAr: "ملحمي · EPIC", badgeClass: "chip chip-good", color: "#c084fc", weight: 9 },
  LEGENDARY: { labelAr: "أسطوري · LEGENDARY", badgeClass: "chip chip-legendary", color: "#fbbf24", weight: 2 },
};

export function rollRarity(roll = Math.random()): EventRarity {
  const r = roll * 100;
  if (r < RARITY_META.LEGENDARY.weight) return "LEGENDARY";
  if (r < RARITY_META.LEGENDARY.weight + RARITY_META.EPIC.weight) return "EPIC";
  if (r < RARITY_META.LEGENDARY.weight + RARITY_META.EPIC.weight + RARITY_META.RARE.weight) return "RARE";
  return "COMMON";
}

interface EventTemplate {
  id: string;
  rarity: EventRarity;
  effects: VisualEffect[];
  sound: SfxKind;
  durationMs: number;
  icon: ChaosEvent["icon"];
  build: (ctx: EventCtx) => { title: string; message: string } | null;
}

interface EventCtx {
  leaderName: string | null;
  leaderPoints: number;
  lastName: string | null;
  lastGames: number;
  hotName: string | null;
  hotStreak: number;
  totalMatches: number;
}

const EVENT_POOL: EventTemplate[] = [
  // ---- COMMON (minor pixel animations, small funny messages, character reactions)
  {
    id: "com_coin",
    rarity: "COMMON",
    effects: ["confetti"],
    sound: "notification",
    durationMs: 3200,
    icon: "coin",
    build: (c) => ({
      title: "عملات بكسل متطايرة!",
      message: c.leaderName
        ? `مطر خفيف من العملات احتفاءً بصدارة «${c.leaderName}» (${c.leaderPoints} نقطة).`
        : "قطعة ذهبية 8-بت مرّت من فوق الطاولة!",
    }),
  },
  {
    id: "com_piggy_wiggle",
    rarity: "COMMON",
    effects: ["piggyBounce"],
    sound: "notification",
    durationMs: 3200,
    icon: "piggy",
    build: (c) => ({
      title: "تحرّك الحصالة!",
      message: c.lastName
        ? `الحصالة تهمس لـ«${c.lastName}»: الفوز القادم سيغيّر كل شيء!`
        : "تم رصد حركة مريبة في قاع الترتيب!",
    }),
  },
  {
    id: "com_spark",
    rarity: "COMMON",
    effects: ["confetti"],
    sound: "click",
    durationMs: 3000,
    icon: "sparkle",
    build: (c) => ({
      title: "تفاعل الجاكارو السريع",
      message: c.totalMatches > 0
        ? `${c.totalMatches} مباراة مسجلة حتى الآن… والطاولة ما زالت ساخنة!`
        : "الشاشة تنتظر الشرارة الأولى من المباريات!",
    }),
  },

  // ---- RARE (special card animations, unusual victory vibes, rare humorous messages)
  {
    id: "rare_boom",
    rarity: "RARE",
    effects: ["explosion", "shake"],
    sound: "rare",
    durationMs: 4200,
    icon: "fire",
    build: (c) => ({
      title: "انفجار بكسل نادر!",
      message: c.hotName && c.hotStreak >= 2
        ? `«${c.hotName}» يشعل الطاولة بسلسلة ${c.hotStreak} انتصارات متتالية!`
        : "طاقة 16-بت مفاجئة ضربت لوحة الدوري!",
    }),
  },
  {
    id: "rare_crown_glint",
    rarity: "RARE",
    effects: ["crownRain", "flash"],
    sound: "rare",
    durationMs: 4200,
    icon: "crown",
    build: (c) => ({
      title: "لمعان التاج الملكي",
      message: c.leaderName
        ? `التاج الذهبي يسطع فوق رأس «${c.leaderName}» — من يجرؤ على التحدي؟`
        : "تاج الصدارة يبحث عن بطل يرتديه!",
    }),
  },
  {
    id: "rare_glitch",
    rarity: "RARE",
    effects: ["glitch", "explosion"],
    sound: "rare",
    durationMs: 4000,
    icon: "chaos",
    build: () => ({
      title: "تشويش كارتريدج كلاسيكي",
      message: "يبدو أن أحدهم نفخ في شريط اللعبة! كل الإحصائيات سليمة 100%.",
    }),
  },

  // ---- EPIC (full-screen pixel animations, special leaderboard effects, rare arcade notifications)
  {
    id: "epic_storm",
    rarity: "EPIC",
    effects: ["explosion", "shake", "flash", "confetti"],
    sound: "epic",
    durationMs: 5400,
    icon: "bolt",
    build: (c) => ({
      title: "⚡ عاصفة الفوضى الملحمية!",
      message: c.leaderName && c.lastName
        ? `صراع العمالقة بين «${c.leaderName}» في القمة و«${c.lastName}» في القاع يشعل الشاشة!`
        : "انفجار طاقة أركيد ملحمية اجتاح ساحة JACKAROO LEAGUE!",
    }),
  },
  {
    id: "epic_arcade_overdrive",
    rarity: "EPIC",
    effects: ["meteor", "shake", "crownRain"],
    sound: "epic",
    durationMs: 5400,
    icon: "trophy",
    build: (c) => ({
      title: "🏆 وضع الأركيد الفائق — EPIC!",
      message: c.totalMatches > 0
        ? `حدث ملحمي نادر! الدوري يوثّق ${c.totalMatches} مواجهة حقيقية بكل تفاصيلها.`
        : "طاقة ملحمية نادرة في ساحة اللعب!",
    }),
  },

  // ---- LEGENDARY (extremely rare full-screen events, unique pixel animations, exclusive messages)
  {
    id: "leg_jackaroo_godmode",
    rarity: "LEGENDARY",
    effects: ["meteor", "crownRain", "explosion", "shake", "flash"],
    sound: "legendary",
    durationMs: 7000,
    icon: "chaos",
    build: (c) => ({
      title: "👑 حدث أسطوري نادر جداً · LEGENDARY JACKAROO!",
      message: c.leaderName
        ? `النيازك الذهبية تهطل على الدوري! عرش «${c.leaderName}» يهتز باحتفال أسطوري لا يتكرر كثيراً!`
        : "ظهر الحدث الأسطوري النادر! احتفظ بلقطة شاشة لهذه اللحظة الذهبية!",
    }),
  },
  {
    id: "leg_golden_jack",
    rarity: "LEGENDARY",
    effects: ["crownRain", "confetti", "flash", "shake"],
    sound: "legendary",
    durationMs: 7000,
    icon: "crown",
    build: () => ({
      title: "🃏 ظهور ورقة الولد الذهبي الأسطورية!",
      message: "نسبة الحدوث 2% فقط! بارك الله في أوراقك في المباريات القادمة!",
    }),
  },
];

export function generateRandomChaosEvent(
  league: League,
  matches: MatchRec[],
  nameOf: (id: string) => string,
  forcedRarity?: EventRarity,
): ChaosEvent {
  const spot = getLeagueSpotlight(league);
  const hot = [...league.ranking]
    .filter((r) => r.curWin > 0)
    .sort((a, b) => b.curWin - a.curWin)[0];

  const ctx: EventCtx = {
    leaderName: spot.leader ? nameOf(spot.leader.id) : null,
    leaderPoints: spot.leader?.points ?? 0,
    lastName: spot.lastPlace ? nameOf(spot.lastPlace.id) : null,
    lastGames: spot.lastPlace?.games ?? 0,
    hotName: hot ? nameOf(hot.id) : null,
    hotStreak: hot?.curWin ?? 0,
    totalMatches: matches.length,
  };

  const targetRarity = forcedRarity ?? rollRarity();
  const matching = EVENT_POOL.filter((e) => e.rarity === targetRarity);
  const pool = matching.length > 0 ? matching : EVENT_POOL;
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  const built = tpl.build(ctx) ?? {
    title: "حدث أركيد!",
    message: "طاقة بكسل مفاجئة في الدوري!",
  };

  return {
    id: `${tpl.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    rarity: tpl.rarity,
    title: built.title,
    message: built.message,
    effects: tpl.effects,
    sound: tpl.sound,
    durationMs: tpl.durationMs,
    icon: tpl.icon,
  };
}
