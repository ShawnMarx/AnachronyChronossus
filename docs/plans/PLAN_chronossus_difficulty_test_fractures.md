# PLAN — Chronossus difficulty options, playthrough tests, small modules, & Fractures of Time

## Overview & goal

Four connected efforts on the now-shipped Chronossus base opponent, in dependency order:

1. **Playthrough test harness (first)** — a reusable end-to-end engine test that drives a
   whole Chronossus game, with a per-mode variation (base, HFA, …). It's the regression
   guardrail that protects the difficulty-engine work and the Fractures module as they land.
2. **Difficulty settings** — the difficulty options are already **stubbed** in the Setup
   flow (visible, disabled). Implement the real **engine logic** for each, **one option at
   a time with a feedback pause**, for the base game and the HFA (Hypersync Future Actions)
   module. Un-stub each as it lands.
3. **Alternate Timelines & Variable Anomalies** — two small standalone modules, prioritized
   **ahead of Fractures** (2026-08-10 decision). Both are documented on Solo Opponents p.18
   with compact Chronossus-behavior deltas — far smaller in scope than Fractures/Hypersync.
4. **Fractures of Time** — the full expansion module (Flux Pool / Cores / Fracture Device,
   X-series actions, expansion objectives), end-to-end, ending with its own playthrough
   test variation.

Every step keeps `npm run build` clean and `npm test` green; the Chronobot and the shipped
Chronossus base must never regress. Rule text shown to players stays **verbatim** where
possible.

Rulebook: `…/reference/Rules/Anachrony-Chronobot-and-Chronossus-Solo-Opponents-…pdf`
(Chronossus base pp. 8–10, difficulty **p. 10**, appendix pp. 19–22, small-module deltas
**p. 18**). Fractures rules in `…/reference/Rules/Anachrony-Fractures-of-Time-…pdf` (Variable
Anomalies module pp. 13-14, 18-19 — sold inside the Fractures box) and the Future-Imperfect/
HFA rulebook.

### Decisions (confirmed)
- **Sequence:** test harness → difficulty → Fractures.
- **Fractures:** full module in this plan (not just a scaffold).
- **Difficulty:** stubs already exist; work each option **one at a time for feedback**
  (list the option + intended logic, get a thumbs-up, implement, test, un-stub).

### Current-state facts (from the code)
- **No difficulty flag is read by the engine yet.** Only setup-text flags
  (`chronossus-tiles-b-side`, `chronossus-hex-unavailable`) and `chronossus-hypersync-targeted`
  affect anything today, via config/UI — not the engine.
- `scoreChronossus(bot)` takes **only the bot**; scoring-based options (leftover-energy VP,
  failed-action VP) will need `config` (or new counters on `ChronossusState`) threaded in.
- Difficulty is stored as `config.difficulty: string[]`. Options live in
  `DIFFICULTY_OPTIONS` (base) + `MODE_DIFFICULTY.hypersync` (HFA) in
  `src/phases/ChronossusSetupFlow.tsx`; most are rendered disabled ("Coming soon").
- The existing `src/engine/playthrough.test.ts` is **Chronobot-only**.

---

## PART 1 — Playthrough test harness  *(do first)*

Goal: a shared helper that plays a full Chronossus game deterministically (inject dice /
energy draws / answers), asserting it completes, invariants hold, and the score is sane.

### T1. Base-game playthrough test ✅ done
- [x] `src/engine/chronossusPlaythrough.test.ts` — drive setup → (per Era) Preparation →
  Paradox → Power Up → Warp → Action Rounds (take turns until both pass) → Clean Up → next
  Era → End Game. Inject deterministic energy draws, AI-die values, and paradox/warp rolls.
- [x] Assert: no throws; Exosuit/energy/paradox invariants hold each phase; `scoreChronossus`
  returns a coherent breakdown; game ends at `MAX_ERA`.
- [x] Factor the driver into a reusable `playChronossus({ config, rolls… })` helper
  (`src/engine/chronossusPlaythrough.ts`) so mode variations differ only by config + injected
  values.

### T2. HFA (Hypersync) variation ✅ done
- [x] Same driver with the `hypersync` mode config (C12A/C13A tiles, Hypersync Action flow,
  Solo Hypersync tiles). Assert the Hypersync Action + Autoleap paths execute.

### T3. Extensibility ✅ done
- [x] Document (in the test file header) how to add a per-mode variation, so **Fractures**
  (Part 3) and future modes drop in a new `describe` with their config. Each new mode ships
  with its playthrough variation.

