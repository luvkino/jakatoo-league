// ============================================================================
// SECRET DEVELOPER ROOM — retro CRT terminal with fake diagnostics and jokes.
// Purely cosmetic: never exposes real env vars, credentials or secrets.
// ============================================================================

import { useEffect, useRef, useState, type FormEvent } from "react";
import { EggModal } from "./EggModal";
import { DEV_BOOT_LINES, DEV_COMMANDS, DEV_UNKNOWN } from "./eggMessages";
import type { EggSfxKind } from "./eggSfx";

export function DeveloperRoom({
  onClose,
  sfx,
}: {
  onClose: () => void;
  sfx: (k: EggSfxKind) => void;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const [booted, setBooted] = useState(false);
  const [cmd, setCmd] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Boot sequence (instant when reduced motion is preferred)
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const stepMs = reduced ? 1 : 420;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setLines(DEV_BOOT_LINES.slice(0, i).map((l) => `[BOOT] ${l}`));
      if (i >= DEV_BOOT_LINES.length) {
        clearInterval(iv);
        setBooted(true);
        inputRef.current?.focus();
      }
    }, stepMs);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    sfx("boot");
  }, [sfx]);

  // keep the terminal scrolled to the newest line
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, booted]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const raw = cmd.trim().toLowerCase();
    setCmd("");
    if (!raw) return;
    sfx("type");
    const prompt = `jackaroo@league:~$ ${raw}`;
    if (raw === "exit" || raw === "خروج") {
      setLines((l) => [...l, prompt, "إغلاق الغرفة… إلى اللقاء يا فضولي 👋"]);
      setTimeout(onClose, 450);
      return;
    }
    if (raw === "clear" || raw === "cls") {
      setLines([]);
      return;
    }
    const known = DEV_COMMANDS[raw];
    const reply = known ?? DEV_UNKNOWN[Math.floor(Math.random() * DEV_UNKNOWN.length)]!;
    setLines((l) => [...l.slice(-40), prompt, ...reply.split("\n")]);
  }

  return (
    <EggModal
      title={
        <>
          <span className="font-pixel-en text-base">DEV://ROOM</span>
        </>
      }
      onClose={onClose}
      wide
    >
      <div className="egg-crt relative border-2 border-[#14532d] bg-[#04140b]" dir="ltr">
        <div
          ref={scrollerRef}
          className="h-64 overflow-y-auto p-3 sm:h-80"
          role="log"
          aria-live="polite"
        >
          {lines.map((l, i) => (
            <p key={i} dir="auto" className="egg-term-line">
              {l}
            </p>
          ))}
          {booted ? (
            <form onSubmit={submit} className="mt-1 flex items-center gap-1">
              <span className="egg-term-line shrink-0 !text-[#4ade80]">jackaroo@league:~$</span>
              <input
                ref={inputRef}
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                className="egg-term-input flex-1 bg-transparent font-pixel-en text-sm text-[#86efac] outline-none"
                autoComplete="off"
                spellCheck={false}
                aria-label="أدخل أمر الطرفية"
                maxLength={40}
              />
              <span className="egg-caret" aria-hidden />
            </form>
          ) : (
            <p className="egg-term-line egg-caret-inline">
              <span className="egg-caret" aria-hidden />
            </p>
          )}
        </div>
        {/* CRT scanlines */}
        <div className="egg-scanlines pointer-events-none absolute inset-0" aria-hidden />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>جرّب: help · whoami · status · league · coffee · sudo · 42 · exit</span>
        <span className="font-bold">⚠️ كل ما هنا وهمي تماماً ولا يكشف أي معلومة حقيقية</span>
      </div>
    </EggModal>
  );
}
