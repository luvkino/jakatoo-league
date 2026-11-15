"use client";

/**
 * PixelSprite — renders a 16×16 pixel-art avatar from an AvatarConfig.
 *
 * All shapes are baked onto the same grid so every combination lines up:
 * head 4..11 × 3..10, neck at 11, body 3..12 × 11..15. Accessory layers are
 * drawn last so hats/headphones never clip the face incorrectly.
 */

import type { ReactNode } from "react";
import {
  ACCESSORIES,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  SKIN_TONES,
  type AvatarConfig,
} from "@/lib/avatar";

interface Props {
  config: AvatarConfig;
  size?: number;
  /** Optional background colour; transparent when omitted. */
  bg?: string;
  className?: string;
  label?: string;
}

const OUTLINE = "#141420";

export function AvatarSprite({ config, size = 64, bg, className = "", label }: Props) {
  const skin = SKIN_TONES[config.skin] ?? SKIN_TONES[0];
  const hair = HAIR_COLORS[config.hairColor] ?? HAIR_COLORS[0];
  const outfit = OUTFITS[config.outfit] ?? OUTFITS[0];
  const eyes = EYE_STYLES[config.eyes]?.id ?? 0;
  const hairStyle = HAIR_STYLES[config.hair]?.id ?? 0;
  const accessory = ACCESSORIES[config.accessory]?.id ?? 0;

  const parts: ReactNode[] = [];

  // ---- long hair / ponytail drawn behind the head
  if (hairStyle === 2) {
    parts.push(
      <g key="hair-back">
        <rect x="3" y="4" width="2" height="8" fill={hair.shade} />
        <rect x="11" y="4" width="2" height="8" fill={hair.shade} />
        <rect x="3" y="10" width="10" height="2" fill={hair.shade} />
      </g>,
    );
  }
  if (hairStyle === 4) {
    parts.push(
      <g key="hair-afro">
        <rect x="3" y="1" width="10" height="3" fill={hair.color} />
        <rect x="2" y="2" width="12" height="4" fill={hair.color} />
        <rect x="3" y="5" width="2" height="4" fill={hair.shade} />
        <rect x="11" y="5" width="2" height="4" fill={hair.shade} />
        <rect x="6" y="0" width="4" height="2" fill={hair.color} />
      </g>,
    );
  }

  // ---- head, ears, neck
  parts.push(
    <g key="head">
      <rect x="4" y="3" width="8" height="8" fill={skin.color} />
      <rect x="4" y="10" width="8" height="1" fill={skin.shade} />
      <rect x="3" y="6" width="1" height="2" fill={skin.shade} />
      <rect x="12" y="6" width="1" height="2" fill={skin.shade} />
      <rect x="7" y="11" width="2" height="1" fill={skin.shade} />
    </g>,
  );

  // ---- front hair styles
  const hairFront: ReactNode[] = [];
  switch (hairStyle) {
    case 0: // short
      hairFront.push(
        <g key="h0">
          <rect x="4" y="2" width="8" height="2" fill={hair.color} />
          <rect x="4" y="4" width="1" height="2" fill={hair.color} />
          <rect x="11" y="4" width="1" height="2" fill={hair.color} />
          <rect x="5" y="3" width="3" height="1" fill={hair.shade} opacity="0.55" />
        </g>,
      );
      break;
    case 1: // spiky
      hairFront.push(
        <g key="h1">
          <rect x="4" y="2" width="8" height="2" fill={hair.color} />
          <rect x="4" y="1" width="2" height="1" fill={hair.color} />
          <rect x="7" y="0" width="2" height="2" fill={hair.color} />
          <rect x="10" y="1" width="2" height="1" fill={hair.color} />
          <rect x="4" y="4" width="1" height="1" fill={hair.shade} />
          <rect x="11" y="4" width="1" height="1" fill={hair.shade} />
        </g>,
      );
      break;
    case 2: // long
      hairFront.push(
        <g key="h2">
          <rect x="4" y="2" width="8" height="3" fill={hair.color} />
          <rect x="4" y="5" width="1" height="1" fill={hair.color} />
          <rect x="11" y="5" width="1" height="1" fill={hair.color} />
        </g>,
      );
      break;
    case 3: // ponytail
      hairFront.push(
        <g key="h3">
          <rect x="4" y="2" width="8" height="2" fill={hair.color} />
          <rect x="11" y="3" width="2" height="1" fill={hair.color} />
          <rect x="13" y="4" width="2" height="5" fill={hair.color} />
          <rect x="14" y="8" width="1" height="2" fill={hair.shade} />
        </g>,
      );
      break;
    case 5: // mohawk
      hairFront.push(
        <g key="h5">
          <rect x="7" y="0" width="2" height="4" fill={hair.color} />
          <rect x="4" y="3" width="8" height="1" fill={hair.shade} />
        </g>,
      );
      break;
    case 6: // side fringe
      hairFront.push(
        <g key="h6">
          <rect x="4" y="2" width="8" height="2" fill={hair.color} />
          <rect x="4" y="4" width="4" height="2" fill={hair.color} />
          <rect x="8" y="4" width="1" height="1" fill={hair.shade} />
        </g>,
      );
      break;
    default:
      break; // bald
  }
  parts.push(<g key="hair-front">{hairFront}</g>);

  // ---- eyes
  const eyeWhite = "#ffffff";
  const eyeDark = "#1b1b2b";
  const eyeY = 6;
  switch (eyes) {
    case 1: // wide
      parts.push(
        <g key="eyes">
          <rect x="5" y={eyeY} width="2" height="2" fill={eyeWhite} />
          <rect x="9" y={eyeY} width="2" height="2" fill={eyeWhite} />
          <rect x="6" y={eyeY} width="1" height="2" fill={eyeDark} />
          <rect x="9" y={eyeY} width="1" height="2" fill={eyeDark} />
        </g>,
      );
      break;
    case 2: // happy
      parts.push(
        <g key="eyes">
          <rect x="5" y={eyeY + 1} width="2" height="1" fill={eyeDark} />
          <rect x="9" y={eyeY + 1} width="2" height="1" fill={eyeDark} />
          <rect x="5" y={eyeY} width="1" height="1" fill={eyeDark} />
          <rect x="10" y={eyeY} width="1" height="1" fill={eyeDark} />
        </g>,
      );
      break;
    case 3: // sharp
      parts.push(
        <g key="eyes">
          <rect x="5" y={eyeY} width="1" height="2" fill={eyeDark} />
          <rect x="6" y={eyeY + 1} width="1" height="1" fill={eyeDark} />
          <rect x="10" y={eyeY} width="1" height="2" fill={eyeDark} />
          <rect x="9" y={eyeY + 1} width="1" height="1" fill={eyeDark} />
          <rect x="5" y={eyeY - 1} width="2" height="1" fill={hair.shade} />
          <rect x="9" y={eyeY - 1} width="2" height="1" fill={hair.shade} />
        </g>,
      );
      break;
    case 4: // sunglasses
      parts.push(
        <g key="eyes">
          <rect x="4" y={eyeY} width="4" height="2" fill="#12121c" />
          <rect x="8" y={eyeY} width="4" height="2" fill="#12121c" />
          <rect x="8" y={eyeY} width="1" height="1" fill="#3a3a52" />
          <rect x="5" y={eyeY} width="1" height="1" fill="#3a3a52" />
        </g>,
      );
      break;
    default: // normal
      parts.push(
        <g key="eyes">
          <rect x="5" y={eyeY} width="2" height="2" fill={eyeWhite} />
          <rect x="9" y={eyeY} width="2" height="2" fill={eyeWhite} />
          <rect x="6" y={eyeY} width="1" height="2" fill={eyeDark} />
          <rect x="9" y={eyeY} width="1" height="2" fill={eyeDark} />
        </g>,
      );
  }

  // ---- mouth (eyes style 2 grins wider)
  parts.push(
    <g key="mouth">
      {eyes === 2 ? (
        <rect x="6" y="9" width="4" height="1" fill="#8a3b3b" />
      ) : (
        <rect x="7" y="9" width="2" height="1" fill="#8a3b3b" />
      )}
    </g>,
  );

  // ---- body / outfit
  parts.push(
    <g key="outfit">
      <rect x="3" y="12" width="10" height="4" fill={outfit.color} />
      <rect x="3" y="15" width="10" height="1" fill={outfit.shade} />
      <rect x="5" y="12" width="6" height="1" fill={outfit.trim} />
      <rect x="7" y="13" width="2" height="2" fill={outfit.trim} opacity="0.8" />
      <rect x="2" y="13" width="1" height="3" fill={skin.color} />
      <rect x="13" y="13" width="1" height="3" fill={skin.color} />
    </g>,
  );

  // ---- accessories
  if (accessory === 1) {
    // cap
    parts.push(
      <g key="acc">
        <rect x="3" y="0" width="10" height="2" fill="#e23b4e" />
        <rect x="3" y="2" width="11" height="1" fill="#8f1f2c" />
        <rect x="4" y="0" width="3" height="1" fill="#ff7a86" />
      </g>,
    );
  } else if (accessory === 2) {
    // headphones
    parts.push(
      <g key="acc">
        <rect x="4" y="1" width="8" height="1" fill="#2a2a3a" />
        <rect x="3" y="2" width="1" height="1" fill="#2a2a3a" />
        <rect x="12" y="2" width="1" height="1" fill="#2a2a3a" />
        <rect x="2" y="5" width="2" height="3" fill="#2a2a3a" />
        <rect x="12" y="5" width="2" height="3" fill="#2a2a3a" />
        <rect x="2" y="6" width="1" height="1" fill="#38e0d0" />
        <rect x="13" y="6" width="1" height="1" fill="#38e0d0" />
      </g>,
    );
  } else if (accessory === 3) {
    // scarf
    parts.push(
      <g key="acc">
        <rect x="4" y="11" width="8" height="1" fill="#e8a33c" />
        <rect x="10" y="12" width="2" height="3" fill="#e8a33c" />
        <rect x="4" y="11" width="2" height="1" fill="#ffcf7a" />
      </g>,
    );
  } else if (accessory === 4) {
    // round glasses (drawn over the eyes)
    parts.push(
      <g key="acc">
        <rect x="4" y="5" width="4" height="1" fill="#d8d8e8" />
        <rect x="8" y="5" width="4" height="1" fill="#d8d8e8" />
        <rect x="4" y="8" width="4" height="1" fill="#d8d8e8" />
        <rect x="8" y="8" width="4" height="1" fill="#d8d8e8" />
        <rect x="4" y="6" width="1" height="2" fill="#d8d8e8" />
        <rect x="11" y="6" width="1" height="2" fill="#d8d8e8" />
      </g>,
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={`pixel-sprite ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ imageRendering: "pixelated" }}
    >
      {bg && <rect x="0" y="0" width="16" height="16" fill={bg} />}
      {!bg && (
        <rect x="0" y="0" width="16" height="16" fill="transparent" />
      )}
      <rect x="3" y="2" width="10" height="14" fill={OUTLINE} opacity="0" />
      {parts}
    </svg>
  );
}
