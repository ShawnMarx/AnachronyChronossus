# Build Log

Running log of implementation progress. Newest first.

## 2026-08-08 — Chronossus playtest fixes (11 items)

A batch of bug/flow/score-screen fixes from an iPad solo play. Details in
`docs/complete/20260808_CHRONOSSUS_PLAYTEST_FIXES_COMPLETED.md`.

- **Bugs:** persist Paradox/Warp/Hypersync rolls across Undo (`ChronossusUi` gains
  `warpRoll`/`paradoxRoll`/`hsRolledHex`); save-error UX with a Retry button.
- **Rules/flow:** Paradox roll cap `min(Era−1, warpTilesOnTimeline)` + repeating
  leads/ties loop; Hypersync starts on the 3 hexes (skips the intro); Recruit tells the
  player to discard the Worker tile; Superproject max VP → 8.
- **Score screen:** Superproject VP broken out from Building VP in scoring + VP pill;
  side-by-side You-vs-Chronossus tally; share/save the result as a PNG via the Web Share
  API (`src/game/shareScore.ts`), download fallback on desktop.
- **Follow-ups (TODO):** on-device verification; mirror roll-persistence + save-retry to
  the Chronobot view (its own snapshot system).

## 2026-08 — Chronossus base underway (Part A parity + B1 tiles/Autoleap)

Active plan: `docs/plans/PLAN_chronossus_base.md`. Base-game Chronossus only; opened to
everyone on the landing page.

- **Shared solo-bot core:** `SoloEngine` interface + registry (`engine/bots/soloEngine.ts`);
  `flow.ts` routes through `engineFor(state.config.bot)`; Chronobot re-expressed as an
  implementation. `chronossus?` slice on `GameState`.
- **Chronossus engine:** `ChronossusState`, `EnergyPool` draw + power-up math,
  `resolveAction` (all base actions + A/B action tiles + energy-core gain), **Autoleap**,
  `resolveHypersyncAction`, passing, `scoreChronossus`. Unit-tested.
- **Chronossus view:** `ChronossusGame.tsx` full Era loop on the shared `PhaseScreen`;
  Phase 5 renders the real board with the shared `DetailPanel`. 4 command-marker routes
  (`chronossusPaths.ts`), calibrate mode, board overlays.
- **Part A parity:** extracted shared modules used by both views — `useUndoableGame` +
  `undo.ts` (Chronossus undo/history/persistence), `HistoryPane`, `ReadyToBegin`,
  `FirstPlayerPrompt`, `TurnTracker`, `DebugBar`, `useMediaQuery`, `BadgePopover`/
  `ShapeIcon`, Simple Command View.

## 2026-07-31 — Optional BGE login: My-history + admin stats + in-app rules

See `docs/complete/20260731_AUTH_STATS_HISTORY_RULES_COMPLETED.md`.

- Optional shared-BGE login (whole app works logged-out); server-backed My-history +
  admin Overall-stats with BG Stats import/export; in-app GameBrain rules frame.

## 2026-07-28 — Full guided Era loop + landing page (Chronobot complete)

Chronobot is feature-complete and live. Details in
`docs/complete/20260728_CHRONOBOT_FULL_PHASES_COMPLETED.md`.

- **Landing/home screen** (`AppRoot` → `Landing` → `BoardExplorer`): pick a Solo
  opponent (Chronobot ready; Chronossus "Coming Soon"); a home icon returns here, and
  a cached game prompts Continue-vs-New.
- **Full phase flow**: `BoardExplorer` renders the whole Era loop by switching on
  `state.phase` — Setup (`SetupFlow`: flavor → difficulty → verbatim/app-modified
  setup) → Phases 1–6 via the `PhaseScreen` splash shell (`src/phases/`, sequencing in
  `src/game/flow.ts`) → End Game score screen. Paradox/Warp dice flows, First-Player
  handling, and game-end decided in Clean Up (Eras 5–6 flip Collapsing Capital tiles).
- **Engine**: `preparation` phase, paradox tracker, `firstPlayer`, difficulty flags
  (`reboot-advance`/`bot-extra-turn`/`min-actions-6`/`no-leader`), corrected Paradox die
  `[0,1,1,1,1,2]`, `rollParadox`/`endParadoxPhase`, Anomaly scoring (−3). Persistence v6.
- **Removed** the unwired legacy runner (`App.tsx`/`useGame.ts`) + `resolveParadox` shim.
- Button theming via `--act` (yellow-green) / `--pass` (pink) CSS vars.

## 2026-07-25 — Board Explorer (current default view)

Pivoted the default view to a board-first **BoardExplorer** (`src/BoardExplorer.tsx`,
wired in `main.tsx`); the guided game runner (`App.tsx`) is preserved for later.

- **Tap an action tile → detail panel** overlaid on the board's right zone (dark,
  purple Chronobot border). Verbatim rulebook text per action (`rule` in
  `chronobotActions.ts`) + `MECH_PLACEMENT`/`FAILED_ACTIONS`. "places an Exosuit"
  is an inline link to the mech-placement rules.
