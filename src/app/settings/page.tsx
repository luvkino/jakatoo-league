"use client";

import { useAppearance, type Appearance } from "@/components/Settings";
import { PageTitle } from "@/components/ui";

const THEMES: [Appearance["theme"], string][] = [["dark", "داكن"], ["light", "فاتح"], ["amoled", "أسود AMOLED"], ["midnight", "أزرق ليلي"]];
const ACCENTS: [Appearance["accent"], string, string][] = [
  ["gold", "ذهبي", "#f5b73b"], ["emerald", "أخضر", "#22c55e"], ["sky", "سماوي", "#38bdf8"],
  ["rose", "وردي", "#fb7185"], ["violet", "بنفسجي", "#a78bfa"], ["orange", "برتقالي", "#fb923c"],
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="mb-2 font-extrabold">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
function Opt({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="radio" aria-checked={on} onClick={onClick} className={`btn ${on ? "btn-primary" : ""}`}>
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const { a, set, reset } = useAppearance();
  return (
    <div className="stack">
      <PageTitle sub="تُحفظ تفضيلات المظهر تلقائياً على هذا الجهاز.">🎨 المظهر</PageTitle>
      <Group title="السمة">
        {THEMES.map(([v, l]) => <Opt key={v} on={a.theme === v} onClick={() => set({ theme: v })}>{l}</Opt>)}
      </Group>
      <Group title="لون التمييز">
        {ACCENTS.map(([v, l, c]) => (
          <Opt key={v} on={a.accent === v} onClick={() => set({ accent: v })}>
            <span className="inline-block h-4 w-4 rounded-full" style={{ background: c }} /> {l}
          </Opt>
        ))}
      </Group>
      <Group title="كثافة الواجهة">
        <Opt on={a.density === "comfortable"} onClick={() => set({ density: "comfortable" })}>مريحة</Opt>
        <Opt on={a.density === "compact"} onClick={() => set({ density: "compact" })}>مدمجة</Opt>
      </Group>
      <Group title="شكل جدول الترتيب">
        <Opt on={a.leaderboard === "table"} onClick={() => set({ leaderboard: "table" })}>جدول</Opt>
        <Opt on={a.leaderboard === "cards"} onClick={() => set({ leaderboard: "cards" })}>بطاقات</Opt>
      </Group>
      <Group title="شكل البطاقات">
        <Opt on={a.radius === "rounded"} onClick={() => set({ radius: "rounded" })}>زوايا مستديرة</Opt>
        <Opt on={a.radius === "sharp"} onClick={() => set({ radius: "sharp" })}>زوايا حادة</Opt>
      </Group>
      <Group title="تخطيط الرئيسية">
        <Opt on={a.dashboard === "tabs"} onClick={() => set({ dashboard: "tabs" })}>إحصائيات في تبويبات</Opt>
        <Opt on={a.dashboard === "stacked"} onClick={() => set({ dashboard: "stacked" })}>كل الإحصائيات ظاهرة</Opt>
      </Group>
      <Group title="الحركات">
        <Opt on={a.anim} onClick={() => set({ anim: true })}>تشغيل</Opt>
        <Opt on={!a.anim} onClick={() => set({ anim: false })}>إيقاف</Opt>
      </Group>
      <button className="btn btn-danger self-start" onClick={reset}>↩️ استعادة الإعدادات الافتراضية</button>
    </div>
  );
}
