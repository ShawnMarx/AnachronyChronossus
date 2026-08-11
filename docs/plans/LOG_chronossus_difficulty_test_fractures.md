# LOG — Chronossus difficulty options, playthrough tests, & Fractures of Time

Execution tracker. Steps in implementation order. Mark `[x]` as completed; note
deviations inline. Difficulty options (Part 2) are worked **one at a time with a feedback
pause** — restate the rule + intended logic, get a thumbs-up, then implement/test/enable.

## PART 1 — Playthrough test harness (first) ✅ done
### T1 — Base-game playthrough test
- [x] `chronossusPlaythrough.test.ts` drives a full game (setup → Eras → End Game) deterministically
- [x] Invariant + score-sanity assertions; ends at MAX_ERA
- [x] Reusable `playChronossus({ config, rolls… })` helper

### T2 — HFA (Hypersync) variation
- [x] Same driver with `hypersync` config; asserts Hypersync Action + Autoleap paths

### T3 — Extensibility
- [x] File-header doc: how to add a per-mode variation (Fractures + future modes)

## PART 2 — Difficulty settings (one at a time) ✅ done (2026-08-10)
- [x] **D0** — thread `config.difficulty` into `scoreChronossus` (D5's end-game seam only —
  D7 turned out to score live mid-game, not through this seam; see deviations)
- [x] **D1** — `chronossus-tiles-b-side` (live): verified; closed a real test gap
  (`chronossusModes.test.ts` for the config-driven side selection)
- [x] **D2** — `chronossus-swap-tiles`: swap-aware `getMode(id, difficulty?)`, exchanges
  Slot I/III `family`, mode-agnostic
- [x] **D3** — `chronossus-extra-energy`: +1/2/3 energized cores, via pure
  `applyDifficultySetup(bot, config)` (also used by A2 later)
- [x] **D4** — `chronossus-extra-powerup`: +1 free Exosuit; excess over `exosuitsTotal`
  (not the per-Era cap) converts to +2 VP
- [x] **D5** — `chronossus-leftover-energy-vp`: `energyPool.energized × 1` VP; shown both
  mid-game (VP pill) and at End Game
- [x] **D6** — `chronossus-fewer-objectives`: reveal-count sub-selector 0/1/2, setup-text only
- [x] **D7** — `chronossus-failed-action-vp`: **replaces** the base +1 VP with +2, live at
  each of the 5 Failed-Action call sites — not an end-game score addition
- [x] **D8** — `chronossus-research-new-shape`: candidates = shape(s) tied for lowest count;
  UI rerolls the existing `rollShapeDie()` until it lands on a candidate
- [x] **D9** — `chronossus-hex-unavailable`: was actually **dead code** (selectable-options
  filter dropped it) — fixed to mirror the Chronobot's identical option
- [x] **D10** — `chronossus-hypersync-targeted` (live): verified UI-only, zero engine effect

## PART 3 — Alternate Timelines & Variable Anomalies (ahead of Fractures) ✅ done (2026-08-10)
Both on Solo Opponents rulebook p.18. Prioritized ahead of Fractures after research showed
neither needs the main Fractures module/mechanics.

### A1 — Alternate Timelines
- [x] `resolveWarp(state, paradoxes, positiveSpaces = 0)` grants 2/3 VP per reported
  positive-effect space; backward compatible (existing callers unaffected)
- [x] New `GameConfig.extraModules` seam + `EXTRA_MODULES` is now a real multi-select in Setup
- [x] Warp Phase UI prompt (0..N button picker) after the Chronossus's Warp tiles are placed
- [x] Unit tests + playthrough variation

### A2 — Variable Anomalies
- [x] `anomalyVps?: number[]` on `ChronossusState` (mirrors `buildingVps`), replacing the
  flat `anomalies`/`ANOMALY_VP` counter only for games with this module
- [x] `rollParadox` defers the gain when active (needs the player-reported tile, unavailable
  at roll time); `resolveVariableAnomalyGain` records it once reported
- [x] Removal (`remove-anomaly`) needs no player input — engine removes `Math.min(...anomalyVps)`
- [x] New `VariableAnomalyGainPrompt` modal; Anomalies board-counter tooltip lists held VPs
  (buildings-tooltip pattern)
