/**
 * CASINO — basic-strategy reference (no hidden math, fully inspectable).
 *
 * The chart assumes the most common rules (4–8 decks, S17, DAS, late
 * surrender). It is a *reference panel* for the player; the engine never uses
 * it to make decisions on the player's behalf.
 */

export type StrategyMove = "H" | "S" | "D" | "Ds" | "P" | "R" | "Ph";

export const STRATEGY_LEGEND: { code: StrategyMove; label: string; desc: string }[] = [
  { code: "H", label: "سحب", desc: "اطلب ورقة إضافية (Hit)." },
  { code: "S", label: "توقف", desc: "توقف عن السحب (Stand)." },
  { code: "D", label: "مضاعفة", desc: "ضاعف الرهان واسحب ورقة واحدة — وإذا لم تكن المضاعفة مسموحة، اسحب." },
  { code: "Ds", label: "مضاعفة/توقف", desc: "ضاعف إن كانت مسموحة، وإلا توقف." },
  { code: "P", label: "تقسيم", desc: "اقسم الورقتين المتساويتين (Split)." },
  { code: "R", label: "استسلام", desc: "استسلم (فقدان نصف الرهان) إن كان الاستسلام متاحاً، وإلا اسحب." },
  { code: "Ph", label: "قسم/سحب", desc: "اقسم إن كانت القاعدة تسمح، وإلا اسحب." },
];

/** Dealer upcards in chart order. */
export const DEALER_UPCARDS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"] as const;

/** Hard totals 5 → 21 (17 rows: 5..21). */
export const HARD_ROWS = [
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
] as const;

const HARD: Record<string, StrategyMove[]> = {
  "5": ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  "6": ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  "7": ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  "8": ["H", "H", "H", "H", "H", "H", "H", "H", "H", "H"],
  "9": ["H", "D", "D", "D", "D", "H", "H", "H", "H", "H"],
  "10": ["D", "D", "D", "D", "D", "D", "D", "D", "H", "H"],
  "11": ["D", "D", "D", "D", "D", "D", "D", "D", "D", "H"],
  "12": ["H", "H", "S", "S", "S", "H", "H", "H", "H", "H"],
  "13": ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
  "14": ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
  "15": ["S", "S", "S", "S", "S", "H", "H", "H", "R", "H"],
  "16": ["S", "S", "S", "S", "S", "H", "H", "R", "R", "R"],
  "17": ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  "18": ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  "19": ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  "20": ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  "21": ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
};

/** Soft totals A,2 … A,9 (8 rows). */
export const SOFT_ROWS = ["A,2", "A,3", "A,4", "A,5", "A,6", "A,7", "A,8", "A,9"] as const;

const SOFT: Record<string, StrategyMove[]> = {
  "A,2": ["H", "H", "H", "D", "D", "H", "H", "H", "H", "H"],
  "A,3": ["H", "H", "H", "D", "D", "H", "H", "H", "H", "H"],
  "A,4": ["H", "H", "D", "D", "D", "H", "H", "H", "H", "H"],
  "A,5": ["H", "H", "D", "D", "D", "H", "H", "H", "H", "H"],
  "A,6": ["H", "D", "D", "D", "D", "H", "H", "H", "H", "H"],
  "A,7": ["Ds", "Ds", "Ds", "Ds", "Ds", "S", "S", "H", "H", "H"],
  "A,8": ["S", "S", "S", "S", "Ds", "S", "S", "S", "S", "S"],
  "A,9": ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
};

/** Pairs 2,2 … A,A (10 rows). */
export const PAIR_ROWS = ["2,2", "3,3", "4,4", "5,5", "6,6", "7,7", "8,8", "9,9", "10,10", "A,A"] as const;

const PAIRS: Record<string, StrategyMove[]> = {
  "2,2": ["P", "P", "P", "P", "P", "P", "H", "H", "H", "H"],
  "3,3": ["P", "P", "P", "P", "P", "P", "H", "H", "H", "H"],
  "4,4": ["H", "H", "H", "P", "P", "H", "H", "H", "H", "H"],
  "5,5": ["D", "D", "D", "D", "D", "D", "D", "D", "H", "H"],
  "6,6": ["P", "P", "P", "P", "P", "H", "H", "H", "H", "H"],
  "7,7": ["P", "P", "P", "P", "P", "P", "H", "H", "H", "H"],
  "8,8": ["P", "P", "P", "P", "P", "P", "P", "P", "P", "P"],
  "9,9": ["P", "P", "P", "P", "P", "S", "P", "P", "S", "S"],
  "10,10": ["S", "S", "S", "S", "S", "S", "S", "S", "S", "S"],
  "A,A": ["P", "P", "P", "P", "P", "P", "P", "P", "P", "P"],
};

export interface StrategyChart {
  hard: { label: string; moves: StrategyMove[] }[];
  soft: { label: string; moves: StrategyMove[] }[];
  pairs: { label: string; moves: StrategyMove[] }[];
}

export const BASIC_STRATEGY: StrategyChart = {
  hard: HARD_ROWS.map((r) => ({ label: r, moves: HARD[r]! })),
  soft: SOFT_ROWS.map((r) => ({ label: r, moves: SOFT[r]! })),
  pairs: PAIR_ROWS.map((r) => ({ label: r, moves: PAIRS[r]! })),
};

/** Best-practice advice for a concrete hand (used by Practice Mode). */
export function advise(
  playerTotal: number,
  soft: boolean,
  pair: boolean,
  dealerUp: string,
): { code: StrategyMove; label: string } {
  const col = DEALER_UPCARDS.indexOf(dealerUp as (typeof DEALER_UPCARDS)[number]);
  const c = col === -1 ? 0 : col;
  let code: StrategyMove = "H";
  if (pair) {
    const key = playerTotal === 12 ? "A,A" : `${playerTotal / 2},${playerTotal / 2}`;
    code = PAIRS[key]?.[c] ?? "H";
  } else if (soft) {
    const key = `A,${playerTotal - 11}`;
    code = SOFT[key]?.[c] ?? "S";
  } else {
    code = HARD[String(Math.max(5, Math.min(21, playerTotal)))]?.[c] ?? "S";
  }
  const legend = STRATEGY_LEGEND.find((l) => l.code === code);
  return { code, label: legend?.label ?? code };
}
