// ============================================================================
// SECRET DISCOVERY COLLECTION — the hidden vault. Invisible until the first
// Easter Egg is discovered; afterwards it lists every secret (discovered and
// locked), discovery dates, secret achievements, and lets you replay the
// discovered mini-games. All data is browser-local only.
// ============================================================================

import { EggModal } from "./EggModal";
import { EggSprite } from "./eggArt";
import { PixelMeter } from "@/components/PixelArt";
import { fmtDay } from "@/components/ui";
import {
  EGGS,
  EGG_ACHIEVEMENTS,
  HUNTER_REQUIRED,
  type EggId,
} from "./eggData";
import type { EggFindings } from "./eggStore";
import type { EggSfxKind } from "./eggSfx";

/** Interactive eggs get a replay button once discovered. */
const REPLAYABLE: Partial<Record<EggId, string>> = {
  blackjack: "العب",
  developer: "افتح",
  boss: "حارب",
  matrix: "ادخل",
  glitch: "أطلق",
  alien: "استدعِ",
  pet: "استدعِ",
};

export function SecretCollection({
  onClose,
  findings,
  sfx,
  onOpenEgg,
}: {
  onClose: () => void;
  findings: EggFindings;
  sfx: (k: EggSfxKind) => void;
  onOpenEgg: (id: EggId) => void;
}) {
  const foundCount = Object.keys(findings.eggs).length;
  const achCount = Object.keys(findings.achievements).length;
  const hunterFound = HUNTER_REQUIRED.filter((id) => findings.eggs[id]).length;
  const allHunted = hunterFound === HUNTER_REQUIRED.length;

  return (
    <EggModal
      title={
        <>
          <EggSprite name="eggVault" size={20} />
          <span>خزنة الأسرار</span>
        </>
      }
      onClose={onClose}
      wide
    >
      <div className="stack">
        <div className="grid grid-cols-2 gap-2">
          <div className="border-2 border-line bg-card2 p-2.5 text-center">
            <div className="tnum font-pixel-en text-2xl font-extrabold text-accent-text">
              {foundCount}/{EGGS.length}
            </div>
            <div className="text-xs text-muted">أسرار مكتشفة</div>
          </div>
          <div className="border-2 border-line bg-card2 p-2.5 text-center">
            <div className="tnum font-pixel-en text-2xl font-extrabold text-accent-text">
              {achCount}/{EGG_ACHIEVEMENTS.length}
            </div>
            <div className="text-xs text-muted">إنجازات سرية</div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-bold">
            <span>🎖️ تقدّم قنّاص الأسرار</span>
            <span className="tnum">
              {hunterFound}/{HUNTER_REQUIRED.length}
            </span>
          </div>
          <PixelMeter value={hunterFound} max={HUNTER_REQUIRED.length} segments={10} tone={allHunted ? "good" : "accent"} />
          {allHunted && (
            <p className="mt-1 text-center text-xs font-bold text-good">
              كل الأسرار القابلة للاكتشاف صارت بين يديك! تبقّى حدث الحظ النادر 1%…
            </p>
          )}
        </div>

        <div>
          <h4 className="mb-2 border-b-2 border-line/70 pb-1 font-pixel-ar text-xl font-extrabold">
            🗝️ الأسرار
          </h4>
          <ul className="stack !gap-1.5">
            {EGGS.map((egg) => {
              const when = findings.eggs[egg.id];
              const discovered = Boolean(when);
              const replay = discovered ? REPLAYABLE[egg.id] : undefined;
              return (
                <li
                  key={egg.id}
                  className={`flex items-start gap-2.5 border-2 px-2.5 py-2 ${
                    discovered
                      ? "border-accent/60 bg-accent/10"
                      : "border-line bg-card2 opacity-80"
                  }`}
                >
                  <span className={discovered ? "" : "opacity-40 grayscale"}>
                    <EggSprite name={egg.icon} size={30} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold">
                        {discovered ? egg.title : "؟؟؟"}
                      </span>
                      {discovered && egg.code && (
                        <code
                          className="border border-line bg-bg px-1.5 py-0.5 font-pixel-en text-[10px] text-accent-text"
                          dir="ltr"
                        >
                          {egg.code}
                        </code>
                      )}
                      {replay && (
                        <button
                          className="btn btn-sm !min-h-[26px] !px-2 text-[11px]"
                          onClick={() => {
                            sfx("chip");
                            onOpenEgg(egg.id);
                          }}
                        >
                          ▶ {replay}
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {discovered ? egg.desc : egg.hint}
                    </p>
                    {discovered && (
                      <p className="mt-0.5 text-[10px] text-muted">اكتُشف: {fmtDay(when)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 border-b-2 border-line/70 pb-1 font-pixel-ar text-xl font-extrabold">
            🏆 الإنجازات السرية
          </h4>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {EGG_ACHIEVEMENTS.map((ach) => {
              const when = findings.achievements[ach.id];
              const unlocked = Boolean(when);
              return (
                <div
                  key={ach.id}
                  className={`flex items-center gap-2.5 border-2 px-2.5 py-2 ${
                    unlocked ? "border-accent/60 bg-accent/10" : "border-line bg-card2"
                  }`}
                >
                  <span className={unlocked ? "" : "opacity-40 grayscale"}>
                    <EggSprite name={ach.icon} size={26} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold">{unlocked ? ach.title : "؟؟؟"}</div>
                    <p className="text-[11px] leading-snug text-muted">
                      {unlocked ? ach.desc : "إنجاز سري لم يُفتح بعد"}
                    </p>
                    {unlocked && <p className="text-[10px] text-muted">فُتح: {fmtDay(when)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-muted">
          🔒 كل ما في هذه الخزنة محفوظ في متصفحك فقط ولا يُرسل لأي خادم. الإنجازات هنا منفصلة
          تماماً عن إنجازات الدوري الحقيقية.
        </p>
      </div>
    </EggModal>
  );
}