---

## PART 2 — Difficulty settings (one option at a time)

Each option below is its own execution step: **(a)** restate the rule + intended engine
logic and get feedback, **(b)** implement, **(c)** unit-test, **(d)** enable it in the Setup
flow (move out of "Coming soon"), **(e)** extend the relevant playthrough variation if it
changes end-to-end behavior. Flags/labels are the existing stubs in `ChronossusSetupFlow.tsx`.

**Cross-cutting requirement (any option with a sub-selector, e.g. D3's 1/2/3, D6's 0/1/2):**
the specific chosen sub-value must be shown wherever the difficulty options selected are
listed (turn overview, end-game screen) — not just the flag's generic label. **Confirmed
2026-08-10.**

**Prereq D0 — scoring seam:** thread `config.difficulty: string[]` into `scoreChronossus`
(new optional 2nd param) so it can add the D5 leftover-energy VP line at game end. **D7 does
NOT go through this seam** — Failed Actions score their +2 VP live, mid-game, the moment a
Failed Action resolves (added straight to `bot.vp` like other during-game VP), not as an
end-game scoreChronossus addition. **Confirmed 2026-08-10.**

### Base-game options (`DIFFICULTY_OPTIONS`)
- [x] **D1 — `chronossus-tiles-b-side`** (already live) — **verified + gap closed
  2026-08-10**: checkbox → per-family `tileSides` picker → `config.tileSides` is fully wired
  (ChronossusSetupFlow.tsx ~186-204, 331-402) and consistent with D2's family-keyed slot-swap
  design. Added `src/board/chronossusModes.test.ts` covering `tileCodeFor`'s config-driven
  side selection (the resolution-level B-side effects were already covered by the existing
  `resolveAction` tests).
- [x] **D2 — `chronossus-swap-tiles`** — swap Action tiles between **Slot I and Slot III**
  (`m2p3` / `m5s4`). Implemented as a swap-aware `getMode(id, difficulty?)` in
  `chronossusModes.ts` (exchanges `family` on the Slot I / Slot III `ModeSlot` entries, mode-
  agnostic since every mode shares the I/II/III scheme). All 4 `getMode` call sites updated to
  pass `state.config.difficulty` where slot lookups matter. Tested in `chronossusModes.test.ts`.
- [x] **D3 — `chronossus-extra-energy`** — +1/2/3 Energy Cores, added **energized**. Refactored
  into a pure `applyDifficultySetup(bot, config)` in `chronossus.ts` (keeps the engine pure/
  testable per CLAUDE.md) called once from `ChronossusGame.beginGame` and from the playthrough
  helper's `setupChronossus`. Sub-selector (1/2/3) added to `ChronossusSetupFlow.tsx`. Tested
  directly + via the new playthrough difficulty variation.
- [x] **D4 — `chronossus-extra-powerup`** — free +1 Exosuit; excess over `exosuitsTotal` (not
  the per-Era `powerUpCap`) converts to +2 VP/excess, cores still removed. Implemented in
  `resolvePowerUp`. Tested (room-to-spare, exceeds-max, post-Impact headroom, flag-off cases).
- [x] **D5 — `chronossus-leftover-energy-vp`** — `bot.energyPool.energized × 1` VP at game end.
  `scoreChronossus(bot, difficulty?)` gained the seam (D0) + a `leftoverEnergyVP` field; score
  screen (both Number and Tally modes) and the share summary show the line when nonzero.
- [x] **D6 — `chronossus-fewer-objectives`** — setup-text only, reveal-count sub-selector
  **0/1/2**, drives the "Setup for this app" bullet's "revealing N" text. No engine logic.
- [x] **D7 — `chronossus-failed-action-vp`** — **replaces** the base +1 VP per Failed Action
  with **+2 VP total**, live at the moment each Failed Action resolves (not through D0). Added
  a `failedActionVP(difficulty)` helper used at all 5 Failed-Action call sites in
  `resolveAction`/`resolveTimeTravel`/`resolveHypersyncAction`. Tested at each site + a
  flag-off regression.
- [x] **D8 — `chronossus-research-new-shape`** — candidates = shape(s) tied for the lowest
  `bot.breakthroughs` count (`researchShapeCandidates`, pure + tested). Unique min → take
  directly; tied → the UI (`ChronossusGame.pickResearchShape`) rerolls the existing
  app-simulated `rollShapeDie()` until it lands on a candidate — no new randomness primitive,
  engine stays pure.
