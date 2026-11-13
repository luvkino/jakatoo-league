// ============================================================================
// EASTER EGG MANAGER — the hidden heart of the secret layer.
//
// Responsibilities:
//   • global keystroke capture → secret-code registry (case-insensitive,
//     ignored while typing in real inputs, idle-timeout reset)
//   • discovery tracking (localStorage only — nothing ever hits the server)
//   • mounting/unmounting every secret overlay with full cleanup
//   • its own isolated toast stack
//
// It is completely passive towards the league system: it reads nothing from
// the league data and writes nothing to it.
// ============================================================================

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useChaos } from "@/components/ChaosEngine";
import { useAppearance } from "@/components/Settings";
import { AlienInvasion, makeAlienConfig, type AlienConfig } from "./AlienInvasion";
import { BlackjackGame } from "./BlackjackGame";
import { DeveloperRoom } from "./DeveloperRoom";
import { GlitchMode } from "./GlitchMode";
import { HiddenPet } from "./HiddenPet";
import { MatrixMode } from "./MatrixMode";
import { RareEvent } from "./RareEvent";
import { SecretBoss } from "./SecretBoss";
import { SecretCollection } from "./SecretCollection";
import { SecretInteractions } from "./SecretInteractions";
import { EggSprite } from "./eggArt";
import {
  getEgg,
  isTypingTarget,
  matchCode,
  pushKeyToBuffer,
  type EggId,
} from "./eggData";
import { playEggSfx, type EggSfxKind } from "./eggSfx";
import {
  discoverEgg,
  readFindings,
  readPetHidden,
  unlockEggAchievement,
  useEggFindings,
  useEggPetHidden,
  writePetHidden,
} from "./eggStore";
import { unlockAudio } from "@/lib/sound";

type ModalEgg = "blackjack" | "developer" | "boss" | "secrets" | "matrix";

interface EggToast {
  id: number;
  msg: string;
}

const BUFFER_RESET_MS = 1800;

