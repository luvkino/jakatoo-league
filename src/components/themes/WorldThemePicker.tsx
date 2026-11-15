"use client";

/**
 * Multiverse theme picker: 7 free worlds + the classic look, a live preview
 * before applying, and a Random Theme option. Selecting a card only previews;
 * the theme is applied (and saved for this player) with "تطبيق الثيم".
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { PixelIcon } from "@/components/PixelArt";
import { useChaos } from "@/components/ChaosEngine";
import { usePlayerPrefs, newAvatarSeed } from "@/components/prefs/PlayerPrefsProvider";
import { WORLD_THEMES, WORLD_THEME_MAP, pickRandomWorld, type WorldTheme } from "@/lib/worldThemes";
import { AvatarSprite } from "@/components/avatar/AvatarSprite";
import { DEFAULT_AVATAR } from "@/lib/avatar";
import { previewTheme, setMusicTheme } from "@/lib/audio/engine";

function WorldPreview({ theme }: { theme: WorldTheme }) {
  const meta = WORLD_THEME_MAP[theme];
  const [s0, s1, s2] = meta.swatch;
  return (
    <div
      className="relative overflow-hidden border-2"
      style={{ borderColor: s2, background: s0 }}
      aria-hidden
    >
      <div className="p-2.5" style={{ background: `linear-gradient(160deg, ${s1}, ${s0})` }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="font-pixel-en text-[9px] tracking-widest"
            style={{ color: s2 }}
          >
            JACKAROO LEAGUE
          </span>
          <span
            className="border px-1 py-0.5 font-pixel-en text-[8px]"
            style={{ borderColor: s2, color: s2 }}
          >
            8-BIT
          </span>
        </div>
        <div className="grid gap-1.5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 border-2 px-2 py-1"
              style={{
                borderColor: i === 0 ? s2 : `${s1}`,
                background: i === 0 ? `color-mix(in srgb, ${s2} 18%, ${s0})` : s1,
              }}
            >
              <span className="grid h-7 w-7 place-items-center border" style={{ borderColor: s2, background: s0 }}>
                <AvatarSprite config={{ ...DEFAULT_AVATAR, outfit: i === 0 ? 2 : 5 }} size={22} />
              </span>
              <span className="flex-1 text-[10px] font-bold" style={{ color: i === 0 ? s2 : "#fff" }}>
                {i === 0 ? "المركز الأول" : "لاعب الدوري"}
              </span>
              <span
                className="border px-1 py-0.5 text-[9px] font-bold"
                style={{ borderColor: s2, color: i === 0 ? s0 : s2, background: i === 0 ? s2 : "transparent" }}
              >
                {i === 0 ? "★" : "12"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          <span className="h-3 flex-1 border-2" style={{ borderColor: s2, background: s2 }} />
          <span className="h-3 flex-1 border-2" style={{ borderColor: s2 }} />
        </div>
      </div>
    </div>
  );
}

export function WorldThemePicker() {
  const { prefs, set, saving } = usePlayerPrefs();
  const { sfx } = useChaos();
  // `chosen` only holds a temporary preview; the applied theme always wins
  // once it changes (no setState-in-effect needed).
  const [chosen, setChosen] = useState<{ base: WorldTheme; value: WorldTheme }>({
    base: prefs.theme,
    value: prefs.theme,
  });
  const preview = chosen.base === prefs.theme ? chosen.value : prefs.theme;
  const setPreview = (value: WorldTheme) => setChosen({ base: prefs.theme, value });
  const [previewMusic, setPreviewMusic] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    [],
  );

  const level = (prefs.masterVolume / 100) * (prefs.musicVolume / 100);
  const restoreMusic = () =>
    setMusicTheme(prefs.theme, level, prefs.musicEnabled && level > 0);
  const startPreviewMusic = (t: WorldTheme) => {
    previewTheme(t, level, 8000);
    if (previewTimer.current) clearTimeout(previewTimer.current);
    // after the preview the player's own world music comes back (if enabled)
    previewTimer.current = setTimeout(restoreMusic, 8200);
  };

  const meta = WORLD_THEME_MAP[preview];
  const isApplied = prefs.theme === preview;
  const ordered = useMemo(() => WORLD_THEMES, []);

  const choose = (t: WorldTheme) => {
    setPreview(t);
    sfx("click");
    if (previewMusic) startPreviewMusic(t);
  };

  const apply = () => {
    set({ theme: preview });
    sfx("achievement");
    // Music switches automatically through AudioManager (no overlap).
  };

  const random = () => {
    const next = pickRandomWorld(newAvatarSeed(), prefs.theme);
    choose(next);
    set({ theme: next });
  };

  return (
    <div className="stack !gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ordered.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={preview === t.id}
            className="world-card"
            onClick={() => choose(t.id)}
          >
            <div className="world-swatch">
              <span style={{ background: t.swatch[0] }} />
              <span style={{ background: t.swatch[1] }} />
              <span style={{ background: t.swatch[2] }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="truncate text-sm font-extrabold">{t.label}</span>
              <span className="font-pixel-en text-[10px] text-muted">{t.glyph}</span>
            </div>
            <span className="mt-0.5 block text-[10px] leading-tight text-muted">{t.track}</span>
            {prefs.theme === t.id && (
              <span className="mt-1 inline-block border border-accent bg-accent/15 px-1 py-0.5 text-[9px] font-bold text-accent-text">
                مُطبَّق
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Preview before applying */}
      <div className="grid gap-3 border-2 border-line bg-card2/50 p-3 sm:grid-cols-[220px_minmax(0,1fr)]">
        <WorldPreview theme={preview} />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-accent">معاينة</span>
            <span className="font-pixel-ar text-xl font-extrabold">{meta.label}</span>
            <span className="font-pixel-en text-[10px] text-muted">{meta.trackEn}</span>
          </div>
          <p className="text-xs text-muted">{meta.desc}</p>
          <p className="text-[11px] text-muted">
            🎵 موسيقى الثيم: <b className="text-fg">{meta.track}</b> · {meta.bpm} BPM · مقطوعة أصلية 8-بت
          </p>
          <div className="mt-auto flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={apply} disabled={isApplied || saving}>
              <PixelIcon name="sparkle" size={14} /> {isApplied ? "مطبَّق حالياً" : "تطبيق الثيم"}
            </button>
            <button type="button" className="btn btn-sm" onClick={random}>
              <PixelIcon name="dice" size={14} /> ثيم عشوائي
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                const next = !previewMusic;
                setPreviewMusic(next);
                if (next) {
                  startPreviewMusic(preview);
                } else {
                  if (previewTimer.current) clearTimeout(previewTimer.current);
                  restoreMusic();
                }
              }}
            >
              <PixelIcon name={previewMusic ? "soundOn" : "soundOff"} size={14} />
              {previewMusic ? "إيقاف المعاينة" : "معاينة الموسيقى (8 ث)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