- [x] **D9 — `chronossus-hex-unavailable`** (World Council) — **fixed 2026-08-10**: the
  selectable-options filter in `ChronossusSetupFlow.tsx` was dropped entirely (all of
  `DIFFICULTY_OPTIONS` + `MODE_DIFFICULTY[moduleId]` now render as checkboxes), which
  un-blocked D9's already-coded `blockWorldCouncil` setup note along with D2–D8. Matches the
  Chronobot's identical option (setup-text only, no engine logic).

**All of Part 2 shipped 2026-08-10.** New tests: `src/board/chronossusModes.test.ts` (11),
~24 new cases appended to `src/engine/bots/chronossus.test.ts`, a difficulty-options variation
in `src/engine/chronossusPlaythrough.test.ts` (D3/D4/D5/D7 through a full game). `npm run
build` / `npm test` (142 passing) / `npm run lint` (only the pre-existing `only-export-
components` warnings) all clean. Manual Playwright smoke test of the Setup flow (toggle
D2/D3/D6/D9, sub-selectors, Setup-for-this-app bullets, Begin Era 1) showed no console errors.
Cross-cutting sub-selector display requirement done: `chronossusDifficultyLabel` appends the
chosen value, used in the score-screen setup note + share summary.

### HFA module option (`MODE_DIFFICULTY.hypersync`)
- [x] **D10 — `chronossus-hypersync-targeted`** (already live) — **verified 2026-08-10, no
  further work.** Traced end-to-end: `HypersyncDialog` (ChronossusGame.tsx ~2759) skips the
  roll-a-hex step and shows the "no random roll" copy when `targeted`, but this is **UI-only
  — zero engine effect**. `resolveHypersyncAction` (chronossus.ts:664-665) always retrieves
  the furthest-past pending tile regardless of which hex was rolled; `input.hex` only feeds
  display text ("Hypersync hex 3" vs. "the Hypersync space for its furthest-past pending
  tile"), nothing downstream reads it. Nothing for the playthrough engine test to exercise —
  the pure engine doesn't branch on this flag at all, and this codebase has no `.test.tsx`
  UI-component tests to add one to.

---

## PART 3 — Alternate Timelines & Variable Anomalies (ahead of Fractures)

Both are documented on **Solo Opponents rulebook p.18** with a compact Chronossus-behavior
delta each (verbatim below). Neither needs the full Fractures of Time module/mechanics —
confirmed 2026-08-10 this can go ahead of Part 4.

### A1. Alternate Timelines — ✅ shipped 2026-08-10
**Dependency:** none confirmed (its own full player-facing rules live in the Essential
Edition core rulebook, out of scope for us — **only the Solo Opponents p.18 delta matters**
for the Chronossus, per the user 2026-08-10).

Verbatim (Solo Opponents p.18):
> CHANGES AT SETUP: No changes at Setup.
> ⏳4 WARP PHASE: In the Warp Phase, you must decide how many Resources and/or Workers to
> warp first, then roll for the Chronossus. Place the tiles in turn order, as usual.
> It ignores penalties (red spaces), and it receives 2 VPs instead of any positive rewards.
> You resolve both positive and negative effects as normal.
> INCREASING THE DIFFICULTY: The Chronossus scores 3 VPs per positive effect.

**Confirmed design (2026-08-10, from the user):** in the Warp Phase, the player decides
their own Warp tile placement first, then the app rolls/places the Chronossus's Warp
tiles as usual (order note only — no state change). After that, the app asks the player
how many of the Chronossus's newly-placed Warp tiles landed on a **positive**-effect
Timeline space (the player reads this off the physical tiles; the app doesn't track
Timeline-tile slot colors). The Chronossus scores **2 VP per positive space** (or **3 VP**
if its own difficulty option is selected). **Negative/penalty spaces are ignored
entirely — nothing to ask, nothing to track.**

- [x] Engine: `resolveWarp(state, paradoxes, positiveSpaces = 0)` grants
  `positiveSpaces * (DIFFICULTY_ALT_TIMELINES_3VP ? 3 : 2)` VP; backward compatible
  (existing callers omitting the 3rd arg see zero behavior change).
- [x] New Extra-Module flag `EXTRA_MODULE_ALTERNATE_TIMELINES` — `EXTRA_MODULES` in
  `ChronossusSetupFlow.tsx` now renders available extras as multi-select checkboxes
  (was previously unconditionally in "Coming soon"); new `GameConfig.extraModules`.
- [x] Its own difficulty option `DIFFICULTY_ALT_TIMELINES_3VP` — plain checkbox, appears
  in the Difficulty step only when the module is selected (`EXTRA_MODULE_DIFFICULTY` map,
  mirrors the existing `MODE_DIFFICULTY` pattern).
- [x] UI: `ChronossusGame.commitWarp` intercepts before resolving when the module is
  active and Warp tiles were placed — shows a 0..N button prompt, then calls
  `resolveWarp` with the chosen count. Verified live (Playwright): correct prompt
  text/pluralization, correct button range, VP applied, phase advances to Actions —
  zero console errors.
- [x] Unit tests (`chronossus.test.ts`: 2/3 VP rates, backward-compat no-op) + a
  playthrough variation (`chronossusPlaythrough.test.ts`) confirming the VP delta
  across a full game and that the engine is caller-driven (doesn't itself gate on
  `extraModules` — the UI decides when to prompt).

### A2. Variable Anomalies — confirmed design, ready to implement
**Dependency:** the physical Fractures of Time **expansion box** (for its 16 Variable
Anomaly tiles + Anomaly Remover tiles) but **not** the Fractures **module**/mechanics —
confirmed 2026-08-10 by the user ("can be played with or without the main Fractures of Time
module," verbatim from the Fractures rulebook p.13). Standalone-implementable.

Verbatim (Solo Opponents p.18):
> CHANGES AT SETUP: The Chronossus ignores all unique effects of the Anomalies and does not
> receive an Anomaly Remover tile.
> RECEIVING ANOMALIES: When receiving Anomalies, the Chronossus will select one that will
> allow it to retrieve a Warp tile. If both or neither do, it will select the one with the
> smaller VP penalty.
> REMOVING ANOMALIES: When removing an Anomaly, it always removes the one with the largest
> VP penalty.

**Tile data** (verbatim, Fractures rulebook pp.3, 18-19 — 16 tiles X01–X16, each with a VP
penalty and a "retrieve a Warp tile" eligibility window keyed to the Era's Impact status;
the Chronossus ignores each tile's unique passive ability per the Setup rule above, so only
these two fields matter to it):

| Tile | VP | Retrieve window |
|---|---|---|
| X01–X06 | −2 | Before Impact only |
| X07–X08 | −3 | Before Impact only |
| X09–X12 | −4 | Any Era |
| X13–X15 | −5 | After Impact only |
| X16 | −6 | Never (no retrieve icon at all) |

Gaining an Anomaly (Fractures p.14): "you must choose to receive one of the two visible
Anomalies" from a primary/secondary stack (same shift-on-Preparation-Phase pattern as
Buildings/Technology). Matches how Construct VP already works in this app (`buildingVP`,
player-reported) rather than the app simulating a shuffled deck.

**Confirmed design (2026-08-10):**
- **State:** replace the flat counter with a held-VP list for Variable-Anomalies games —
  `anomalyVps: number[]` on `ChronossusState` (mirrors the existing `buildingVps`/
  `superprojectVps` per-instance-VP pattern), alongside the untouched flat `anomalies:
  number` used by every other mode/the Chronobot. `scoreChronossus` sums `anomalyVps` instead
  of `anomalies * ANOMALY_VP` when the list is present/non-empty for that game.
- **Gaining** (still triggers at 3 Paradoxes, same as today): the player reports the 2
  visible offer tiles' data by hand — **VP value + a yes/no "does it let the Chronossus
  retrieve a Warp tile right now" answer** for each (no tile-code catalog; the player reads
  this straight off the physical tiles, same as `buildingVP` input for Construct today).
  Engine picks: the one flagged retrieve-eligible (if only one is); if both or neither are,
  the one with the smaller penalty (closer to 0). Push its VP onto `anomalyVps`; if the
  chosen tile was retrieve-eligible, decrement `warpTilesOnTimeline` by 1 (if any) — same
  simple flat-count removal the engine already does elsewhere, no per-Timeline-tile tracking.
