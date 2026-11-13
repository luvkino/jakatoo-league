// ============================================================================
// SECRET EASTER EGGS — pure registry & helpers (no DOM, no React).
// Fully isolated from the league system: nothing here touches players,
// matches, rankings, achievements or any server data.
// ============================================================================

export type EggId =
  | "blackjack"
  | "developer"
  | "glitch"
  | "boss"
  | "alien"
  | "matrix"
  | "pet"
  | "secrets"
  | "konami"
  | "logo7"
  | "onepercent";

export type EggIconName =
  | "eggCards"
  | "eggTerminal"
  | "eggGlitch"
  | "eggBoss"
  | "eggUfo"
  | "eggMatrix"
  | "eggPet"
  | "eggVault"
  | "eggKonami"
  | "eggLogo"
  | "eggCrown1";

export interface EggDef {
  id: EggId;
  /** Secret code typed anywhere on the page (case-insensitive). null = activated another way. */
  code: string | null;
  title: string;
  desc: string;
  /** Cryptic hint shown for locked entries in the secret collection. */
  hint: string;
  icon: EggIconName;
}

export const EGGS: readonly EggDef[] = [
  {
    id: "blackjack",
    code: "blackjack",
    title: "طاولة البلاك جاك السرية",
    desc: "كازينو بكسلي مدفون تحت أرضية الملعب. تبدأ برصيد 1000 شيبس وهمية تماماً — لا قيمة حقيقية لها إطلاقاً.",
    hint: "؟؟؟ — لعبة ورق… تُكتب في الهواء",
    icon: "eggCards",
  },
  {
    id: "developer",
    code: "developer",
    title: "غرفة المطور",
    desc: "طرفية قديمة مهجورة فيها رسائل المبرمجين وتشخيصات وهمية 100%. لا تلمس شيئاً.",
    hint: "؟؟؟ — مكان يسهرون فيه ليلاً مع القهوة",
    icon: "eggTerminal",
  },
  {
    id: "glitch",
    code: "glitch",
    title: "خلل في المصفوفة",
    desc: "الموقع ينهار بصرياً لبضع ثوانٍ… ثم يعود وكأن شيئاً لم يكن. لا شيء حقيقي يُكسر أبداً.",
    hint: "؟؟؟ — عندما تسوء البكسلات",
    icon: "eggGlitch",
  },
  {
    id: "boss",
    code: "boss",
    title: "المركز الأخير: الزعيم",
    desc: "معركة أركيد أسطورية ضد أسطورة قاع الترتيب. خيالية بالكامل ولا علاقة لها بأي ترتيب حقيقي.",
    hint: "؟؟؟ — خصم نهائي… أسطوري",
    icon: "eggBoss",
  },
  {
    id: "alien",
    code: "alien",
    title: "غزو الفضائيين",
    desc: "أطباق طائرة تدرس جدول الترتيب وتحاول سرقته. محاولتها بائسة وترتيبك سليم تماماً.",
    hint: "؟؟؟ — زوار من بعيد… جداً",
    icon: "eggUfo",
  },
  {
    id: "matrix",
    code: "matrix",
    title: "وضع المصفوفة",
    desc: "أحرف خضراء تتساقط في الظلام. اتبع الحصالة الوردية… واخرج قبل أن تنسى الطريق.",
    hint: "؟؟؟ — واقع بديل أخضر",
    icon: "eggMatrix",
  },
  {
    id: "pet",
    code: "pet",
    title: "الرفيق السري",
    desc: "كائن بكسلي صغير يسكن زاوية الشاشة ويعلّق على كل ما يحدث حوله.",
    hint: "؟؟؟ — صديق صغير جداً",
    icon: "eggPet",
  },
  {
    id: "secrets",
    code: "secrets",
    title: "خزنة الأسرار",
    desc: "سجلٌّ يوثّق كل سر اكتشفته في هذا الموقع، مع كل الأسرار التي ما زلت تجهلها.",
    hint: "؟؟؟ — المكان الذي تُحفظ فيه الأسرار",
    icon: "eggVault",
  },
  {
    id: "konami",
    code: null,
    title: "الكود الأسطوري",
    desc: "↑ ↑ ↓ ↓ ← → ← → B A — الكود الذي يحفظه كل لاعب حقيقي عن ظهر قلب. احترام خالص.",
    hint: "؟؟؟ — إشارة قديمة جداً يعرفها اللاعبون الحقيقيون",
    icon: "eggKonami",
  },
  {
    id: "logo7",
    code: null,
    title: "نادي المعجبين السري",
    desc: "سبع نقرات سريعة على شعار الدوري تكشف عن ولائك الأعمى. أهلاً بك في النادي.",
    hint: "؟؟؟ — العضوية بالنقر… سبع مرات",
    icon: "eggLogo",
  },
  {
    id: "onepercent",
    code: null,
    title: "حدث الواحد بالمئة",
    desc: "اختيار نادر جداً يحدث مرة كل مئة زيارة تقريباً… إدارة الدوري بانتظارك. مزاح بالطبع.",
    hint: "؟؟؟ — حظٌّ من نوع نادر جداً",
    icon: "eggCrown1",
  },
];

