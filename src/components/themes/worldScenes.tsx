"use client";

/**
 * WORLD SCENES — the animated pixel-art art for each of the eight worlds.
 *
 * Shared by <WorldEnvironment /> (the real full-page backdrop) and by the
 * Settings preview, so the preview is guaranteed to show the true environment.
 * Every scene is a flat set of absolutely-positioned, CSS-animated elements
 * (see `src/app/worlds.css`); nothing here runs JavaScript per frame.
 */

import type { WorldTheme } from "@/lib/worldThemes";

/** Deterministic pseudo-random so SSR and client markup always agree. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Cloud({ i, tone }: { i: number; tone?: string }) {
  const top = 6 + rand(i + 1) * 34;
  const dur = 60 + rand(i + 2) * 70;
  const delay = -rand(i + 3) * dur;
  const scale = 0.7 + rand(i + 4) * 0.9;
  return (
    <div
      className="wenv-cloud"
      style={{
        top: `${top}%`,
        animationDuration: `${dur}s`,
        animationDelay: `${delay}s`,
        transform: `scale(${scale.toFixed(2)})`,
        ["--cloud-tone" as string]: tone ?? "#ffffff",
      }}
    >
      <span /><span /><span />
    </div>
  );
}

/* ---------------------------------------------------------------- OCEAN */

