# PLAN — Chronossus (base game) solo opponent

Single combined plan + execution tracker (merges the former `PLAN_` concept doc and
`LOG_` tracker). **Scope:** base-game Chronossus only. Fractures of Time (Flux Pool /
Cores / Fracture Device) and other modules are deferred. **Gating:** Chronossus is
admin-only (`shawn@shawnmarx.com`) or any local run; everyone else keeps the
"Coming Soon" card. Mark `[x]` as steps land; note deviations inline.

The rulebook frames Chronossus as "Chronobot + deltas", so the architecture is a
**shared solo-bot core** with Chronossus-specific behavior layered on. Every step keeps
`npm run build` clean and `npm test` green; Chronobot must never regress.

Rulebook: `…/reference/Rules/Anachrony-Chronobot-and-Chronossus-Solo-Opponents-…pdf`
— **Chronossus rules pp. 8–10, appendix pp. 19–22**.

---

## ✅ Done (condensed)

- **F1 Shared framework** — `SoloEngine` interface + registry (`engine/bots/soloEngine.ts`);
  `flow.ts` routes through `engineFor(state.config.bot)`; Chronobot re-expressed as an
  implementation. `chronossus?` slice on `GameState`.
- **F3 Engine: state + Power Up** — `ChronossusState`/`emptyChronossusState`,
  `EnergyPool` (5/5), `drawEnergyPool`, power-up math (`poweredExosuits` 3+X/2+X caps 6/4),
  `poolAfterDraw`, `resolvePowerUp`. Unit-tested.
- **F4 (slice) single-action resolver** — `resolveAction` covers all base actions on the
  Chronossus slice (reusing the Chronobot decision helpers via structural compatibility),
  the Failed-no-space discard-Exosuit nuance, and the 3 default A-side tile actions
  (C01A Reboot / C02A Score +2 / C03A Energy Pack). Passing (`wouldPassOn`/`passChronossus`)
  + `actionRoundsEnded`. Scoring `scoreChronossus` (breakthroughs + sets + Time Travel;
  **no Solo Objectives yet**).
- **F6 board view** — `ChronossusGame.tsx` full Era-loop shell on the shared `PhaseScreen`;
  Phase 5 renders the real board with the exported `DetailPanel` (`botName="Chronossus"`) so
  the action pop-ups are visually + behaviorally identical to the Chronobot's. Command
  markers on 4 per-token routes (`chronossusPaths.ts`), calibrate mode, board counters/
  trackers, Time Travel / Warp / Paradox overlays. Boots into Phase 5 (dev harness).
- **F7 landing** — Chronossus card playable when `isAdmin || isLocalRun`; `AppRoot` launches
  the view. (`chronossus.implemented` still `false` — flip when the game view is complete.)
  Since opened to **everyone** (commit `4c515f3`); the landing card carries the Uploading bar.
- **PART A** — action-stage parity + shared UI: **complete** (see A1–A6 below).
- **B1 (action tiles + Autoleap + energy-core gain)** — A/B tile catalog, Autoleap flow
  (engine + UI + history + heads-up label + Start-Your-Turn dialog), gaining Energy Cores,
  and the Hypersync Action/tile flow all landed and unit-tested (`chronossus.test.ts`;
  `board/chronossusTiles.ts`). Note: no standalone `engine/rules/chronossusActions.ts` —
  tile effects live in `resolveAction`/`resolveHypersyncAction` + `chronossusTiles.ts`.
- **Playtest fixes (2026-08-08)** — 11 bug/flow/score-screen fixes shipped; see
  `docs/complete/20260808_CHRONOSSUS_PLAYTEST_FIXES_COMPLETED.md`.

Deliberate, keep-as-is differences from Chronobot: board positions, extra/modular action
spaces, art assets, warm theme, the 4 independent command-marker routes, and the simpler
**passing rule** (out of Exosuits → pass the next Exosuit-placing action; token doesn't
advance; no fixed "min 3 Actions"). Do NOT port the Chronobot's `botPassDecision`/
final-Time-Travel pass. Per-module **difficulty options** are deferred (a later step adds
a module-selection stage).

---

## PART A — Action-stage parity with the Chronobot + shared UI  *(✅ complete)*

The Chronossus Action stage reused the pop-up but stubbed/omitted the turn-loop scaffold
around it. Bring it to parity by **extracting shared modules** used by both views
(`BoardExplorer` + `ChronossusGame`), not by copying.

