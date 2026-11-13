// ============================================================================
// EASTER EGG PIXEL ART — isolated sprite set drawn in the exact same style as
// PixelArt.tsx (16x16 integer grids, shapeRendering="crispEdges") so the
// secrets share the league's visual identity without touching the original
// icon component.
// ============================================================================

import type { CSSProperties } from "react";
import type { Card } from "./blackjackEngine";

export type { Card };

export function EggSprite({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const base = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    shapeRendering: "crispEdges" as const,
    className: `inline-block shrink-0 pixel-sprite ${className}`,
    style,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "eggCards":
      return (
        <svg {...base}>
          <rect x="1" y="3" width="7" height="11" fill="#334155" />
          <rect x="2" y="4" width="5" height="9" fill="#475569" />
          <rect x="8" y="1" width="7" height="12" fill="#f8fafc" />
          <rect x="9" y="2" width="5" height="10" fill="#ffffff" />
          <rect x="10" y="3" width="3" height="3" fill="#ef4444" />
          <rect x="9" y="5" width="5" height="1" fill="#ef4444" />
          <rect x="10" y="6" width="3" height="1" fill="#ef4444" />
          <rect x="11" y="7" width="1" height="1" fill="#ef4444" />
          <rect x="2" y="13" width="13" height="1" fill="#0f172a" />
        </svg>
      );
    case "eggTerminal":
      return (
        <svg {...base}>
          <rect x="2" y="2" width="12" height="10" fill="#334155" />
          <rect x="3" y="3" width="10" height="8" fill="#052e16" />
          <rect x="4" y="4" width="7" height="1" fill="#22c55e" />
          <rect x="4" y="6" width="5" height="1" fill="#4ade80" />
          <rect x="4" y="8" width="3" height="1" fill="#22c55e" />
          <rect x="8" y="8" width="1" height="1" fill="#bbf7d0" />
          <rect x="6" y="12" width="4" height="1" fill="#64748b" />
          <rect x="4" y="13" width="8" height="1" fill="#94a3b8" />
        </svg>
      );
    case "eggGlitch":
      return (
        <svg {...base}>
          <rect x="2" y="2" width="12" height="12" fill="#e2e8f0" />
          <rect x="2" y="2" width="12" height="1" fill="#0f172a" />
          <rect x="2" y="5" width="12" height="2" fill="#f43f5e" />
          <rect x="3" y="8" width="10" height="1" fill="#38bdf8" />
          <rect x="4" y="10" width="8" height="1" fill="#22c55e" />
          <rect x="2" y="12" width="5" height="2" fill="#0f172a" />
          <rect x="9" y="12" width="5" height="1" fill="#a855f7" />
        </svg>
      );
    case "eggBoss":
      return (
        <svg {...base}>
          <rect x="3" y="2" width="2" height="2" fill="#6b7280" />
          <rect x="11" y="2" width="2" height="2" fill="#6b7280" />
          <rect x="3" y="4" width="10" height="2" fill="#312e81" />
          <rect x="4" y="6" width="8" height="5" fill="#1e1b4b" />
          <rect x="5" y="7" width="2" height="2" fill="#ef4444" />
          <rect x="9" y="7" width="2" height="2" fill="#ef4444" />
          <rect x="3" y="11" width="10" height="3" fill="#1e1b4b" />
          <rect x="6" y="14" width="4" height="2" fill="#f472b6" />
          <rect x="7" y="14" width="2" height="1" fill="#f9a8d4" />
        </svg>
      );
    case "eggUfo":
      return (
        <svg {...base}>
          <rect x="5" y="1" width="6" height="3" fill="#7dd3fc" />
          <rect x="7" y="2" width="2" height="2" fill="#22c55e" />
          <rect x="2" y="4" width="12" height="4" fill="#94a3b8" />
          <rect x="3" y="4" width="10" height="1" fill="#cbd5e1" />
          <rect x="3" y="7" width="2" height="1" fill="#fde047" />
          <rect x="7" y="7" width="2" height="1" fill="#f43f5e" />
          <rect x="11" y="7" width="2" height="1" fill="#fde047" />
          <rect x="5" y="8" width="6" height="1" fill="#38bdf8" />
          <rect x="6" y="9" width="4" height="3" fill="#38bdf8" opacity="0.45" />
        </svg>
      );
    case "eggMatrix":
      return (
        <svg {...base}>
          <rect x="2" y="2" width="12" height="12" fill="#052e16" />
          <rect x="4" y="3" width="1" height="4" fill="#22c55e" />
          <rect x="6" y="5" width="1" height="6" fill="#4ade80" />
          <rect x="8" y="3" width="1" height="8" fill="#22c55e" />
          <rect x="10" y="6" width="1" height="5" fill="#16a34a" />
          <rect x="4" y="3" width="1" height="1" fill="#bbf7d0" />
          <rect x="6" y="5" width="1" height="1" fill="#dcfce7" />
          <rect x="8" y="3" width="1" height="1" fill="#bbf7d0" />
          <rect x="12" y="4" width="1" height="3" fill="#22c55e" />
        </svg>
      );
    case "eggPet":
      return (
        <svg {...base}>
          <rect x="7" y="0" width="1" height="1" fill="#fde047" />
          <rect x="7" y="1" width="1" height="2" fill="#4ade80" />
          <rect x="5" y="3" width="6" height="4" fill="#4ade80" />
          <rect x="4" y="6" width="8" height="6" fill="#22c55e" />
          <rect x="6" y="4" width="1" height="2" fill="#052e16" />
          <rect x="9" y="4" width="1" height="2" fill="#052e16" />
          <rect x="7" y="7" width="2" height="1" fill="#15803d" />
          <rect x="5" y="12" width="2" height="2" fill="#15803d" />
          <rect x="9" y="12" width="2" height="2" fill="#15803d" />
        </svg>
      );
    case "eggVault":
      return (
        <svg {...base}>
          <rect x="2" y="3" width="12" height="3" fill="#d97706" />
          <rect x="2" y="6" width="12" height="8" fill="#b45309" />
          <rect x="2" y="8" width="2" height="3" fill="#92400e" />
          <rect x="12" y="8" width="2" height="3" fill="#92400e" />
          <rect x="7" y="7" width="2" height="4" fill="#facc15" />
          <rect x="7" y="9" width="2" height="1" fill="#78350f" />
          <rect x="12" y="1" width="2" height="2" fill="#fde047" />
        </svg>
      );
    case "eggKonami":
      return (
        <svg {...base}>
          <rect x="2" y="6" width="12" height="5" fill="#475569" />
          <rect x="2" y="6" width="12" height="1" fill="#64748b" />
          <rect x="4" y="7" width="1" height="3" fill="#e2e8f0" />
          <rect x="3" y="8" width="3" height="1" fill="#e2e8f0" />
          <rect x="10" y="7" width="1" height="1" fill="#ef4444" />
          <rect x="12" y="9" width="1" height="1" fill="#38bdf8" />
          <rect x="5" y="11" width="2" height="2" fill="#334155" />
          <rect x="9" y="11" width="2" height="2" fill="#334155" />
        </svg>
      );
    case "eggLogo":
      return (
        <svg {...base}>
          <rect x="3" y="4" width="4" height="4" fill="#f43f5e" />
          <rect x="9" y="4" width="4" height="4" fill="#f43f5e" />
          <rect x="3" y="7" width="10" height="3" fill="#ef4444" />
          <rect x="5" y="9" width="6" height="2" fill="#ef4444" />
          <rect x="6" y="11" width="4" height="2" fill="#dc2626" />
          <rect x="7" y="13" width="2" height="1" fill="#b91c1c" />
          <rect x="4" y="5" width="1" height="1" fill="#fda4af" />
          <rect x="12" y="2" width="2" height="2" fill="#fde047" />
        </svg>
      );
    case "eggCrown1":
      return (
        <svg {...base}>
          <rect x="2" y="3" width="2" height="3" fill="#fbbf24" />
          <rect x="7" y="2" width="2" height="4" fill="#fde047" />
          <rect x="12" y="3" width="2" height="3" fill="#fbbf24" />
          <rect x="2" y="6" width="12" height="4" fill="#f59e0b" />
          <rect x="4" y="10" width="8" height="2" fill="#b45309" />
          <rect x="7" y="7" width="2" height="2" fill="#a855f7" />
          <rect x="4" y="12" width="8" height="1" fill="#92400e" />
          <rect x="5" y="4" width="1" height="1" fill="#ffffff" />
        </svg>
      );
    default:
      return (
        <svg {...base}>
          <rect x="4" y="4" width="8" height="8" fill="var(--accent)" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Playing cards (blackjack)
// ---------------------------------------------------------------------------

const SUIT_RED = "#ef4444";
const SUIT_BLACK = "#1e293b";

export function SuitSprite({ s, size = 10 }: { s: string; size?: number }) {
  const base = {
    width: size,
    height: size,
    viewBox: "0 0 8 8",
    shapeRendering: "crispEdges" as const,
    className: "pixel-sprite",
    "aria-hidden": true as const,
  };
  const color = s === "H" || s === "D" ? SUIT_RED : SUIT_BLACK;
  switch (s) {
    case "H":
      return (
        <svg {...base}>
          <rect x="1" y="1" width="2" height="2" fill={color} />
          <rect x="5" y="1" width="2" height="2" fill={color} />
          <rect x="1" y="3" width="6" height="2" fill={color} />
          <rect x="2" y="5" width="4" height="1" fill={color} />
          <rect x="3" y="6" width="2" height="1" fill={color} />
        </svg>
      );
    case "D":
      return (
        <svg {...base}>
          <rect x="3" y="0" width="2" height="1" fill={color} />
          <rect x="2" y="1" width="4" height="1" fill={color} />
          <rect x="1" y="2" width="6" height="2" fill={color} />
          <rect x="2" y="4" width="4" height="1" fill={color} />
          <rect x="3" y="5" width="2" height="1" fill={color} />
        </svg>
      );
    case "S":
      return (
        <svg {...base}>
          <rect x="3" y="0" width="2" height="1" fill={color} />
          <rect x="2" y="1" width="4" height="2" fill={color} />
          <rect x="1" y="2" width="6" height="2" fill={color} />
          <rect x="2" y="4" width="4" height="1" fill={color} />
          <rect x="3" y="5" width="2" height="3" fill={color} />
        </svg>
      );
    case "C":
      return (
        <svg {...base}>
          <rect x="3" y="0" width="2" height="1" fill={color} />
          <rect x="1" y="1" width="2" height="2" fill={color} />
          <rect x="5" y="1" width="2" height="2" fill={color} />
          <rect x="2" y="3" width="4" height="2" fill={color} />
          <rect x="3" y="5" width="2" height="3" fill={color} />
        </svg>
      );
    default:
      return <svg {...base} />;
  }
}

export function PlayingCardView({
  card,
  index = 0,
  hidden = false,
}: {
  card: Card;
  index?: number;
  hidden?: boolean;
}) {
  if (hidden) {
    return (
      <div
        className="egg-card egg-card-deal egg-card-back"
        style={{ animationDelay: `${index * 0.12}s` }}
        aria-label="ورقة مقلوبة"
      />
    );
  }
  const red = card.s === "H" || card.s === "D";
  return (
    <div
      className={`egg-card egg-card-deal ${red ? "egg-card-red" : "egg-card-black"}`}
      style={{ animationDelay: `${index * 0.12}s` }}
      aria-label={`${card.r} ${
        card.s === "H" ? "قلوب" : card.s === "D" ? "ماسي" : card.s === "S" ? "بستوني" : "سكوب"
      }`}
    >
      <span className="egg-card-rank font-pixel-en">{card.r}</span>
      <SuitSprite s={card.s} size={12} />
      <span className="egg-card-rank egg-card-rank-b font-pixel-en">{card.r}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Big sprites for the mini-games
// ---------------------------------------------------------------------------

/** THE LAST PLACE — pixel-art boss (24x24 grid, scaled up). */
export function BossSprite({ size = 120, hurt = false, className = "" }: { size?: number; hurt?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      className={`pixel-sprite ${hurt ? "egg-boss-hurt" : ""} ${className}`}
      aria-hidden
    >
      {/* aura */}
      <rect x="2" y="2" width="2" height="2" fill="#312e81" />
      <rect x="20" y="2" width="2" height="2" fill="#312e81" />
      <rect x="1" y="12" width="2" height="2" fill="#312e81" />
      <rect x="21" y="12" width="2" height="2" fill="#312e81" />
      {/* broken crown */}
      <rect x="7" y="1" width="2" height="2" fill="#6b7280" />
      <rect x="11" y="0" width="2" height="3" fill="#9ca3af" />
      <rect x="15" y="1" width="2" height="2" fill="#6b7280" />
      <rect x="7" y="3" width="10" height="1" fill="#4b5563" />
      {/* head */}
      <rect x="8" y="4" width="8" height="6" fill="#312e81" />
      {/* eyes */}
      <rect x="10" y="6" width="2" height="2" fill="#ef4444" />
      <rect x="14" y="6" width="2" height="2" fill="#ef4444" />
      <rect x="10" y="6" width="1" height="1" fill="#fca5a5" />
      <rect x="14" y="6" width="1" height="1" fill="#fca5a5" />
      {/* body */}
      <rect x="5" y="10" width="14" height="9" fill="#1e1b4b" />
      <rect x="3" y="11" width="18" height="4" fill="#1e1b4b" />
      <rect x="5" y="10" width="14" height="1" fill="#4338ca" />
      {/* arms */}
      <rect x="2" y="12" width="3" height="5" fill="#1e1b4b" />
      <rect x="19" y="12" width="3" height="5" fill="#1e1b4b" />
      {/* piggy bank hostage */}
      <rect x="16" y="15" width="6" height="5" fill="#f9a8d4" />
      <rect x="17" y="14" width="4" height="1" fill="#f9a8d4" />
      <rect x="18" y="15" width="2" height="1" fill="#831843" />
      <rect x="17" y="17" width="1" height="1" fill="#831843" />
      <rect x="16" y="14" width="1" height="1" fill="#f472b6" />
      <rect x="22" y="17" width="1" height="2" fill="#ec4899" />
      {/* feet */}
      <rect x="7" y="19" width="4" height="3" fill="#0f0a2e" />
      <rect x="13" y="19" width="4" height="3" fill="#0f0a2e" />
      {/* shadow */}
      <rect x="5" y="22" width="14" height="1" fill="#000000" opacity="0.4" />
    </svg>
  );
}

export type PetExpression = "idle" | "happy" | "surprised" | "sleep" | "love";

/** The secret companion — tiny green creature with expressions. */
export function PetSprite({
  expression = "idle",
  size = 44,
}: {
  expression?: PetExpression;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className="pixel-sprite" aria-hidden>
      {/* antenna */}
      <rect x="7" y="0" width="1" height="1" fill="#fde047" />
      <rect x="7" y="1" width="1" height="2" fill="#4ade80" />
      {/* head */}
      <rect x="5" y="3" width="6" height="4" fill="#4ade80" />
      {/* body */}
      <rect x="4" y="6" width="8" height="6" fill="#22c55e" />
      <rect x="5" y="11" width="6" height="1" fill="#16a34a" />
      {/* feet */}
      <rect x="5" y="12" width="2" height="2" fill="#15803d" />
      <rect x="9" y="12" width="2" height="2" fill="#15803d" />
      {/* face */}
      {expression === "happy" ? (
        <>
          <rect x="5" y="4" width="1" height="1" fill="#052e16" />
          <rect x="6" y="5" width="1" height="1" fill="#052e16" />
          <rect x="10" y="4" width="1" height="1" fill="#052e16" />
          <rect x="9" y="5" width="1" height="1" fill="#052e16" />
          <rect x="6" y="7" width="4" height="2" fill="#052e16" />
          <rect x="7" y="7" width="2" height="1" fill="#4ade80" />
        </>
      ) : expression === "surprised" ? (
        <>
          <rect x="5" y="4" width="2" height="2" fill="#e2e8f0" />
          <rect x="6" y="5" width="1" height="1" fill="#052e16" />
          <rect x="9" y="4" width="2" height="2" fill="#e2e8f0" />
          <rect x="9" y="5" width="1" height="1" fill="#052e16" />
          <rect x="7" y="7" width="2" height="2" fill="#052e16" />
        </>
      ) : expression === "sleep" ? (
        <>
          <rect x="5" y="5" width="2" height="1" fill="#052e16" />
          <rect x="9" y="5" width="2" height="1" fill="#052e16" />
          <rect x="7" y="7" width="2" height="1" fill="#15803d" />
          <rect x="11" y="2" width="2" height="1" fill="#e2e8f0" />
          <rect x="12" y="1" width="1" height="1" fill="#e2e8f0" />
        </>
      ) : expression === "love" ? (
        <>
          <rect x="6" y="4" width="1" height="2" fill="#052e16" />
          <rect x="9" y="4" width="1" height="2" fill="#052e16" />
          <rect x="7" y="7" width="2" height="1" fill="#052e16" />
          <rect x="2" y="1" width="2" height="2" fill="#f472b6" />
          <rect x="12" y="2" width="2" height="2" fill="#f472b6" />
        </>
      ) : (
        <>
          <rect x="6" y="4" width="1" height="2" fill="#052e16" />
          <rect x="9" y="4" width="1" height="2" fill="#052e16" />
          <rect x="7" y="7" width="2" height="1" fill="#15803d" />
        </>
      )}
      {/* belly */}
      <rect x="6" y="9" width="4" height="2" fill="#86efac" />
    </svg>
  );
}

/** Classic arcade UFO. */
export function UfoSprite({ size = 56, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 16 12"
      shapeRendering="crispEdges"
      className={`pixel-sprite ${className}`}
      aria-hidden
    >
      <rect x="5" y="0" width="6" height="3" fill="#7dd3fc" />
      <rect x="6" y="0" width="4" height="1" fill="#bae6fd" />
      <rect x="7" y="1" width="2" height="2" fill="#22c55e" />
      <rect x="7" y="1" width="1" height="1" fill="#bbf7d0" />
      <rect x="2" y="3" width="12" height="4" fill="#94a3b8" />
      <rect x="3" y="3" width="10" height="1" fill="#cbd5e1" />
      <rect x="2" y="6" width="12" height="1" fill="#64748b" />
      <rect x="3" y="7" width="2" height="1" fill="#fde047" />
      <rect x="7" y="7" width="2" height="1" fill="#f43f5e" />
      <rect x="11" y="7" width="2" height="1" fill="#fde047" />
    </svg>
  );
}

/** The mothership for the invasion finale. */
export function MothershipSprite({ size = 180 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 24 14" shapeRendering="crispEdges" className="pixel-sprite" aria-hidden>
      <rect x="9" y="0" width="6" height="3" fill="#7dd3fc" />
      <rect x="10" y="0" width="4" height="1" fill="#bae6fd" />
      <rect x="11" y="1" width="2" height="2" fill="#22c55e" />
      <rect x="4" y="3" width="16" height="5" fill="#94a3b8" />
      <rect x="5" y="3" width="14" height="1" fill="#cbd5e1" />
      <rect x="2" y="5" width="20" height="3" fill="#64748b" />
      <rect x="3" y="8" width="18" height="1" fill="#475569" />
      <rect x="3" y="9" width="2" height="1" fill="#fde047" />
      <rect x="7" y="9" width="2" height="1" fill="#f43f5e" />
      <rect x="11" y="9" width="2" height="1" fill="#fde047" />
      <rect x="15" y="9" width="2" height="1" fill="#f43f5e" />
      <rect x="19" y="9" width="2" height="1" fill="#fde047" />
    </svg>
  );
}

/** Mysterious corner stalker — a shy cloaked figure. */
export function StalkerSprite({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className="pixel-sprite" aria-hidden>
      <rect x="5" y="2" width="6" height="3" fill="#374151" />
      <rect x="4" y="5" width="8" height="9" fill="#1f2937" />
      <rect x="5" y="14" width="6" height="1" fill="#111827" />
      <rect x="6" y="4" width="4" height="2" fill="#0b0e1c" />
      <rect x="6" y="4" width="1" height="1" fill="#e2e8f0" />
      <rect x="9" y="4" width="1" height="1" fill="#e2e8f0" />
      <rect x="3" y="8" width="1" height="1" fill="#e2e8f0" opacity="0.5" />
      <rect x="12" y="6" width="1" height="1" fill="#e2e8f0" opacity="0.5" />
    </svg>
  );
}

/** Casino chip. */
export function ChipSprite({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" className={`pixel-sprite ${className}`} aria-hidden>
      <rect x="3" y="1" width="10" height="14" fill="#eab308" />
      <rect x="1" y="3" width="14" height="10" fill="#facc15" />
      <rect x="4" y="4" width="8" height="8" fill="#fef08a" />
      <rect x="1" y="4" width="2" height="2" fill="#fff7ed" />
      <rect x="13" y="8" width="2" height="2" fill="#fff7ed" />
      <rect x="6" y="6" width="4" height="4" fill="#eab308" />
    </svg>
  );
}
