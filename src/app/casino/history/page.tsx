"use client";

import "../casino.css";
import { CasinoAudioBridge } from "@/components/casino/CasinoAudioBridge";
import { useMemo } from "react";
import Link from "next/link";
import { PixelIcon } from "@/components/PixelArt";
import { useCasinoStore } from "@/components/casino/useCasino";
import { StatsPanel } from "@/components/casino/CasinoLobby";
import { computeCasinoStats, OUTCOME_LABEL_AR } from "@/lib/casino/stats";
import { TABLE_MAP } from "@/lib/casino/tables";
import { SIDE_BET_LABEL_AR } from "@/lib/casino/sideBets";

export default function CasinoHistoryPage() {
  const store = useCasinoStore();
  const stats = useMemo(() => computeCasinoStats(store.history), [store.history]);

  return (
    <div className="casino-root stack">
      <div className="casino-backdrop" aria-hidden />
      <div className="casino-bg" aria-hidden />
      <CasinoAudioBridge />
      <div className="cas-panel flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2">
          <Link href="/casino" className="cas-btn cas-btn-sm">
            <PixelIcon name="home" size={12} /> اللوبي
          </Link>
          <h1 className="font-pixel-ar text-lg font-extrabold text-[#f0d79a]">سجل الجولات والإحصاءات</h1>
        </div>
        <span className="cas-chip-line">{store.history.length} جولة محفوظة</span>
      </div>

      <StatsPanel stats={stats} />

      <div className="cas-panel p-3">
        <h2 className="mb-2 text-sm">تفاصيل الجولات</h2>
        {store.history.length === 0 ? (
          <p className="text-[11px] text-[#b9a486]">السجل فارغ — العب جولة واحدة ليبدأ التسجيل.</p>
        ) : (
          <ul className="space-y-2">
            {store.history.map((r) => (
              <li key={r.id} className="border border-[#4a351f] bg-black/25 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-pixel-en text-[10px] text-[#b9a486]">{new Date(r.at).toLocaleString("ar-EG-u-nu-latn")}</span>
                  <span>{TABLE_MAP[r.tableId]?.name ?? r.tableId}{r.practice ? " · تدريب" : ""}</span>
                  <span className="font-pixel-en">
                    {r.hands.map((h) => OUTCOME_LABEL_AR[h.outcome ?? "push"]).join(" / ")}
                  </span>
                  <b dir="ltr" className={r.net > 0 ? "text-[#7ef0b0]" : r.net < 0 ? "text-[#ff9aa5]" : "text-[#b9a486]"}>
                    {r.net > 0 ? "+" : ""}
                    {r.net}
                  </b>
                </div>
                <div className="mt-1 grid gap-1 text-[10px] text-[#d9c9a8] sm:grid-cols-2">
                  {r.hands.map((h, i) => (
                    <span key={i} className="cas-chip-line !justify-start">
                      يد {i + 1}: <b dir="ltr">{h.cards}</b> = {h.total} · رهان <b dir="ltr">{h.stake}</b>
                    </span>
                  ))}
                  <span className="cas-chip-line !justify-start">
                    الموزّع: <b dir="ltr">{r.hands[0]?.dealerCards}</b> = {r.hands[0]?.dealerTotal}
                  </span>
                  <span className="cas-chip-line !justify-start">
                    عائد <b dir="ltr">{r.returned}</b> من مخاطرة <b dir="ltr">{r.reserved}</b>
                  </span>
                </div>
                {(r.sideBets.length > 0 || r.insurance.stake > 0) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.sideBets.map((s) => (
                      <span key={s.id} className="cas-chip-line">
                        {SIDE_BET_LABEL_AR[s.id]}: <b dir="ltr">{s.net > 0 ? `+${s.net}` : s.net}</b>
                      </span>
                    ))}
                    {r.insurance.stake > 0 && (
                      <span className="cas-chip-line">
                        تأمين: <b dir="ltr">{r.insurance.result === "win" ? `+${r.insurance.payout - r.insurance.stake}` : `-${r.insurance.stake}`}</b>
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
