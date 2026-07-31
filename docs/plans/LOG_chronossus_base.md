# LOG — Chronossus (base game)

Execution tracker for `PLAN_chronossus_base.md`. Mark `[x]` as steps complete; note
deviations inline. (Rebuilt after the plan was briefly parked to `docs/concepts/` by a
parallel session — plan content intact.)

## Feature 1 — Shared solo-bot framework (no behavior change) ✅ COMPLETE
- [x] 1. Define `SoloEngine` interface + registry (`engine/bots/soloEngine.ts`). **Deviation:** kept it thin/flow-level (`MAX_ERA`, `startNextEra`) instead of a full phase/decision interface — matches the existing "no single planTurn interface" design note in `BotModule.ts`. Per-phase/per-action logic stays in each bot module and is dispatched by the view that owns it (wired in Feature 6). Grows as bots need more shared seams.
- [~] 2. Generalize `GameState` bot slice — **deferred into Feature 3**, where `ChronossusState` is designed, to avoid a throwaway stub type. `state.chronobot` untouched (Chronobot ships unchanged); `chronossus?` slice added alongside in F3.
- [x] 3. Re-express Chronobot as an implementation — registered its flow-level engine in `engine/index.ts` (`registerEngine`).
- [x] 4. Route `src/game/flow.ts` through `engineFor(state.config.bot)` — no longer imports `Chronobot` directly (`isFinalEra`, `finishEra`).
- [x] 5. Regression gate: **60 tests green** (suite grew past the plan's "39"; +4 new `soloEngine.test.ts`), `npm run build` clean.

## Feature 2 — Assets & Chronossus theme
- [ ] 1. Import cropped assets: energy core, exhausted energy core, 3 action tiles (A/B).
- [ ] 2. Decide sprite-sheet vs. individual files; wire into `ActionIcon`/asset paths.
- [ ] 3. Sample board palette; add scoped `--chrono-*` Chronossus CSS theme.
- [ ] 4. Reuse warp-tile / time-travel-marker; confirm command-token art (Chronossus-tinted).

## Feature 3 — Engine: state + Power Up (Energy Pool)
- [ ] 1. `ChronossusState` + `emptyChronossusState` (energy pool, 6 Exosuits, tiles, objectives).
- [ ] 2. Energy Pool draw (3), power-up math (3+X/2+X, caps 6/4), return-1-exhausted, remove others, refill-if-<3.
- [ ] 3. Unit tests for Power Up edge cases (empty pool, all-exhausted draw, post-Impact caps).

## Feature 4 — Engine: Action Rounds / tiles / Autoleap / passing
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
- [ ] 0. Debug dev-flow harness: boot Chronossus straight into **Phase 5 (Action Rounds)** with **4 powered Exosuits** (Debug-only; skips Setup→Warp) to test actions/tokens/Autoleap turn-after-turn.
- [ ] 1. Board image + theme + bot-aware BoardExplorer plumbing.
- [ ] 2a. Seed `chronossusHotspots.ts` from Chronobot %-anchors for all **matching action spaces**; nudge only divergent hotspots (tile slots I/II/III, Autoleap, Energy Pool). Verify with `pw-validate.mjs`.
- [ ] 2b. Build `chronossusPaths.ts` from scratch: **4 unique per-token routes** (2/3/4/5, colored) that **overlap** at shared spaces; per-token-per-step anchors; stacking/bump + paired-split must handle different tokens sharing a spot. Calibrate on the Chronossus board (none of the Chronobot path anchors apply).
- [ ] 3. Board hotspots/counters — fill in Chronossus-specific spaces + trackers.
- [ ] 4. Per-phase bodies (Power Up energy-draw UI, Autoleap flow, action-tile dialogs).
- [ ] 5. Top bar: `Actions #` → `# Exo`; add Energy Pool `#/#` (Energized/Exhausted) tracker.
- [ ] 6. Solo-Objective tracker + score screen.

## Feature 7 — Landing + admin gating
- [ ] 1. Chronossus card playable when `isAdmin || isLocalRun`, else "Coming Soon".
- [ ] 2. Wire `AppRoot`/`main.tsx` to launch Chronossus view.
- [ ] 3. Flip `chronossus.implemented` (guarded by gating).

## Feature 8 — Playthrough test + polish
- [ ] 1. End-to-end Chronossus playthrough test.
- [ ] 2. Persistence (per-bot save/undo/history).
- [ ] 3. Mobile / top-bar-wrap checks; `build` + `test` clean.
