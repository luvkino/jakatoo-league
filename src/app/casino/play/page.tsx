"use client";

import "../casino.css";
import { CasinoAudioBridge } from "@/components/casino/CasinoAudioBridge";
import { useState } from "react";
import Link from "next/link";
import { PixelIcon } from "@/components/PixelArt";
import { CasinoTable } from "@/components/casino/CasinoTable";
import { TABLES, TABLE_MAP, normalizeRules } from "@/lib/casino/tables";
import { describeRules } from "@/lib/casino/tables";
import { useCasinoStore } from "@/components/casino/useCasino";
import { patchCasino } from "@/lib/casino/store";
import { usePlayerPrefs } from "@/components/prefs/PlayerPrefsProvider";
import { playCasinoSfx } from "@/lib/casino/sound";
import { readCasino } from "@/lib/casino/store";
import { CLASSIC_RULES } from "@/lib/casino/tables";

export default function CasinoPlayPage() {
  const store = useCasinoStore();
  const { set: setPrefs } = usePlayerPrefs();
  const table = TABLE_MAP[store.tableId];
  const [showRules, setShowRules] = useState(false);
  const rules = store.tableId === "custom" ? normalizeRules(store.customRules, CLASSIC_RULES) : table?.rules;

  return (
    <div className="casino-root stack">
      <div className="casino-backdrop" aria-hidden />
      <div className="casino-bg" aria-hidden />
      <CasinoAudioBridge />
      <div className="cas-panel flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2">
          <Link href="/casino" className="cas-btn cas-btn-sm" onClick={() => playCasinoSfx("button")}>
            <PixelIcon name="home" size={12} /> اللوبي
          </Link>
          <span className="font-pixel-ar text-lg font-extrabold text-[#f0d79a]">{table?.name}</span>
          <span className="cas-chip-line font-pixel-en">{table?.nameEn}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="اختيار الطاولة"
            className="cas-input !min-h-[34px] text-[11px]"
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
          <button type="button" className="cas-btn cas-btn-sm" onClick={() => setShowRules((v) => !v)}>
            قواعد الطاولة
          </button>
        </div>
      </div>

      {showRules && rules && (
        <div className="cas-panel p-3">
          <h2 className="mb-1 text-sm">كل قاعدة على هذه الطاولة مطبّقة في المحرك</h2>
          <dl className="grid gap-1 text-[11px] sm:grid-cols-2">
            {describeRules(rules).map((row) => (
              <div key={row.label} className="flex justify-between gap-2 border-b border-[#4a351f]/60 py-0.5">
                <dt className="text-[#b9a486]">{row.label}</dt>
                <dd className="text-end">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <CasinoTable onOpenRules={() => setShowRules(true)} />
      <p className="text-center text-[10px] text-[#b9a486]">
        إحصاءاتك وسجل جولاتك محفوظة على هذا الجهاز فقط.{" "}
        <Link href="/casino/history" className="underline">
          السجل الكامل
        </Link>
      </p>
    </div>
  );
}
