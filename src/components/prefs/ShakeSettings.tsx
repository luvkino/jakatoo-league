"use client";

import { PixelIcon } from "@/components/PixelArt";
import { useChaos } from "@/components/ChaosEngine";
import { usePlayerPrefs } from "./PlayerPrefsProvider";
import { shakeAmplitude } from "@/lib/prefs";

const PRESETS: { value: number; label: string; hint: string }[] = [
  { value: 0, label: "إيقاف كامل", hint: "بدون أي حركة — الواجهة ثابتة تماماً" },
  { value: 25, label: "خفيف", hint: "حركة بسيطة جداً" },
  { value: 50, label: "متوسط", hint: "حركة ملحوظة ومريحة" },
  { value: 100, label: "قوي", hint: "أقصى حركة أركيد (لا تزال هادئة)" },
];

export function ShakeSettings() {
  const { prefs, set, reducedMotion } = usePlayerPrefs();
  const { sfx } = useChaos();
  const enabled = prefs.shakeEnabled && prefs.shakeIntensity > 0;
  const amp = enabled && !reducedMotion ? shakeAmplitude(prefs.shakeIntensity) : 0;

  return (
    <div className="stack !gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted">
          حركة أركيد مستمرة وهادئة للواجهة (مستوحاة من إحساس Balatro). لا تُحرّك النوافذ أو النماذج ولا تسبب أي إزاحة
          في التخطيط.
        </div>
        <span className={`chip ${enabled ? "chip-good" : ""}`}>
          {reducedMotion ? "معطّل (تقليل الحركة في النظام)" : enabled ? `مفعّل ${prefs.shakeIntensity}%` : "إيقاف"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`btn btn-sm ${enabled ? "btn-primary" : ""}`}
          onClick={() => {
            set({ shakeEnabled: !enabled, shakeIntensity: !enabled && prefs.shakeIntensity === 0 ? 35 : prefs.shakeIntensity });
            sfx("click");
          }}
        >
          <PixelIcon name={enabled ? "soundOn" : "soundOff"} size={14} /> {enabled ? "إيقاف الاهتزاز" : "تشغيل الاهتزاز"}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => set({ shakeEnabled: false, shakeIntensity: 0 })}>
          OFF كامل (0%)
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-bold">شدة الاهتزاز</span>
          <span className="tnum font-pixel-en text-[11px] text-accent-text">
            {prefs.shakeIntensity}% · {amp.toFixed(1)}px
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={prefs.shakeIntensity}
          onChange={(e) => {
            const v = Number(e.target.value);
            set({ shakeIntensity: v, shakeEnabled: v > 0 ? true : false });
          }}
          className="audio-range"
          aria-label="شدة الاهتزاز"
        />
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={prefs.shakeIntensity === p.value && (p.value === 0 ? !enabled : true)}
              className="av-choice flex-col !items-start !gap-0 px-2 py-1.5 text-start"
              onClick={() => {
                set({ shakeIntensity: p.value, shakeEnabled: p.value > 0 });
                sfx("click");
              }}
            >
              <span className="text-[11px] font-extrabold">{p.label}</span>
              <span className="text-[9px] font-normal text-muted">{p.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted">
        الافتراضي 35%. عند تفعيل «تقليل الحركة» في نظام التشغيل يتم إيقاف التأثير تلقائياً وتطبيق إعدادات أخرى أكثر
        هدوءاً.
      </p>
    </div>
  );
}
