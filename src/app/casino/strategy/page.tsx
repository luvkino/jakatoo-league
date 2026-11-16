"use client";

import "../casino.css";
import { CasinoAudioBridge } from "@/components/casino/CasinoAudioBridge";
import Link from "next/link";
import { PixelIcon } from "@/components/PixelArt";
import { BASIC_STRATEGY, DEALER_UPCARDS, STRATEGY_LEGEND } from "@/lib/casino/strategy";

function Chart({ title, rows }: { title: string; rows: { label: string; moves: string[] }[] }) {
  return (
    <div className="cas-panel overflow-x-auto p-3">
      <h2 className="mb-2 text-sm">{title}</h2>
      <table className="w-full border-collapse text-center">
        <thead>
          <tr>
            <th className="p-1 text-[9px] text-[#b9a486]">يدك</th>
            {DEALER_UPCARDS.map((u) => (
              <th key={u} className="p-1 font-pixel-en text-[10px] text-[#f0d79a]">
                {u}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th className="whitespace-nowrap p-1 font-pixel-en text-[10px] text-[#d9c9a8]">{row.label}</th>
              {row.moves.map((m, i) => (
                <td key={i} className={`cas-chart-cell cas-chart-${m}`}>
                  {m}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StrategyPage() {
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
          <h1 className="font-pixel-ar text-lg font-extrabold text-[#f0d79a]">الاستراتيجية الأساسية</h1>
        </div>
        <span className="cas-chip-line">مرجع فقط — لا يقرر بدلاً منك</span>
      </div>

      <div className="cas-panel p-3">
        <p className="text-[11px] leading-relaxed text-[#d9c9a8]">
          الجداول القياسية لـ ٤–٨ مجموعات، الموزّع يقف على ١٧ الناعمة (S17)، والمضاعفة بعد التقسيم مسموحة (DAS).
          عند اختلاف قواعد الطاولة (H17، ٦:٥، بدون DAS، بدون استسلام) قد تتغيّر بعض القرارات — لاحظ تلميح الطاولة.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
          {STRATEGY_LEGEND.map((l) => (
            <span key={l.code} className="flex items-center gap-1">
              <b className={`cas-chart-cell cas-chart-${l.code} !min-h-0 px-1.5`}>{l.code}</b>
              <span className="text-[#b9a486]">{l.desc}</span>
            </span>
          ))}
        </div>
      </div>

      <Chart title="المجاميع الصلبة (Hard totals)" rows={BASIC_STRATEGY.hard} />
      <Chart title="المجاميع الناعمة (Soft totals)" rows={BASIC_STRATEGY.soft} />
      <Chart title="الأزواج (Pairs)" rows={BASIC_STRATEGY.pairs} />
    </div>
  );
}
