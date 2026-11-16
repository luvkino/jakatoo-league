"use client";

/**
 * CasinoSettingsSection — the Blackjack block inside the main Settings page.
 * Keeps the casino's own controls (sound, hints, practice chips, table) in one
 * place while the full casino lives on /casino.
 */

import Link from "next/link";
import { PixelIcon } from "@/components/PixelArt";
import { useCasinoStore } from "./useCasino";
import { patchCasino, resetPracticeChips, topUpChips, CASINO_KEY } from "@/lib/casino/store";
import { TABLES, TABLE_MAP } from "@/lib/casino/tables";
import { playCasinoSfx } from "@/lib/casino/sound";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";

export function CasinoSettingsSection() {
  const store = useCasinoStore();
  const { prefs, set: setPrefs } = usePlayerPrefs();
  const table = TABLE_MAP[store.tableId];

  const togglePref = (key: "casinoSfxEnabled" | "showStrategyHint" | "confirmAllIn", label: string, desc: string) => (
    <div className="flex items-center justify-between gap-3 border-2 border-line bg-card2 px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-bold">{label}</div>
        <div className="text-[10px] text-muted">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={key === "casinoSfxEnabled" ? prefs.casinoSfxEnabled : store.settings[key]}
        className={`btn btn-sm shrink-0 !min-h-[32px] !px-2 ${(key === "casinoSfxEnabled" ? prefs.casinoSfxEnabled : store.settings[key]) ? "btn-primary" : ""}`}
        onClick={() => {
          if (key === "casinoSfxEnabled") setPrefs({ casinoSfxEnabled: !prefs.casinoSfxEnabled });
          else patchCasino({ settings: { ...store.settings, [key]: !store.settings[key] } });
          playCasinoSfx("button");
        }}
      >
        {(key === "casinoSfxEnabled" ? prefs.casinoSfxEnabled : store.settings[key]) ? "مفعّل" : "معطّل"}
      </button>
    </div>
  );

  const toggle = (key: keyof typeof store.settings, label: string, desc: string) => (
    <div className="flex items-center justify-between gap-3 border-2 border-line bg-card2 px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-bold">{label}</div>
        <div className="text-[10px] text-muted">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={store.settings[key]}
        className={`btn btn-sm shrink-0 !min-h-[32px] !px-2 ${store.settings[key] ? "btn-primary" : ""}`}
        onClick={() => {
          patchCasino({ settings: { ...store.settings, [key]: !store.settings[key] } });
          playCasinoSfx("button");
        }}
      >
        {store.settings[key] ? "مفعّل" : "معطّل"}
      </button>
    </div>
  );

  return (
    <div className="stack !gap-3">
      <p className="text-xs sm:text-sm text-muted">
        البلاك جاك تجربة كازينو مستقلة تماماً بقواعد حقيقية وشيبس افتراضية. لا تؤثر أي من هذه الإعدادات على نقاط
        الدوري أو الترتيب. الإعدادات الكاملة (الطاولات، القواعد المخصّصة، الإحصاءات) في صفحة الكازينو.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="border-2 border-line bg-card2 px-3 py-2">
          <div className="text-[10px] text-muted">الرصيد الافتراضي</div>
          <div className="tnum font-pixel-en text-lg text-accent-text" dir="ltr">
            {store.chips.toLocaleString("en-US")}
          </div>
        </div>
        <div className="border-2 border-line bg-card2 px-3 py-2">
          <div className="text-[10px] text-muted">شيبس التدريب</div>
          <div className="tnum font-pixel-en text-lg text-accent-text" dir="ltr">
            {store.practiceChips.toLocaleString("en-US")}
          </div>
        </div>
      </div>

      {togglePref("casinoSfxEnabled", "مؤثرات صوت الكازينو", "توزيع الأوراق، الشيبس، الفوز والخسارة — مستقلة عن مؤثرات الدوري.")}
      {togglePref("showStrategyHint", "تلميح الاستراتيجية", "يعرض القرار الموصى به من جدول الاستراتيجية الأساسية أثناء يدك.")}
      {togglePref("confirmAllIn", "تأكيد رهان «الكل»", "سؤال تأكيد قبل وضع كامل الرصيد على جولة واحدة.")}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted" htmlFor="casino-table-select">
          طاولة اللعب الحالية
        </label>
        <select
          id="casino-table-select"
          className="input !min-h-[38px] !w-auto"
          value={store.tableId}
          onChange={(e) => {
            setPrefs({ casinoTable: e.target.value as typeof store.tableId });
            patchCasino({ tableId: e.target.value as typeof store.tableId });
            playCasinoSfx("button");
          }}
        >
          {TABLES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            patchCasino({ practice: !store.practice });
            playCasinoSfx("button");
          }}
        >
          <PixelIcon name="target" size={14} /> {store.practice ? "إيقاف وضع التدريب" : "وضع التدريب"}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => topUpChips(1000)}>
          +1000 شيبس افتراضية
        </button>
        <button type="button" className="btn btn-sm" onClick={() => resetPracticeChips()}>
          إعادة شيبس التدريب
        </button>
      </div>

      <p className="text-[11px] text-muted">
        الطاولة الحالية: <b className="text-fg">{table?.name}</b> · {table?.rules.decks} مجموعات ·{" "}
        {table?.rules.dealerHitsSoft17 ? "H17" : "S17"} · دفع {table?.rules.blackjackPayout === 1.5 ? "٣:٢" : "٦:٥"}.
        تُحفظ البيانات محلياً في المتصفح ({CASINO_KEY}).
      </p>

      <div className="flex flex-wrap gap-2">
        <Link href="/casino" className="btn btn-sm btn-primary">
          <PixelIcon name="cards" size={14} /> فتح الكازينو
        </Link>
        <Link href="/casino/history" className="btn btn-sm">
          السجل والإحصاءات
        </Link>
        <Link href="/casino/strategy" className="btn btn-sm">
          جدول الاستراتيجية
        </Link>
      </div>
    </div>
  );
}
