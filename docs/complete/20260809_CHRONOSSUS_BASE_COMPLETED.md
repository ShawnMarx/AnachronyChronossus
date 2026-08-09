# COMPLETED — Chronossus (base game) solo opponent (2026-08-09)

Archived from `docs/plans/PLAN_chronossus_base.md` (a single combined plan + execution
tracker). **Shipped and live in prod** at https://anachrony.boardgameedge.com — base game
+ the Hypersync Future Actions module. `chronossus.implemented` is `true`. Further modes
and options land over time via new plans.

**Scope delivered:** base-game Chronossus, built on a shared solo-bot core with
Chronossus-specific behavior layered on. Chronobot never regressed. Build + 109 tests green.

**One deferred loose end** (moved to `TODO.md`): an automated end-to-end Chronossus
playthrough test — to be written *before* the next mode, as the guardrail protecting the
shared engine.

---

## What shipped

### Framework + engine
- **F1 Shared framework** — `SoloEngine` interface + registry (`engine/bots/soloEngine.ts`);
  `flow.ts` routes through `engineFor(state.config.bot)`; Chronobot re-expressed as an
  implementation. `chronossus?` slice on `GameState`.
- **F3 Engine: state + Power Up** — `ChronossusState`/`emptyChronossusState`, `EnergyPool`
  (5/5), `drawEnergyPool`, power-up math (`poweredExosuits` 3+X/2+X caps 6/4), `poolAfterDraw`,
  `resolvePowerUp`. Unit-tested.
- **F4 resolver** — `resolveAction` covers all base actions (reusing Chronobot decision
  helpers via structural compatibility), the Failed-no-space discard-Exosuit nuance, and the
  A/B action-tile catalog. Passing (`wouldPassOn`/`passChronossus`) + `actionRoundsEnded`.
  Scoring `scoreChronossus` (breakthroughs + sets + Time Travel; Superproject VP broken out).

### View + shared UI (Part A — action-stage parity)
- **F6 board view** — `ChronossusGame.tsx` full Era-loop on the shared `PhaseScreen`; Phase 5
  renders the real board with the exported `DetailPanel` (`botName="Chronossus"`), so action
  pop-ups are visually + behaviorally identical to the Chronobot's. 4 per-token routes
  (`chronossusPaths.ts`), calibrate mode, board counters/trackers, Time Travel / Warp /
  Paradox overlays.
- **F7 landing** — Chronossus card live for everyone; `AppRoot` launches the view.
- **A1 undo/history/persistence** — generic `src/game/useUndoableGame.ts` + `undo.ts`
  types/persistence serve Chronossus (real Undo, History pane, reload-rehydrate).
  *Deviation:* BoardExplorer kept its proven inline model to avoid dropping in-progress saves.
- **A2 shared components** — `HistoryPane`, `ReadyToBegin`, `FirstPlayerPrompt` (parameterized
  by `botName`).
- **A3 TurnTracker** — "Turn N" pill + hover popover (Exo/Energy readout), both bots.
- **A4 unified Debug menu + phase-jump bar** — `src/components/DebugBar.tsx`; all debug
  controls in one dropdown; scattered top-bar controls removed from both views.
- **A5 stacking/bump** — resolved by topology (each shared spot appears in exactly 2 of the 4
  routes, so a 3rd marker can never land; simple `nextStep` advance is correct). Port the
  Chronobot bump only if a future module adds a route that puts a 3rd marker on a shared spot.
- **A6 settings + responsive parity** — History + "Log in (soon)" in `CxSettingsMenu`; Phase-5
  uses the shared `board-stage`/`board-wrap` + `scvMode` (extracted `useMediaQuery.ts`); shared
  `BadgePopover`/`ShapeIcon`; Simple Command View.

### Part B — remaining base features
- **B1 action tiles + Autoleap + energy-core gain** — A/B tile catalog, Autoleap flow (engine
  + UI: history logging, heads-up label, Start-Your-Turn dialog, Hypersync-autoleap extra
  advance), gaining Energy Cores, and the Hypersync Action/tile flow. Unit-tested.
  *Deviation:* no standalone `engine/rules/chronossusActions.ts` — tile effects live in
  `resolveAction`/`resolveHypersyncAction` + `board/chronossusTiles.ts`.
- **B2 Solo Objectives** — ❌ **DROPPED.** Entirely player-managed; the app neither tracks nor
  scores them for the Chronossus. The existing Setup reveal line + the player-only final-tally
  line are sufficient. No engine/tracker work.
- **B3 real per-phase bodies** — Setup (full `ChronossusSetupFlow`: Intro → Modules →
  Difficulty → Setup; 6 Exosuits + 8 Warp tiles, reveal 3 Solo Objectives, Command tokens +
  Action tiles, Energy Pool 5+5, Chronossus First Player Era 1, +1 Water, World Council
  difficulty, per-module Hypersync setup — verbatim + app-modified). Power-Up (real energy-draw
  UI). Warp (shared `WarpPhaseBody`). Paradox (shared `ParadoxPhaseBody` + Hypersync tiles).
  Deleted the dead `default: setup` case in `ChronossusGame.tsx`.
- **B4 module selection** — Module menu step in Setup (before Difficulty); Base + Hypersync
  available, others "Coming soon"; per-module difficulty options hang off `MODE_DIFFICULTY`.
- **B5 ship** — `chronossus.implemented` → `true`; live in prod; assets/theme pass done
  (cropped cores/tiles + warm `--chrono-*` theme). Automated playthrough test deferred (TODO).

### Playtest fixes (2026-08-08)
11 bug/flow/score-screen fixes — see
`docs/complete/20260808_CHRONOSSUS_PLAYTEST_FIXES_COMPLETED.md`.

---

## Deliberate differences from the Chronobot (keep-as-is)
Board positions, extra/modular action spaces, art assets, warm theme, the 4 independent
command-marker routes, and the simpler **passing rule** (out of Exosuits → pass the next
Exosuit-placing action; token doesn't advance; no fixed "min 3 Actions"). The Chronobot's
`botPassDecision`/final-Time-Travel pass is intentionally **not** ported.

## Production notes / follow-ups
- **Before the next mode:** write an automated Chronossus playthrough test (mirror
  `playthrough.test.ts`, which is Chronobot-only) — protects the shared engine as modes pile on.
- **Next candidate efforts** (were "Deferred" on the plan): Fractures of Time (Flux Pool /
  Cores / Fracture Device, X-series actions, expansion objectives); per-module difficulty
  options (the seam exists via `MODE_DIFFICULTY`); Chronossus-specific stats/history in
  `AdminStats`; more modules (Doomsday, Pioneers, Guardians — stubbed in the Module menu).
- **A5 note:** if a future module route puts a 3rd marker on a shared spot, port
  `Chronobot.advanceActiveToken`'s bump rule to Chronossus.
