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
- [x] 0. Debug dev-flow harness: `ChronossusExplorer.tsx` boots straight into **Phase 5** with **4 powered Exosuits**; tap any action space → `resolveAction` → activation log. Chronossus theme (orange/amber/teal). Verified in-browser via Playwright (card unlocks on localhost, 4 actions resolve, VP/Exo update, no console errors).
- [~] 1. Board image + theme done (in the harness). Full bot-aware BoardExplorer plumbing still pending.
- [~] 2a. `CHRONOSSUS_HOTSPOTS` seeded from the Chronobot grid — **placeholder positions**; tile slots I/II/III landed well, several base actions need nudging. Calibrate next.
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
