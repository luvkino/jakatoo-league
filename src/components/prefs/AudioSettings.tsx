"use client";

import { useState } from "react";
import { PixelIcon } from "@/components/PixelArt";
import { useChaos } from "@/components/ChaosEngine";
import { useAppearance } from "@/components/Settings";
import { usePlayerPrefs } from "./PlayerPrefsProvider";
import { TRACKS } from "@/lib/audio/tracks";
import { previewTheme, setMusicTheme } from "@/lib/audio/engine";
import { WORLD_THEME_MAP, WORLD_THEMES, type WorldTheme } from "@/lib/worldThemes";

function Slider({
  label,
  value,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{label}</span>
        <span className="tnum font-pixel-en text-[11px] text-accent-text">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="audio-range"
        aria-label={label}
        disabled={disabled}
      />
      {hint && <p className="mt-0.5 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
  desc,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  desc?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-2 border-line bg-card2 px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-bold">{label}</div>
        {desc && <div className="text-[10px] text-muted">{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`btn btn-sm shrink-0 !min-h-[32px] !px-2 ${on ? "btn-primary" : ""}`}
      >
        {on ? "مفعّل" : "معطل"}
      </button>
    </div>
  );
}

export function AudioSettings() {
  const { prefs, set } = usePlayerPrefs();
  const { set: setAppearance } = useAppearance();
  const { sfx } = useChaos();
  const [previewThemeId, setPreviewThemeId] = useState<WorldTheme>(prefs.theme);
  const muted = prefs.masterVolume === 0;

  const level = (prefs.masterVolume / 100) * (prefs.musicVolume / 100);

  return (
    <div className="stack !gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Slider
          label="الصوت الرئيسي (Master)"
          value={prefs.masterVolume}
          onChange={(v) => set({ masterVolume: v })}
          hint="0% = صامت تماماً"
        />
        <Slider
          label="موسيقى الثيمات"
          value={prefs.musicVolume}
          onChange={(v) => set({ musicVolume: v })}
          hint="مستوى هادئ ومريح للخلفية"
          disabled={muted || !prefs.musicEnabled}
        />
        <Slider
          label="المؤثرات الصوتية"
          value={prefs.sfxVolume}
          onChange={(v) => {
            set({ sfxVolume: v });
          }}
          hint="أصوات الأزرار والأحداث والمباريات"
          disabled={muted || !prefs.sfxEnabled}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${muted ? "btn-primary" : ""}`}
          onClick={() => {
            set({ masterVolume: muted ? 80 : 0 });
            sfx("click");
          }}
        >
          <PixelIcon name={muted ? "soundOn" : "soundOff"} size={14} /> {muted ? "إلغاء كتم الكل" : "كتم الكل (Mute All)"}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setMusicTheme(prefs.theme, level, prefs.musicEnabled && level > 0)}
        >
          <PixelIcon name="bolt" size={14} /> تشغيل موسيقى الثيم
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          label="الموسيقى الخلفية"
          on={prefs.musicEnabled}
          onChange={(v) => set({ musicEnabled: v })}
          desc="موسيقى أصلية 8-بت تتغير مع الثيم وتتكرر بسلاسة."
        />
        <Toggle
          label="المؤثرات الصوتية"
          on={prefs.sfxEnabled}
          onChange={(v) => {
            set({ sfxEnabled: v });
            setAppearance({ sound: v }); // keeps the header toggle in sync
            if (v) setTimeout(() => sfx("achievement"), 30);
          }}
          desc="أصوات الأزرار، الفوز، الترتيب، والنتائج."
        />
      </div>

      {/* Theme music preview */}
      <div className="border-2 border-line bg-card2/60 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold">
              <PixelIcon name="soundOn" size={16} /> معاينة موسيقى الثيمات
            </div>
            <p className="text-[10px] text-muted">
              ألحان أصلية (8-بت) لكل عالم — استمع قبل التطبيق. لن تتداخل الموسيقى مع ثيمك الحالي.
            </p>
          </div>
          <span className="chip tnum !text-[10px]">
            {TRACKS[previewThemeId].bpm} BPM · {WORLD_THEME_MAP[previewThemeId].trackEn}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {WORLD_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`av-choice text-[11px] ${previewThemeId === t.id ? "!border-accent" : ""}`}
              aria-checked={previewThemeId === t.id}
              role="radio"
              onClick={() => {
                setPreviewThemeId(t.id);
                previewTheme(t.id, level, 8000);
                if (prefs.musicEnabled && level > 0) {
                  setTimeout(() => setMusicTheme(prefs.theme, level, true), 8200);
                }
              }}
            >
              <span className="inline-block h-3 w-3 border border-black/40" style={{ background: t.swatch[2] }} />
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted">
        تُحفظ هذه الإعدادات لكل لاعب وتُطبَّق على كل أجهزته بعد اختيار اسمه في قسم الأفاتار. تعمل الموسيقى فقط بعد
        أول تفاعل مع الموقع (سياسة المتصفح)، وتتوقف تلقائياً عند إخفاء الصفحة.
      </p>
    </div>
  );
}
