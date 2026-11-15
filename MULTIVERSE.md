# 🎨 JACKAROO LEAGUE — Multiverse, Avatars, Audio & Screen Effects

This update adds player-customizable **world themes**, a **pixel-art avatar
creator**, **per-theme 8-bit music**, a **continuous arcade screen shake** and an
animated **match-result / live-ranking sequence**.

Everything below was added *on top of* the existing project. The league itself —
players, seasons, matches, points, ranking calculations, achievements, the pixel
look, Chaos Mode and all easter eggs — is untouched.

---

## 1. Multiverse themes — 7 worlds, all free

| World | `data-world` | Atmosphere | Original track |
| --- | --- | --- | --- |
| الكلاسيكي | `classic` | The original dark arcade look | ليلة الجاكارو (96 BPM) |
| سايبربنك | `cyberpunk` | Neon purple/blue/pink, futuristic skyline | نيون فوق المدينة (118 BPM) |
| المحيط | `ocean` | Deep blue/turquoise, bubbles, water | أعماق مرجانية (92 BPM) |
| الأركيد | `arcade` | 1985 arcade hall, CRT scanlines, neon | طاولة الأركيد (140 BPM) |
| مملكة الفطر | `mushroom` | Cheerful platformer: clouds, green pipes | مملكة السحاب (132 BPM) |
| فايس سيتي | `vice` | Pink sunset, palm silhouettes, neon grid | غروب الأطلسي (104 BPM) |
| الكازينو الغامض | `balatro` | Purple/red/dark, playing-card details | ورقة الحظ (100 BPM) |
| الصحراء | `desert` | Muted yellow/green, desert lab, chemistry | حرارة الصحراء (88 BPM) |

- No unlocks, no trophies, no currencies, no shop, no payments — everything is
  available immediately for every player.
- A theme changes **backgrounds, cards, buttons, panels, menus, borders and
  effects** (`src/app/themes.css`, every rule scoped to `[data-world="…"]`).
- **Preview before applying**: choosing a card only previews it; «تطبيق الثيم»
  commits it. «ثيم عشوائي» (also in the header) rolls a random world.
- The selected world is remembered per player (browser + database) and survives
  logout/login and device changes.
- Accent colour is now `theme`-driven by default and can still be overridden with
  the existing accent picker.

## 2. Pixel-art avatar creator

`src/lib/avatar.ts` (pure model) + `src/components/avatar/*` (UI).
Exactly the requested option counts:

| Group | Options |
| --- | --- |
| Skin | 8 natural + 3 fantasy tones = **11** |
| Hairstyles | **8** (short, spiky, long, ponytail, afro, mohawk, fringe, bald) |
| Hair colours | **8** |
| Eyes | **5** (normal, wide, happy, sharp, sunglasses) |
| Outfits | **8** |
| Accessories | **5** (none, cap, headphones, scarf, glasses) |

Live preview, Randomize, Reset and Save. Every part is drawn on one 16×16 grid,
so all 140,800 combinations line up. Avatars appear in the leaderboard, player
profiles, the dashboard hero cards, the head-to-head page and match-history rows
(`PixelAvatar` now prefers a saved avatar and falls back to the original
deterministic art for players who never customized).

## 3. Audio

New `Audio` settings section: master / music / SFX sliders, **Mute All**,
background-music toggle, SFX toggle and a **theme-music preview**.

- Music is synthesised live (`src/lib/audio/engine.ts`) — a look-ahead chiptune
  sequencer with pulse/square/triangle/saw voices, bass, arpeggios and
  synthesised kick/snare/hat. No audio files, no external requests.
- Loops seamlessly and **keeps playing through navigation** (the engine lives
  outside React on `globalThis`).
- Changing world fades the old loop out, resets the sequencer and starts the new
  one → **tracks can never overlap**.
- Playback only begins after a real user gesture (autoplay policy) and pauses
  when the tab is hidden.
- Volumes are composed as `master × channel`; the existing 8-bit SFX and the
  easter-egg synth all respect the SFX level (so Mute All really mutes).

## 4. Continuous arcade screen shake

`Screen Shake` settings section: enable/disable, intensity slider 0–100 %
(default **35 %**), OFF switch, and presets at 0/25/50/100 %.

- CSS `transform` keyframes on `.shake-target` regions (header, page content,
  mobile dock) → compositor-only motion, **no layout shift**, no per-frame JS.
- Overlays and modals are not targeted, so forms, menus and dialogs stay still.
- 0 % = no movement at all; the amplitude is ≈1.6 px at 25 %, ≈3.2 px at 50 %,
  ≈6.5 px at 100 %.
- `prefers-reduced-motion` disables it automatically; saved per player.

## 5. Match result animation & live ranking movement

When a match is saved successfully, `MatchResultSequence` plays:

1. **MATCH COMPLETE** arcade banner → 2. the result → 3. previous positions →
4. rows animate into the new official positions → 5. climbers highlighted →
6. #1 celebrated with an Arabic line → 7. fallers highlighted → 8. funny Arabic
message for last place → final leaderboard.

- Positions come from the real engine only (`computeLeague` before/after the
  saved match). Nothing is invented and nothing is recalculated by the UI.
- Handles multi-position moves, new entrants and leader changes.
- «تخطي الحركة» skips the sequence; the animation can be disabled in Settings.
- Retro SFX per stage, Arabic RTL layout, reduced-motion friendly.

## 6. Settings organisation

`/settings` now has clearly separated sections and keeps every previous option:

1. المظهر والثيمات (Multiverse)
2. تخصيص الأفاتار
3. الموسيقى والصوت
4. اهتزاز الشاشة المستمر
5. حركات نتيجة المباراة
then the original sections (Chaos Mode, trash talk, SFX, animation intensity, the
effects lab and the original appearance controls).

## 7. Database & player preferences

`player_preferences` (new table only):

```sql
player_id uuid primary key, theme text, avatar jsonb,
master_volume int, music_volume int, sfx_volume int,
music_enabled bool, sfx_enabled bool,
shake_enabled bool, shake_intensity int,
match_animations bool, updated_at timestamptz
```

- Created idempotently at runtime (`src/db/init.ts`) and as an explicit
  migration (`drizzle/migrations/0001_player_preferences.sql`).
- **No existing table is altered or reset**; players without a row get safe
  defaults (classic theme, 35 % shake, 80/40/70 volumes, animations on).
- API: `GET/PUT/PATCH /api/players/:id/prefs` (+ `GET /api/avatars` for the
  leaderboard map). Preferences can never modify players, matches or rankings.

## 8. Verification

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # stats + chaos/pixel + easter eggs + multiverse suites
npm run build       # production build
```

`tests/multiverse.test.mts` covers theme metadata/random picker, avatar option
counts/normalisation, preference defaults & clamping, shake amplitude mapping
(0/25/50/100 %), audio mixing, music track structure, notation parsing and the
ranking-movement maths against the real `computeLeague` engine.

## 9. Copyright

All palettes, sprites, patterns and music here are original work created for
this project. The themes only *evoke* a genre/atmosphere — no copyrighted
characters, logos, sprites, recordings or melodies are reproduced, and no
external audio or image assets are downloaded.
