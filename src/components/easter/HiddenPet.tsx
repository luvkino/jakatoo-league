// ============================================================================
// HIDDEN PET — a tiny pixel companion living in the corner of the screen.
// It never overlaps the mobile dock or real buttons (fixed above the dock on
// mobile), can be hidden at any time, and only reacts when clicked.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { PetSprite, type PetExpression } from "./eggArt";
import { PET_REACTIONS } from "./eggMessages";
import type { EggSfxKind } from "./eggSfx";
import { writePetHidden } from "./eggStore";

export function HiddenPet({
  sfx,
  onToast,
}: {
  sfx: (k: EggSfxKind) => void;
  onToast: (msg: string) => void;
}) {
  const [expression, setExpression] = useState<PetExpression>("idle");
  const [bubble, setBubble] = useState<string | null>(null);
  const [hopping, setHopping] = useState(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timers = [bubbleTimer, hopTimer];
    return () => {
      for (const t of timers) if (t.current) clearTimeout(t.current);
    };
  }, []);

  // occasional idle hop (respects motion preferences)
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let cancelled = false;
    const schedule = () => {
      hopTimer.current = setTimeout(() => {
        if (cancelled || document.hidden) {
          if (!cancelled) schedule();
          return;
        }
        setHopping(true);
        setTimeout(() => setHopping(false), 620);
        schedule();
      }, 5000 + Math.random() * 6000);
    };
    schedule();
    return () => {
      cancelled = true;
      if (hopTimer.current) clearTimeout(hopTimer.current);
    };
  }, []);

  function react() {
    const r = PET_REACTIONS[Math.floor(Math.random() * PET_REACTIONS.length)]!;
    setExpression(r.expression);
    setBubble(r.text);
    sfx("pet");
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => {
      setBubble(null);
      setExpression("idle");
    }, 3600);
  }

  function hide() {
    writePetHidden(true);
    sfx("pet");
    onToast("💤 اختبأ الرفيق… اكتب pet عندما تحتاج رفيقك من جديد.");
  }

  return (
    <div className="fixed bottom-[4.9rem] left-3 z-40 lg:bottom-6">
      {bubble && (
        <div className="pop pointer-events-none absolute bottom-[3.4rem] left-0 max-w-[12.5rem] border-2 border-line bg-card px-2.5 py-1.5 text-xs font-bold leading-snug shadow-[3px_3px_0_var(--pixel-shadow)]">
          {bubble}
        </div>
      )}
      <div className="group relative">
        <button
          onClick={react}
          className={`block cursor-pointer border-2 border-line bg-card/90 p-1 shadow-[3px_3px_0_var(--pixel-shadow)] transition-transform hover:scale-105 ${hopping ? "egg-pet-hop" : ""}`}
          aria-label="الرفيق السري — اضغط للتفاعل معه"
          title="الرفيق السري"
        >
          <PetSprite expression={expression} size={44} />
        </button>
        <button
          onClick={hide}
          className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center border border-line bg-card2 text-[10px] font-bold text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="إخفاء الرفيق"
          title="إخفاء الرفيق"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
