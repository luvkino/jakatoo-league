/**
 * CASINO — table rule definitions.
 *
 * Every table below is a *real* rule configuration consumed by the engine
 * (deck count, dealer soft-17 behaviour, payout, peek/hole-card model,
 * doubling, splitting, surrender and side-bet availability) — never a skin.
 * The `custom` table starts from a legal, conservative baseline that the
 * player can edit in Casino → Settings.
 */

import { isDeckCount, type DeckCount } from "./cards";
import { SIDE_BET_IDS, SIDE_BET_LABEL_AR, type SideBetId } from "./sideBets";

export type SurrenderRule = "none" | "early" | "late";

export interface TableRules {
  decks: DeckCount;
  /** true = H17 (dealer hits soft 17), false = S17. */
  dealerHitsSoft17: boolean;
  /** 1.5 = 3:2, 1.2 = 6:5. */
  blackjackPayout: 1.5 | 1.2;
  /** American hole card + dealer peek when allowed. */
  holeCard: boolean;
  /** Dealer peeks for blackjack on ace/ten upcards (needs a hole card). */
  dealerPeek: boolean;
  /** Double on any first two cards. */
  doubleOnAnyTwo: boolean;
  /** Allowed first-two-card totals when `doubleOnAnyTwo` is false. */
  doubleTotals: number[];
  /** Double After Split. */
  das: boolean;
  /** Maximum number of *splits* (hands = maxSplits + 1). */
  maxSplits: number;
  resplitAces: boolean;
  /** Split aces receive one card only (then stand) when false. */
  hitSplitAces: boolean;
  surrender: SurrenderRule;
  /** 21 on two cards after a split pays like a natural. */
  blackjackAfterSplit: boolean;
  /** Insurance is offered on dealer ace upcards. */
  insurance: boolean;
  /** Side bets enabled at this table. */
  sideBets: SideBetId[];
  minBet: number;
  maxBet: number;
}

export type TableId = "classic" | "vegas" | "atlantic" | "european" | "highroller" | "custom";

export interface TableMeta {
  id: TableId;
  name: string;
  nameEn: string;
  tagline: string;
  /** Visual accent for the lobby card. */
  accent: string;
  rules: TableRules;
}

const ALL_SIDE_BETS: SideBetId[] = [...SIDE_BET_IDS];

export const CLASSIC_RULES: TableRules = {
  decks: 6,
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  holeCard: true,
  dealerPeek: true,
  doubleOnAnyTwo: true,
  doubleTotals: [],
  das: true,
  maxSplits: 3,
  resplitAces: false,
  hitSplitAces: false,
  surrender: "late",
  blackjackAfterSplit: false,
  insurance: true,
  sideBets: ["perfectPairs", "twentyOnePlusThree"],
  minBet: 10,
  maxBet: 1000,
};

export const TABLES: TableMeta[] = [
  {
    id: "classic",
    name: "البلاك جاك الكلاسيكي",
    nameEn: "Classic Blackjack",
    tagline: "قواعد متوازنة ورهانات صغيرة — أفضل طاولة للتعلّم.",
    accent: "#f0c060",
    rules: { ...CLASSIC_RULES },
  },
  {
    id: "vegas",
    name: "شارع لاس فيغاس",
    nameEn: "Vegas Strip",
    tagline: "ثمانية مجموعات، الموزّع يسحب على ١٧ الناعمة، ودفع ٦:٥ للأوراق الطبيعية.",
    accent: "#ff5f8d",
    rules: {
      ...CLASSIC_RULES,
      decks: 8,
      dealerHitsSoft17: true,
      blackjackPayout: 1.2,
      surrender: "none",
      sideBets: ALL_SIDE_BETS,
      minBet: 50,
      maxBet: 5000,
    },
  },
  {
    id: "atlantic",
    name: "أتلانتيك سيتي",
    nameEn: "Atlantic City",
    tagline: "الموزّع يقف على ١٧ الناعمة، استسلام متأخر، وإعادة تقسيم الآسات.",
    accent: "#63d3ff",
    rules: {
      ...CLASSIC_RULES,
      decks: 8,
      dealerHitsSoft17: false,
      surrender: "late",
      resplitAces: true,
      hitSplitAces: false,
      sideBets: ["perfectPairs", "twentyOnePlusThree", "luckyLadies", "royalMatch"],
      minBet: 25,
      maxBet: 2500,
    },
  },
  {
    id: "european",
    name: "البلاك جاك الأوروبي",
    nameEn: "European Blackjack",
    tagline: "بدون ورقة مخفية: الموزّع يسحب ورقتين ثم يكشف كل شيء. لا تأمين.",
    accent: "#a78bfa",
    rules: {
      ...CLASSIC_RULES,
      decks: 2,
      holeCard: false,
      dealerPeek: false,
      das: false,
      surrender: "none",
      insurance: false,
      sideBets: ["perfectPairs"],
      minBet: 20,
      maxBet: 1500,
    },
  },
  {
    id: "highroller",
    name: "الرهانات العالية",
    nameEn: "High Roller",
    tagline: "مجموعة واحدة، رهانات كبيرة، وقرارات لا ترحم.",
    accent: "#e8d27a",
    rules: {
      ...CLASSIC_RULES,
      decks: 1,
      maxSplits: 1,
      resplitAces: false,
      hitSplitAces: false,
      surrender: "late",
      sideBets: ["perfectPairs", "twentyOnePlusThree", "royalMatch"],
      minBet: 500,
      maxBet: 25000,
    },
  },
  {
    id: "custom",
    name: "طاولة مخصّصة",
    nameEn: "Custom Table",
    tagline: "اضبط كل قاعدة بنفسك من إعدادات الكازينو — تُحفظ تلقائياً.",
    accent: "#7ad1a0",
    rules: { ...CLASSIC_RULES },
  },
];