- **Removing** (the `remove-anomaly` Action / Anomaly Remover tile): no player input needed —
  the engine already knows every held tile's VP, so it removes `Math.min(...anomalyVps)`
  (most negative = largest penalty) itself.
- **Tooltip:** the Anomalies board counter shows the held VP list on hover/tap, same pattern
  as the buildings tooltip (`buildingVps`/`superprojectVps`) already listing per-tile VP.
- Fractures' Anomaly Remover Water-cost delta (−1 W vs. base) doesn't affect the app — it
  doesn't track Water.

- [ ] Engine: `anomalyVps?: number[]` on `ChronossusState`; a `pickVariableAnomaly` helper
  implementing the gain-selection rule; `scoreChronossus` sums it when present; `remove-
  anomaly` resolution removes `Math.min(...anomalyVps)` when the list is present.
- [ ] New Extra-Module flag — un-stub `variable-anomalies` in `EXTRA_MODULES`
  (`ChronossusSetupFlow.tsx`); combines with any base mode per the rulebook.
- [ ] UI: gain-Anomaly prompt asks for the 2 offer tiles' (VP, retrieve-eligible) each;
  Anomalies board counter tooltip lists held VPs (buildings-tooltip pattern).
- [ ] Unit tests (tile-selection rule: unique-eligible, both/neither-eligible tie-break,
  removal-picks-largest-penalty) + playthrough variation.

