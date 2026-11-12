"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useLeague } from "@/components/LeagueProvider";
import { Modal } from "@/components/ui";

const NAV = [
  { href: "/", label: "الرئيسية", icon: "🏠" },
  { href: "/leaderboard", label: "الترتيب", icon: "🏆" },
  { href: "/players", label: "اللاعبون", icon: "👥" },
  { href: "/matches", label: "المباريات", icon: "🃏" },
  { href: "/head-to-head", label: "المواجهات", icon: "⚔️" },
  { href: "/seasons", label: "المواسم", icon: "📅" },
  { href: "/hall-of-fame", label: "قاعة المشاهير", icon: "🌟" },
  { href: "/draw", label: "دق الولد", icon: "🎲" },
  { href: "/settings", label: "المظهر", icon: "🎨" },
  { href: "/admin", label: "الإدارة", icon: "🛠️" },
];
const BOTTOM = ["/", "/players", "/matches", "/draw"];

export function LoginButton({ label = "دخول المشرف", className = "btn btn-primary" }: { label?: string; className?: string }) {
  const { login } = useLeague();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!pw) return setErr("اكتب كلمة المرور.");
    setBusy(true);
    setErr("");
    const r = await login(pw);
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      setPw("");
    } else setErr(r.message);
  }

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        🔑 {label}
      </button>
      {open && (
        <Modal title="دخول المشرف" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="stack">
            <div>
              <label className="label" htmlFor="pw">
                كلمة مرور المشرف
              </label>
              <input
                id="pw"
                className="input"
                type="password"
                autoFocus
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="current-password"
                dir="ltr"
              />
            </div>
            {err && (
              <p role="alert" className="text-sm font-bold text-bad">
                {err}
              </p>
            )}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "جارٍ التحقق…" : "دخول"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { admin, logout, seasons, scope, setScope, loadError, refresh, toasts, dismissToast } = useLeague();
  const [more, setMore] = useState(false);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 pb-24 sm:px-5 lg:pb-8">
      <header className="sticky top-0 z-30 -mx-3 border-b border-line bg-bg/90 px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="text-lg font-extrabold tracking-wide text-accent-text sm:text-xl" dir="ltr">
            🃏 JACKAROO LEAGUE
          </Link>
          <div className="flex items-center gap-2">
            <select
              aria-label="الموسم"
              className="input !min-h-[40px] !w-auto max-w-[9.5rem] !py-0 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              {seasons.length === 0 && <option value={scope}>الموسم</option>}
              {[...seasons].reverse().map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.status === "active" ? " (الحالي)" : ""}
                </option>
              ))}
              <option value="all">كل المواسم</option>
            </select>
            {admin === "unknown" ? (
              <div className="skel h-10 w-20" />
            ) : admin === "admin" ? (
              <button className="btn btn-sm" onClick={logout} title="تسجيل الخروج">
                👤 مشرف · خروج
              </button>
            ) : (
              <LoginButton label="دخول" className="btn btn-sm btn-primary" />
            )}
          </div>
        </div>
        <nav className="mt-2 hidden gap-1 overflow-x-auto lg:flex" aria-label="التنقل">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-[var(--rs)] px-3 py-2 text-sm font-bold ${
                isActive(n.href) ? "bg-accent text-accent-fg" : "text-muted hover:bg-card2 hover:text-fg"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      {loadError && (
        <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--rs)] border border-bad/50 bg-bad/10 px-3 py-2 text-sm">
          <span>⚠️ {loadError} {" "}البيانات المعروضة قد لا تكون محدثة.</span>
          <button className="btn btn-sm" onClick={() => refresh()}>
            إعادة المحاولة
          </button>
        </div>
      )}

      <main className="mt-4 flex-1">{children}</main>

      {/* mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card/95 backdrop-blur lg:hidden" aria-label="التنقل السريع">
        {NAV.filter((n) => BOTTOM.includes(n.href)).map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${isActive(n.href) ? "text-accent-text" : "text-muted"}`}
          >
            <span className="text-xl leading-none">{n.icon}</span>
            {n.label}
          </Link>
        ))}
        <button onClick={() => setMore(true)} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-muted">
          <span className="text-xl leading-none">☰</span>
          المزيد
        </button>
      </nav>

      {more && (
        <Modal title="القائمة" onClose={() => setMore(false)}>
          <div className="grid grid-cols-2 gap-2">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMore(false)} className={`btn justify-start ${isActive(n.href) ? "btn-primary" : ""}`}>
                {n.icon} {n.label}
              </Link>
            ))}
          </div>
        </Modal>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-3 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={`pop pointer-events-auto max-w-md rounded-[var(--rs)] border px-4 py-3 text-start text-sm font-bold shadow-xl ${
              t.kind === "err"
                ? "border-bad bg-card text-bad"
                : t.kind === "ok"
                  ? "border-good bg-card text-good"
                  : t.kind === "ach"
                    ? "border-accent bg-card text-accent-text"
                    : "border-line bg-card text-fg"
            }`}
          >
            {t.msg}
          </button>
        ))}
      </div>
    </div>
  );
}