function OceanScene() {
  return (
    <>
      <div className="wenv-layer wenv-ocean-glow" />
      <div className="wenv-layer wenv-water-caustics" />
      <div className="wenv-seaweed-row">
        {range(9).map((i) => (
          <div
            key={i}
            className="wenv-seaweed"
            style={{
              left: `${4 + i * 11 + rand(i) * 4}%`,
              height: `${18 + rand(i + 2) * 26}vh`,
              animationDuration: `${5 + rand(i + 3) * 4}s`,
              animationDelay: `${-rand(i + 4) * 5}s`,
            }}
          >
            <span /><span /><span />
          </div>
        ))}
      </div>
      <div className="wenv-fish wenv-fish-a" style={{ top: "28%", animationDuration: "38s" }}>
        <span className="wenv-fish-body" />
      </div>
      <div className="wenv-fish wenv-fish-b" style={{ top: "58%", animationDuration: "54s", animationDelay: "-18s" }}>
        <span className="wenv-fish-body wenv-fish-body-b" />
      </div>
      <div className="wenv-fish wenv-fish-c" style={{ top: "74%", animationDuration: "72s", animationDelay: "-40s" }}>
        <span className="wenv-fish-body wenv-fish-body-c" />
      </div>
      <div className="wenv-layer wenv-ocean-floor" />
      {range(14).map((i) => (
        <span
          key={`b${i}`}
          className="wenv-bubble"
          style={{
            left: `${rand(i + 10) * 100}%`,
            animationDuration: `${9 + rand(i + 11) * 14}s`,
            animationDelay: `${-rand(i + 12) * 18}s`,
            ["--bubble-size" as string]: `${3 + Math.round(rand(i + 13) * 8)}px`,
          }}
        />
      ))}
      {range(24).map((i) => (
        <span
          key={`p${i}`}
          className="wenv-mote wenv-mote-blue"
          style={{
            left: `${rand(i + 40) * 100}%`,
            top: `${rand(i + 41) * 100}%`,
            animationDuration: `${10 + rand(i + 42) * 16}s`,
            animationDelay: `${-rand(i + 43) * 14}s`,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------- CYBERPUNK */

function CyberScene() {
  return (
    <>
      <div className="wenv-layer wenv-cyber-sky" />
      <div className="wenv-layer wenv-grid-floor" />
      <div className="wenv-cityline wenv-cityline-far" aria-hidden>
        {range(18).map((i) => (
          <span
            key={i}
            style={{
              width: `${4 + rand(i) * 6}%`,
              height: `${18 + rand(i + 1) * 46}%`,
              left: `${i * 5.6}%`,
            }}
          />
        ))}
      </div>
      <div className="wenv-cityline wenv-cityline-near" aria-hidden>
        {range(13).map((i) => (
          <span
            key={i}
            style={{
              width: `${6 + rand(i + 5) * 7}%`,
              height: `${26 + rand(i + 6) * 40}%`,
              left: `${i * 7.7}%`,
            }}
          >
            <b className="wenv-window" style={{ animationDelay: `${rand(i) * 3}s` }} />
          </span>
        ))}
      </div>
      {range(5).map((i) => (
        <span
          key={`n${i}`}
          className="wenv-neon-sign"
          style={{
            left: `${8 + i * 19}%`,
            top: `${10 + rand(i + 3) * 30}%`,
            animationDelay: `${-rand(i + 4) * 4}s`,
            ["--neon" as string]: ["#ff2fd0", "#38f8ff", "#ffe14d", "#a855f7", "#ff6b3d"][i % 5],
          }}
        />
      ))}
      <div className="wenv-layer wenv-rain" />
      {range(10).map((i) => (
        <span
          key={`r${i}`}
          className="wenv-raindrop"
          style={{
            left: `${rand(i + 20) * 100}%`,
            animationDuration: `${0.9 + rand(i + 21) * 0.9}s`,
            animationDelay: `${-rand(i + 22) * 2}s`,
          }}
        />
      ))}
      {range(16).map((i) => (
        <span
          key={`e${i}`}
          className="wenv-mote wenv-mote-pink"
          style={{
            left: `${rand(i + 60) * 100}%`,
            top: `${rand(i + 61) * 100}%`,
            animationDuration: `${8 + rand(i + 62) * 12}s`,
            animationDelay: `${-rand(i + 63) * 10}s`,
          }}
        />
      ))}
      <div className="wenv-glitch" />
    </>
  );
}

/* --------------------------------------------------------------- ARCADE */

function ArcadeScene() {
  const glyphs = ["▚", "♦", "✚", "▲", "1UP", "★", "◉", "▙", "♠", "♥"];
  return (
    <>
      <div className="wenv-layer wenv-arcade-sky" />
      <div className="wenv-layer wenv-crt" />
      <div className="wenv-arcade-frame" aria-hidden>
        {range(7).map((i) => (
          <span
            key={i}
            className="wenv-arcade-glyph"
            style={{
              left: `${6 + rand(i) * 88}%`,
              top: `${8 + rand(i + 1) * 74}%`,
              animationDelay: `${-rand(i + 2) * 6}s`,
              animationDuration: `${6 + rand(i + 3) * 6}s`,
              ["--glyph-color" as string]: ["#ffe14d", "#ff3860", "#39ff88", "#38bdf8", "#ff2fd0"][i % 5],
            }}
          >
            {glyphs[i]}
          </span>
        ))}
      </div>
      {range(20).map((i) => (
        <span
          key={`s${i}`}
          className="wenv-star"
          style={{
            left: `${rand(i + 30) * 100}%`,
            top: `${rand(i + 31) * 100}%`,
            animationDelay: `${-rand(i + 32) * 4}s`,
            animationDuration: `${3 + rand(i + 33) * 4}s`,
          }}
        />
      ))}
      {range(12).map((i) => (
        <span
          key={`px${i}`}
          className="wenv-pixel-float"
          style={{
            left: `${rand(i + 70) * 100}%`,
            animationDuration: `${11 + rand(i + 71) * 12}s`,
            animationDelay: `${-rand(i + 72) * 12}s`,
            ["--px" as string]: ["#ffe14d", "#39ff88", "#38bdf8", "#ff3860"][i % 4],
          }}
        />
      ))}
    </>
  );
}

/* -------------------------------------------------------- MUSHROOM (Mario) */

function MushroomScene() {
  return (
    <>
      <div className="wenv-layer wenv-mushroom-sky" />
      {range(5).map((i) => (
        <Cloud key={i} i={i} tone="#ffffff" />
      ))}
      <div className="wenv-hills" aria-hidden>
        {range(4).map((i) => (
          <span key={i} className="wenv-hill" style={{ left: `${i * 27 - 4}%`, ["--hill-h" as string]: `${22 + rand(i) * 14}vh` }} />
        ))}
      </div>
      <div className="wenv-block-row" aria-hidden>
        {range(7).map((i) => (
          <span key={i} className="wenv-qblock" style={{ animationDelay: `${rand(i) * 2}s` }} />
        ))}
      </div>
      {range(6).map((i) => (
        <span
          key={`c${i}`}
          className="wenv-coin"
          style={{
            left: `${8 + i * 16}%`,
            animationDuration: `${2.4 + rand(i + 4) * 1.6}s`,
            animationDelay: `${-rand(i + 5) * 3}s`,
          }}
        >
          <span />
        </span>
      ))}
      <div className="wenv-pipe" style={{ left: "8%" }} aria-hidden />
      <div className="wenv-pipe wenv-pipe-sm" style={{ left: "78%" }} aria-hidden />
      {range(10).map((i) => (
        <span
          key={`sp${i}`}
          className="wenv-mote wenv-mote-white"
          style={{
            left: `${rand(i + 80) * 100}%`,
            top: `${rand(i + 81) * 100}%`,
            animationDuration: `${9 + rand(i + 82) * 10}s`,
            animationDelay: `${-rand(i + 83) * 9}s`,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------- GTA VI (vice sunset) */

function ViceScene() {
  return (
    <>
      <div className="wenv-layer wenv-vice-sky" />
      <div className="wenv-sun" aria-hidden />
      <div className="wenv-vice-water" aria-hidden />
      <div className="wenv-cityline wenv-vice-city" aria-hidden>
        {range(16).map((i) => (
          <span
            key={i}
            style={{
              width: `${4 + rand(i) * 5}%`,
              height: `${12 + rand(i + 1) * 30}%`,
              left: `${i * 6.3}%`,
            }}
          >
            <b className="wenv-window wenv-window-warm" style={{ animationDelay: `${rand(i + 2) * 4}s` }} />
          </span>
        ))}
      </div>
      {range(7).map((i) => (
        <div
          key={`p${i}`}
          className="wenv-palm"
          style={{
            left: `${i * 15 - 2}%`,
            height: `${26 + rand(i) * 20}vh`,
            animationDuration: `${5 + rand(i + 1) * 4}s`,
            animationDelay: `${-rand(i + 2) * 5}s`,
            ["--palm-scale" as string]: `${0.7 + rand(i + 3) * 0.7}`,
          }}
        >
          <span className="wenv-palm-trunk" />
          <span className="wenv-palm-leaf" />
          <span className="wenv-palm-leaf wenv-palm-leaf-2" />
          <span className="wenv-palm-leaf wenv-palm-leaf-3" />
        </div>
      ))}
      {range(6).map((i) => (
        <span
          key={`n${i}`}
          className="wenv-neon-sign wenv-neon-sign-soft"
          style={{
            left: `${12 + i * 15}%`,
            top: `${34 + rand(i + 9) * 22}%`,
            animationDelay: `${-rand(i + 8) * 5}s`,
            ["--neon" as string]: ["#ff7ab8", "#38f8ff", "#ffe14d", "#ff9f68"][i % 4],
          }}
        />
      ))}
      {range(20).map((i) => (
        <span
          key={`d${i}`}
          className="wenv-mote wenv-mote-warm"
          style={{
            left: `${rand(i + 90) * 100}%`,
            top: `${rand(i + 91) * 100}%`,
            animationDuration: `${14 + rand(i + 92) * 16}s`,
            animationDelay: `${-rand(i + 93) * 14}s`,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------- BALATRO */

function BalatroScene() {
  return (
    <>
      <div className="wenv-layer wenv-balatro-glow" />
      <div className="wenv-layer wenv-balatro-vignette" />
      <div className="wenv-cards" aria-hidden>
        {range(6).map((i) => (
          <span
            key={i}
            className={`wenv-card wenv-card-${i % 6}`}
            style={{
              animationDuration: `${18 + rand(i) * 14}s`,
              animationDelay: `${-rand(i + 1) * 20}s`,
              ["--card-rot" as string]: `${-24 + rand(i + 2) * 48}deg`,
              ["--card-delay" as string]: `${-rand(i + 3) * 10}s`,
            }}
          >
            <span className="wenv-card-suit">{["♠", "♥", "♦", "♣", "♠", "♦"][i]}</span>
          </span>
        ))}
      </div>
      <div className="wenv-layer wenv-suits" aria-hidden />
      {range(9).map((i) => (
        <span
          key={`sp${i}`}
          className="wenv-suit-float"
          style={{
            left: `${rand(i + 12) * 92}%`,
            top: `${rand(i + 13) * 88}%`,
            animationDuration: `${9 + rand(i + 14) * 8}s`,
            animationDelay: `${-rand(i + 15) * 10}s`,
            ["--suit-color" as string]: i % 2 ? "#e23b4e" : "#f6e9e3",
          }}
        >
          {["♠", "♥", "♦", "♣"][i % 4]}
        </span>
      ))}
      <div className="wenv-layer wenv-casino-light" />
      {range(10).map((i) => (
        <span
          key={`m${i}`}
          className="wenv-mote wenv-mote-gold"
          style={{
            left: `${rand(i + 40) * 100}%`,
            top: `${rand(i + 41) * 100}%`,
            animationDuration: `${11 + rand(i + 42) * 12}s`,
            animationDelay: `${-rand(i + 43) * 11}s`,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------ BREAKING BAD (desert) */

function DesertScene() {
  return (
    <>
      <div className="wenv-layer wenv-desert-sky" />
      <div className="wenv-desert-sun" aria-hidden />
      <div className="wenv-layer wenv-heat-haze" aria-hidden />
      <div className="wenv-mountains" aria-hidden>
        {range(4).map((i) => (
          <span
            key={i}
            className="wenv-mountain"
            style={{
              left: `${i * 26 - 6}%`,
              ["--mtn-h" as string]: `${18 + rand(i) * 16}vh`,
              ["--mtn-tone" as string]: ["#4a4030", "#3d3526", "#5a4c36", "#332c20"][i],
            }}
          />
        ))}
      </div>
      <div className="wenv-layer wenv-desert-floor" />
      {range(5).map((i) => (
        <div
          key={`c${i}`}
          className="wenv-cactus"
          style={{
            left: `${6 + i * 20}%`,
            height: `${10 + rand(i) * 14}vh`,
            animationDelay: `${-rand(i + 1) * 6}s`,
          }}
        >
          <span className="wenv-cactus-arm" />
        </div>
      ))}
      <div className="wenv-layer wenv-sandstorm" />
      {range(22).map((i) => (
        <span
          key={`d${i}`}
          className="wenv-sand-mote"
          style={{
            left: `${rand(i + 50) * 100}%`,
            top: `${20 + rand(i + 51) * 80}%`,
            animationDuration: `${6 + rand(i + 52) * 10}s`,
            animationDelay: `${-rand(i + 53) * 10}s`,
            ["--sand-size" as string]: `${2 + Math.round(rand(i + 54) * 3)}px`,
          }}
        />
      ))}
      {range(10).map((i) => (
        <span
          key={`a${i}`}
          className="wenv-mote wenv-mote-warm"
          style={{
            left: `${rand(i + 70) * 100}%`,
            top: `${rand(i + 71) * 100}%`,
            animationDuration: `${16 + rand(i + 72) * 18}s`,
            animationDelay: `${-rand(i + 73) * 16}s`,
          }}
        />
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- CLASSIC */

function ClassicScene() {
  return (
    <>
      <div className="wenv-layer wenv-classic-glow" />
      {range(18).map((i) => (
        <span
          key={i}
          className="wenv-mote wenv-mote-blue wenv-mote-slow"
          style={{
            left: `${rand(i) * 100}%`,
            top: `${rand(i + 1) * 100}%`,
            animationDuration: `${16 + rand(i + 2) * 18}s`,
            animationDelay: `${-rand(i + 3) * 16}s`,
          }}
        />
      ))}
    </>
  );
}

export const SCENES: Record<WorldTheme, () => React.JSX.Element> = {
  classic: ClassicScene,
  ocean: OceanScene,
  cyberpunk: CyberScene,
  arcade: ArcadeScene,
  mushroom: MushroomScene,
  vice: ViceScene,
  balatro: BalatroScene,
  desert: DesertScene,
};

/** Lightweight swatch used in tight UI (chips, lobby rows). */
export const WORLD_GLYPH: Record<WorldTheme, string> = {
  classic: "★",
  ocean: "≈",
  cyberpunk: "⚡",
  arcade: "▚",
  mushroom: "◕",
  vice: "☀",
  balatro: "♠",
  desert: "⌬",
};