### A1. Shared undo / history / persistence
- [x] Extract the Snapshot/UndoEntry model + `commit`/`undo` + localStorage save/load
  (`BoardExplorer.tsx` ~L94-113, L223-319, L789-832) into a generic
  `src/game/useUndoableGame.ts` hook: `useUndoableGame<TUi>({ storageKey, initial })` →
  `{ state, ui, commit, undo, canUndo, entries, reset }`. `TUi` is the transient token/die
  slice (Chronobot `{ tokens, botDie, activeToken }`; Chronossus `{ markerSteps, botDie,
  activeMarker }`). Entries carry Era via `snap.state.era`.
- [x] Chronossus gets its own `storageKey` (`anachrony:chronossus`, already in
  `OTHER_OPPONENT_KEYS`); reuse `summarizeTurn` for per-turn labels (works on the slice).
- [~] **Deviation:** BoardExplorer keeps its proven inline undo/persistence model (the
  hook fold-in is pervasive and would drop players' in-progress saves); the shared
  `useUndoableGame` hook + `undo.ts` types/persistence serve **Chronossus**. Real ↶ Undo,
  🕑 History, and reload-rehydrate are wired into `ChronossusGame` (runtime-verified:
  Turn 6 → Undo → Turn 5, History pane lists per-turn summaries).

### A2. Shared presentational components (parameterized by `botName`)
- [x] `src/history/HistoryPane.tsx` — move the existing `HistoryPane` (`BoardExplorer` ~L2189).
- [x] `src/phases/ReadyToBegin.tsx` — "Ready to begin — Era N" splash (~L1748); on entering
  `actions` it shows once/Era and, when `firstPlayer === 'bot'`, its button fires the first
  bot turn. Wire into Chronossus.
- [x] `src/phases/FirstPlayerPrompt.tsx` — end-of-Actions "First Player next Era" prompt
  (~L1790). After both pass, set next Era's `firstPlayer` then Clean Up (Chronossus jumps
  straight to Clean Up today; `Chronossus.resolveCleanUp` already threads `state` — set
  `firstPlayer` on it as Chronobot does).

### A3. Shared Turn tracker (top bar, both bots)
- [x] `src/components/TurnTracker.tsx` — a "Turn N" pill + hover popover (built on
  `AnchoredPopover` + `.stat-pill`/`.vp-popover` so it inherits responsive CSS). N = count of
  committed bot-action entries where `snap.state.era === state.era`; hover lists this-Era bot
  turns. Props: `turnNumber`, `entries`, `extra?` (Exo + Energy readout folds into the hover).
- [x] Replace Chronossus's top-bar `🦾 Exo` / `🔋 Energy` pills (`ChronossusGame` L629-634) with
  `<TurnTracker>`; add `<TurnTracker>` beside the Chronobot `VpPill` (its `stats` array is
  already empty). Keep `VpPill` in both. A neutral turn count reads the same for both bots even
  though they reach end-of-phase differently.

### A4. Unified Debug menu + shared phase-jump bar (both bots)
- [x] When Debug is ON, show one **debug rail bar** for both bots. Its **left** is a **Debug
  dropdown button** (replacing the top-bar `🛠 DEBUG` badge) holding **all** debug options —
  Era adjust, Paradox adjust, Warp-tile control, Impact toggle, End-Actions, jump-to-phase,
  etc. To its right, the **jump-to-phase** buttons stay as an open bar.
- [x] Remove the scattered Era/Paradox/DEBUG controls from both top bars
  (`StatsBar` L2811-2837, `cx-statsbar` L576-594); they live only in the dropdown now.
- [x] Extract `src/components/DebugBar.tsx` (dropdown + phase-jump bar); each view passes its
  phase list + handlers. Generalize Chronossus's current `cx-debugrail` to Chronobot too.

### A5. Stacking / bump on the command-marker routes
- [x] **Resolved by topology — no code needed.** Each shared spot (`m2p1`–`m2p5`) appears in
  exactly **2** of the 4 marker routes (`CHRONOSSUS_TRACKS`), so no board spot can ever hold a
  3rd marker; the Chronobot's "max-two, bump the top forward" rule can never fire on the
  Chronossus routes. The simple `nextStep` advance is therefore correct, and the paired-split
  render already offsets the (at most two) markers sharing a spot. If future modules add routes
  that put a 3rd marker on a shared spot, port `Chronobot.advanceActiveToken`'s bump then.

### A6. Settings-menu + responsive CSS parity
- [x] Add **History** entry + "Log in (soon)" placeholder to `CxSettingsMenu`
  (`ChronossusGame` L1415), matching `StatsBar`'s ⚙ menu.
