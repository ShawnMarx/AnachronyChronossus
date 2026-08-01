# LOG — Chronossus (base game)

Execution tracker for `PLAN_chronossus_base.md`. Mark `[x]` as steps complete; note
deviations inline. (Rebuilt after the plan was briefly parked to `docs/concepts/` by a
parallel session — plan content intact.)

## Feature 1 — Shared solo-bot framework (no behavior change) ✅ COMPLETE
- [x] 1. Define `SoloEngine` interface + registry (`engine/bots/soloEngine.ts`). **Deviation:** kept it thin/flow-level (`MAX_ERA`, `startNextEra`) instead of a full phase/decision interface — matches the existing "no single planTurn interface" design note in `BotModule.ts`. Per-phase/per-action logic stays in each bot module and is dispatched by the view that owns it (wired in Feature 6). Grows as bots need more shared seams.
- [x] 2. Generalize `GameState` bot slice — done in F3: added optional `chronossus?: ChronossusState` alongside the untouched `chronobot` slice (Chronobot ships unchanged).
- [x] 3. Re-express Chronobot as an implementation — registered its flow-level engine in `engine/index.ts` (`registerEngine`).
- [x] 4. Route `src/game/flow.ts` through `engineFor(state.config.bot)` — no longer imports `Chronobot` directly (`isFinalEra`, `finishEra`).
- [x] 5. Regression gate: **60 tests green** (suite grew past the plan's "39"; +4 new `soloEngine.test.ts`), `npm run build` clean.

## Feature 2 — Assets & Chronossus theme
- [ ] 1. Import cropped assets: energy core, exhausted energy core, 3 action tiles (A/B).
- [ ] 2. Decide sprite-sheet vs. individual files; wire into `ActionIcon`/asset paths.
- [ ] 3. Sample board palette; add scoped `--chrono-*` Chronossus CSS theme.
- [ ] 4. Reuse warp-tile / time-travel-marker; confirm command-token art (Chronossus-tinted).

## Feature 3 — Engine: state + Power Up (Energy Pool) ✅ COMPLETE
- [x] 1. `ChronossusState` + `emptyChronossusState` + `EnergyPool`/`ENERGY_POOL_START` (5/5) in `state.ts`; `chronossus?` slice on `GameState`. Split descriptor into `chronossusMeta.ts`; `chronossus.ts` is now the engine (mirrors Chronobot). Registered Chronossus's flow engine. **Note:** Action tiles / Solo Objectives / command-token state deferred to their own features (F4/F5) to avoid churn; slice grows there.
- [x] 2. Energy Pool math: `drawEnergyPool` roller (draw min(3,pool) without replacement, at the engine boundary), `poweredExosuits` (3+X/2+X, caps 6/4), `poolAfterDraw` (remove drawn, return exactly 1 exhausted), `resolvePowerUp` → advances to Warp. "Refill-if-<3" is naturally handled by `energyDrawCount` next draw.
- [x] 3. Unit tests (`chronossus.test.ts`, 16): power-up math, caps pre/post-Impact, all-exhausted draw, pool bookkeeping, draw-invariants over 500 samples, startNextEra. **76 tests green, build clean, lint clean (only pre-existing warnings).**

## Feature 4 — Engine: Action Rounds / tiles / Autoleap / passing
> **Vertical-slice deviation (user request):** built a click-to-activate Phase-5 debug
> harness *without* the Command-token paths first, to validate that each action space
> resolves correctly. So the single-action resolver landed ahead of the token model.
- [x] (slice) `resolveAction(state, input)` — all base actions on the Chronossus slice (reusing the Chronobot's tested priority helpers via structural compatibility), the **Failed-no-space discard-Exosuit nuance**, and the 3 default A-side tile actions (C01A Reboot / C02A Score +2 / C03A Energy Pack). No token advancement. +10 tests.
- [ ] 0. Generalize token model: **N independent per-token routes**; rework `advanceActiveToken` + stacking/bump + paired-split to key off board-spot occupancy (any token), not one shared path. Tests for overlapping-occupancy + bump.
- [ ] 1. AI-die → action above/below token; advance token.
- [ ] 2. Action-tile (Cxx A/B) resolution catalog (`chronossusActions.ts`).
- [ ] 3. Autoleap: resolve tile action + advance one more (double action).
- [ ] 4. Gaining Energy Cores (add 1 non-exhausted to pool).
- [ ] 5. Passing (token does NOT advance; both-passed ends phase); Failed-Action discard nuance.
- [ ] 6. Unit tests for each.

## Feature 5 — Engine: scoring + Solo Objectives
- [ ] 1. Solo Objective definitions (Bronze/Silver/Gold, appendix pp.21–22).
- [ ] 2. `scoreChronossus` (breakthroughs + sets + objective levels; no warp penalty).
- [ ] 3. Unit tests.

## Feature 6 — UI: BoardExplorer for Chronossus
- [x] 0. Debug dev-flow harness: boots straight into **Phase 5** with **4 powered Exosuits**; tap any action space → `resolveAction` → activation log. Chronossus theme (orange/amber/teal).
- [x] FULL-FLOW SHELL: `ChronossusGame.tsx` now wraps the whole Era loop (Setup → 1–6 → End Game) reusing the **shared `PhaseScreen`** (parameterized `hero`/`statusLabel`/`heroAlt`, Chronobot defaults → Chronobot unchanged). Boots to Phase 5; Era loop wired: Phase 5 → End Actions → Clean Up → Finish Era → next-Era Power Up (Energy Pool draw shows result) → Warp → Actions, or → End Game score screen. Debug phase rail jumps to any phase. Non-Phase-5 phases (setup/prep/paradox/warp) are honest skeletons to reconcile next. Verified in-browser: full loop works, Power Up math correct, **Chronobot regression-checked (SetupFlow still opens)**, no console errors.
- Shared infra: `chronossusPhaseMeta.ts` (Chronossus overview/rules text).
- Groundwork for the real Phase-5 board is DONE and committed on `staging` (see the
  HANDOFF section below): `DetailPanel` exported + `botName` prop; `CHRONOSSUS_ACTION_HOTSPOTS`
  + `CHRONOSSUS_COMMAND_MARKERS`; 19 TTS overlay assets; command-marker art.
- [x] 1. Board image + theme + **full DetailPanel plumbing** (real Phase-5 board, botName="Chronossus").
- [x] 2a. Old `CHRONOSSUS_HOTSPOTS` deleted; the 11-action `CHRONOSSUS_ACTION_HOTSPOTS` now drive the real board — **coordinates + Command-marker positions calibrated on the Chronossus board (user-supplied literal).** Hotspots are transparent click targets over the tiles printed on the board (no overlaid images); the `reboot` space was dropped (Reboot is a modular Action-tile action, not a base Chronossus space). Added `CHRONOSSUS_PANEL` ([57.2, 1.7, 42.2, 97.4]) so the dialog sits on the board's right ~42% clear of the (left-side) action tiles.

---

## ✅ DONE — Phase 5: Chronobot action popup replicated on the Chronossus board

**Landed (this session, `staging`):** `ChronossusGame.tsx` Phase-5 block now renders the
real board (`board-chronossus.jpg`) with the 12 `CHRONOSSUS_ACTION_HOTSPOTS` buttons, the
4 Command markers (`chronossus-marker-{2,3,4,5}.png`, teal-glow `.cx-cmd-marker`), and the
**exported `DetailPanel` with `botName="Chronossus"`** — the pop-up is visually + behaviorally
identical to the Chronobot's. Full controller copied over (`onTileClick`/`onConfirmPlace`/
`onCannotPlace`/`onMine*`/`onGenius*`/`onPickVP`/`onPickWorker`/`onToggleResource`/`startTurn`/
`resolve`), calling `Chronossus.resolveAction` (no token advancement — correct for now), reusing
`Chronobot.*` decision helpers on the (structurally compatible) Chronossus slice.
- **Calibrate mode** added: checkbox in the Phase-5 controls; clicking a hotspot/marker *selects*
  it, click-board places, arrow-keys nudge (0.2% / Shift 1%), width/height sliders; a
  `CalibrationPanel` emits paste-ready `CHRONOSSUS_ACTION_HOTSPOTS` + `CHRONOSSUS_COMMAND_MARKERS`
  literals. **Positions are still the placeholder seed** — next: actually calibrate on the board (2a/2b).
- Deleted the old `CHRONOSSUS_HOTSPOTS` (15-tile) set + `ChronossusHotspot` interface.
- **Fixed a botName leak:** `MechRules` ("Placing the …'s Exosuit") is now parameterized by
  `botName` (defaults `'Chronobot'`; Chronobot unchanged).
- **Verified:** `npm run build` clean, `npm test` 85 green, `npm run lint` (3 pre-existing warnings).
  Playwright smoke on localhost:5205 — Construct-Factory gate → VP picker → Start (Exo 4→3, VP recorded),
  Recruit (Exo→3, +1 VP), Mine open/no-space branch, mech collapsible reads "Chronossus's Exosuit",
  no console errors. Chronobot regression: SetupFlow still opens, no errors.
- **Still TODO:** calibrate the real hotspot/marker coordinates (2a); build `chronossusPaths.ts` +
  the 4-token route model (2b / F4-0); board counters/trackers (3); per-phase bodies (4); top bar
  Exo/Energy already present (5); Solo-Objective tracker + score (6).

### (original directive, for reference) — replicate the Chronobot action popup on the Chronossus board

**User's directive:** the Chronossus Phase 5 uses the **same 11 action spaces, same rules**
as the Chronobot — only board placement differs. The pop-ups must **act and look EXACTLY
like the Chronobot's** (not the current simplified tap-log). Plus a **calibration tool** to
set positions, and the **Command markers** rendered. Build all in one pass. Work on the
**`staging`** branch (auto-deploys to anachrony.staging.boardgameedge.com; prod is safe).
Do NOT change Chronobot behavior — only additive/shared-via-props changes.

### Already staged (commit `a449007` on `staging`)
- **`DetailPanel` is exported** from `src/BoardExplorer.tsx` with a `botName` prop
  (defaults `'Chronobot'`; all instruction strings parameterized). Import into the
  Chronossus view: `import { DetailPanel, type PendingStep } from './BoardExplorer'`.
  It renders absolutely on the board via `hotspot.panel ?? DEFAULT_PANEL` (right-side).
  Uses the shared `CHRONOBOT_ACTIONS` catalog + `ActionIcon` sprite (both work for
  Chronossus — same `ChronobotActionId`s). **Pass `botName="Chronossus"`.**
- **`CHRONOSSUS_ACTION_HOTSPOTS: Hotspot[]`** (the 11 shared actions on the Chronossus
  board, placeholder coords) and **`CHRONOSSUS_COMMAND_MARKERS`** — both in
  `src/board/chronossusHotspots.ts`. Marker art: `assets/solo/commands/chronossus-marker-{2,3,4,5}.png`.
- Overlay assets in `assets/solo/chronossus/` (cores/markers/buildings clean; workers +
  factory + exosuit + operator need rework — or reuse existing `assets/solo/workers/*`).

### The controller to replicate (READ IT FIRST)
`src/BoardExplorer.tsx` **lines ~1001–1167** is the exact action-turn state machine to
copy into `ChronossusGame.tsx`, swapping the bot slice + resolver:
- `onTileClick(h)` → sets `pending` by action: `mine-resource`→`mineOpen`;
  `recruit-genius-research`→`geniusQuestion`; `remove-anomaly`→`removeAnomaly`;
  `reboot`→`reboot`; `time-travel` (if `warpTilesOnTimeline>0`)→`timeTravel`; else if
  `CHRONOBOT_ACTIONS[a].placesExosuit`→`mech`; else `resolve(h,{})` immediately.
- `onConfirmPlace`, `onCannotPlace`, `onMineHasSpace/NoSpace`, `onPickVP`, `onPickWorker`,
  `onGeniusYes/No`, `onToggleResource`, `startTurn` — copy verbatim.
- `resolve(h, opts)`: for Chronossus call **`Chronossus.resolveAction(state, input)`**
  (not `takeActionTurn`), then `setState(next)` + `setResult(instructions)`.
  **opts → `ChronossusActionInput` map:** `cannotPlace`→`noSpaceAvailable:true`,
  plus `buildingVP` / `minedResources` / `recruitedWorker` / `shape` / `geniusAvailable`
  pass through. (`ChronossusActionInput` already supports all of these.)
- **Reused decision helpers accept the chronossus slice** (ChronossusState is structurally
  assignable to ChronobotState): `Chronobot.chooseRecruitWorker(bot)`,
  `Chronobot.recruitWorkerOrder(bot)`, `Chronobot.mineResourceOrder(bot)`,
  `Chronobot.chooseRemoveAnomalyDiscards(bot)`. `rollShapeDie()` from `./engine`.

### DetailPanel props to supply (from `ChronossusGame` state)
`hotspot=active`, `readOnly=false`, `pending`, `result`, `selectedVP`,
`selectedResources`, `selectedWorker`, `rolledShape`, `breakthroughs=bot.breakthroughs`,
`mineOrder=Chronobot.mineResourceOrder(bot)`, `workerOrder=Chronobot.recruitWorkerOrder(bot)`,
`botName="Chronossus"`, all the `on*` callbacks, `onStartTurn=startTurn`, `onClose=closePanel`.
**`removeAnomaly` prop** = `{ canRemove: bot.anomalies>=1 && !!Chronobot.chooseRemoveAnomalyDiscards(bot),
discards: <formatted cubes>, reason: bot.anomalies<1 ? 'it has no Anomaly to remove' : 'it lacks 2 Resource cubes to spend' }`.

### Build steps
1. In `ChronossusGame.tsx`, replace the `state.phase === 'actions'` block (the simplified
   tap-log) with: the board image + `CHRONOSSUS_ACTION_HOTSPOTS` buttons (call `onTileClick`),
   the exported `DetailPanel` when `active`, and the command markers rendered as `<img>` at
   `CHRONOSSUS_COMMAND_MARKERS` positions. Add all the controller state + handlers above.
2. Keep the top bar (`# Exo`, Energy Pool `#/#`, VP) + the End-Actions / phase-rail / Impact
   controls already there. Delete the old `CHRONOSSUS_HOTSPOTS` (15-tile) set + its usage.
3. **Calibrate mode** (adapt Chronobot's `CalibrationPanel`, `BoardExplorer.tsx` ~line 2428;
   a simpler version is fine): toggle; clicking a hotspot/marker *selects* it instead of
   opening the dialog; arrow keys nudge the selected `rect`/`pos` (0.2% / Shift 1%); a panel
   emits a paste-ready `CHRONOSSUS_ACTION_HOTSPOTS` + `CHRONOSSUS_COMMAND_MARKERS` literal.
   Validate rendered positions with `node pw-validate.mjs shot.png` if useful.

### Verify
- `npm run build` + `npm test` (85 green) + `npm run lint` (only pre-existing warnings).
- Playwright smoke (`http://localhost:<port>/`, card is `ready` on localhost): open Chronossus
  → Phase 5 → click **Construct — Factory** → gate (Confirm placed) → VP digits → **▶ Start
  Your Turn** → VP updates; click **Recruit** → worker picker → Start; **Mine** → open? → 2
  cubes → Start. Confirm the popup is visually identical to the Chronobot's.
- **Chronobot regression:** open the Chronobot, take any action — popup + text unchanged
  (it passes no `botName`, so defaults to "Chronobot").
- Commit + push `staging`; confirm the deploy (gh run watch) and the live bundle hash.

### Gotchas
- Don't move `DetailPanel`/helpers out of `BoardExplorer` — exporting in place is enough and
  keeps its many in-module deps (`ResourceSwatch`, `WorkerSwatch`, `ShapeIcon`,
  `RuleExplainer`, `spaceLabel`, `DEFAULT_PANEL`, `SHAPE_ORDER`, `RESOURCE_META`) valid.
- The Chronossus `resolveAction` has NO token advancement (correct for now — paths are a
  later feature). This board is tap-to-activate; the AI die + token paths come later (F4).
- `Hotspot` type is exported from `src/board/chronobotHotspots.ts`.
- [ ] 2a. Seed `chronossusHotspots.ts` from Chronobot %-anchors for all **matching action spaces**; nudge only divergent hotspots (tile slots I/II/III, Autoleap, Energy Pool). Verify with `pw-validate.mjs`.
- [ ] 2b. Build `chronossusPaths.ts` from scratch: **4 unique per-token routes** (2/3/4/5, colored) that **overlap** at shared spaces; per-token-per-step anchors; stacking/bump + paired-split must handle different tokens sharing a spot. Calibrate on the Chronossus board (none of the Chronobot path anchors apply).
- [ ] 3. Board hotspots/counters — fill in Chronossus-specific spaces + trackers.
- [ ] 4. Per-phase bodies (Power Up energy-draw UI, Autoleap flow, action-tile dialogs).
- [ ] 5. Top bar: `Actions #` → `# Exo`; add Energy Pool `#/#` (Energized/Exhausted) tracker.
- [ ] 6. Solo-Objective tracker + score screen.

## Feature 7 — Landing + admin gating
- [x] 1. Chronossus card playable when `isLocalRun() || user.isAdmin`, else "Coming Soon" (admin-preview tagline/description). Done in `Landing.tsx`.
- [x] 2. Wire `AppRoot` to launch the Chronossus view (`ChronossusExplorer`).
- [ ] 3. Flip `chronossus.implemented` — left `false` (harness is a preview, not the full game); flip when the real game view lands.

## Feature 8 — Playthrough test + polish
- [ ] 1. End-to-end Chronossus playthrough test.
- [ ] 2. Persistence (per-bot save/undo/history).
- [ ] 3. Mobile / top-bar-wrap checks; `build` + `test` clean.
