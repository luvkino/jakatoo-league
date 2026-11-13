import type { League, PStat } from "./stats";

export const LEADER_TITLES = [
  "ملك الدوري",
  "الزعيم الأوحد",
  "إمبراطور الطاولة",
  "سيد الصدارة",
  "تاج البطولة",
] as const;

export const LEADER_MESSAGES = [
  "ملك الدوري بلا منازع.",
  "البقية يتنافسون على المركز الثاني.",
  "هذا اللاعب يلعب في دوري مختلف.",
  "يبدو أن أحداً لم يخبره أن المنافسة جماعية.",
  "الزعيم وصل، انتهى النقاش.",
  "العرش محجوز باسمه حالياً… والباقي في الانتظار.",
  "نقاطه ترتفع والخصوم يبحثون عن الأعذار.",
  "أعلى الطاولة محجوز للملك فقط.",
] as const;

export const LAST_PLACE_TITLES = [
  "حصالة الدوري",
  "ذيل الدوري",
  "قاع الترتيب",
  "وزارة الهزائم",
  "مشروع لاعب",
  "مواطن المركز الأخير",
  "آخر الناجين",
  "صاحب المقعد الدائم",
] as const;

export const LAST_PLACE_MESSAGES = [
  "الحصالة مفتوحة للتبرع بالنقاط للجميع.",
  "المكان دافئ ومريح في القاع… على ما يبدو.",
  "لا تقلق، الطريق من هنا للأعلى فقط!",
  "الدوري يطالب باسترجاع النقاط.",
  "بانتظار المعجزة لقلب جدول الترتيب.",
  "يرجى ربط حزام الأمان في المقعد الأخير.",
  "حضور مشرّف… في نهاية القائمة.",
] as const;

export interface LeagueSpotlight {
  leader: PStat | null;
  leaderGap: number;
  lastPlace: PStat | null;
  playedCount: number;
}

/**
 * Purely cosmetic derivation from the already-computed League ranking.
 * Leader = #1 ranked player with at least 1 match.
 * Last place = lowest-ranked player among those who have played (when >= 2 played).
 * Never permanently attached to any player; updates automatically whenever ranking changes.
 */
export function getLeagueSpotlight(league: League): LeagueSpotlight {
  const played = league.ranking.filter((r) => r.games > 0);
  if (played.length === 0) {
    return { leader: null, leaderGap: 0, lastPlace: null, playedCount: 0 };
  }
  const leader = played[0];
  const leaderGap = played.length >= 2 ? leader.points - played[1].points : leader.points;
  const lastPlace = played.length >= 2 ? played[played.length - 1] : null;
  return { leader, leaderGap, lastPlace, playedCount: played.length };
}

export function pickRotating<T>(items: readonly T[], seed: number): T {
  const idx = Math.abs(Math.floor(seed)) % items.length;
  return items[idx];
}

export interface PlayerRpgProfile {
  level: number;
  xpPct: number;
  roleTitle: string;
  attributes: {
    key: string;
    label: string;
    value: number; // 0..100 for visual pixel gauge
    rawText: string;
    tone: "accent" | "good" | "bad" | "neutral";
  }[];
}

/**
 * Computes retro RPG-style display metrics purely from real PStat values.
 */
export function getPlayerRpgProfile(
  s: PStat,
  opts: { isLeader?: boolean; isLastPlace?: boolean } = {},
): PlayerRpgProfile {
  const level = 1 + Math.floor(s.points / 6) + Math.floor(s.games / 4);
  const xpProgress = ((s.points % 6) + (s.games % 4) * 0.5) / 8;
  const xpPct = Math.min(100, Math.max(8, Math.round(xpProgress * 100)));

  let roleTitle = "لاعب طاولة";
  if (s.games === 0) roleTitle = "مقاتل في الانتظار";
  else if (opts.isLeader) roleTitle = "ملك الدوري 👑";
  else if (opts.isLastPlace) roleTitle = "حارس القاع 🐷";
  else if (s.curWin >= 3) roleTitle = "بطل السلسلة 🔥";
  else if (s.comebackWins >= 2) roleTitle = "سيد العودة 🔄";
  else if (s.dominantWins >= 3) roleTitle = "الضارب الساحق 💪";
  else if (s.partnerCount >= 4) roleTitle = "صانع التحالفات 🤝";
  else if ((s.winRate ?? 0) >= 0.65 && s.games >= 3) roleTitle = "قنّاص النقاط 🎯";
  else if (s.games >= 10) roleTitle = "محارب مخضرم 🛡️";

  const winPower = s.winRate !== null ? Math.round(s.winRate * 100) : 0;
  const avgDiff = s.avgStoneDiff ?? 0;
  const controlPower = s.games > 0 ? Math.min(100, Math.max(5, Math.round(((avgDiff + 6) / 12) * 100))) : 0;
  const clutchRatio =
    s.games > 0 ? Math.min(100, Math.round(((s.comebackWins * 2 + s.dominantWins) / Math.max(1, s.games)) * 75)) : 0;
  const streakPower = s.games > 0 ? Math.min(100, Math.round((s.maxWin * 18) + (s.curWin * 12))) : 0;

  return {
    level,
    xpPct,
    roleTitle,
    attributes: [
      {
        key: "attack",
        label: "قوة الفوز",
        value: winPower,
        rawText: s.winRate === null ? "—" : `${winPower}%`,
        tone: winPower >= 55 ? "good" : winPower > 0 && winPower < 40 ? "bad" : "accent",
      },
      {
        key: "control",
        label: "السيطرة (الأحجار)",
        value: controlPower,
        rawText: s.avgStoneDiff === null ? "—" : `${s.avgStoneDiff > 0 ? "+" : ""}${Number(s.avgStoneDiff.toFixed(1))}`,
        tone: avgDiff > 0 ? "good" : avgDiff < 0 ? "bad" : "neutral",
      },
      {
        key: "clutch",
        label: "العودة والحسم",
        value: clutchRatio,
        rawText: `${s.comebackWins + s.dominantWins}`,
        tone: "accent",
      },
      {
        key: "streak",
        label: "الاندفاع (السلاسل)",
        value: streakPower,
        rawText: `أطول ${s.maxWin}`,
        tone: s.curWin >= 2 ? "good" : "neutral",
      },
    ],
  };
}
