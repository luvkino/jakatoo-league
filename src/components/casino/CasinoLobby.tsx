"use client";

/**
 * CASINO LOBBY — table selection, balance, statistics and settings entry point.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { PixelIcon } from "@/components/PixelArt";
import { Chip } from "./CasinoArt";
import { useCasinoStore } from "./useCasino";
import { TABLES, TABLE_MAP, CLASSIC_RULES, normalizeRules, describeRules } from "@/lib/casino/tables";
import { computeCasinoStats, OUTCOME_LABEL_AR } from "@/lib/casino/stats";
import { readCasino, patchCasino, topUpChips, defaultCasinoState, resetPracticeChips } from "@/lib/casino/store";
import { clearCasinoHistory } from "@/lib/casino/store";
import { playCasinoSfx } from "@/lib/casino/sound";
import { SIDE_BET_LABEL_AR } from "@/lib/casino/sideBets";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";

type Tab = "tables" | "stats" | "rules" | "settings";

export function CasinoLobby() {
  const store = useCasinoStore();
  const { prefs, set: setPrefs } = usePlayerPrefs();
  const [tab, setTab] = useState<Tab>("tables");
  const stats = useMemo(() => computeCasinoStats(store.history), [store.history]);
  const active = TABLE_MAP[store.tableId];

  const selectTable = (id: typeof TABLES[number]["id"]) => {
    // Saved in the player preferences so it follows the player everywhere.
    setPrefs({ casinoTable: id });
    patchCasino({ tableId: id });
    playCasinoSfx("button");
  };

  return (
    <div className="stack !gap-3">
      {/* Balance strip */}
      <div className="cas-panel flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          <Chip value={500} size={38} />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#b9a486]">رصيد الشيبس (افتراضي)</div>
            <div className="tnum font-pixel-en text-xl font-extrabold text-[#f0d79a]" dir="ltr">
              {(store.practice ? store.practiceChips : store.chips).toLocaleString("en-US")}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`cas-btn cas-btn-sm ${store.practice ? "cas-btn-felt" : ""}`}
            onClick={() => {
              patchCasino({ practice: !store.practice });
              playCasinoSfx("button");
            }}
            title="وضع التدريب لا يستخدم شيبسك الحقيقية"
          >
            <PixelIcon name="target" size={12} /> {store.practice ? "إيقاف وضع التدريب" : "وضع التدريب"}
          </button>
          <Link href="/casino/play" className="cas-btn cas-btn-gold cas-btn-sm" onClick={() => playCasinoSfx("button")}>
            <PixelIcon name="cards" size={12} /> العب على {active?.name ?? "الطاولة"}
          </Link>
          <Link href="/" className="cas-btn cas-btn-sm" onClick={() => playCasinoSfx("button")}>
            <PixelIcon name="home" size={12} /> العودة للدوري
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="أقسام الكازينو">
        {(
          [
            ["tables", "الطاولات"],
            ["stats", "الإحصائيات"],
            ["rules", "الاستراتيجية"],
            ["settings", "الإعدادات"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`cas-btn cas-btn-sm ${tab === id ? "cas-btn-gold" : ""}`}
            onClick={() => {
              setTab(id);
              playCasinoSfx("button");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tables" && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TABLES.map((t) => {
              const r = t.id === "custom" ? normalizeRules(store.customRules, CLASSIC_RULES) : t.rules;
              const isActive = store.tableId === t.id;
              return (
                <div
                  key={t.id}
                  className="cas-lobby-card"
                  aria-current={isActive}
                  onClick={() => selectTable(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") selectTable(t.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-[#f0d79a]">{t.name}</div>
                      <div className="font-pixel-en text-[9px] tracking-widest text-[#b9a486]">{t.nameEn}</div>
                    </div>
                    <span
                      className="grid h-8 w-8 place-items-center border-2"
                      style={{ borderColor: t.accent, color: t.accent }}
                    >
                      <PixelIcon name="cards" size={16} />
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-[#d9c9a8]">{t.tagline}</p>
                  <ul className="space-y-0.5 text-[10px] text-[#b9a486]">
                    <li>
                      {r.decks}D · {r.dealerHitsSoft17 ? "H17" : "S17"} · {r.blackjackPayout === 1.5 ? "3:2" : "6:5"} ·{" "}
                      {r.holeCard ? (r.dealerPeek ? "Peek" : "Hole") : "ENHC"}
                    </li>
                    <li>
                      حدود {r.minBet.toLocaleString("en-US")}–{r.maxBet.toLocaleString("en-US")} · DAS {r.das ? "✓" : "✗"} ·
                      استسلام {r.surrender === "none" ? "✗" : r.surrender === "early" ? "مبكر" : "متأخر"}
                    </li>
                    <li>مراهنات جانبية: {r.sideBets.length ? r.sideBets.map((s) => SIDE_BET_LABEL_AR[s]).join("، ") : "لا يوجد"}</li>
                  </ul>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#b9a486]">{isActive ? "الطاولة الحالية" : "اضغط للاختيار"}</span>
                    <Link
                      href="/casino/play"
                      className="cas-btn cas-btn-gold cas-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectTable(t.id);
                      }}
                    >
                      دخول
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="cas-panel p-3">
            <h3 className="mb-1 text-sm">آخر الجولات</h3>
            {store.history.length === 0 ? (
              <p className="text-[11px] text-[#b9a486]">لا توجد جولات بعد — اختر طاولة وابدأ اللعب.</p>
            ) : (
              <ul className="space-y-1 text-[11px]">
                {store.history.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#4a351f]/60 pb-1">
                    <span className="text-[#b9a486]">{new Date(r.at).toLocaleString("ar-EG-u-nu-latn")}</span>
                    <span>{TABLE_MAP[r.tableId]?.name ?? r.tableId}</span>
                    <span>{r.primaryOutcome ? OUTCOME_LABEL_AR[r.primaryOutcome] : "—"}</span>
                    <b dir="ltr" className={r.net > 0 ? "text-[#7ef0b0]" : r.net < 0 ? "text-[#ff9aa5]" : "text-[#b9a486]"}>
                      {r.net > 0 ? "+" : ""}
                      {r.net}
                    </b>
                  </li>
                ))}
              </ul>
            )}
            {store.history.length > 0 && (
              <div className="mt-2">
                <Link href="/casino/history" className="cas-btn cas-btn-sm">
                  السجل الكامل
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "stats" && <StatsPanel stats={stats} />}

      {tab === "rules" && (
        <div className="cas-panel p-3">
          <h3 className="mb-1 text-sm">قواعد الطاولة الحالية</h3>
          <p className="mb-2 text-[11px] text-[#b9a486]">
            {active?.name} — كل سطر أدناه قاعدة حقيقية يطبّقها المحرك، وليست واجهة تجميلية.
          </p>
          <dl className="grid gap-1 text-[11px] sm:grid-cols-2">
            {describeRules(store.tableId === "custom" ? normalizeRules(store.customRules, CLASSIC_RULES) : active!.rules).map(
              (row) => (
                <div key={row.label} className="flex justify-between gap-2 border-b border-[#4a351f]/60 py-0.5">
                  <dt className="text-[#b9a486]">{row.label}</dt>
                  <dd className="text-end">{row.value}</dd>
                </div>
              ),
            )}
          </dl>
          <Link href="/casino/strategy" className="cas-btn cas-btn-sm mt-2">
            جدول الاستراتيجية الأساسية الكامل
          </Link>
        </div>
      )}

      {tab === "settings" && (
        <SettingsPanel
          store={store}
          onTopUp={() => {
            topUpChips(1000);
            playCasinoSfx("chipCollect");
          }}
          onResetPractice={() => {
            resetPracticeChips();
            playCasinoSfx("shuffle");
          }}
          onClearHistory={() => {
            clearCasinoHistory();
            playCasinoSfx("button");
          }}
          onResetAll={() => {
            const fresh = defaultCasinoState();
            patchCasino({ ...fresh, settings: store.settings });
            playCasinoSfx("shuffle");
          }}
        />
      )}
    </div>
  );
}

export function StatsPanel({ stats }: { stats: ReturnType<typeof computeCasinoStats> }) {
  const grid: { label: string; value: string; tone?: "good" | "bad" }[] = [
    { label: "إجمالي الجولات", value: String(stats.rounds) },
    { label: "نسبة الفوز", value: `${stats.winRate}%` },
    { label: "عدد البلاك جاك", value: String(stats.blackjacks) },
    { label: "معدل البلاك جاك", value: `${stats.blackjackRate}%` },
    { label: "متوسط الرهان", value: stats.averageBet.toLocaleString("en-US") },
    { label: "أكبر ربح", value: `+${stats.largestWin.toLocaleString("en-US")}`, tone: "good" },
    { label: "أكبر خسارة", value: stats.largestLoss.toLocaleString("en-US"), tone: "bad" },
    { label: "أطول سلسلة فوز", value: String(stats.longestWinStreak) },
    { label: "أطول سلسلة خسارة", value: String(stats.longestLossStreak) },
    { label: "السلسلة الحالية", value: String(stats.currentStreak) },
    {
      label: "صافي الجلسة",
      value: `${stats.sessionNet > 0 ? "+" : ""}${stats.sessionNet.toLocaleString("en-US")}`,
      tone: stats.sessionNet >= 0 ? "good" : "bad",
    },
    { label: "إجمالي المخاطرة", value: stats.grossStaked.toLocaleString("en-US") },
  ];

  return (
    <div className="stack !gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {grid.map((s) => (
          <div key={s.label} className="cas-stat">
            <b dir="ltr" className={s.tone === "good" ? "!text-[#7ef0b0]" : s.tone === "bad" ? "!text-[#ff9aa5]" : ""}>
              {s.value}
            </b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {stats.byTable.length > 0 && (
        <div className="cas-panel p-3">
          <h3 className="mb-1 text-sm">حسب نوع الطاولة</h3>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[#b9a486]">
                <th className="p-1 text-start">الطاولة</th>
                <th className="p-1">جولات</th>
                <th className="p-1">نسبة الفوز</th>
                <th className="p-1">صافي</th>
              </tr>
            </thead>
            <tbody>
              {stats.byTable.map((t) => (
                <tr key={t.tableId} className="border-t border-[#4a351f]/60">
                  <td className="p-1 text-start">{t.name}</td>
                  <td className="p-1 text-center font-pixel-en">{t.rounds}</td>
                  <td className="p-1 text-center font-pixel-en">{t.winRate}%</td>
                  <td className={`p-1 text-center font-pixel-en ${t.net >= 0 ? "text-[#7ef0b0]" : "text-[#ff9aa5]"}`} dir="ltr">
                    {t.net > 0 ? "+" : ""}
                    {t.net}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.sideBets.length > 0 && (
        <div className="cas-panel p-3">
          <h3 className="mb-1 text-sm">المراهنات الجانبية</h3>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[#b9a486]">
                <th className="p-1 text-start">الرهان</th>
                <th className="p-1">مرات</th>
                <th className="p-1">إصابات</th>
                <th className="p-1">صافي</th>
              </tr>
            </thead>
            <tbody>
              {stats.sideBets.map((s) => (
                <tr key={s.id} className="border-t border-[#4a351f]/60">
                  <td className="p-1 text-start">{s.name}</td>
                  <td className="p-1 text-center font-pixel-en">{s.wagers}</td>
                  <td className="p-1 text-center font-pixel-en">{s.hits}</td>
                  <td className={`p-1 text-center font-pixel-en ${s.net >= 0 ? "text-[#7ef0b0]" : "text-[#ff9aa5]"}`} dir="ltr">
                    {s.net > 0 ? "+" : ""}
                    {s.net}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.rounds === 0 && <p className="text-[11px] text-[#b9a486]">لا توجد بيانات بعد — تُحسب الإحصاءات من سجل الجولات الفعلي فقط.</p>}
    </div>
  );
}

function SettingsPanel({
  store,
  onTopUp,
  onResetPractice,
  onClearHistory,
  onResetAll,
}: {
  store: ReturnType<typeof readCasino>;
  onTopUp: () => void;
  onResetPractice: () => void;
  onClearHistory: () => void;
  onResetAll: () => void;
}) {
  const { prefs, set: setPrefs } = usePlayerPrefs();
  const custom = normalizeRules(store.customRules, CLASSIC_RULES);
  const setCustom = (patch: Partial<typeof custom>) =>
    patchCasino({ customRules: normalizeRules({ ...custom, ...patch }, CLASSIC_RULES) });

  const ruleToggle = (label: string, key: keyof typeof custom, hint?: string) => (
    <label className="flex items-center justify-between gap-2 border-b border-[#4a351f]/60 py-1 text-[11px]">
      <span>
        {label}
        {hint && <span className="ms-1 text-[10px] text-[#b9a486]">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={Boolean(custom[key])}
        onChange={(e) => setCustom({ [key]: e.target.checked } as Partial<typeof custom>)}
        className="h-4 w-4 accent-[#d9b658]"
      />
    </label>
  );

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="cas-panel p-3">
        <h3 className="mb-2 text-sm">الصوت والواجهة</h3>
        <label className="flex items-center justify-between gap-2 border-b border-[#4a351f]/60 py-1 text-[11px]">
          <span>مؤثرات صوت الكازينو</span>
          <input
            type="checkbox"
            checked={prefs.casinoSfxEnabled}
            onChange={(e) => setPrefs({ casinoSfxEnabled: e.target.checked })}
            className="h-4 w-4 accent-[#d9b658]"
          />
        </label>
        <label className="flex items-center justify-between gap-2 border-b border-[#4a351f]/60 py-1 text-[11px]">
          <span>إظهار تلميح الاستراتيجية أثناء اللعب</span>
          <input
            type="checkbox"
            checked={store.settings.showStrategyHint}
            onChange={(e) => patchCasino({ settings: { ...store.settings, showStrategyHint: e.target.checked } })}
            className="h-4 w-4 accent-[#d9b658]"
          />
        </label>
        <label className="flex items-center justify-between gap-2 border-b border-[#4a351f]/60 py-1 text-[11px]">
          <span>تأكيد قبل الرهان «الكل»</span>
          <input
            type="checkbox"
            checked={store.settings.confirmAllIn}
            onChange={(e) => patchCasino({ settings: { ...store.settings, confirmAllIn: e.target.checked } })}
            className="h-4 w-4 accent-[#d9b658]"
          />
        </label>

        <h3 className="mb-2 mt-3 text-sm">شيبس افتراضية</h3>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="cas-btn cas-btn-sm" onClick={onTopUp}>
            +1000 شيبس (افتراضي)
          </button>
          <button type="button" className="cas-btn cas-btn-sm" onClick={onResetPractice}>
            إعادة شيبس التدريب
          </button>
          <button type="button" className="cas-btn cas-btn-sm cas-btn-danger" onClick={onClearHistory}>
            مسح السجل والإحصاءات
          </button>
          <button type="button" className="cas-btn cas-btn-sm cas-btn-danger" onClick={onResetAll}>
            إعادة ضبط الكازينو
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-[#b9a486]">
          كل الشيبس افتراضية وبلا قيمة نقدية. لا توجد مدفوعات أو مشتريات، ولا تؤثر هذه الشيبس على نقاط الدوري أو
          ترتيبه أو إحصاءات اللاعبين الرسمية.
        </p>
        <p className="mt-1 text-[10px] text-[#b9a486]">
          حركة الخلفية والاهتزاز عامّان في{" "}
          <Link href="/settings" className="underline">
            إعدادات الدوري → المؤثرات
          </Link>
          .
        </p>
      </div>

      <div className="cas-panel p-3">
        <h3 className="mb-1 text-sm">الطاولة المخصّصة</h3>
        <p className="mb-2 text-[11px] text-[#b9a486]">
          تُطبّق هذه القواعد فوراً عند اختيار «طاولة مخصّصة». كل خيار يغيّر منطق اللعب فعلياً.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px]">
            <span className="text-[#b9a486]">عدد المجموعات</span>
            <select
              className="cas-input w-full"
              value={custom.decks}
              onChange={(e) => setCustom({ decks: Number(e.target.value) as typeof custom.decks })}
            >
              {[1, 2, 4, 6, 8].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px]">
            <span className="text-[#b9a486]">دفع الطبيعية</span>
            <select
              className="cas-input w-full"
              value={custom.blackjackPayout}
              onChange={(e) => setCustom({ blackjackPayout: Number(e.target.value) as 1.2 | 1.5 })}
            >
              <option value={1.5}>3:2</option>
              <option value={1.2}>6:5</option>
            </select>
          </label>
          <label className="block text-[11px]">
            <span className="text-[#b9a486]">أقصى تقسيمات</span>
            <select
              className="cas-input w-full"
              value={custom.maxSplits}
              onChange={(e) => setCustom({ maxSplits: Number(e.target.value) })}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "بدون" : n}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px]">
            <span className="text-[#b9a486]">الاستسلام</span>
            <select
              className="cas-input w-full"
              value={custom.surrender}
              onChange={(e) => setCustom({ surrender: e.target.value as typeof custom.surrender })}
            >
              <option value="none">غير متاح</option>
              <option value="early">مبكر</option>
              <option value="late">متأخر</option>
            </select>
          </label>
          <label className="block text-[11px]">
            <span className="text-[#b9a486]">حد أدنى</span>
            <input
              type="number"
              className="cas-input w-full"
              value={custom.minBet}
              min={1}
              onChange={(e) => setCustom({ minBet: Number(e.target.value) })}
            />
          </label>
          <label className="block text-[11px]">
            <span className="text-[#b9a486]">حد أقصى</span>
            <input
              type="number"
              className="cas-input w-full"
              value={custom.maxBet}
              min={custom.minBet}
              onChange={(e) => setCustom({ maxBet: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="mt-2">
          {ruleToggle("الموزّع يسحب على ١٧ الناعمة (H17)", "dealerHitsSoft17")}
          {ruleToggle("ورقة مخفية للموزّع (American)", "holeCard")}
          {ruleToggle("كشف مبكر للورقة المخفية (Peek)", "dealerPeek")}
          {ruleToggle("المضاعفة على أي ورقتين", "doubleOnAnyTwo")}
          {ruleToggle("المضاعفة بعد التقسيم (DAS)", "das")}
          {ruleToggle("إعادة تقسيم الآسات", "resplitAces")}
          {ruleToggle("آس مقسوم يلعب عادياً", "hitSplitAces")}
          {ruleToggle("٢١ بعد التقسيم يدفع كالبلاك جاك", "blackjackAfterSplit")}
          {ruleToggle("التأمين", "insurance")}
        </div>

        <div className="mt-2">
          <div className="mb-1 text-[11px] text-[#b9a486]">المراهنات الجانبية المتاحة</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SIDE_BET_LABEL_AR) as (keyof typeof SIDE_BET_LABEL_AR)[]).map((id) => (
              <label key={id} className="flex items-center gap-1 text-[11px]">
                <input
                  type="checkbox"
                  checked={custom.sideBets.includes(id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...custom.sideBets, id]
                      : custom.sideBets.filter((s) => s !== id);
                    setCustom({ sideBets: next });
                  }}
                  className="h-4 w-4 accent-[#d9b658]"
                />
                {SIDE_BET_LABEL_AR[id]}
              </label>
            ))}
          </div>
        </div>

        <p className="mt-2 text-[10px] text-[#b9a486]">
          الحركة العامة (الخلفية والاهتزاز) في إعدادات الدوري: شدة الحركة الحالية {prefs.bgIntensity}/3،
          الاهتزاز {prefs.shakeEnabled ? `${prefs.shakeIntensity}%` : "متوقف"}.
          <button type="button" className="ms-1 underline" onClick={() => setPrefs({ bgAnimations: true })}>
            تفعيل حركة الخلفية
          </button>
        </p>
      </div>
    </div>
  );
}
