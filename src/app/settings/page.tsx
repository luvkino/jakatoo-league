"use client";

import { useChaos } from "@/components/ChaosEngine";
import { PixelIcon, type PixelIconName } from "@/components/PixelArt";
import { useAppearance, type AnimIntensity, type Appearance } from "@/components/Settings";
import { PageTitle, SectionTitle } from "@/components/ui";
import { unlockAudio } from "@/lib/sound";

const THEMES: [Appearance["theme"], string][] = [
  ["dark", "داكن أركيد"],
  ["light", "كلاسيك فاتح"],
  ["amoled", "أسود AMOLED"],
  ["midnight", "نيون ليلي"],
];
const ACCENTS: [Appearance["accent"], string, string][] = [
  ["gold", "ذهبي", "#fbbf24"],
  ["emerald", "أخضر", "#22c55e"],
  ["sky", "سماوي", "#38bdf8"],
  ["rose", "وردي", "#fb7185"],
  ["violet", "بنفسجي", "#a78bfa"],
  ["orange", "برتقالي", "#fb923c"],
];
const INTENSITIES: [AnimIntensity, string, string][] = [
  ["off", "إيقاف", "إلغاء جميع الحركات والاهتزازات"],
  ["low", "خفيف", "حركات بسيطة دون اهتزاز أو ومضات"],
  ["normal", "عادي", "التوازن المثالي لتجربة البكسل"],
  ["extreme", "فائق", "أقصى طاقة أركيد وتأثيرات مبالغ فيها"],
];