---

## PART 4 — Fractures of Time (full module)

The largest piece: a new mode with new subsystems. Build on the shared solo-bot core +
mode/tile machinery. Ends with a playthrough variation (Part 1 seam).

### F-R. Research & design
- [ ] Read the Fractures rules (Chronossus deltas) + pull TTS art (see CLAUDE.md pipeline).
  Capture the module's deltas in a short design note in this plan before coding.

### F1. Mode entry & setup
- [ ] Un-stub **Fractures of Time** (and any combos) in `MODULE_CONFIGS`; wire `getMode`
  slots/tiles for it (`chronossusModes.ts`, `chronossusTiles.ts`).
- [ ] Fractures Setup screens (verbatim rulebook + app-modified), including the Flux Pool /
  Cores / Fracture Device components and any tile-layout changes.

### F2. Engine — Flux Pool / Energy Cores / Fracture Device
- [ ] State + types for the Fractures subsystems on the Chronossus slice.
- [ ] Draw/spend/exhaust logic for the Flux Pool + Cores; Fracture Device behavior.
- [ ] Unit tests for each subsystem.

### F3. Engine — X-series actions & tiles
- [ ] X-series Action catalog (the Fractures-specific tiles/actions) in the tile/resolver
  machinery (mirroring how base + HFA tiles resolve). Autoleap where applicable.
- [ ] Unit tests.

### F4. Board / view / overlays
- [ ] Fractures board art + overlays (Flux Pool, Cores, Fracture Device, X-tiles),
  calibrate-mode positions, command-marker routes if they differ.

### F5. Scoring & objectives
- [ ] Fractures expansion scoring deltas + any expansion objectives (confirm player-side vs
  Chronossus-scored — **open question**). Extend `scoreChronossus` + score screen.

### F6. Ship
- [ ] Fractures playthrough test variation (Part 1 seam).
- [ ] `npm run build` + `npm test` + `npm run lint` clean; manual playthrough; assets/theme pass.

---

## Recommended implementation order
1. **Part 1** (test harness: T1 → T2 → T3) — guardrail first. ✅ done
2. **Part 2 D0** (scoring seam), then **D1…D10** one at a time (feedback pause each). ✅ done
3. **Part 3** — A1 (Alternate Timelines, ready to implement) → A2 (Variable Anomalies, needs
   the open design questions answered first). ← next up
4. **Part 4** (F-R → F1 → F2 → F3 → F4 → F5 → F6).

## Open questions
- **New idea (not a strict difficulty increase, deferred):** a *randomized* tile-arrangement
  option — shuffle **all** of the chosen mode's modular-tile slots (not just Slot I↔III like
  D2; every slot the active mode defines, e.g. base's I/II/III, hypersync's I/II/III/V, and
  whatever future modules add). Raised during the D2 discussion; needs its own definition
  later — not in scope for this plan's D-numbered list yet.
- **F5:** are Fractures expansion objectives player-scored (like Solo Objectives) or does the
  Chronossus score them? Confirm from the rulebook during F-R.
- **Combos** (e.g. Fractures + Pioneers/Hypersync) are out of scope here unless trivial.

## Verification (whole effort)
- Build clean; lint (only pre-existing warnings); tests green (base + HFA + Fractures
  playthroughs, plus per-option difficulty unit tests).
- Chronobot + Chronossus base regression: unchanged behavior; pop-ups/text intact.
- Each difficulty option: selectable in Setup, drives the stated engine effect, reflected in
  scoring where applicable.
- Fractures: full guided playthrough with no console errors.
