# 🎨 JACKAROO LEAGUE — Multiverse, Avatars, Audio & Screen Effects

This update adds player-customizable **living world environments**, a
**pixel-art avatar creator**, **per-theme 8-bit music**, a rebuilt **screen
shake**, an animated **match-result / live-ranking sequence** and a standalone
**blackjack casino**.

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
- A theme is a **full-page animated environment**, not a colour swap:
  `src/components/themes/worldScenes.tsx` (art) + `src/app/worlds.css` (motion)
  render one fixed, `pointer-events: none`, `aria-hidden` layer *behind* the
  real content. Each world has its own sky, silhouettes, particles and lighting:

  | World | Environment |
  | --- | --- |
  | المحيط | depth-graded water, caustic light shafts, drifting bubbles, swaying seaweed, three crossing fish, sandy floor |
  | سايبربنك | two skyline layers, neon signs, rain streaks, wet-floor reflections, grid floor, occasional glitch |
  | الأركيد | CRT scanlines + vignette, floating pixel stars, retro glyphs, marquee glow |
  | مملكة الفطر | parallax clouds, rolling hills, floating coins, ?-blocks and pipes |
  | فايس سيتي | pink/purple sunset gradient, sun disc, swaying palms, distant city lights, water shimmer |
  | الكازينو الغامض | slow-drifting playing cards, floating suits, warm overhead casino light |
  | الصحراء | layered mountains, large sun, drifting sand motes, heat haze, cacti silhouettes |

- Cards, panels, buttons, inputs and nav still change colour per world
  (`src/app/themes.css`), and `html:not([data-world="classic"])` guards give
  surfaces a solid plate so text stays readable over the motion.
- **Controls**: master animation toggle + 4 intensity levels (`.wenv-root`
  `data-bg` / `data-bg-level`), saved with the other preferences. Intensity and
  the toggle are honoured live, and `prefers-reduced-motion` stops everything.
- **Previews are accurate**: the Settings preview mounts the *same*
  `SCENES` art inside a stage that is a full viewport scaled down to the card
  width (ResizeObserver), so every `vh`/`vw` decoration lands exactly where it
  does on the real page.
- Every animation only touches `transform` / `opacity` (asserted by
  `tests/environments.test.mts`), so there is no layout thrash, and the old
  per-world `body` decorations plus the duplicate keyframe system were retired —
  one background system per world.
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

## 4. Screen shake (rebuilt)

**Off by default**, 15 % when first enabled. Settings section «اهتزاز الشاشة»:
enable switch, 0–100 % slider, presets at 0/10/15/35/100 % and a live preview
button («معاينة مباشرة», also triggered by dragging the slider).

- The old design ran **two competing CSS keyframes** on the same element,
  which is what produced the harsh, jumpy motion. It was replaced by a single
  `requestAnimationFrame` loop (`src/components/prefs/ScreenShake.tsx`) writing
  one accumulated `translate3d(...) rotate(...)` to `.jl-shake` regions.
- Amplitude curve (`shakeAmplitude`): 0 %→0 px, 10 %→0.36 px, 15 %→0.57 px,
  35 %→1.50 px, 50 %→2.25 px, 100 %→5 px. **0 % writes no transform at all.**
- Only transform is animated → no layout shift, no scroll jump, no change to
  hit targets, so clicking, typing and reading are never affected. Overlays,
  modals and the casino table are not wrapped.
- Pulses are event-driven (settlement, celebration), never a constant shake.
- `prefers-reduced-motion`, the OFF switch and 0 % all fully disable it; the
  value is saved with the player's preferences.

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

`/settings` is now organised in the five requested numbered sections and keeps
every previous option:

1. **المظهر والثيمات** — world picker (live previews) + «حركة الخلفية العامة»
   (master toggle, intensity).
2. **الموسيقى والمؤثرات** — master/music/SFX volumes, mute, music + SFX toggles,
   per-world soundtrack status list.
3. **اهتزاز الشاشة والمؤثرات البصرية** — shake switch/slider/preview + match
   result animations.
4. **تخصيص الأفاتار** — the avatar creator.
5. **الكازينو والبلاك جاك** — casino SFX switch, default table, virtual-chip
   disclaimer, top-up/practice chips, clear history, reset.

Then the retained sections (appearance theme/accent/animations, Chaos Mode,
trash talk, SFX and the effects lab) — nothing was removed.

## 7. Database & player preferences

`player_preferences` (new table only):