export function EasterEggProvider({ children }: { children: ReactNode }) {
  const { a } = useAppearance();
  const { triggerExplosion } = useChaos();
  const findings = useEggFindings();
  const petHidden = useEggPetHidden();

  const [modal, setModal] = useState<ModalEgg | null>(null);
  const [glitchOn, setGlitchOn] = useState(false);
  const [alien, setAlien] = useState<AlienConfig | null>(null);
  const [toasts, setToasts] = useState<EggToast[]>([]);
  const toastIdRef = useRef(0);

  const sfx = useCallback(
    (k: EggSfxKind) => {
      playEggSfx(k, a.sound);
    },
    [a.sound],
  );

  const sfxRef = useRef(sfx);
  useEffect(() => {
    sfxRef.current = sfx;
  }, [sfx]);

  const toast = useCallback((msg: string) => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t.slice(-3), { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // ---- discovery ------------------------------------------------------------

  const handleDiscovery = useCallback((id: EggId) => {
    const before = readFindings();
    if (!discoverEgg(id)) return;
    const after = readFindings();
    sfxRef.current("secret");
    toastRef.current(`🔓 اكتُشف سر جديد: ${getEgg(id).title}`);
    if (after.achievements.secret_hunter && !before.achievements.secret_hunter) {
      sfxRef.current("achievement");
      toastRef.current("🏆 إنجاز سري: قنّاص الأسرار — اكتشفت كل الأسرار القابلة للاكتشاف!");
    }
    if (Object.keys(after.eggs).length === 1) {
      // first secret ever → reveal the vault
      toastRef.current("🗝️ فُتحت «خزنة الأسرار» — اكتب secrets لزيارتها في أي وقت.");
      setModal("secrets");
    }
  }, []);

  const handleDiscoveryRef = useRef(handleDiscovery);
  useEffect(() => {
    handleDiscoveryRef.current = handleDiscovery;
  }, [handleDiscovery]);

  // ---- activation -------------------------------------------------------------

  const glitchOnRef = useRef(glitchOn);
  useEffect(() => {
    glitchOnRef.current = glitchOn;
  }, [glitchOn]);
  const alienRef = useRef(alien);
  useEffect(() => {
    alienRef.current = alien;
  }, [alien]);

  const openEgg = useCallback(
    (id: EggId) => {
      unlockAudio(); // a code is always typed/clicked by the user
      handleDiscoveryRef.current(id);
      switch (id) {
        case "blackjack":
        case "developer":
        case "boss":
        case "secrets":
          setModal(id);
          break;
        case "matrix":
          setModal("matrix");
          sfxRef.current("matrix");
          break;
        case "glitch":
          if (!glitchOnRef.current) setGlitchOn(true);
          break;
        case "alien":
          if (!alienRef.current) setAlien(makeAlienConfig());
          break;
        case "pet": {
          const wasHidden = readPetHidden();
          writePetHidden(!wasHidden);
          sfxRef.current("pet");
          toastRef.current(
            wasHidden
              ? "🌱 ظهر الرفيق السري! اضغط عليه لاحقاً لتسمع رأيه في كل شيء."
              : "💤 اختبأ الرفيق… اكتب pet عندما تحتاجه.",
          );
          break;
        }
        default:
          break; // konami / logo7 / onepercent run their own visuals
      }
    },
    [],
  );

  const openEggRef = useRef(openEgg);
  useEffect(() => {
    openEggRef.current = openEgg;
  }, [openEgg]);

  const closeModal = useCallback(() => setModal(null), []);

  const closeMatrix = useCallback(() => {
    setModal(null);
    if (unlockEggAchievement("matrix_explorer")) {
      sfxRef.current("achievement");
      toastRef.current("🏆 إنجاز سري: مستكشف المصفوفة");
    }
  }, []);

  const finishGlitch = useCallback(() => {
    setGlitchOn(false);
    if (unlockEggAchievement("glitch_survivor")) {
      sfxRef.current("achievement");
      toastRef.current("🏆 إنجاز سري: ناجي الخلل");
    }
    toastRef.current("✅ عاد كل شيء إلى طبيعته… تقريباً.");
  }, []);

  const finishAlien = useCallback(() => {
    setAlien(null);
    if (unlockEggAchievement("alien_encounter")) {
      sfxRef.current("achievement");
      toastRef.current("🏆 إنجاز سري: لقاء فضائي");
    }
  }, []);

  const boom = useCallback(
    (count = 40, palette: "rainbow" | "gold" | "pink" = "rainbow") => {
      triggerExplosion(undefined, undefined, count, palette);
    },
    [triggerExplosion],
  );

  // ---- hidden keystroke capture ------------------------------------------------

  useEffect(() => {
    let buffer = "";
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        buffer = "";
        return;
      }
      // never fire while the user is typing in a real field
      if (isTypingTarget(e.target)) {
        buffer = "";
        return;
      }
      if (e.key === "Escape") {
        buffer = "";
        return;
      }
      buffer = pushKeyToBuffer(buffer, e.key);
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        buffer = "";
      }, BUFFER_RESET_MS);
      const egg = matchCode(buffer);
      if (egg) {
        buffer = "";
        openEggRef.current(egg.id);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, []);

  // ---- render -------------------------------------------------------------------

  const blocked = modal !== null || glitchOn || alien !== null;
  const foundCount = useMemo(() => Object.keys(findings.eggs).length, [findings.eggs]);

  return (
    <>
      {children}

      {/* vault chip — appears only after the first discovery ever */}
      {foundCount > 0 && (
        <button
          className="btn btn-sm egg-vault-chip fixed bottom-[5.4rem] right-3 z-40 !min-h-[38px] !px-2 lg:bottom-6"
          onClick={() => openEggRef.current("secrets")}
          aria-label="خزنة الأسرار"
          title="خزنة الأسرار"
        >
          <EggSprite name="eggVault" size={18} />
          <span className="tnum text-[11px]">{foundCount}</span>
        </button>
      )}

      {modal === "blackjack" && <BlackjackGame onClose={closeModal} sfx={sfx} onToast={toast} />}
      {modal === "developer" && <DeveloperRoom onClose={closeModal} sfx={sfx} />}
      {modal === "boss" && <SecretBoss onClose={closeModal} sfx={sfx} onBoom={boom} />}
      {modal === "secrets" && (
        <SecretCollection onClose={closeModal} findings={findings} sfx={sfx} onOpenEgg={openEgg} />
      )}
      {modal === "matrix" && <MatrixMode onExit={closeMatrix} sfx={sfx} />}

      {glitchOn && <GlitchMode sfx={sfx} onDone={finishGlitch} />}
      {alien && (
        <AlienInvasion config={alien} sfx={sfx} onToast={toast} onDone={finishAlien} />
      )}

      {!petHidden && <HiddenPet sfx={sfx} onToast={toast} />}

      <SecretInteractions
        sfx={sfx}
        onToast={toast}
        onDiscover={handleDiscovery}
        openEgg={openEgg}
        onBoom={boom}
        blocked={blocked}
      />

      <RareEvent
        sfx={sfx}
        onDiscover={() => handleDiscovery("onepercent")}
        onToast={toast}
        blocked={blocked}
      />

      {/* isolated easter-egg toast stack */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-36 z-[80] flex flex-col items-center gap-2 px-3 lg:bottom-24"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            className="pop pointer-events-auto flex max-w-md items-center gap-2 border-2 border-accent bg-card px-4 py-2.5 text-start text-sm font-bold text-fg shadow-[4px_4px_0_var(--pixel-shadow)]"
          >
            {t.msg}
          </button>
        ))}
      </div>
    </>
  );
}
