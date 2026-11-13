# 🥚 JACKAROO LEAGUE — Secret Easter Eggs (maintainer guide)

A fully **client-side, opt-in-by-discovery** easter-egg layer. It is completely
isolated from the league system: **no API routes, no database changes, no
league data is ever read or written**. Discovery progress, achievements and
virtual chips live in `localStorage` only and are never sent to the server.

## How players activate secrets

Codes are **typed anywhere on the page** (not inside real input fields), like
classic arcade cheat codes. Codes are case-insensitive and must be typed as a
whole word (typing `carpet` will *not* fire the `pet` code). The keystroke
buffer resets after ~1.8s of inactivity.

| Code | Secret |
| --- | --- |
| `blackjack` | 🃏 Secret blackjack table (offline, virtual chips: 1000) |
| `developer` | 💻 Developer room (retro terminal with fake diagnostics) |
| `glitch` | ⚡ Temporary purely-visual glitch event |
| `boss` | 👹 Boss fight: **THE LAST PLACE** |
| `alien` | 🛸 UFO invasion event |
| `matrix` | 🟢 Matrix mode (ESC or ✕ to exit) |
| `pet` | 🌱 Hidden pixel companion (toggles) |
| `secrets` | 🗝️ Secret discovery vault |

Hidden interactions (no code):

- **7 quick clicks on the logo** → secret fan-club animation.
- **Long-press the logo (0.7s)** → hidden code pad — the mobile-friendly way
  to enter codes on touch devices.
- **↑ ↑ ↓ ↓ ← → ← → B A** → the legendary code.
- A shy pixel figure occasionally peeks from a random screen corner.
- Rare absurd league messages appear once in a while.
- A **1% chance on website load** (once per browser session, ≥6h cooldown)
  shows "YOU HAVE BEEN SELECTED TO MANAGE THE LEAGUE" — a purely visual joke
  that closes instantly and changes nothing.

## Secret achievements (browser-local only)

`first_blackjack`, `lucky_21`, `streak_5`, `dealer_destroyer`,
`glitch_survivor`, `alien_encounter`, `matrix_explorer`, `secret_hunter`
(all eggs except the pure-luck 1% event).

These are **completely separate** from the league achievements system.

## Architecture

```
src/components/easter/
├── EasterEggProvider.tsx   # manager: keystroke capture, registry, overlays, toasts
├── eggData.ts              # pure registry: eggs, achievements, code matching
├── eggStore.ts             # localStorage discovery/achievements/chips store
├── eggSfx.ts               # isolated 8-bit synth (respects the global mute toggle)
├── eggArt.tsx              # pixel sprites (cards, boss, UFOs, pet, …)
├── eggMessages.ts          # all the jokes
├── useReducedMotion.ts     # hydration-safe reduced-motion hook
├── EggModal.tsx            # shared overlay shell (Escape, scroll lock, RTL)
├── BlackjackGame.tsx       # + blackjackEngine.ts (pure, unit-tested logic)
├── DeveloperRoom.tsx
├── GlitchMode.tsx
├── SecretBoss.tsx
├── AlienInvasion.tsx
├── MatrixMode.tsx
├── HiddenPet.tsx
├── RareEvent.tsx
├── SecretCollection.tsx
└── SecretInteractions.tsx  # logo clicks, long-press pad, Konami, stalker, rare msgs
```

Integration points (intentionally minimal & additive):

- `src/app/layout.tsx` — mounts `<EasterEggProvider>` around `<Shell>`.
- `src/components/Shell.tsx` — one inert `data-egg-logo` attribute on the logo.
- `src/app/globals.css` — one appended `egg-` prefixed CSS section.
- `tests/easter-eggs.test.mts` — unit tests for the pure logic.

## Adding a new easter egg

1. Add an `EggDef` to `EGGS` in `eggData.ts` (id, code, title, desc, hint, icon).
2. Add a sprite in `eggArt.tsx` if needed.
3. Handle its `id` in `EasterEggProvider.openEgg()` and render its component.
4. Discovery, achievements, the vault listing and the "secret hunter" progress
   all update automatically from the registry.

## Safety guarantees

- No easter egg ever calls a league API, touches players/matches/rankings, or
  modifies real achievements.
- Glitch mode is overlay-only (backdrop filters) — it can never break
  navigation, buttons or forms, and always ends by itself.
- All overlays clean up their timers/animation frames on close; loops pause
  when the tab is hidden; sounds respect the global mute toggle and only start
  after user interaction.
- Reduced-motion preference disables all heavy animation (CSS is covered by
  the existing global `prefers-reduced-motion` rules; canvas/JS loops check
  `useReducedMotion()` / `matchMedia` directly).
- Virtual blackjack chips have **zero real-world value**: no payments, no
  purchases, no gambling integrations — the game is 100% offline.
