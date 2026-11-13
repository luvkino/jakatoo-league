"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLeague } from "@/components/LeagueProvider";
import { PixelIcon, type PixelIconName } from "@/components/PixelArt";
import { useAppearance } from "@/components/Settings";
import {
  getLeagueSpotlight,
  LAST_PLACE_MESSAGES,
  LAST_PLACE_TITLES,
  LEADER_MESSAGES,
  LEADER_TITLES,
  pickRotating,
  type LeagueSpotlight,
} from "@/lib/chaos";
import { generateRandomChaosEvent, RARITY_META, type ChaosEvent, type EventRarity } from "@/lib/events";
import { playSfx, unlockAudio, type SfxKind } from "@/lib/sound";
import { pickTrashTalk, type TrashMessage } from "@/lib/trashTalk";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  kind: "pixel" | "gold" | "pink";
}

interface ChaosCtx {
  spotlight: LeagueSpotlight;
  leaderTitle: string;
  leaderMsg: string;
  lastTitle: string;
  lastMsg: string;
  currentTrash: TrashMessage | null;
  nextTrash: () => void;
  activeEvent: ChaosEvent | null;
  dismissEvent: () => void;
  shaking: boolean;
  flashing: boolean;
  glitching: boolean;
  sfx: (kind: SfxKind) => void;
  triggerExplosion: (x?: number, y?: number, count?: number, palette?: "rainbow" | "gold" | "pink") => void;
  triggerEvent: (forcedRarity?: EventRarity, forceVisuals?: boolean) => void;
  triggerCelebration: (kind: "match" | "leader" | "last" | "draw" | "leadSurge", label?: string) => void;
}

const ChaosContext = createContext<ChaosCtx | null>(null);

export function useChaos(): ChaosCtx {
  const c = useContext(ChaosContext);
  if (!c) throw new Error("ChaosProvider missing");
  return c;
}

const RAINBOW = ["#facc15", "#38bdf8", "#f43f5e", "#22c55e", "#c084fc", "#fb923c", "#ffffff"];
const GOLD_PAL = ["#fde047", "#facc15", "#f59e0b", "#fef9c3", "#ffffff"];
const PINK_PAL = ["#f9a8d4", "#f472b6", "#ec4899", "#38bdf8", "#fde047"];

