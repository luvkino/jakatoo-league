"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { PixelIcon, type PixelIconName } from "@/components/PixelArt";

export function Skeleton({ className = "h-6 w-full" }: { className?: string }) {
  return <div className={`skel ${className}`} aria-hidden />;
}

const EMOJI_TO_PIXEL: Record<string, PixelIconName> = {
  "🃏": "cards",
  "🎴": "cards",
  "🏆": "trophy",
  "⚔️": "swords",
  "🤷": "piggy",
  "🔍": "search",
  "🔒": "lock",
};

export function Empty({
  icon = "🃏",
  pixelIcon,
  title,
  children,
}: {
  icon?: string;
  pixelIcon?: PixelIconName;
  title: string;
  children?: ReactNode;
}) {
  const sprite = pixelIcon ?? EMOJI_TO_PIXEL[icon] ?? "cards";
  return (
    <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
      <div className="grid h-14 w-14 place-items-center border-2 border-line bg-card2">
        <PixelIcon name={sprite} size={32} />
      </div>
      <div className="font-pixel-ar text-2xl font-extrabold">{title}</div>
      {children && <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  extra,
  pixelIcon,
}: {
  children: ReactNode;
  extra?: ReactNode;
  pixelIcon?: PixelIconName;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-line/70 pb-1.5">
      <h2 className="flex items-center gap-2 font-pixel-ar text-2xl font-extrabold leading-none">
        {pixelIcon && <PixelIcon name={pixelIcon} size={22} />}
        <span>{children}</span>
      </h2>
      {extra}
    </div>
  );
}

export function PageTitle({
  children,
  sub,
  pixelIcon,
}: {
  children: ReactNode;
  sub?: ReactNode;
  pixelIcon?: PixelIconName;
}) {
  return (
    <div className="mb-1 border-b-2 border-line pb-2">
      <h1 className="flex items-center gap-2 font-pixel-ar text-3xl font-extrabold leading-tight">
        {pixelIcon && <PixelIcon name={pixelIcon} size={26} />}
        <span>{children}</span>
      </h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="card pop max-h-[92dvh] w-full overflow-y-auto !p-0 sm:max-w-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-line bg-card2 px-4 py-2.5">
          <h3 className="flex items-center gap-2 font-pixel-ar text-2xl font-extrabold">
            <PixelIcon name="sparkle" size={18} />
            <span>{title}</span>
          </h3>
          <button className="btn btn-sm !min-h-[34px] !px-2.5" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`btn btn-sm shrink-0 ${value === t.id ? "btn-primary" : ""}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PlayerLink({ id, className = "" }: { id: string; className?: string }) {
  const { nameOf } = useLeague();
  return (
    <Link href={`/players/${id}`} className={`font-bold hover:text-accent-text hover:underline ${className}`}>
      {nameOf(id)}
    </Link>
  );
}

export function Last5({ results }: { results: ("W" | "L")[] }) {
  if (results.length === 0) return <span className="text-sm text-muted">—</span>;
  return (
    <div className="flex gap-1.5" aria-label="آخر النتائج">
      {results.map((r, i) => (
        <span
          key={i}
          className={`grid h-7 w-7 place-items-center border-2 text-xs font-extrabold ${
            r === "W"
              ? "border-good bg-good/20 text-good"
              : "border-bad bg-bad/20 text-bad"
          }`}
        >
          {r === "W" ? "ف" : "خ"}
        </span>
      ))}
    </div>
  );
}

export function StatBox({ label, value, tone }: { label: string; value: ReactNode; tone?: "good" | "bad" | "accent" }) {
  const color = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : tone === "accent" ? "text-accent-text" : "";
  return (
    <div className="border-2 border-line bg-card2 p-2.5 text-center shadow-[2px_2px_0_var(--pixel-shadow)]">
      <div className={`tnum text-xl font-extrabold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-muted">{label}</div>
    </div>
  );
}

export function signTone(n: number): "good" | "bad" | undefined {
  return n > 0 ? "good" : n < 0 ? "bad" : undefined;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("ar-EG-u-nu-latn", { dateStyle: "medium" });
