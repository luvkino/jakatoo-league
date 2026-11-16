"use client";

import { useChaos } from "@/components/ChaosEngine";
import { PixelIcon, type PixelIconName } from "@/components/PixelArt";
import { useAppearance, type AnimIntensity, type Appearance } from "@/components/Settings";
import { PageTitle, SectionTitle } from "@/components/ui";
import { unlockAudio } from "@/lib/sound";
import { AvatarEditor } from "@/components/avatar/AvatarEditor";
import { AudioSettings } from "@/components/prefs/AudioSettings";
import { ShakeSettings } from "@/components/prefs/ShakeSettings";
import { WorldThemePicker } from "@/components/themes/WorldThemePicker";
import { BackgroundSettings } from "@/components/themes/BackgroundSettings";
import { CasinoSettingsSection } from "@/components/casino/CasinoSettingsSection";
import { useCasinoAccess } from "@/components/casino/CasinoAccessProvider";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";

const THEMES: [Appearance["theme"], string][] = [
  ["dark", "داكن أركيد"],
  ["light", "كلاسيك فاتح"],
  ["amoled", "أسود AMOLED"],
  ["midnight", "نيون ليلي"],
];
const ACCENTS: [Appearance["accent"], string, string][] = [
  ["theme", "لون الثيم", "#a855f7"],
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

function MatchAnimationsSetting() {
  const { prefs, set } = usePlayerPrefs();
  const { a, set: setAppearance } = useAppearance();
  const animOn = prefs.matchAnimations;
  return (
    <div className="stack !gap-3">
      <p className="text-sm text-muted">
        عند حفظ نتيجة مباراة جديدة تظهر شاشة أركيد «MATCH COMPLETE» تعرض النتيجة الرسمية، ثم تحرّك الترتيب من
        المراكز السابقة إلى المراكز الجديدة مع إبراز الصاعدين والمتراجعين ورسائل عربية للمركز الأخير.
      </p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="حركات نتيجة المباراة">
        <button
          type="button"
          role="radio"
          aria-checked={animOn}
          className={`btn ${animOn ? "btn-primary" : ""}`}
          onClick={() => set({ matchAnimations: true })}
        >
          <PixelIcon name="sparkle" size={16} /> تشغيل الحركة
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!animOn}
          className={`btn ${!animOn ? "btn-primary" : ""}`}
          onClick={() => set({ matchAnimations: false })}
        >
          إيقاف الحركة
        </button>
      </div>
      {a.animIntensity === "off" && (
        <p className="text-[11px] text-bad">
          ملاحظة: «شدة الحركات» مضبوطة على إيقاف، لذا لن تظهر الحركة حتى لو كانت مفعّلة هنا.
        </p>
      )}
      <button
        type="button"
        className="btn btn-sm self-start"
        onClick={() => {
          setAppearance({ animIntensity: "normal", anim: true });
          set({ matchAnimations: true });
        }}
      >
        <PixelIcon name="bolt" size={14} /> تفعيل كل الحركات (هذا الخيار + شدة الحركات)
      </button>
      <p className="text-[11px] text-muted">
        يُحترم إعداد «تقليل الحركة» في نظام التشغيل تلقائياً، ويمكن تخطي أي مشهد بزر «تخطي الحركة». لا تُعدَّل النقاط
        أو الترتيب أبداً لأجل الرسوم.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const { a, set, reset } = useAppearance();
  const { set: setPrefs } = usePlayerPrefs();
  const { triggerEvent, triggerExplosion, triggerCelebration, nextTrash, sfx } = useChaos();
  const { authorized } = useCasinoAccess();

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
    // The new Audio section owns the volume sliders; this switch stays the
    // quick 8-bit SFX on/off control and is mirrored there.
    set({ sound: val });
    setPrefs({ sfxEnabled: val });
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

      {/* 1 — Appearance & Themes */}
      <section className="card stack">
        <SectionTitle pixelIcon="palette" extra={<span className="chip chip-accent !text-[10px]">7 عوالم + الكلاسيكي</span>}>
          ١ · المظهر والثيمات (Multiverse)
        </SectionTitle>
        <p className="text-xs sm:text-sm text-muted">
          جميع الثيمات مجانية ومتاحة من البداية — بلا إنجازات أو أقفال أو متجر. اختر عالماً، شاهده في المعاينة، ثم
          اضغط «تطبيق الثيم» ليُحفظ في حسابك.
        </p>
        <WorldThemePicker />
        <div className="border-t-2 border-line pt-3">
          <SectionTitle pixelIcon="sparkle">حركة الخلفية العامة</SectionTitle>
          <BackgroundSettings />
        </div>
      </section>

      {/* 2 — Music & sound effects */}
      <section className="card stack">
        <SectionTitle pixelIcon="soundOn">٢ · الموسيقى والمؤثرات الصوتية</SectionTitle>
        <AudioSettings />
      </section>

      {/* 3 — Screen shake & visual effects */}
      <section className="card stack">
        <SectionTitle pixelIcon="bolt" extra={<span className="chip !text-[10px]">افتراضي: متوقف</span>}>
          ٣ · اهتزاز الشاشة والتأثيرات البصرية
        </SectionTitle>
        <ShakeSettings />
        <div className="border-t-2 border-line pt-3">
          <MatchAnimationsSetting />
        </div>
      </section>

      {/* 4 — Avatar */}
      <section className="card stack">
        <SectionTitle pixelIcon="players">٤ · تخصيص الأفاتار (Pixel Art)</SectionTitle>
        <p className="text-xs sm:text-sm text-muted">
          مصمّم بسيط: بشرة، شعر، لون شعر، عيون، زي، وإكسسوار — كل الخيارات مجانية وفورية. يظهر الأفاتار بجانب اسمك في
          الترتيب والملف الشخصي وسجل المباريات.
        </p>
        <AvatarEditor />
      </section>

      {/* 5 — Blackjack */}
      {authorized && (
        <section className="card stack">
          <SectionTitle pixelIcon="cards" extra={<span className="chip chip-accent !text-[10px]">كازينو مستقل</span>}>
            ٥ · إعدادات البلاك جاك
          </SectionTitle>
          <CasinoSettingsSection />
        </section>
      )}

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

      {/* Existing Appearance Settings Preserved (colours / density / radius) */}
      <section className="stack">
        <SectionTitle pixelIcon="palette">مظهر واجهة البكسل</SectionTitle>

        <Group title="اللوحة الأساسية للواجهة" icon="sparkle">
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

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-danger self-start" onClick={reset}>
          ↩️ استعادة الإعدادات الافتراضية
        </button>
        <button
          type="button"
          className="btn self-start"
          onClick={() => {
            setPrefs({ theme: "classic", shakeEnabled: true, shakeIntensity: 35, matchAnimations: true });
          }}
        >
          🎮 استعادة ثيم وإعدادات الحركة الافتراضية
        </button>
      </div>
    </div>
  );
}