function Group({
  title,
  desc,
  icon,
  children,
}: {
  title: string;
  desc?: string;
  icon?: PixelIconName;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h2 className="mb-1 flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
        {icon && <PixelIcon name={icon} size={18} />}
        <span>{title}</span>
      </h2>
      {desc && <p className="mb-3 text-xs sm:text-sm text-muted">{desc}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Opt({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className={`btn ${on ? "btn-primary" : ""}`}>
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const { a, set, reset } = useAppearance();
  const { triggerEvent, triggerExplosion, triggerCelebration, nextTrash, sfx } = useChaos();

  function toggleChaos(val: boolean) {
    unlockAudio();
    set({ chaosMode: val });
    if (val) {
      triggerExplosion(undefined, undefined, 40, "rainbow");
      if (a.sound) sfx("epic");
    }
  }

  function toggleSound(val: boolean) {
    unlockAudio();
    set({ sound: val });
    if (val) {
      // Unlock immediately on this user gesture and play confirmation chime
      setTimeout(() => sfx("achievement"), 20);
    }
  }

  return (
    <div className="stack">
      <PageTitle
        pixelIcon="palette"
        sub="تُحفظ تفضيلات المظهر، وضع الفوضى، التعليقات، والمؤثرات الصوتية تلقائياً على هذا الجهاز ولا تؤثر على أي نتائج أو إحصائيات."
      >
        المظهر والإعدادات
      </PageTitle>

      {/* Part 3, 6, 8, 9: Chaos Mode, Trash Talk, Sound Effects, Animation Intensity */}
      <section className="stack">
        <SectionTitle pixelIcon="chaos">وضع الفوضى والتأثيرات التفاعلية</SectionTitle>

        <div className="grid gap-3 md:grid-cols-2">
          <div className={`card ${a.chaosMode ? "rarity-legendary" : ""}`}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
                <PixelIcon name="chaos" size={20} />
                <span>وضع الفوضى (Chaos Mode)</span>
              </h2>
              <span className={`chip ${a.chaosMode ? "chip-legendary" : ""}`}>
                {a.chaosMode ? "مفعّل" : "معطل افتراضياً"}
              </span>
            </div>
            <p className="mb-3 text-xs sm:text-sm text-muted">
              انفجارات بكسل عشوائية، اهتزاز الشاشة في الأحداث الكبرى، ومضات أركيد، انتقالات درامية، وأحداث نادرة مفاجئة.
              تأثيرات بصرية فقط ولا تغيّر النقاط أو الترتيب أبداً.
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="وضع الفوضى">
              <Opt on={!a.chaosMode} onClick={() => toggleChaos(false)}>
                إيقاف (هادئ)
              </Opt>
              <Opt on={a.chaosMode} onClick={() => toggleChaos(true)}>
                <PixelIcon name="fire" size={16} /> تشغيل الفوضى!
              </Opt>
            </div>
          </div>

          <div className="card">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
                <PixelIcon name="megaphone" size={20} />
                <span>تعليقات الدوري (LEAGUE TRASH TALK)</span>
              </h2>
              <span className={`chip ${a.trashTalk ? "chip-accent" : ""}`}>
                {a.trashTalk ? "مفعّل" : "معطل"}
              </span>
            </div>
            <p className="mb-3 text-xs sm:text-sm text-muted">
              رسائل ساخرة لطيفة ومرتبطة بالنتائج الحقيقية للمتصدر والفائزين والمركز الأخير في مختلف صفحات الموقع. يمكنك
              إيقافها بشكل مستقل في أي وقت.
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="تعليقات الدوري">
              <Opt on={a.trashTalk} onClick={() => set({ trashTalk: true })}>
                تشغيل التعليقات
              </Opt>
              <Opt on={!a.trashTalk} onClick={() => set({ trashTalk: false })}>
                إيقاف التعليقات
              </Opt>
            </div>
          </div>

          <div className="card">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
                <PixelIcon name={a.sound ? "soundOn" : "soundOff"} size={20} />
                <span>المؤثرات الصوتية (8-Bit Sound)</span>
              </h2>
              <span className={`chip ${a.sound ? "chip-good" : ""}`}>
                {a.sound ? "مفعّل" : "معطل افتراضياً"}
              </span>
            </div>
            <p className="mb-3 text-xs sm:text-sm text-muted">
              أصوات ريترو 8-بت للأزرار، الفوز، فتح الإنجازات، تغيير المتصدر أو المركز الأخير، والأحداث النادرة. تعمل
              فقط بعد تفعيلها وتفاعلك مع الموقع.
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="المؤثرات الصوتية">
              <Opt on={!a.sound} onClick={() => toggleSound(false)}>
                إيقاف الصوت
              </Opt>
              <Opt on={a.sound} onClick={() => toggleSound(true)}>
                <PixelIcon name="soundOn" size={16} /> تشغيل أصوات 8-Bit
              </Opt>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-1 flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
              <PixelIcon name="bolt" size={20} />
              <span>شدة الحركات (Animation Intensity)</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm text-muted">
              تحكم مستقل في سرعة وكثافة الانيميشن. يحترم النظام تلقائياً إعداد تقليل الحركة في جهازك (Reduced Motion).
            </p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="شدة الحركات">
              {INTENSITIES.map(([val, label, hint]) => (
                <button
                  key={val}
                  type="button"
                  role="radio"
                  aria-checked={a.animIntensity === val}
                  onClick={() => set({ animIntensity: val, anim: val !== "off" })}
                  className={`btn flex-col !items-start !py-2 !min-h-[54px] text-start ${
                    a.animIntensity === val ? "btn-primary" : ""
                  }`}
                >
                  <span className="text-sm font-extrabold">{label}</span>
                  <span className={`text-[10px] font-normal whitespace-normal ${a.animIntensity === val ? "opacity-90" : "text-muted"}`}>
                    {hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cosmetic Sandbox Preview */}
        <div className="card">
          <h2 className="mb-1 flex items-center gap-2 font-pixel-ar text-xl font-extrabold">
            <PixelIcon name="sparkle" size={18} />
            <span>معمل اختبار التأثيرات والأحداث النادرة</span>
          </h2>
          <p className="mb-3 text-xs text-muted">
            جرّب مستويات الندرة والأصوات والانفجارات البصرية فوراً دون التأثير على أي بيانات حقيقية في الدوري.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" onClick={() => triggerEvent("COMMON", true)}>
              عادي (Common)
            </button>
            <button type="button" className="btn btn-sm" onClick={() => triggerEvent("RARE", true)}>
              نادر (Rare)
            </button>
            <button type="button" className="btn btn-sm" onClick={() => triggerEvent("EPIC", true)}>
              ملحمي (Epic)
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => triggerEvent("LEGENDARY", true)}>
              <PixelIcon name="crown" size={14} /> أسطوري (Legendary)
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                triggerExplosion(undefined, undefined, 45, "rainbow");
                sfx("explosion");
              }}
            >
              💥 انفجار بكسل
            </button>
            <button type="button" className="btn btn-sm" onClick={() => triggerCelebration("leader", "بطل الدوري")}>
              👑 حدث تغيير المتصدر
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => triggerCelebration("last", "اختبار حركة الحصالة في القاع!")}
            >
              🐷 حدث المركز الأخير
            </button>
            {a.trashTalk && (
              <button type="button" className="btn btn-sm" onClick={nextTrash}>
                🎙️ تعليق جديد
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Existing Appearance Settings Preserved */}
      <section className="stack">
        <SectionTitle pixelIcon="palette">مظهر واجهة البكسل</SectionTitle>

        <Group title="السمة" icon="sparkle">
          {THEMES.map(([v, l]) => (
            <Opt key={v} on={a.theme === v} onClick={() => set({ theme: v })}>
              {l}
            </Opt>
          ))}
        </Group>

        <Group title="لون التمييز" icon="coin">
          {ACCENTS.map(([v, l, c]) => (
            <Opt key={v} on={a.accent === v} onClick={() => set({ accent: v })}>
              <span className="inline-block h-4 w-4 border border-black/40" style={{ background: c }} /> {l}
            </Opt>
          ))}
        </Group>

        <Group title="كثافة الواجهة">
          <Opt on={a.density === "comfortable"} onClick={() => set({ density: "comfortable" })}>
            مريحة
          </Opt>
          <Opt on={a.density === "compact"} onClick={() => set({ density: "compact" })}>
            مدمجة
          </Opt>
        </Group>

        <Group title="شكل جدول الترتيب">
          <Opt on={a.leaderboard === "table"} onClick={() => set({ leaderboard: "table" })}>
            جدول
          </Opt>
          <Opt on={a.leaderboard === "cards"} onClick={() => set({ leaderboard: "cards" })}>
            بطاقات RPG
          </Opt>
        </Group>

        <Group title="شكل زوايا البكسل">
          <Opt on={a.radius === "sharp"} onClick={() => set({ radius: "sharp" })}>
            حواف 8-بت حادة
          </Opt>
          <Opt on={a.radius === "rounded"} onClick={() => set({ radius: "rounded" })}>
            حواف 16-بت مشطوفة
          </Opt>
        </Group>

        <Group title="تخطيط الرئيسية">
          <Opt on={a.dashboard === "tabs"} onClick={() => set({ dashboard: "tabs" })}>
            إحصائيات في تبويبات
          </Opt>
          <Opt on={a.dashboard === "stacked"} onClick={() => set({ dashboard: "stacked" })}>
            كل الإحصائيات ظاهرة
          </Opt>
        </Group>

        <Group title="الحركات (تشغيل / إيقاف سريع)">
          <Opt on={a.anim} onClick={() => set({ anim: true, animIntensity: a.animIntensity === "off" ? "normal" : a.animIntensity })}>
            تشغيل
          </Opt>
          <Opt on={!a.anim} onClick={() => set({ anim: false, animIntensity: "off" })}>
            إيقاف
          </Opt>
        </Group>
      </section>

      <button type="button" className="btn btn-danger self-start" onClick={reset}>
        ↩️ استعادة الإعدادات الافتراضية
      </button>
    </div>
  );
}
