"use client";

/**
 * Simple pixel-art avatar creator — deliberately uncomplicated.
 * Live preview, a Randomize and a Reset button, and one Save button that
 * writes to the player's own database row (and keeps a local draft).
 */

import { useState } from "react";
import { PixelIcon } from "@/components/PixelArt";
import { useLeague } from "@/components/LeagueProvider";
import { useChaos } from "@/components/ChaosEngine";
import { useAppearance } from "@/components/Settings";
import { usePlayerPrefs, newAvatarSeed } from "@/components/prefs/PlayerPrefsProvider";
import {
  ACCESSORIES,
  AVATAR_OPTION_COUNTS,
  DEFAULT_AVATAR,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  SKIN_TONES,
  avatarsEqual,
  randomAvatar,
  type AvatarConfig,
} from "@/lib/avatar";
import { AvatarSprite } from "./AvatarSprite";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-extrabold">{title}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function AvatarEditor({ compact = false }: { compact?: boolean }) {
  const { players, activePlayers, loaded, admin, toast } = useLeague();
  const { prefs, setLocal, selectProfile, saving, syncError } = usePlayerPrefs();
  const { sfx } = useChaos();
  const { a } = useAppearance();

  // The draft is tagged with the avatar/profile it started from, so switching
  // player or saving elsewhere resets it without a setState-in-effect.
  const source = `${prefs.profilePlayerId ?? "local"}|${JSON.stringify(prefs.avatar)}`;
  const [draftState, setDraftState] = useState<{ source: string; value: AvatarConfig }>({
    source,
    value: prefs.avatar,
  });
  const draft = draftState.source === source ? draftState.value : prefs.avatar;
  const setDraft = (value: AvatarConfig | ((d: AvatarConfig) => AvatarConfig)) => {
    const base = draftState.source === source ? draftState.value : prefs.avatar;
    setDraftState({ source, value: typeof value === "function" ? value(base) : value });
  };

  const isAdmin = admin === "admin";
  const profile = players.find((p) => p.id === prefs.profilePlayerId) ?? null;
  const options = isAdmin ? players : activePlayers;

  const dirty = !avatarsEqual(draft, prefs.avatar);
  const change = (patch: Partial<AvatarConfig>) => {
    setDraft((d) => ({ ...d, ...patch }));
    sfx("click");
  };

  const doSave = async () => {
    if (!profile) {
      toast("اختر اللاعب الحالي أولاً حتى يُحفظ الأفاتار على حسابه.", "err");
      return;
    }
    // The PATCH below is the authoritative save for the avatar; the local
    // store is updated in place so the whole site reflects it immediately.
    try {
      const res = await fetch(`/api/players/${profile.id}/prefs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: draft }),
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (res.ok && json?.ok) {
        setLocal({ avatar: draft });
        toast(`✅ تم حفظ الأفاتار على حساب «${profile.name}».`, "ok");
        sfx("achievement");
        window.dispatchEvent(new CustomEvent("jl:prefs-changed"));
      } else {
        setLocal({ avatar: draft });
        toast(json?.message ?? "تم الحفظ على هذا الجهاز فقط؛ الخادم غير متاح حالياً.", "err");
      }
    } catch {
      setLocal({ avatar: draft });
      toast("تم الحفظ على هذا الجهاز فقط؛ تعذر الاتصال بالخادم.", "err");
    }
  };

  const counts = AVATAR_OPTION_COUNTS;

  return (
    <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]"}`}>
      {/* ------------- live preview ------------- */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="pixel-frame grid place-items-center"
          style={{
            width: compact ? 128 : 176,
            height: compact ? 128 : 176,
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--accent) 18%, var(--card)), var(--card))",
          }}
        >
          <AvatarSprite
            config={draft}
            size={compact ? 112 : 152}
            label="معاينة الأفاتار"
          />
        </div>

        <label className="w-full">
          <span className="label mb-1">اللاعب الحالي (تُحفظ إعداداته على حسابه)</span>
          <select
            className="input !min-h-[42px] text-sm"
            value={prefs.profilePlayerId ?? ""}
            onChange={(e) => {
              void selectProfile(e.target.value || null);
              sfx("notification");
            }}
            disabled={!loaded}
          >
            <option value="">— بدون حساب (محلي فقط) —</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.archived ? " (مؤرشف)" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="flex w-full flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm flex-1"
            onClick={() => {
              const seed = newAvatarSeed();
              setDraft(randomAvatar(seed));
              sfx("notification");
            }}
          >
            <PixelIcon name="dice" size={16} /> عشوائي
          </button>
          <button
            type="button"
            className="btn btn-sm flex-1"
            onClick={() => {
              setDraft({ ...DEFAULT_AVATAR });
              sfx("click");
            }}
          >
            ↩️ إعادة ضبط
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={doSave}
          disabled={!profile || saving || !dirty}
        >
          <PixelIcon name="sparkle" size={16} /> {saving ? "جارٍ الحفظ…" : dirty ? "حفظ الأفاتار" : "محفوظ"}
        </button>
        {!profile && (
          <p className="text-center text-[11px] text-muted">
            الأفاتار يُحفظ لكل لاعب. اختر اسمك من القائمة أعلاه لربط هذا المتصفح بحسابك.
          </p>
        )}
        {syncError && <p className="text-center text-[11px] text-bad">{syncError}</p>}
      </div>

      {/* ------------- options ------------- */}
      <div className="stack !gap-3">
        <Section title="لون البشرة" hint={`${counts.skin} خياراً`}>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
            {SKIN_TONES.map((t, i) => (
              <button
                key={t.name}
                type="button"
                role="radio"
                aria-checked={draft.skin === i}
                aria-label={t.name}
                title={t.name}
                className="av-swatch"
                onClick={() => change({ skin: i })}
              >
                <span
                  className="block h-6 w-6 border border-black/40"
                  style={{ background: t.color }}
                />
              </button>
            ))}
          </div>
        </Section>

        <Section title="تسريحة الشعر" hint={`${counts.hair} خيارات`}>
          <div className="grid grid-cols-4 gap-1.5">
            {HAIR_STYLES.map((h) => (
              <button
                key={h.id}
                type="button"
                role="radio"
                aria-checked={draft.hair === h.id}
                className="av-choice"
                onClick={() => change({ hair: h.id })}
              >
                <AvatarSprite config={{ ...draft, hair: h.id }} size={26} />
                <span className="truncate">{h.name}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="لون الشعر" hint={`${counts.hairColor} خياراً`}>
          <div className="grid grid-cols-8 gap-1.5">
            {HAIR_COLORS.map((c, i) => (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={draft.hairColor === i}
                aria-label={c.name}
                title={c.name}
                className="av-swatch"
                onClick={() => change({ hairColor: i })}
              >
                <span className="block h-6 w-6 border border-black/40" style={{ background: c.color }} />
              </button>
            ))}
          </div>
        </Section>

        <Section title="شكل العينين" hint={`${counts.eyes} خيارات`}>
          <div className="grid grid-cols-5 gap-1.5">
            {EYE_STYLES.map((e) => (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={draft.eyes === e.id}
                className="av-choice text-[11px]"
                onClick={() => change({ eyes: e.id })}
              >
                <AvatarSprite config={{ ...draft, eyes: e.id }} size={24} />
                <span className="truncate">{e.name}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="الزي" hint={`${counts.outfit} خيارات`}>
          <div className="grid grid-cols-4 gap-1.5">
            {OUTFITS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={draft.outfit === o.id}
                className="av-choice text-[11px]"
                onClick={() => change({ outfit: o.id })}
              >
                <span className="block h-4 w-4 border border-black/40" style={{ background: o.color }} />
                <span className="truncate">{o.name}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="الإكسسوار" hint={`${counts.accessory} خيارات`}>
          <div className="grid grid-cols-5 gap-1.5">
            {ACCESSORIES.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={draft.accessory === x.id}
                className="av-choice text-[11px]"
                onClick={() => change({ accessory: x.id })}
              >
                <AvatarSprite config={{ ...draft, accessory: x.id }} size={24} />
                <span className="truncate">{x.name}</span>
              </button>
            ))}
          </div>
        </Section>

        <p className="text-[11px] text-muted">
          جميع الخيارات مجانية ومتاحة فوراً. {a.sound ? "أصوات 8-بت مفعّلة." : ""}
        </p>
      </div>
    </div>
  );
}