- [x] Phase-5 layout now uses the Chronobot's shared `board-stage`/`board-wrap` + `scvMode`
  (ResizeObserver + `useMediaQuery`) mechanics, so the board scales to fit and reflows
  identically on mobile (SCV drops below the board). Dropped the bespoke `cx-body`/`cx-board`/
  `cx-log` layout and the right-side "Action Rounds" aside; end-of-phase uses the shared
  `end-phase-banner`. Extracted `src/game/useMediaQuery.ts`.
- [x] **Breakthrough popover** now uses the shared `BadgePopover` + `ShapeIcon` (exported from
  BoardExplorer) — identical shape-icon art to the Chronobot (was a bespoke ●▲■ list).
- [x] **Simple Command View** added for Chronossus (`CxSimpleCommandView`): the 4 markers + the
  Action each sits on + AI-die faces, reusing the shared `.scv-*` classes; toggled from the
  ⚙ menu, overlay/side/below by viewport, mirroring the Chronobot.

---

## PART B — Remaining Chronossus base features  *(current focus)*

B1 is done (above). Remaining: **B2 Solo Objectives**, **B3 real per-phase bodies**,
**B4 module selection**, **B5 ship**.

### B1. Action tiles + Autoleap + gaining Energy Cores (F4 remainder) — ✅ DONE
- [x] Action-tile (Cxx A/B) resolution catalog — the A/B variants from appendix pp.19–20.
  **Deviation:** no standalone `engine/rules/chronossusActions.ts`; tile effects live in
  `resolveAction`/`resolveHypersyncAction` + `board/chronossusTiles.ts`.
- [x] **Autoleap** — token onto a `!` space resolves the tile then advances one more (two
  actions in one turn). Engine + UI (history logging, heads-up label, Start-Your-Turn
  dialog, Hypersync-autoleap extra advance).
- [x] **Gaining Energy Cores** — actions add 1 non-exhausted core to the pool (never touch
  Exhausted cores this way).
- [x] Tests for tiles / autoleap / core-gain (`chronossus.test.ts`).

### B2. Solo Objectives (F5 remainder)
- [ ] Solo Objective definitions (Bronze/Silver/Gold, appendix pp.21–22) — reveal 3, shuffle.
- [ ] Extend `scoreChronossus` with highest-level-reached per objective (PLAYER-facing tally;
  the Chronossus itself never scores them). Tests.
- [ ] Solo-Objective tracker UI + score-screen line.

### B3. Real per-phase bodies (F6 remainder)
- [ ] Replace the Setup / Paradox / Warp / Power-Up skeletons with real Chronossus behavior
  (Setup: place 3 modular tiles, reveal objectives, Chronossus First Player Era 1, +1 Water;
  Power-Up: energy-draw UI already present; Paradox: identical to Chronobot — reuse).

### B4. Module selection (Chronossus-only setup step)
- [ ] Add a **Module menu** selection stage to the Chronossus Setup flow, placed **just before
  the difficulty selection**. This is Chronossus-only (the Chronobot setup gains no such step).
  It's the seam the per-module difficulty options (currently deferred) will hang off of.

### B5. Ship
- [ ] Flip `chronossus.implemented` → `true` once the full game view is real (not a preview).
- [ ] End-to-end Chronossus playthrough test (mirror `playthrough.test.ts`).
- [ ] Assets/theme final pass (verify cropped cores/tiles + warm `--chrono-*` theme).

---

## Deferred
- Fractures of Time (Flux Pool/Cores/Fracture Device, X-series actions, expansion objectives).
- Per-module difficulty options (arrive with the Chronossus-only Module-selection step, B4).
- Chronossus-specific stats/history in `AdminStats`.

## Verification (whole effort)
- `npm run build` clean; `npm run lint` (only pre-existing warnings); `npm test` green
  (keep the current 85 passing; add hook / first-player / autoleap / objective coverage).
- **Chronobot regression:** take actions, Undo, open History, reload (rehydrates), both pass →
  First-Player prompt → Clean Up; pop-ups/text unchanged.
- **Chronossus:** Phase 5 → Ready-to-begin (bot-first auto-fires) → turns (markers advance,
  stacking honored) → Undo restores → History lists turns → reload rehydrates → both pass →
  First-Player prompt → next Era `firstPlayer` honored. Turn tracker shows "Turn N" (hover =
  turns + Exo/Energy). Debug dropdown holds all debug controls; jump-to-phase bar works.
- Responsive: shrink past 760px — top bar wraps and board/aside reflow in both views.
- Playwright smoke on the dev port for both boards; no console errors.
