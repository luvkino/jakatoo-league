"use client";

/**
 * CLIENT-SIDE CASINO ACCESS — mirrors the server-verified boolean.
 *
 * ⚠️ This value is only a *presentation* convenience (hide/show nav, show the
 * unlock entry). It is NEVER the security boundary. The real gate is
 * server-side: every page is gated in its layout and every API route checks the
 * signed cookie. A tampered/absent value here cannot grant access.
 *
 * The unlock modal is opened programmatically — there is no visible Casino
 * unlock button for locked users.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { decideCapture, type CaptureDecision } from "@/lib/casino/accessCode";

type CasinoAuthState = "loading" | "unauthorized" | "authorized";

interface CasinoAccessContextValue {
  status: CasinoAuthState;
  authorized: boolean;
  /** Open the (programmatic) unlock modal. */
  openUnlock: () => void;
  /** Close the unlock modal. */
  closeUnlock: () => void;
  unlockOpen: boolean;
  /** Re-check the server authorization boolean (server is the source of truth). */
  refresh: () => Promise<void>;
}

const CasinoAccessContext = createContext<CasinoAccessContextValue>({
  status: "loading",
  authorized: false,
  openUnlock: () => {},
  closeUnlock: () => {},
  unlockOpen: false,
  refresh: async () => {},
});

export function CasinoAccessProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<CasinoAuthState>("loading");
  const [unlockOpen, setUnlockOpen] = useState(false);

  /* ---- unlock modal: local capture, exactly one request on Enter ---- */
  const [buffer, setBuffer] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const bufferRef = useRef("");
  const pendingRef = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/casino/access", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        setStatus("unauthorized");
        return;
      }
      const data = (await res.json()) as { authorized?: boolean };
      setStatus(data.authorized ? "authorized" : "unauthorized");
    } catch {
      setStatus("unauthorized");
    }
  }, []);

  // Initial server check. The setState happens inside a microtask (not
  // synchronously in the effect body) so it never cascades renders.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/casino/access", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ authorized: false })))
      .then((data: { authorized?: boolean }) => {
        if (!cancelled) setStatus(data.authorized ? "authorized" : "unauthorized");
      })
      .catch(() => {
        if (!cancelled) setStatus("unauthorized");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const closeUnlock = useCallback(() => setUnlockOpen(false), []);
  const openUnlock = useCallback(() => {
    // Clear any leftover buffer when the modal opens.
    bufferRef.current = "";
    pendingRef.current = false;
    setBuffer("");
    setPending(false);
    setError(false);
    setUnlockOpen(true);
  }, []);

  useEffect(() => {
    if (!unlockOpen) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target !== null &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      const decision: CaptureDecision = decideCapture({
        buffer: bufferRef.current,
        key: e.key,
        pending: pendingRef.current,
        isTyping: typing,
        hasModifier: e.ctrlKey || e.metaKey || e.altKey,
      });
      bufferRef.current = decision.nextBuffer;
      setBuffer(decision.nextBuffer);

      if (decision.submit !== null) {
        const code = decision.submit;
        pendingRef.current = true;
        setPending(true);
        fetch("/api/casino/unlock", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })
          .then((r) => r.json())
          .then((data: { ok?: boolean }) => {
            pendingRef.current = false;
            setPending(false);
            if (data.ok) {
              setError(false);
              setUnlockOpen(false);
              void refresh();
            } else {
              setError(true);
            }
          })
          .catch(() => {
            pendingRef.current = false;
            setPending(false);
            setError(true);
          });
      } else if (e.key === "Enter") {
        setError(false);
      }
    };

    const onKeyEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalRef.current) {
        e.preventDefault();
        setUnlockOpen(false);
      }
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keydown", onKeyEsc, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keydown", onKeyEsc, true);
    };
  }, [unlockOpen, refresh]);

  const value = useMemo<CasinoAccessContextValue>(
    () => ({
      status,
      authorized: status === "authorized",
      openUnlock,
      closeUnlock,
      unlockOpen,
      refresh,
    }),
    [status, openUnlock, closeUnlock, unlockOpen, refresh],
  );

  return (
    <CasinoAccessContext.Provider value={value}>
      {children}
      {unlockOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="إدخال رمز الكازينو"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setUnlockOpen(false);
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-[color:var(--fg)]">رمز الكازينو</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              ابدأ الرمز ثم اضغط Enter للإكمال. لا توجد أزرار مرئية.
            </p>
            <div className="mt-4 min-h-[2.5rem] rounded-lg border border-dashed border-[color:var(--line)] bg-[color:var(--card2)] p-3 font-mono text-sm tracking-widest text-[color:var(--fg)]">
              {pending ? "جارّ التحقق…" : buffer || "—"}
            </div>
            {error && (
              <p className="mt-3 text-sm text-[color:var(--bad)]" role="alert">
                رمز غير صحيح.
              </p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setUnlockOpen(false)}
                className="rounded-lg border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--fg)] transition hover:border-[color:var(--accent)]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </CasinoAccessContext.Provider>
  );
}

export function useCasinoAccess(): CasinoAccessContextValue {
  return useContext(CasinoAccessContext);
}

/** Convenience: whether the user is currently authorized (server-verified). */
export function useCasinoAuthorized(): boolean {
  return useCasinoAccess().authorized;
}
