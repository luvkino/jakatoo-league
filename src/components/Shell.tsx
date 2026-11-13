"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useChaos } from "@/components/ChaosEngine";
import { useLeague } from "@/components/LeagueProvider";
import { PixelIcon, type PixelIconName } from "@/components/PixelArt";
import { useAppearance } from "@/components/Settings";
import { Modal } from "@/components/ui";
import { unlockAudio } from "@/lib/sound";

const NAV: { href: string; label: string; icon: PixelIconName }[] = [
  { href: "/", label: "الرئيسية", icon: "home" },
  { href: "/leaderboard", label: "الترتيب", icon: "trophy" },
  { href: "/players", label: "اللاعبون", icon: "players" },
  { href: "/matches", label: "المباريات", icon: "cards" },
  { href: "/head-to-head", label: "المواجهات", icon: "swords" },
  { href: "/seasons", label: "المواسم", icon: "calendar" },
  { href: "/hall-of-fame", label: "قاعة المشاهير", icon: "star" },
  { href: "/draw", label: "دق الولد", icon: "dice" },
  { href: "/settings", label: "الإعدادات", icon: "palette" },
  { href: "/admin", label: "الإدارة", icon: "shield" },
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
        <PixelIcon name="key" size={16} />
        <span>{label}</span>
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
  const { a, set } = useAppearance();
  const { currentTrash, nextTrash } = useChaos();
  const [more, setMore] = useState(false);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  function toggleSoundQuick() {
    unlockAudio();
    set({ sound: !a.sound });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 pb-24 sm:px-5 lg:pb-8">
      <header className="sticky top-0 z-30 -mx-3 border-b-2 border-line bg-bg/95 px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 text-accent-text hover:brightness-110" dir="ltr">
            <PixelIcon name="cards" size={24} />
            <span className="font-pixel-en text-xs font-bold tracking-wider sm:text-sm">JACKAROO LEAGUE</span>
            <span className="hidden border border-accent/60 bg-accent/15 px-1.5 py-0.5 font-pixel-en text-[9px] text-accent-text sm:inline-block">
              8-BIT
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {a.chaosMode && (
              <Link
                href="/settings"
                className="chip chip-legendary !px-2 !py-1 text-[11px]"
                title="وضع الفوضى مفعّل"
              >
                <PixelIcon name="chaos" size={14} />
                <span className="hidden sm:inline">وضع الفوضى</span>
              </Link>
            )}

            <button
              type="button"
              onClick={toggleSoundQuick}
              className="btn btn-sm !min-h-[38px] !px-2"
              title={a.sound ? "إيقاف الأصوات (8-Bit)" : "تشغيل الأصوات (8-Bit)"}
              aria-label={a.sound ? "إيقاف المؤثرات الصوتية" : "تشغيل المؤثرات الصوتية"}
            >
              <PixelIcon name={a.sound ? "soundOn" : "soundOff"} size={18} />
            </button>

            <select
              aria-label="الموسم"
              className="input !min-h-[38px] !w-auto max-w-[8.8rem] !py-0 text-xs sm:max-w-[10.5rem] sm:text-sm"
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
              <div className="skel h-9 w-20" />
            ) : admin === "admin" ? (
              <button className="btn btn-sm !min-h-[38px]" onClick={logout} title="تسجيل الخروج">
                <PixelIcon name="shield" size={16} />
                <span className="hidden sm:inline">مشرف · خروج</span>
                <span className="sm:hidden">خروج</span>
              </button>
            ) : (
              <LoginButton label="دخول" className="btn btn-sm btn-primary !min-h-[38px]" />
            )}
          </div>
        </div>

        <nav className="mt-2 hidden gap-1.5 overflow-x-auto pb-0.5 lg:flex" aria-label="التنقل">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-2 px-2.5 py-1.5 text-xs font-bold transition-colors sm:text-sm ${
                isActive(n.href)
                  ? "border-accent bg-accent text-accent-fg shadow-[2px_2px_0_var(--pixel-shadow)]"
                  : "border-transparent text-muted hover:border-line hover:bg-card2 hover:text-fg"
              }`}
            >
              <PixelIcon name={n.icon} size={16} />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      {/* LEAGUE TRASH TALK Arcade Ticker */}
      {a.trashTalk && currentTrash && (
        <div
          className={`mt-3 flex items-center justify-between gap-2 border-2 px-3 py-2 text-xs sm:text-sm ${
            currentTrash.rare
              ? "rarity-legendary text-fg"
              : "border-line bg-card shadow-[3px_3px_0_var(--pixel-shadow)]"
          }`}
          data-testid="trash-talk-ticker"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <PixelIcon name={currentTrash.rare ? "chaos" : "megaphone"} size={18} />
            <span className="hidden shrink-0 border border-accent/50 bg-accent/15 px-1.5 py-0.5 font-pixel-en text-[9px] font-bold text-accent-text sm:inline-block">
              LEAGUE TRASH TALK
            </span>
            <span className="truncate font-bold">{currentTrash.text}</span>
          </div>
          <button
            type="button"
            onClick={nextTrash}
            className="btn btn-sm !min-h-[30px] !px-2 text-xs shrink-0"
            title="تعليق جديد"
          >
            تعليق آخر
          </button>
        </div>
      )}

      {loadError && (
        <div
          role="status"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 border-2 border-bad bg-bad/15 px-3 py-2 text-sm"
        >
          <span>⚠️ {loadError} البيانات المعروضة قد لا تكون محدثة.</span>
          <button className="btn btn-sm" onClick={() => refresh()}>
            إعادة المحاولة
          </button>
        </div>
      )}

      <main className="mt-4 flex-1">{children}</main>

      {/* Mobile bottom arcade dock */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-2 border-line bg-card/95 backdrop-blur lg:hidden"
        aria-label="التنقل السريع"
      >
        {NAV.filter((n) => BOTTOM.includes(n.href)).map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-bold ${
              isActive(n.href) ? "bg-accent/15 text-accent-text" : "text-muted"
            }`}
          >
            <PixelIcon name={n.icon} size={20} />
            <span>{n.label}</span>
          </Link>
        ))}
        <button
          onClick={() => setMore(true)}
          className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-bold text-muted"
        >
          <PixelIcon name="palette" size={20} />
          <span>المزيد</span>
        </button>
      </nav>

      {more && (
        <Modal title="قائمة الأركيد" onClose={() => setMore(false)}>
          <div className="grid grid-cols-2 gap-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMore(false)}
                className={`btn justify-start ${isActive(n.href) ? "btn-primary" : ""}`}
              >
                <PixelIcon name={n.icon} size={18} />
                <span>{n.label}</span>
              </Link>
            ))}
          </div>
        </Modal>
      )}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-3 lg:bottom-6"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={`pop pointer-events-auto flex max-w-md items-center gap-2 border-2 px-4 py-3 text-start text-sm font-bold shadow-[4px_4px_0_var(--pixel-shadow)] ${
              t.kind === "err"
                ? "border-bad bg-card text-bad"
                : t.kind === "ok"
                  ? "border-good bg-card text-good"
                  : t.kind === "ach"
                    ? "border-accent bg-card text-accent-text"
                    : "border-line bg-card text-fg"
            }`}
          >
            <PixelIcon
              name={t.kind === "ach" ? "trophy" : t.kind === "ok" ? "sparkle" : t.kind === "err" ? "bolt" : "megaphone"}
              size={18}
            />
            <span>{t.msg}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
