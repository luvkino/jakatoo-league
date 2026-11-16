"use client";

import { useState } from "react";
import { PixelIcon } from "@/components/PixelArt";
import { useChaos } from "@/components/ChaosEngine";
import { usePlayerPrefs } from "./PlayerPrefsProvider";
import { shakeAmplitude, shakeDuration } from "@/lib/prefs";
import { previewShake } from "./ScreenShake";

const PRESETS: { value: number; label: string; hint: string }[] = [
  { value: 10, label: "١٠٪ خفيف جداً", hint: "أقل من نصف بكسل — بالكاد يُلاحظ" },
  { value: 15, label: "١٥٪ (الافتراضي)", hint: "لمسة أركيد هادئة أثناء اللعب" },
  { value: 35, label: "٣٥٪ متوسط", hint: "إحساس قريب من Balatro" },
  { value: 100, label: "١٠٠٪ أقصى", hint: "أقوى حركة ممكنة — لا تزال مسيطراً عليها" },
];

export function ShakeSettings() {
  const { prefs, set, reducedMotion } = usePlayerPrefs();
  const { sfx } = useChaos();
  const [previewing, setPreviewing] = useState(false);
  const enabled = prefs.shakeEnabled && prefs.shakeIntensity > 0;
  const amp = enabled && !reducedMotion ? shakeAmplitude(prefs.shakeIntensity) : 0;

  const runPreview = () => {
    setPreviewing(true);
    previewShake(shakeAmplitude(prefs.shakeIntensity), 2200);
    sfx("click");
    window.setTimeout(() => setPreviewing(false), 2300);
  };

  return (
    <div className="stack !gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-prose text-sm text-muted">
          اهتزاز أركيد اختياري أثناء اللعب. محرك جديد يعتمد موجة واحدة سلسة بدل حركتين متصادمتين، وبمقادير
          أصغر بكثير من السابق. لا يغيّر التخطيط ولا يمنع النقر أو الكتابة.
        </p>
        <span className={`chip ${enabled ? "chip-good" : ""}`}>
          {reducedMotion ? "معطّل تلقائياً (تقليل الحركة في النظام)" : enabled ? `مفعّل ${prefs.shakeIntensity}%` : "متوقف"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`btn btn-sm ${enabled ? "btn-primary" : ""}`}
          onClick={() => {
            const next = !enabled;
            set({ shakeEnabled: next, shakeIntensity: next && prefs.shakeIntensity === 0 ? 15 : prefs.shakeIntensity });
            sfx("click");
          }}
        >
          <PixelIcon name={enabled ? "soundOn" : "soundOff"} size={14} /> {enabled ? "إيقاف الاهتزاز" : "تشغيل الاهتزاز"}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            set({ shakeEnabled: false, shakeIntensity: 0 });
            sfx("click");
          }}
        >
          إيقاف كامل (٠٪)
        </button>
        <button
          type="button"
          className={`btn btn-sm ${previewing ? "btn-primary" : ""}`}
          onClick={runPreview}
          disabled={reducedMotion}
          title={reducedMotion ? "تقليل الحركة مفعّل في نظام التشغيل" : "اختبار الشدة لمدة ثانيتين"}
        >
          <PixelIcon name="bolt" size={14} /> {previewing ? "جارٍ الاختبار…" : "معاينة مباشرة (٢ ث)"}
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor="shake-slider" className="text-sm font-bold">
            شدة الاهتزاز
          </label>
          <span className="tnum font-pixel-en text-[11px] text-accent-text">
            {prefs.shakeIntensity}% · {amp.toFixed(2)}px · {shakeDuration(prefs.shakeIntensity)}s
          </span>
        </div>
        <input
          id="shake-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={prefs.shakeIntensity}
          onChange={(e) => {
            const v = Number(e.target.value);
            set({ shakeIntensity: v, shakeEnabled: v > 0 });
          }}
          onPointerUp={() => {
            if (prefs.shakeIntensity > 0 && !reducedMotion) previewShake(shakeAmplitude(prefs.shakeIntensity), 1200);
          }}
          className="audio-range"
          aria-valuetext={`${prefs.shakeIntensity} بالمئة`}
        />
        <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={prefs.shakeIntensity === p.value && enabled}
              className="av-choice flex-col !items-start !gap-0 px-2 py-1.5 text-start"
              onClick={() => {
                set({ shakeIntensity: p.value, shakeEnabled: true });
                previewShake(shakeAmplitude(p.value), 1800);
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
        عند ٠٪ لا توجد أي حركة على الإطلاق. الافتراضي ١٥٪ وفعّال فقط بعد تشغيل المفتاح. يُحترم «تقليل الحركة» في
        نظام التشغيل دائماً، وتُحفظ التفضيلات في حسابك.
      </p>
    </div>
  );
}