- [x] Unit tests + playthrough variation
- [x] **Revised 2026-08-10 (playtest feedback):** the gain prompt was asking for both offer
  tiles (Tile A / Tile B) and letting the engine choose — out of step with Construct's
  `buildingVP`. Rebuilt buildings-style: verbatim RECEIVING ANOMALIES criteria → the player
  applies it → reports only the taken tile (VP digit row −2…−6, then a yes/no "does it
  retrieve a Warp tile"), plus a verbatim Solo Opponents p.18 `RulesBox`.
  `resolveVariableAnomalyGain(state, chosen)` collapsed to one candidate; tests + the
  playthrough harness option (`variableAnomalyTaken`) updated. Dead `.va-candidate` CSS removed.
- [x] **Player-input prompts kept on their phase screen** (2026-08-10): Alternate Timelines'
  positive-space question was replacing the whole Warp body, and the Variable Anomaly gain
  prompt was a modal covering the Paradox roll log — in both cases the player answered with
  the triggering roll off-screen. `WarpPhaseBody` and `ParadoxPhaseBody` each gained an
  optional `followUp` node rendered in place of their roll/continue controls, so the
  question now sits under the roll result with its context intact. The Anomaly prompt's
  Confirm step then went away — the yes/no retrieval answer commits the gain — and the
  phase screens gained the Action-Rounds **↶ Undo** in their header instead (restores the
  last committed step; persisted rolls mean nothing is re-rolled). Undo also re-derives
  whether the Anomaly prompt is owed from the restored state, and remounts
  `ParadoxPhaseBody` so its local roll log can't contradict the rewound state. Every phase
  advance now commits too (`commitPhase`), so Undo steps back to the previous phase screen
  even when the move changed nothing else. Verified live (Playwright, Era 1 → 3): Undo
  disabled on the first screen, Preparation↔Power Up round-trip, both follow-up prompts
  rendering under their roll, and an undone Anomaly gain restoring `anomalyVps`/Warp count
  and re-opening the prompt.
- [x] **Alternate Timelines overrides the Warp turn-order note** (2026-08-11): the screen was
  still showing the base "Warping occurs in player order… roll for it below, then place your
  own tiles", which contradicts p.18 ("you must decide how many Resources and/or Workers to
  warp first, then roll for the Chronossus"). `WarpPhaseBody` gained `intro` (replaces the
  order note) + `extraRules` (an extra verbatim box); the module now states the
  decide-before-rolling order and shows its own p.18 text, including the 3-VP difficulty
  bullet when selected. The positive-space question also names the VP rate.
- [x] **Hypersync Paradox rules verified** (unrelated question, same session): the
  majority + extra-roll rules the app prompts for are verbatim Future Imperfect p.5, and
  Solo Opponents p.17 carries the module's rules over without touching the Paradox Phase.
  Added that text as a `RulesBox` in `ParadoxPhaseBody`'s Hypersync branch so the prompts
  are no longer app-voice-only.

## PART 4 — Fractures of Time (full module) ← next up
### F-R — Research & design
- [ ] Read Fractures rules (Chronossus deltas) + pull TTS art; capture design note here

### F1 — Mode entry & setup
- [ ] Un-stub Fractures in `MODULE_CONFIGS`; wire `getMode` slots/tiles
- [ ] Fractures Setup screens (verbatim + app-modified)

### F2 — Engine: Flux Pool / Cores / Fracture Device
- [ ] State + types; draw/spend/exhaust + Fracture Device; unit tests

### F3 — Engine: X-series actions & tiles
- [ ] X-series catalog in tile/resolver machinery (+ Autoleap); unit tests

### F4 — Board / view / overlays
- [ ] Art + overlays (Flux Pool, Cores, Fracture Device, X-tiles); calibrate positions; routes

### F5 — Scoring & objectives
- [ ] Expansion scoring deltas + objectives (player vs Chronossus — confirm); score screen

### F6 — Ship
- [ ] Fractures playthrough variation
- [ ] build + test + lint clean; manual playthrough; assets/theme pass

---
### Deviations / decisions
- **D0/D7 split (2026-08-10):** the scoring seam (`config.difficulty` → `scoreChronossus`)
  only serves D5. D7 (Failed Actions score VP) scores live at the moment each Failed Action
  resolves, straight into `bot.vp` — not an end-game addition, doesn't touch the seam.
- **D9 was dead code, not "partly live" (2026-08-10):** the plan originally assumed D9 had
  a working checkbox; tracing the code found the selectable-options filter in
  `ChronossusSetupFlow.tsx` had silently dropped it. Fixed as part of un-stubbing D2–D8
  (removed the filter entirely, letting all base options through).
- **Part 3 inserted ahead of Part 4 (2026-08-10):** user request. Research found Variable
  Anomalies is a sub-module *sold inside* the Fractures box but explicitly playable
  "with or without the main Fractures of Time module" (verbatim, Fractures rulebook p.13) —
  so it only needs the physical component set (16 Anomaly tiles + Anomaly Remover), not
  Fractures' Flux/Operator/Fracture-Device mechanics. Alternate Timelines' own base rules
  live in the Essential Edition core rulebook (out of scope) — only its Solo Opponents
  p.18 Chronossus-behavior delta was needed.
- **Anomaly-tile data source (for A2):** the 16 Variable Anomaly tiles' VP values (−2 to −6)
  and Warp-tile-retrieve eligibility windows (Before Impact / After Impact / Any Era / never)
  came from the Fractures rulebook's appendix (pp.16-19), not its component-overview page
  (p.3, icons only). Not encoded as an engine catalog — the confirmed design has the player
  report each candidate's (VP, eligible) by hand, so the engine only needs the selection
  *rule*, not the tile data itself.
