"use client";

import { PixelIcon } from "@/components/PixelArt";
import { useChaos } from "@/components/ChaosEngine";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";
import { BG_INTENSITIES, BG_INTENSITY_LABEL_AR, type BgIntensity } from "@/lib/prefs";

const INTENSITY_HINT: Record<BgIntensity, string> = {
  0: "الفن الثابت فقط — صفر حركة في الخلفية",
  1: "حركة قليلة جداً وأقل عدد جزيئات (الأخف على البطارية)",
  2: "التوازن الموصى به: كل التأثيرات بسرعة مريحة",
  3: "كل شيء بأقصى حيوية — جزيئات أكثر وسرعات أعلى",
};

export function BackgroundSettings() {
  const { prefs, set, reducedMotion } = usePlayerPrefs();
  const { sfx } = useChaos();
  const on = prefs.bgAnimations && prefs.bgIntensity > 0;

  return (
    <div className="stack !gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-prose text-sm text-muted">
          كل عالم يحوّل الصفحة كاملة إلى بيئة حيّة: سماء وأرضية وخطوط أفق وحركات وجزيئات بيئية تعمل{" "}
          <b className="text-fg">خلف</b> المحتوى، لا داخل صندوق صغير. هذا المفتاح يتحكم بها جميعاً.
        </p>
        <span className={`chip ${on ? "chip-good" : ""}`}>
          {reducedMotion ? "معطّلة تلقائياً (تقليل الحركة)" : on ? `مفعّلة · ${BG_INTENSITY_LABEL_AR[prefs.bgIntensity]}` : "متوقفة"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          className={`btn btn-sm ${on ? "btn-primary" : ""}`}
          onClick={() => {
            const next = !on;
            set({ bgAnimations: next, bgIntensity: next && prefs.bgIntensity === 0 ? 2 : prefs.bgIntensity });
            sfx("click");
          }}
        >
          <PixelIcon name={on ? "sparkle" : "soundOff"} size={14} /> {on ? "إيقاف حركة الخلفية" : "تشغيل حركة الخلفية"}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            set({ bgAnimations: true, bgIntensity: 2 });
            sfx("click");
          }}
        >
          إعادة للوضع الموصى به
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor="bg-intensity" className="text-sm font-bold">
            كثافة حركة الخلفية
          </label>
          <span className="tnum font-pixel-en text-[11px] text-accent-text">{prefs.bgIntensity}/3</span>
        </div>
        <input
          id="bg-intensity"
          type="range"
          min={0}
          max={3}
          step={1}
          value={prefs.bgIntensity}
          onChange={(e) => {
            const v = Number(e.target.value) as BgIntensity;
            set({ bgIntensity: v, bgAnimations: v > 0 });
          }}
          className="audio-range"
          aria-valuetext={BG_INTENSITY_LABEL_AR[prefs.bgIntensity]}
        />
        <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {BG_INTENSITIES.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={prefs.bgIntensity === v}
              className="av-choice flex-col !items-start !gap-0 px-2 py-1.5 text-start"
              onClick={() => {
                set({ bgIntensity: v, bgAnimations: v > 0 });
                sfx("click");
              }}
            >
              <span className="text-[11px] font-extrabold">{BG_INTENSITY_LABEL_AR[v]}</span>
              <span className="text-[9px] font-normal text-muted">{INTENSITY_HINT[v]}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted">
        الحركة تُنفَّذ بـ CSS فقط (transform/opacity) على طبقة واحدة ثابتة، وتتوقف تلقائياً عند إخفاء التبويب أو
        تفعيل «تقليل الحركة» في النظام. الإعداد يُحفظ في حساب اللاعب.
      </p>
    </div>
  );
}