export const TABLE_MAP: Record<TableId, TableMeta> = TABLES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<TableId, TableMeta>,
);

export function isTableId(v: unknown): v is TableId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(TABLE_MAP, v);
}

export function normalizeTableId(v: unknown): TableId {
  return isTableId(v) ? v : "classic";
}

const clampInt = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

/** Sanitises an untrusted rule object (localStorage / future API payloads). */
export function normalizeRules(raw: unknown, base: TableRules = CLASSIC_RULES): TableRules {
  if (!raw || typeof raw !== "object") return { ...base, doubleTotals: [...base.doubleTotals] };
  const r = raw as Record<string, unknown>;
  const decks = isDeckCount(r.decks) ? r.decks : base.decks;
  const payout = r.blackjackPayout === 1.2 || r.blackjackPayout === 1.5 ? r.blackjackPayout : base.blackjackPayout;
  const surrender: SurrenderRule =
    r.surrender === "early" || r.surrender === "late" || r.surrender === "none" ? r.surrender : base.surrender;
  const doubleTotals = Array.isArray(r.doubleTotals)
    ? r.doubleTotals
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n >= 2 && n <= 21)
        .map((n) => Math.round(n))
    : [...base.doubleTotals];
  const sideBets = Array.isArray(r.sideBets)
    ? (r.sideBets.filter((s): s is SideBetId => (SIDE_BET_IDS as readonly unknown[]).includes(s)) as SideBetId[])
    : [...base.sideBets];

  const minBet = clampInt(r.minBet, base.minBet, 1, 1_000_000);
  const maxBet = clampInt(r.maxBet, base.maxBet, minBet, 5_000_000);
  const holeCard = bool(r.holeCard, base.holeCard);

  return {
    decks,
    dealerHitsSoft17: bool(r.dealerHitsSoft17, base.dealerHitsSoft17),
    blackjackPayout: payout,
    holeCard,
    // A peek is only meaningful with a hole card.
    dealerPeek: holeCard && bool(r.dealerPeek, base.dealerPeek),
    doubleOnAnyTwo: bool(r.doubleOnAnyTwo, base.doubleOnAnyTwo),
    doubleTotals,
    das: bool(r.das, base.das),
    maxSplits: clampInt(r.maxSplits, base.maxSplits, 0, 4),
    resplitAces: bool(r.resplitAces, base.resplitAces),
    hitSplitAces: bool(r.hitSplitAces, base.hitSplitAces),
    surrender,
    blackjackAfterSplit: bool(r.blackjackAfterSplit, base.blackjackAfterSplit),
    insurance: bool(r.insurance, base.insurance),
    sideBets,
    minBet,
    maxBet,
  };
}

/** Legal, explicit descriptions used by the lobby and the in-table rules sheet. */
export function describeRules(rules: TableRules): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [
    { label: "المجموعات", value: `${rules.decks} ${rules.decks === 1 ? "مجموعة" : "مجموعات"}` },
    {
      label: "١٧ الناعمة",
      value: rules.dealerHitsSoft17 ? "الموزّع يسحب (H17)" : "الموزّع يقف (S17)",
    },
    {
      label: "دفع الطبيعية",
      value: rules.blackjackPayout === 1.5 ? "٣:٢" : "٦:٥",
    },
    {
      label: "ورقة الموزّع",
      value: rules.holeCard
        ? rules.dealerPeek
          ? "ورقة مخفية + كشف مبكر"
          : "ورقة مخفية بدون كشف مبكر"
        : "أوروبي — بدون ورقة مخفية",
    },
    {
      label: "المضاعفة",
      value: rules.doubleOnAnyTwo
        ? "على أي ورقتين"
        : rules.doubleTotals.length
          ? `على مجاميع ${rules.doubleTotals.join("، ")}`
          : "غير مسموحة",
    },
    { label: "بعد التقسيم", value: rules.das ? "المضاعفة مسموحة (DAS)" : "المضاعفة غير مسموحة" },
    { label: "الحد الأقصى للقطع", value: rules.maxSplits === 0 ? "غير مسموح" : `${rules.maxSplits} تقسيمات` },
    { label: "إعادة تقسيم الآسات", value: rules.resplitAces ? "مسموحة" : "غير مسموحة" },
    { label: "آس مقسوم", value: rules.hitSplitAces ? "يلعب عادياً" : "ورقة واحدة فقط" },
    {
      label: "الاستسلام",
      value: rules.surrender === "none" ? "غير متاح" : rules.surrender === "early" ? "مبكر" : "متأخر",
    },
    { label: "التأمين", value: rules.insurance ? "متاح" : "غير متاح" },
    {
      label: "المراهنات الجانبية",
      value: rules.sideBets.length ? rules.sideBets.map((s) => SIDE_BET_LABEL_AR[s]).join("، ") : "لا يوجد",
    },
    { label: "حدود الطاولة", value: `${rules.minBet.toLocaleString("en-US")} – ${rules.maxBet.toLocaleString("en-US")}` },
  ];
  return out;
}