export function ChaosProvider({ children }: { children: ReactNode }) {
  const { league, scopeMatches, nameOf, loaded, scope, toast } = useLeague();
  const { a } = useAppearance();

  const [trashSeed, setTrashSeed] = useState(0);
  const [activeEvent, setActiveEvent] = useState<ChaosEvent | null>(null);
  const [shaking, setShaking] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [glitching, setGlitching] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const spotlight = useMemo(() => getLeagueSpotlight(league), [league]);
  const msgSeed = scopeMatches.length + trashSeed;

  const leaderTitle = useMemo(
    () => pickRotating(LEADER_TITLES, msgSeed),
    [msgSeed],
  );
  const leaderMsg = useMemo(
    () => pickRotating(LEADER_MESSAGES, msgSeed * 3 + 1),
    [msgSeed],
  );
  const lastTitle = useMemo(
    () => pickRotating(LAST_PLACE_TITLES, msgSeed),
    [msgSeed],
  );
  const lastMsg = useMemo(
    () => pickRotating(LAST_PLACE_MESSAGES, msgSeed * 5 + 2),
    [msgSeed],
  );

  const currentTrash = useMemo(() => {
    if (!a.trashTalk || !loaded) return null;
    // Reference trashSeed so clicking "next" picks a fresh non-repeating message
    void trashSeed;
    return pickTrashTalk(league, scopeMatches, nameOf, { allowRare: true, trackRecent: true });
  }, [a.trashTalk, loaded, league, scopeMatches, nameOf, trashSeed]);

  const prefersReduced = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  const canAnimate = useCallback(() => {
    return a.anim && a.animIntensity !== "off" && !prefersReduced();
  }, [a.anim, a.animIntensity, prefersReduced]);

  const sfx = useCallback(
    (kind: SfxKind) => {
      playSfx(kind, a.sound);
    },
    [a.sound],
  );

  // Particle loop (runs ONLY while particles exist — zero idle CPU cost)
  const startParticleLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    const tick = () => {
      const canvas = canvasRef.current;
      const list = particlesRef.current;
      if (!canvas || list.length === 0) {
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        rafRef.current = null;
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        particlesRef.current = [];
        rafRef.current = null;
        return;
      }

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const next: Particle[] = [];
      for (const p of list) {
        p.life += 1;
        if (p.life >= p.maxLife) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985;
        const alpha = 1 - p.life / p.maxLife;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, p.size, p.size);
        next.push(p);
      }
      ctx.globalAlpha = 1;
      particlesRef.current = next;

      if (next.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const spawnParticles = useCallback(
    (
      cx: number,
      cy: number,
      count: number,
      palette: "rainbow" | "gold" | "pink" = "rainbow",
      mode: "burst" | "rain" = "burst",
    ) => {
      if (!canAnimate() || typeof window === "undefined") return;
      const mult = a.animIntensity === "low" ? 0.45 : a.animIntensity === "extreme" ? 1.45 : 1;
      const n = Math.min(120, Math.max(6, Math.round(count * mult)));
      const cols = palette === "gold" ? GOLD_PAL : palette === "pink" ? PINK_PAL : RAINBOW;

      for (let i = 0; i < n; i++) {
        if (mode === "rain") {
          particlesRef.current.push({
            x: Math.random() * window.innerWidth,
            y: -10 - Math.random() * 140,
            vx: (Math.random() - 0.5) * 2.2,
            vy: 2.5 + Math.random() * 4.5,
            size: Math.random() > 0.5 ? 8 : 6,
            color: cols[i % cols.length],
            life: 0,
            maxLife: 65 + Math.random() * 35,
            gravity: 0.08,
            kind: palette === "gold" ? "gold" : palette === "pink" ? "pink" : "pixel",
          });
        } else {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 7.5;
          particlesRef.current.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2.2,
            size: Math.random() > 0.45 ? 8 : 5,
            color: cols[i % cols.length],
            life: 0,
            maxLife: 38 + Math.random() * 28,
            gravity: 0.24,
            kind: palette === "gold" ? "gold" : palette === "pink" ? "pink" : "pixel",
          });
        }
      }

      startParticleLoop();
    },
    [a.animIntensity, canAnimate, startParticleLoop],
  );

  const triggerExplosion = useCallback(
    (x?: number, y?: number, count = 34, palette: "rainbow" | "gold" | "pink" = "rainbow") => {
      if (typeof window === "undefined") return;
      const cx = x ?? window.innerWidth * (0.25 + Math.random() * 0.5);
      const cy = y ?? window.innerHeight * (0.25 + Math.random() * 0.45);
      spawnParticles(cx, cy, count, palette, "burst");
    },
    [spawnParticles],
  );

  const runVisualEffects = useCallback(
    (ev: ChaosEvent) => {
      if (!canAnimate() || typeof window === "undefined") return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const allowHeavy = a.animIntensity !== "low";

      for (const eff of ev.effects) {
        if (eff === "confetti") spawnParticles(w / 2, h * 0.28, 36, "rainbow", "burst");
        if (eff === "crownRain") spawnParticles(w / 2, 0, 48, "gold", "rain");
        if (eff === "piggyBounce") spawnParticles(w / 2, h * 0.45, 28, "pink", "burst");
        if (eff === "explosion") {
          spawnParticles(w * 0.35, h * 0.35, 36, "rainbow", "burst");
          spawnParticles(w * 0.65, h * 0.42, 36, "gold", "burst");
        }
        if (eff === "meteor") {
          spawnParticles(w * 0.2, 0, 56, "gold", "rain");
          spawnParticles(w * 0.5, h * 0.3, 40, "rainbow", "burst");
        }
        if (eff === "shake" && allowHeavy) {
          setShaking(true);
          const t = setTimeout(() => setShaking(false), 450);
          effectTimersRef.current.push(t);
        }
        if (eff === "flash" && allowHeavy) {
          setFlashing(true);
          const t = setTimeout(() => setFlashing(false), 220);
          effectTimersRef.current.push(t);
        }
        if (eff === "glitch" && allowHeavy) {
          setGlitching(true);
          const t = setTimeout(() => setGlitching(false), 520);
          effectTimersRef.current.push(t);
        }
      }
    },
    [a.animIntensity, canAnimate, spawnParticles],
  );

  const presentEvent = useCallback(
    (ev: ChaosEvent, forceVisuals = false) => {
      setActiveEvent(ev);
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
      eventTimerRef.current = setTimeout(() => setActiveEvent(null), ev.durationMs);
      if (forceVisuals || a.chaosMode) {
        runVisualEffects(ev);
      }
      sfx(ev.sound);
    },
    [a.chaosMode, runVisualEffects, sfx],
  );

  const triggerEvent = useCallback(
    (forcedRarity?: EventRarity, forceVisuals = true) => {
      const ev = generateRandomChaosEvent(league, scopeMatches, nameOf, forcedRarity);
      presentEvent(ev, forceVisuals);
    },
    [league, scopeMatches, nameOf, presentEvent],
  );

  const triggerCelebration = useCallback(
    (kind: "match" | "leader" | "last" | "draw" | "leadSurge", label?: string) => {
      if (kind === "draw") {
        sfx("drawWin");
        if (a.chaosMode) {
          triggerExplosion(undefined, undefined, 45, "gold");
        }
        return;
      }
      if (kind === "match") {
        sfx("victory");
        if (a.chaosMode) {
          triggerExplosion(undefined, undefined, 48, "rainbow");
          if (a.animIntensity === "extreme") {
            setShaking(true);
            setTimeout(() => setShaking(false), 380);
          }
        }
        return;
      }
      if (kind === "leader") {
        const ev: ChaosEvent = {
          id: `leader_${Date.now()}`,
          rarity: "EPIC",
          title: "👑 تغيّر متصدر الدوري!",
          message: label ? `اعتلى «${label}» عرش الصدارة! التاج الذهبي ينتقل لمالكه الجديد!` : "متصدر جديد على عرش الدوري!",
          effects: ["crownRain", "shake", "flash"],
          sound: "leaderChange",
          durationMs: 5200,
          icon: "crown",
        };
        presentEvent(ev, a.chaosMode);
        return;
      }
      if (kind === "leadSurge") {
        const ev: ChaosEvent = {
          id: `surge_${Date.now()}`,
          rarity: "RARE",
          title: "✨ المتصدر يوسّع الفارق!",
          message: label ? `«${label}» يواصل الابتعاد عن ملاحقيه في الصدارة!` : "الصدارة تتعزز بنقاط إضافية!",
          effects: ["crownRain"],
          sound: "victory",
          durationMs: 4000,
          icon: "crown",
        };
        presentEvent(ev, a.chaosMode);
        return;
      }
      if (kind === "last") {
        const ev: ChaosEvent = {
          id: `last_${Date.now()}`,
          rarity: "RARE",
          title: "🐷 حركة في قاع الترتيب!",
          message: label ?? "تم تسليم حصالة الدوري لمالكها الجديد!",
          effects: ["piggyBounce", "shake"],
          sound: "lastPlace",
          durationMs: 4800,
          icon: "piggy",
        };
        presentEvent(ev, a.chaosMode);
      }
    },
    [a.animIntensity, a.chaosMode, presentEvent, sfx, triggerExplosion],
  );

  const dismissEvent = useCallback(() => {
    setActiveEvent(null);
    if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
  }, []);

  const nextTrash = useCallback(() => {
    setTrashSeed((n) => n + 1);
    sfx("notification");
  }, [sfx]);

  // Global audio unlock & retro pixel click SFX on user interaction
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      unlockAudio();
      if (!a.sound) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a.btn, [role='tab'], [role='radio'], [role='checkbox']")) {
        playSfx("click", true);
      }
    };
    const onKeyDown = () => unlockAudio();
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("keydown", onKeyDown, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [a.sound]);

  // Detect real leaderboard changes (leader change, lead surge, last-place change, match added)
  const prevStateRef = useRef<{
    scope: string;
    ready: boolean;
    leaderId: string | null;
    leaderGap: number;
    lastId: string | null;
    matchCount: number;
  }>({
    scope: "",
    ready: false,
    leaderId: null,
    leaderGap: 0,
    lastId: null,
    matchCount: 0,
  });

  useEffect(() => {
    if (!loaded) return;
    const leaderId = spotlight.leader?.id ?? null;
    const leaderGap = spotlight.leaderGap;
    const lastId = spotlight.lastPlace?.id ?? null;
    const matchCount = scopeMatches.length;

    const prev = prevStateRef.current;
    if (!prev.ready || prev.scope !== scope) {
      prevStateRef.current = { scope, ready: true, leaderId, leaderGap, lastId, matchCount };
      return;
    }

    const matchesChanged = matchCount !== prev.matchCount;
    const leaderChanged = prev.leaderId && leaderId && prev.leaderId !== leaderId;
    const lastChanged = prev.lastId && lastId && prev.lastId !== lastId;
    const leadIncreased = prev.leaderId && leaderId === prev.leaderId && leaderGap > prev.leaderGap && matchCount > prev.matchCount;

    prevStateRef.current = { scope, ready: true, leaderId, leaderGap, lastId, matchCount };

    if (!matchesChanged && !leaderChanged && !lastChanged) return;

    const timer = setTimeout(() => {
      if (leaderChanged && leaderId) {
        triggerCelebration("leader", nameOf(leaderId));
      } else if (lastChanged && lastId && prev.lastId) {
        triggerCelebration(
          "last",
          `«${nameOf(prev.lastId)}» غادر قاع الترتيب، والحصالة انتقلت إلى «${nameOf(lastId)}»!`,
        );
      } else if (leadIncreased && leaderId) {
        triggerCelebration("leadSurge", nameOf(leaderId));
      } else if (matchCount > prev.matchCount) {
        triggerCelebration("match");
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [loaded, scope, spotlight, scopeMatches.length, nameOf, triggerCelebration]);

  // Ambient Chaos Mode loop (gentle, non-intrusive, only when Chaos Mode is ON and tab is visible)
  useEffect(() => {
    if (!a.chaosMode || !loaded) return;
    let cancelled = false;
    let handle: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const delay = a.animIntensity === "extreme" ? 18000 + Math.random() * 12000 : 28000 + Math.random() * 18000;
      handle = setTimeout(() => {
        if (cancelled) return;
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          const r = Math.random();
          if (r < 0.35 && a.trashTalk) {
            const msg = pickTrashTalk(league, scopeMatches, nameOf, { allowRare: true });
            toast(`🎙️ ${msg.text}`, msg.rare ? "ach" : "info");
            sfx(msg.rare ? "rare" : "notification");
            if (canAnimate()) triggerExplosion(undefined, undefined, 22, "rainbow");
          } else {
            triggerEvent(undefined, true);
          }
        }
        schedule();
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [a.chaosMode, a.animIntensity, a.trashTalk, loaded, league, scopeMatches, nameOf, toast, sfx, canAnimate, triggerExplosion, triggerEvent]);

  // Cleanup on unmount
  useEffect(() => {
    const timers = effectTimersRef.current;
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  const value: ChaosCtx = useMemo(
    () => ({
      spotlight,
      leaderTitle,
      leaderMsg,
      lastTitle,
      lastMsg,
      currentTrash,
      nextTrash,
      activeEvent,
      dismissEvent,
      shaking,
      flashing,
      glitching,
      sfx,
      triggerExplosion,
      triggerEvent,
      triggerCelebration,
    }),
    [
      spotlight,
      leaderTitle,
      leaderMsg,
      lastTitle,
      lastMsg,
      currentTrash,
      nextTrash,
      activeEvent,
      dismissEvent,
      shaking,
      flashing,
      glitching,
      sfx,
      triggerExplosion,
      triggerEvent,
      triggerCelebration,
    ],
  );

  const rarityInfo = activeEvent ? RARITY_META[activeEvent.rarity] : null;
  const evIcon: PixelIconName = activeEvent?.icon ?? "sparkle";

  return (
    <ChaosContext.Provider value={value}>
      <div className={shaking ? "chaos-shake" : glitching ? "chaos-glitch" : ""}>
        {children}
      </div>

      {/* Hardware-accelerated pixel particle canvas (pointer-events-none) */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[70]"
        aria-hidden
      />

      {/* Screen flash overlay */}
      {flashing && (
        <div
          className="pointer-events-none fixed inset-0 z-[65] bg-white/30 chaos-flash"
          aria-hidden
        />
      )}

      {/* Non-blocking Rare/Epic/Legendary Event Arcade Banner */}
      {activeEvent && rarityInfo && (
        <div
          className="pointer-events-none fixed inset-x-0 top-16 z-[75] flex justify-center px-3"
          role="status"
          aria-live="polite"
        >
          <div
            className={`pointer-events-auto pop pixel-event-banner max-w-lg w-full border-2 bg-card p-3 shadow-xl rarity-${activeEvent.rarity.toLowerCase()}`}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center border-2 border-line bg-card2">
                <PixelIcon name={evIcon} size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={rarityInfo.badgeClass}>{rarityInfo.labelAr}</span>
                  <span className="font-extrabold text-sm">{activeEvent.title}</span>
                </div>
                <p className="text-xs sm:text-sm text-fg/90">{activeEvent.message}</p>
              </div>
              <button
                onClick={dismissEvent}
                className="btn btn-sm !min-h-[30px] !px-2 shrink-0"
                aria-label="إغلاق الحدث"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </ChaosContext.Provider>
  );
}