- **Icons**: 12 action-tile icons cropped from the board into a sprite sheet
  (`public/assets/solo/chronobot-icons.png`, 4×3, 144×90 cells) via
  `src/board/ActionIcon.tsx`; shown 2× in the panel header.
- **Debug harness**: top stats row (VP · Warp · Actions), Reset, seeded with 2 Warp
  tiles + 6 Exosuits. Tapping a tile resolves the action through
  `Chronobot.takeActionTurn`.
- **Mech placement gate**: any mech-placing action prompts Confirm placed / Cannot
  place before spending an Exosuit (Cannot place → +1 VP, no Exosuit).
- **Construct VP entry**: after placement, tap the tile's printed VP — **buildings
  1–4**, **superprojects 3–7** — added to the bot's score, tile discarded; max 3 per
  type (4th fails). Engine scores it via `buildingVP` input.
- **Board trackers** (`BOARD_COUNTERS` in `chronobotHotspots.ts`): 8 on-board count
  badges — Mechs (hexagon), Breakthroughs (bottom-left), Superproject + 4 buildings +
  Anomalies (bottom row).
- **Position calibration**: `pw-validate.mjs` (Playwright, cached Chromium at
  `ms-playwright/chromium_headless_shell-1217`) measures each badge's rendered
  position; plus an in-app **calibrate mode** (toggle in the top bar) — click the
  board to place the selected badge, arrow-keys nudge, panel emits the exact
  `BOARD_COUNTERS` literal.

## 2026-07-22 — Chronobot v1

**Recon / assets**
- Proved the TTS asset pipeline end-to-end: resolve a component GUID (from the mod's
  global Lua `SOLO` table) → its `ImageURL` → the matching file inside the `.ttsmod`
  ZIP → extract. Solo board (both faces), AI die, and action tiles all extract cleanly.
- Extracted to `public/assets/solo/`: `board-chronossus.jpg`, `ai-die.jpg`.
- AI die faces read as numbers paired with a fist/exosuit glyph. **Open item:** confirm
  the exact 6 faces + how they map to the 4 Command tokens (2/3/4/5) with the physical
  die. Engine keeps `aiDieFaces` as configurable data so this is a one-line fix.
- The mod's Lua is a 3D-simulation engine (spatial moves), so it's an oracle for phase
  *text* and setup, not a clean die→action table. Board arrow routing is printed on the
  board; treating it as **seeded + player-correctable** data for v1 rather than guessing
  pixel-perfect geometry (user owns the physical board to verify in testing).

**Engine scope for v1 (Chronobot)**
- Full setup guide + per-Era phase flow: Paradox → Power Up → Warp → Action Rounds →
  Clean Up, then End-of-Game scoring.
- App performs all bot randomness (AI die, paradox die).
- Action Rounds: the valuable core = full **decision resolution** for every Chronobot
  action (Construct / Recruit / Research / Recruit-Genius-or-Research / Mine / Time
  Travel / Remove Anomaly / Reboot) with priority rules + JIT explanations, plus Failed
  Action handling, min-3-actions, and passing logic.
- Bot bookkeeping tracked by the app: exosuits, VP, resources, workers, breakthroughs,
  buildings, superprojects, anomalies, warp tiles, time-travel track, actions this era.
- Where a choice needs physical board info (e.g. which building has higher VP), the app
  states the rule and asks the player to apply it (`requiresInput`).

**Chronobot v1 — DONE (testable).** `npm run dev` then choose Chronobot.
- Engine: `src/engine/bots/chronobot.ts` (pure phase functions + decision helpers),
  `rules/chronobotActions.ts` (action catalog + JIT text), expanded `types.ts`/`state.ts`.
- UI: `src/App.tsx` guided flow — setup checklist → per-Era Paradox/Power Up/Warp/Action
  Rounds/Clean Up → end-game scoring; live Chronobot status panel; collapsible board art;
  action picker with per-action "why?" JIT text; app rolls AI/paradox/shape dice.
- Tests: 21 passing (`npm test`) — decision priorities, phase transitions, failed-action
  handling, pass logic, scoring, and a full-era integration playthrough.
- Verified: `tsc` + `vite build` clean, `oxlint` clean, dev server serves app + assets 200.

**Open items to confirm with the physical game during testing:**
1. AI die faces + how they map to the 4 Command tokens (2/3/4/5). Currently
   `AI_DIE_FACES=[1..6]` in `engine/index.ts` — one-line fix once known.
2. Board arrow routing / which action sits on each token's space. v1 has the player pick
   the action from the grid each roll (also serves as the JIT reference). Once geometry is
   confirmed we can auto-predict the action per die face (the true "roll-outcome grid").
3. Paradox phase: v1 asks "did it gain an Anomaly?" (player resolves the physical roll)
   because anomaly gain depends on maturing Warp tiles the app doesn't fully track.