```sql
player_id uuid primary key, theme text, avatar jsonb,
master_volume int, music_volume int, sfx_volume int,
music_enabled bool, sfx_enabled bool,
shake_enabled bool, shake_intensity int,
match_animations bool,
bg_animations bool, bg_intensity int,          -- 0002
casino_sfx_enabled bool, casino_table text,     -- 0003
updated_at timestamptz
```

Plus `casino_local` (0002): `player_id`, `chips`, `practice_chips`, `table_id`,
`custom_rules`, `stats`, `history`, `sound_enabled`, `updated_at` with
`chips >= 0` / `practice_chips >= 0` checks. It is an optional backup of the
browser-owned virtual casino state and has no relation to league points.

- Created idempotently at runtime (`src/db/init.ts`) and as explicit migrations:
  `0001_player_preferences.sql`, `0002_world_environments_and_casino.sql`,
  `0003_casino_preferences.sql` — **additive only**: no column is dropped,
  retyped or renamed and no row is deleted.
- **No league table is altered or reset**; players without a row get safe
  defaults (classic theme, shake OFF at 15 %, 80/40/70 volumes, animations on,
  casino sound on, classic casino table).
- API: `GET/PUT/PATCH /api/players/:id/prefs` (+ `GET /api/avatars` for the
  leaderboard map). Preferences can never modify players, matches or rankings.

## 8. Verification

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # stats + chaos/pixel + easter eggs + multiverse suites
npm run build       # production build
```

- `tests/multiverse.test.mts` — theme metadata/random picker, avatar options,
  preference defaults & clamping, shake mapping, audio mixing, music structure,
  notation parsing and ranking movement against the real `computeLeague`.
- `tests/casino.test.mts` (51 checks) — the blackjack engine: soft/hard totals,
  multiple aces, naturals, splits/resplit/resplit-aces, double, surrender,
  insurance/even money, dealer BJ/bust, push, side bets, and that every hand and
  bet settles **exactly once** with a non-negative balance.
- `tests/environments.test.mts` (44 checks) — full-page scene coverage per world,
  fixed/behind/pointer-events-none layer, decoration presence, transform/opacity
  only animations, off/reduced-motion/intensity guards, accurate previews, the
  rebuilt shake curve at 0/10/15/35/50/100 %, the audio-honesty contract, casino
  store sanitisation and settings order.

## 9. Copyright and audio honesty

All palettes, sprites, patterns and music here are original work created for
this project. The themes only *evoke* a genre/atmosphere — no copyrighted
characters, logos, sprites, recordings or melodies are reproduced, and no
external audio or image assets are downloaded.

`src/lib/audio/sources.ts` is the single place where *licensed* soundtrack files
can be registered:

- It is **empty by design**. `audioStatus(theme)` therefore reports
  «لم تُضف موسيقى مرخّصة بعد» for every world, and the world plays its original
  8-bit chip composition.
- To add a file: put it at `public/audio/licensed/<theme>.mp3` and add an entry
  `{ theme, src, licence, attribution, verified: true }`. `verified` may only be
  set after the file really exists — a test asserts this.
- No soundtrack is ever extracted from a game, video or stream, and nothing
  generated is ever labelled as an original soundtrack.

## 10. Blackjack casino (standalone)

`/casino` — a self-contained casino with its own identity, **independent of the
selected league theme** (`.casino-backdrop` + `src/app/casino/casino.css` paint
their own dark ambience over the world layer).

- Pages: lobby `/casino` (tables / stats / rules / settings), `/casino/play`
  (table + rules panel + table select), `/casino/history` (full round log),
  `/casino/strategy` (hard/soft/pairs basic strategy).
- Pure, DOM-free engine in `src/lib/casino/`: `cards`, `tables`, `sideBets`,
  `engine` (reducer), `settlement` (chips + ledger), `stats`, `strategy`,
  `store` (browser storage), `sound`. Deterministic tests, no randomness in the
  settlement path.
- Six real rule configurations (Classic, Vegas Strip, Atlantic City, European,
  High Roller, Custom) — decks, H17/S17, 3:2 or 6:5, peek, hole card vs ENHC,
  DAS, split limits, resplit aces, split-ace rules, surrender timing, BJ after
  split, side-bet availability. The felt prints the live payline and dealer
  rule, so the table can never advertise rules it does not use.
- Settlement is centralised and idempotent: a round id can only be applied once
  (`settleRoundChips` + ledger), wins pay `stake + winnings`, losses deduct the
  reserved stake once, pushes return it, blackjack follows the table payout,
  double/split/side/insurance are tracked separately, balance is clamped at 0
  and chips never touch league points, rankings or statistics.
- Chips are virtual only: no purchases, no currencies, no store.
