// ============================================================================
// Shared overlay/modal shell for the easter-egg mini-games.
// Local copy of the app's Modal pattern (Escape close, scroll lock, RTL) so the
// secret layer never modifies src/components/ui.tsx. Rendered above every other
// layer (z-[100]) — it is only ever opened by explicit secret interactions.
// ============================================================================

import { useEffect, type ReactNode } from "react";

export function EggModal({
  title,
  onClose,
  children,
  wide = false,
  closeLabel = "إغلاق",
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  closeLabel?: string;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card pop !p-0 max-h-[94dvh] w-full overflow-y-auto sm:max-h-[90dvh]"
        style={{ maxWidth: wide ? "56rem" : "32rem" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b-2 border-line bg-card2 px-4 py-2.5">
          <h3 className="flex min-w-0 items-center gap-2 font-pixel-ar text-2xl font-extrabold">
            {title}
          </h3>
          <button className="btn btn-sm !min-h-[34px] !px-2.5" onClick={onClose} aria-label={closeLabel}>
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
