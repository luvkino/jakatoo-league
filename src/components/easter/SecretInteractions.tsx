// ============================================================================
// SECRET INTERACTIONS — hidden micro-experiments:
//   • 7 quick clicks on the league logo  → secret fan-club animation
//   • long-press the logo                → hidden code pad (mobile-friendly entry)
//   • ↑↑↓↓←→←→BA                         → the legendary code
//   • a shy pixel figure occasionally peeks from a corner
//   • rare absurd league messages
// None of these interfere with normal navigation (passive listeners only).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { StalkerSprite, EggSprite } from "./eggArt";
import { EGGS, isTypingTarget, type EggId } from "./eggData";
import { KONAMI_TEXT, LOGO7_TEXT, RARE_MSGS } from "./eggMessages";
import type { EggSfxKind } from "./eggSfx";

const KONAMI: readonly string[] = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export function SecretInteractions({
  sfx,
  onToast,
  onDiscover,
  openEgg,
  onBoom,
  blocked,
}: {
  sfx: (k: EggSfxKind) => void;
  onToast: (msg: string) => void;
  onDiscover: (id: EggId) => void;
  openEgg: (id: EggId) => void;
  onBoom: (count?: number, palette?: "rainbow" | "gold" | "pink") => void;
  blocked: boolean;
}) {
  const [konamiShown, setKonamiShown] = useState(false);
  const [stalker, setStalker] = useState<Corner | null>(null);
  const [codePad, setCodePad] = useState(false);
  const [codePadValue, setCodePadValue] = useState("");
  const [padShake, setPadShake] = useState(false);

  const blockedRef = useRef(blocked);
  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);

  const sfxRef = useRef(sfx);
  useEffect(() => {
    sfxRef.current = sfx;
  }, [sfx]);
  const toastRef = useRef(onToast);
  useEffect(() => {
    toastRef.current = onToast;
  }, [onToast]);
  const discoverRef = useRef(onDiscover);
  useEffect(() => {
    discoverRef.current = onDiscover;
  }, [onDiscover]);
  const boomRef = useRef(onBoom);
  useEffect(() => {
    boomRef.current = onBoom;
  }, [onBoom]);
  const openRef = useRef(openEgg);
  useEffect(() => {
    openRef.current = openEgg;
  }, [openEgg]);

  const logoClicksRef = useRef<number[]>([]);
  const konamiIdxRef = useRef(0);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  // ---- logo: 7 quick clicks + long-press code pad -----------------------------
  useEffect(() => {
    const reduced = () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const onPointerDown = (e: PointerEvent) => {
      const logo = (e.target as HTMLElement | null)?.closest?.("[data-egg-logo]") as HTMLElement | null;
      if (!logo) return;
      longPressedRef.current = false;
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      pressTimerRef.current = setTimeout(() => {
        longPressedRef.current = true;
        sfxRef.current("secret");
        setCodePad(true);
      }, 700);
    };

    const onPointerUp = () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };

    const onClick = (e: MouseEvent) => {
      const logoEl = (e.target as HTMLElement | null)?.closest?.("[data-egg-logo]");
      if (!logoEl) return;
      if (longPressedRef.current) {
        e.preventDefault();
        longPressedRef.current = false;
        return;
      }
      const now = Date.now();
      logoClicksRef.current = [...logoClicksRef.current.filter((t) => now - t < 3500), now];
      if (logoClicksRef.current.length >= 7) {
        logoClicksRef.current = [];
        discoverRef.current("logo7");
        toastRef.current(LOGO7_TEXT);
        sfxRef.current("secret");
        boomRef.current(50, "rainbow");
        const el = logoEl as HTMLElement;
        if (!reduced() && typeof el.animate === "function") {
          el.animate(
            [
              { filter: "hue-rotate(0deg) saturate(1)", transform: "rotate(0deg) scale(1)" },
              { filter: "hue-rotate(180deg) saturate(2)", transform: "rotate(180deg) scale(1.18)" },
              { filter: "hue-rotate(360deg) saturate(1)", transform: "rotate(360deg) scale(1)" },
            ],
            { duration: 1300, easing: "steps(13)" },
          );
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("[data-egg-logo]")) e.preventDefault();
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("click", onClick);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("click", onClick);
      document.removeEventListener("contextmenu", onContextMenu);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  // ---- Konami code --------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey) {
        konamiIdxRef.current = 0;
        return;
      }
      const expected = KONAMI[konamiIdxRef.current];
      if (e.key === expected || e.key.toLowerCase() === expected) {
        konamiIdxRef.current += 1;
        if (konamiIdxRef.current === KONAMI.length) {
          konamiIdxRef.current = 0;
          discoverRef.current("konami");
          setKonamiShown(true);
          toastRef.current(KONAMI_TEXT);
          sfxRef.current("secret");
          boomRef.current(40, "pink");
          setTimeout(() => setKonamiShown(false), 3200);
        }
      } else {
        konamiIdxRef.current = e.key === KONAMI[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- rare absurd league messages ---------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      const t = setTimeout(() => {
        if (cancelled) return;
        if (!document.hidden && !blockedRef.current && Math.random() < 0.2) {
          toastRef.current(RARE_MSGS[Math.floor(Math.random() * RARE_MSGS.length)]!);
          sfxRef.current("notification");
        }
        schedule();
      }, 210000 + Math.random() * 90000);
      return t;
    };
    const t = schedule();
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  // ---- shy corner stalker --------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const corners: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
    const schedule = () => {
      const t = setTimeout(() => {
        if (cancelled) return;
        if (!document.hidden && !blockedRef.current && Math.random() < 0.12) {
          setStalker(corners[Math.floor(Math.random() * corners.length)]!);
          sfxRef.current("stalker");
          hideTimer = setTimeout(() => setStalker(null), 4500);
        }
        schedule();
      }, 70000 + Math.random() * 50000);
      return t;
    };
    const t = schedule();
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const stalkerPos =
    stalker === "top-left"
      ? "top-16 left-2"
      : stalker === "top-right"
        ? "top-16 right-2"
        : stalker === "bottom-left"
          ? "bottom-[5.5rem] left-2 lg:bottom-10"
          : "bottom-[5.5rem] right-2 lg:bottom-10";

  // ---- hidden code pad (long-press entry, works on mobile) ------------------------
  function submitPadCode() {
    const raw = codePadValue.trim().toLowerCase();
    if (!raw) return;
    const egg = EGGS.find((e) => e.code === raw);
    if (egg) {
      setCodePad(false);
      setCodePadValue("");
      openRef.current(egg.id);
    } else {
      sfxRef.current("error");
      setPadShake(true);
      setTimeout(() => setPadShake(false), 500);
    }
  }

  return (
    <>
      {/* Konami flash */}
      {konamiShown && (
        <div className="pointer-events-none fixed inset-x-0 top-1/3 z-[92] flex justify-center px-3">
          <div className="pop border-2 border-accent bg-card px-4 py-3 text-center font-pixel-en text-xs font-extrabold text-accent-text shadow-[5px_5px_0_var(--pixel-shadow)] sm:text-base" dir="ltr">
            ↑ ↑ ↓ ↓ ← → ← → B A
            <div className="mt-1 font-sans text-xs font-bold text-fg" dir="rtl">
              الكود الأسطوري — احترام خالص!
            </div>
          </div>
        </div>
      )}

      {/* shy stalker */}
      {stalker && (
        <button
          className={`egg-stalker fixed z-[44] ${stalkerPos}`}
          onClick={() => {
            setStalker(null);
            toastRef.current("لقد رآك أيضاً… 👀");
            sfxRef.current("stalker");
          }}
          aria-label="شخصية غامضة"
          title="…؟"
        >
          <StalkerSprite size={40} />
        </button>
      )}

      {/* hidden code pad */}
      {codePad && (
        <div
          className="fixed inset-x-0 top-20 z-[96] flex justify-center px-3"
          role="dialog"
          aria-label="لوحة إدخال سرية"
        >
          <div
            className={`card flex items-center gap-2 !p-2.5 ${padShake ? "chaos-shake" : "pop"}`}
            style={{ maxWidth: "20rem" }}
          >
            <EggSprite name="eggVault" size={22} />
            <input
              className="input !min-h-[38px] font-pixel-en text-sm"
              value={codePadValue}
              onChange={(e) => setCodePadValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitPadCode();
                if (e.key === "Escape") setCodePad(false);
              }}
              placeholder="secret code…"
              dir="ltr"
              autoFocus
              maxLength={20}
              aria-label="أدخل كلمة السر"
            />
            <button className="btn btn-sm btn-primary" onClick={submitPadCode}>
              ↵
            </button>
            <button className="btn btn-sm !px-2" onClick={() => setCodePad(false)} aria-label="إغلاق">
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
