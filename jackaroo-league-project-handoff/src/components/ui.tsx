"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useLeague } from "@/components/LeagueProvider";

export function Skeleton({ className = "h-6 w-full" }: { className?: string }) {
  return <div className={`skel ${className}`} aria-hidden />;
}

export function Empty({ icon = "🃏", title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="text-lg font-bold">{title}</div>
      {children && <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function SectionTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-lg font-extrabold">{children}</h2>
      {extra}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-1">
      <h1 className="text-2xl font-extrabold">{children}</h1>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="card pop max-h-[92dvh] w-full overflow-y-auto sm:max-w-lg"
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button className="btn btn-sm" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
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
    <div className="flex gap-1" aria-label="آخر النتائج">
      {results.map((r, i) => (
        <span
          key={i}
          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold ${r === "W" ? "chip-good" : "chip-bad"}`}
          style={{ border: "1px solid currentColor" }}
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
    <div className="rounded-[var(--rs)] border border-line bg-card2 p-3 text-center">
      <div className={`tnum text-xl font-extrabold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

export function signTone(n: number): "good" | "bad" | undefined {
  return n > 0 ? "good" : n < 0 ? "bad" : undefined;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("ar-EG-u-nu-latn", { dateStyle: "medium" });