export function getEgg(id: EggId): EggDef {
  const egg = EGGS.find((e) => e.id === id);
  if (!egg) throw new Error(`Unknown egg: ${id}`);
  return egg;
}

/** Eggs required for the "Secret Hunter" achievement (pure-luck 1% event excluded). */
export const HUNTER_REQUIRED: readonly EggId[] = EGGS.filter((e) => e.id !== "onepercent").map(
  (e) => e.id,
);

// ---------------------------------------------------------------------------
// Secret achievement registry (browser-local only — never sent to the server,
// completely separate from the league achievements system).
// ---------------------------------------------------------------------------

export type EggAchId =
  | "first_blackjack"
  | "lucky_21"
  | "streak_5"
  | "dealer_destroyer"
  | "glitch_survivor"
  | "alien_encounter"
  | "matrix_explorer"
  | "secret_hunter";

export interface EggAchDef {
  id: EggAchId;
  title: string;
  desc: string;
  icon: EggIconName;
}

export const EGG_ACHIEVEMENTS: readonly EggAchDef[] = [
  { id: "first_blackjack", title: "أول بلاك جاك", desc: "أكملت أول جولة على الطاولة السرية.", icon: "eggCards" },
  { id: "lucky_21", title: "الـ 21 المحظوظ", desc: "وصلت إلى 21 بثلاث أوراق أو أكثر.", icon: "eggCards" },
  { id: "streak_5", title: "خمسة على التوالي", desc: "خمسة انتصارات متتالية في البلاك جاك.", icon: "eggCards" },
  { id: "dealer_destroyer", title: "مدمّر الموزّع", desc: "فزت لأن الموزّع تجاوز الـ 21.", icon: "eggCards" },
  { id: "glitch_survivor", title: "ناجي الخلل", desc: "صمدت حتى النهاية أمام عاصفة الخلل البصرية.", icon: "eggGlitch" },
  { id: "alien_encounter", title: "لقاء فضائي", desc: "شاهدت الغزو الكامل وخرجت بشكلك سليماً.", icon: "eggUfo" },
  { id: "matrix_explorer", title: "مستكشف المصفوفة", desc: "دخلت المصفوفة وخرجت منها بسلام.", icon: "eggMatrix" },
  { id: "secret_hunter", title: "قنّاص الأسرار", desc: "اكتشفت كل الأسرار القابلة للاكتشاف في الموقع.", icon: "eggVault" },
];

export function getAch(id: EggAchId): EggAchDef {
  const a = EGG_ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown egg achievement: ${id}`);
  return a;
}

// ---------------------------------------------------------------------------
// Hidden keystroke buffer (typed-code matching).
// Pure helpers so the matching logic is unit-testable.
// ---------------------------------------------------------------------------

/**
 * Feed one KeyboardEvent.key into the rolling secret-code buffer.
 * - Latin letters are appended (lower-cased => codes are case-insensitive).
 * - Any other printable key becomes a word separator (" ").
 * - Modifier/special keys (Shift, arrows, Escape…) leave the buffer untouched,
 *   so typing "Blackjack" with a Shift still matches.
 */
export function pushKeyToBuffer(buffer: string, key: string): string {
  if (key.length !== 1) return buffer; // ignore Shift/Arrow/etc. (Escape handled by caller)
  const ch = key.toLowerCase();
  if (ch >= "a" && ch <= "z") return (buffer + ch).slice(-48);
  return (buffer + " ").slice(-48);
}

/**
 * Match the buffer against every registered secret code.
 * Short codes (< 5 chars, e.g. "pet"/"boss") must appear as a whole word at
 * the end of the buffer, so typing "carpet" never fires "pet" and "embossed"
 * never fires "boss". Longer codes match as a plain suffix so that mistyping
 * and immediately retyping a code still works without waiting.
 */
export function matchCode(buffer: string): EggDef | null {
  if (!buffer) return null;
  let best: EggDef | null = null;
  for (const egg of EGGS) {
    const code = egg.code;
    if (!code || buffer.length < code.length) continue;
    if (buffer.slice(-code.length) !== code) continue;
    if (code.length < 5) {
      const boundary = buffer.length === code.length ? "" : buffer[buffer.length - code.length - 1];
      if (boundary !== "" && boundary !== " ") continue;
    }
    if (!best || code.length > (best.code?.length ?? 0)) best = egg;
  }
  return best;
}

/** True when the key event target is a place where the user is really typing. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable === true
  );
}

/** Should the 1% rare event be allowed to roll on this page load? */
export function onePercentShouldRoll(opts: {
  sessionSeen: boolean;
  lastTriggeredAtMs: number | null;
  nowMs: number;
  cooldownMs?: number;
}): boolean {
  if (opts.sessionSeen) return false;
  const cooldown = opts.cooldownMs ?? 6 * 60 * 60 * 1000; // default: once per 6h max
  if (opts.lastTriggeredAtMs !== null && opts.nowMs - opts.lastTriggeredAtMs < cooldown) return false;
  return true;
}
