// ============================================================================
// MATRIX MODE — temporary full-screen green digital rain overlay.
// It is a pure overlay: the real page/theme underneath is untouched and the
// mode exits instantly via ESC or the ✕ button. Canvas loop pauses when the
// tab is hidden and degrades to a static frame with reduced motion.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { MATRIX_MSGS } from "./eggMessages";
import type { EggSfxKind } from "./eggSfx";

const GLYPHS = "01ｱｲｳｴｵｶｷｸｹｺ0123456789ｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾔﾕﾗﾘﾜ";

interface Column {
  x: number;
  y: number;
  speed: number;
}

export function MatrixMode({
  onExit,
  sfx,
}: {
  onExit: () => void;
  sfx: (k: EggSfxKind) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);

  // exit immediately on Escape
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onExit]);

  // cycle secret messages
  useEffect(() => {
    const iv = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MATRIX_MSGS.length);
    }, 3800);
    return () => clearInterval(iv);
  }, []);

  // digital rain
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let raf: number | null = null;
    let cols: Column[] = [];
    let fontSize = 14;

    const build = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = window.innerWidth < 640 ? 12 : 15;
      const count = Math.ceil(window.innerWidth / (fontSize + 3));
      cols = Array.from({ length: count }, (_, i) => ({
        x: i * (fontSize + 3),
        y: Math.random() * window.innerHeight,
        speed: 1.5 + Math.random() * 4.5,
      }));
      ctx.fillStyle = "#010401";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    };
    build();

    const drawFrame = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.fillStyle = "rgba(1, 4, 1, 0.1)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fontSize}px monospace`;
      for (const col of cols) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
        const bright = Math.random() < 0.06;
        ctx.fillStyle = bright ? "#eaffea" : Math.random() < 0.3 ? "#86efac" : "#22c55e";
        ctx.fillText(glyph, col.x, col.y);
        col.y += col.speed * (reduced ? 0 : 1);
        if (col.y > h + 40 && Math.random() > 0.975) col.y = -Math.random() * 200;
      }
    };

    if (reduced) {
      // a few static frames only — no continuous animation
      for (let i = 0; i < 24; i++) drawFrame();
    } else {
      const loop = () => {
        if (!document.hidden) drawFrame();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    const onResize = () => build();
    window.addEventListener("resize", onResize);
    sfx("matrix");
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[95] bg-[#010401]" role="dialog" aria-modal="true" aria-label="وضع المصفوفة">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="egg-matrix-vignette pointer-events-none absolute inset-0" aria-hidden />

      {/* secret messages */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center px-4">
        <p key={msgIndex} className="egg-matrix-msg font-pixel-en text-center text-sm font-bold sm:text-xl" dir="auto">
          {MATRIX_MSGS[msgIndex]}
        </p>
      </div>

      <div className="absolute top-3 end-3 z-10 flex items-center gap-2">
        <span className="hidden border border-[#22c55e]/60 bg-black/60 px-2 py-1 font-pixel-en text-[9px] text-[#86efac] sm:inline-block" dir="ltr">
          ESC TO EXIT
        </span>
        <button
          className="btn btn-sm !border-[#22c55e] !bg-black/70 !text-[#86efac]"
          onClick={onExit}
          aria-label="الخروج من المصفوفة"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
