# COMPLETED — Chronossus difficulty options, playthrough tests, small modules, & Fractures of Time

**Archived 2026-08-13.** Frozen record — do not edit.

Ran 2026-08-09 → 2026-08-13. Four connected efforts on the shipped Chronossus opponent:
a reusable playthrough test harness, the 10 difficulty options, two small modules
(Alternate Timelines + Variable Anomalies), and the full **Fractures of Time** module —
finishing with a playtest-fix pass (F8). Deployed to production 2026-08-13
(`main` @ `cbf6578`, 39 commits from `staging`).

## What shipped

| Part | Outcome |
|---|---|
| 1 — Test harness | `playChronossus({config, rolls…})` + `chronossusPlaythrough.test.ts`; a mode adds a `describe` |
| 2 — Difficulty | D1–D10 all live and engine-backed (D6/D9 setup-text only, D10 UI-only) |
| 3 — Small modules | Alternate Timelines (2/3 VP per positive Warp space) + Variable Anomalies (`anomalyVps` per-tile VP) |
| 4 — Fractures of Time | Flux Pool, Energy Cores in placed Exosuits, the full Blink check + A/B selection, Valley Actions (Assimilate/Extract), Power Pack, Technologies at 3 VP, C04/C05/C06/C14 tiles, and the `fractures+hypersync` combo |
| F8 — Playtest fixes | Placement ordering, dialog parity, rule-box placement, History detail |

**Final state:** 247 tests, `npm run build` + `npm run lint` clean (only the pre-existing
`only-export-components` warnings). F4 (board overlays) and F5 (scoring & objectives) were
dropped 2026-08-12 — the Valley board stays player-managed, and the scoring deltas the module
needed had already shipped.

## Production notes

Things worth knowing when maintaining or extending this:

- **A new module that brings its own board** follows the seam documented in CLAUDE.md:
  `placesExosuitFor(actionId)` (does it place at all) and `OFF_MAIN_BOARD_ACTIONS` /
  `isMainBoardPlacement(actionId)` (where it lands). Off-board placements are Blink
  **destinations but never sources**, so they aren't recorded in `placedExosuits`. Add a new
  module's off-board Actions to that list and Blink selection, the "bottom one" counting, and
  the pass rule all follow.
- **The Blink check is skipped when the Flux Pool holds no Cores** — a deliberate departure
  from the rulebook's literal "at least 1 token". A draw could then only produce Casings,
  which change nothing that Era and all return in Clean Up. Documented on `shouldCheckBlink`.
- **Blink selection works on Capital Action *spaces*, not the app's per-type Action ids**
  (`BlinkSpace` / `BLINK_SPACE_ORDER`): Research, Recruit, Construct (all types), Mine, World
  Council last. Any Construct Exosuit answers a Construct token, and the "bottom one" count is
  per space. World Council matches no Command token and sorts last.
- **Every Exosuit-placing path must run the Blink check.** Mine and Recruit Genius shipped
  broken for a day because they don't use the shared `mech` gate; they now route through
  `runBlinkCheck` with a `postBlinkRef` continuation. Any new Action with its own gate needs
  the same.
- **Never instruct a placement before the app knows the outcome** — ask, check, decide, then
  instruct. See the CLAUDE.md convention; `blinkCheck` on `DetailPanel` / `valleyGate` is what
  makes the gate ask rather than tell.
- **A module's Action must join `summarizeChronossusExtras`** or it won't appear in History —
  `summarizeTurn` is written against the Chronobot's state and can't see module-only pools.
- **Both rule-text tiers.** The Solo Opponents rulebook writes each module Action twice: a
  one-line Appendix entry and a fuller module-section write-up. Transcribing only the Appendix
  is how the Operator wildcard / 5-VP-set and "none left → Failed Action" rules got missed the
  first time. `ModularTile.detail` carries the second tier.
- **Not verified on device.** The end-to-end pass was automated (Playwright, `Math.random`
  pinned) plus live browser checks. A manual iPad playthrough / assets-theme pass is still
  outstanding — carried to `TODO.md`.

---

# THE PLAN (as written)

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

### A2. Variable Anomalies — ✅ shipped 2026-08-10
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
- **Gaining** (still triggers at 3 Paradoxes, same as today): **revised 2026-08-10 after
  playtest feedback** — the prompt now follows the Construct/`buildingVP` pattern exactly:
  it states the verbatim RECEIVING ANOMALIES criteria (take the one that lets it retrieve a
  Warp tile; if both or neither do, the smaller penalty), the player applies that to the 2
  visible tiles, then reports **the taken tile only** — its printed VP (−2…−6) plus a yes/no
  "does it retrieve a Warp tile". (The earlier shipped version asked for both offer tiles
  and had the engine choose; that was out of step with every other player-reported value.)
  Push its VP onto `anomalyVps`; if it retrieves, decrement `warpTilesOnTimeline` by 1 (if
  any) — same flat-count removal used elsewhere, no per-Timeline-tile tracking.
- **Removing** (the `remove-anomaly` Action / Anomaly Remover tile): no player input needed —
  the engine already knows every held tile's VP, so it removes `Math.min(...anomalyVps)`
  (most negative = largest penalty) itself.
- **Tooltip:** the Anomalies board counter shows the held VP list on hover/tap, same pattern
  as the buildings tooltip (`buildingVps`/`superprojectVps`) already listing per-tile VP.
- Fractures' Anomaly Remover Water-cost delta (−1 W vs. base) doesn't affect the app — it
  doesn't track Water.

- [x] Engine: `anomalyVps?: number[]` on `ChronossusState`; `resolveVariableAnomalyGain`
  implements the gain-selection rule; `scoreChronossus` sums it when present; `remove-
  anomaly` resolution removes `Math.min(...anomalyVps)` when the list is present.
  `rollParadox` defers the actual gain when Variable Anomalies is active (needs the 2
  offered tiles' data, unavailable at roll time) — reaching 3 Paradoxes just flags
  `requiresInput: true` and resets the tracker; the base flat-counter path (Chronobot +
  every other Chronossus game) is untouched, zero regression risk.
- [x] New Extra-Module flag `EXTRA_MODULE_VARIABLE_ANOMALIES` — un-stubbed in
  `EXTRA_MODULES` (`ChronossusSetupFlow.tsx`, same multi-select mechanism A1 added);
  combines with any base mode. No difficulty sub-option (Solo Opponents p.18 has none for
  this module, unlike Alternate Timelines).
- [x] UI: `VariableAnomalyGainPrompt` (new modal, `.modal-overlay`/`.modal-card`) asks for
  the 2 offer tiles' (VP preset buttons −2..−6, retrieve-eligible toggle) each, blocking
  the Paradox phase's "Continue to Power Up" until resolved (rendered as a sibling overlay
  rather than replacing `ParadoxPhaseBody`, so its internal roll-history/stopped state
  isn't lost to a remount). Anomalies board counter tooltip lists held VPs — same
  `buildingVps`-style pattern as buildings. `ParadoxPhaseBody`'s "Anomalies X/3" display
  and the Remove-Anomaly gate text both shimmed to read `anomalyVps?.length ?? anomalies`.
- [x] Unit tests (`chronossus.test.ts`: setup seeding, scoring, deferred-gain roll
  behavior + 3-cap, all 4 gain-selection branches, Warp-tile retrieval incl. zero-Warp
  edge case, removal-picks-largest-penalty, regression checks) + a playthrough variation
  (`chronossusPlaythrough.test.ts`) confirming a full game correctly holds/scores tiles
  by their individual VPs. 169 tests passing total.

---

## PART 4 — Fractures of Time (full module)

The largest piece: a new mode with new subsystems. Build on the shared solo-bot core +
mode/tile machinery. Ends with a playthrough variation (Part 1 seam).

### F-R. Research & design
- [x] Read the Fractures rules (Chronossus deltas). Design note below (2026-08-11).
- [ ] Pull TTS art for the Valley board + Fractures pieces (see CLAUDE.md pipeline) — F4.

**The module's deltas** (verbatim source: Solo Opponents pp. 11-13; "All of the Fractures of
Time module and the Chronossus base rules apply, unless noted below"):

- **Setup:** Valley board on its 2-player side; C04A/C05A/C06A onto the three empty
  Chronossus-board spaces; a second container, the **Flux Pool**, holding 1 Flux Core + 3
  Empty Flux Casing tokens; the Chronossus does **not** use a Fracture Device; add the
  "Technology Cards" and "Flux on Track" Solo Objectives to the deck before drawing.
- **Every placement:** when the Chronossus places an Exosuit on the Main board, take an
  Energy Core from supply and put it in that Exosuit.
- **Blink-ready Exosuit** = one that is on the Main board, has an Energy Core in it, and is
  not on the Action being attempted.
- **Blink check** (before every Exosuit Action): if it has a Blink-ready Exosuit AND >= 1
  token in the Flux Pool, draw 1 token. Flux Core -> discard it and Blink. Empty Flux Casing
  -> set it aside; place/pass as usual.
- **Blink selection:** (A) an Exosuit on an Action matching any *other* Command token on the
  Chronossus board — lowest token number wins; else (B) the bottom-left-most Exosuit
  (closest to the bottom Research space; lower spaces win ties). Move it to the Action as if
  newly placed, return its Energy Core to supply, resolve the Action normally (advancing the
  token). It never rolls the Flux or Glitch dice and never receives Glitches.
- **Valley Actions:** as with World Capital, if no Valley Action space is free it places on
  the **Valley Capital** Action space.
- **New Action - Assimilate** (roll the Research shape die first): Circle -> recruit an
  Operator + gain 1 Flux Core. Triangle -> take a Technology card (preferring the secondary
  stack). Square -> whichever it has fewer of, Operator (+1 Flux Core) or Technology;
  Operator if tied.
- **Clean Up:** set-aside Empty Flux Casings return to the Flux Pool.
- **End of game:** 3 VP per Technology it holds.
- **Difficulty options (5):** B-side new Action tiles; replace C04 with C14; +1/2/3 Flux
  Cores in the pool at game start; each leftover Flux Core = 1 VP at the end; roll the Glitch
  die at setup and place that Glitch **for yourself** (player-side only, app just says so).

**Confirmed 2026-08-11:**
- The app tracks the bot's Exosuit placements and applies the Blink-selection rule itself.
  It already knows *which Action* each placement went to; the only thing it can't see is
  whether the Exosuit took the printed Capital Action space or the World Council space —
  so in Fractures the placement gate asks that as two questions: "is a Capital Action space
  (not World Council) open?", then "is the World Council space open?".
- **World Council is not a specific Action space.** An Exosuit there matches no Command
  token, so selection rule A never picks it; and since it sits physically at the top of the
  board, rule B's bottom-left-most ordering puts it effectively last (Mine is the other
  late one, depending on whether Mine is an upcoming Command Action).
- The Valley board stays player-managed: the app names the Valley Action and the Valley
  Capital fallback in text, no art or overlays (revisit in F4 if wanted).

**Still open:**
1. Track the bot's Exosuit placements (new state) so the app can apply the Blink-selection
   rule itself, vs. asking the player to pick.
2. Whether the Valley board gets its own art/overlays or stays player-managed with the app
   only naming the Action.
3. Counters the slice needs: Flux Pool (Cores + set-aside Casings, reusing the Energy-Pool
   draw pattern), Technologies (3 VP each), Operators (Assimilate tie-break).

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

*(F4 board/overlays and F5 scoring & objectives were dropped from this plan on 2026-08-12 —
the Valley board stays player-managed so there is no overlay work, and the scoring deltas
that were needed already shipped.)*

### F6. Ship
- [ ] Fractures playthrough test variation (Part 1 seam).
- [ ] `npm run build` + `npm test` + `npm run lint` clean; manual playthrough; assets/theme pass.

### F7. Turn-overview + History polish (playtest feedback 2026-08-11)
Chronossus play view only; no engine rules change.

**Turn overview panel** — ✅ shipped 2026-08-12
- [x] **Kill the dead space.** `.eoa-hint` carried `flex: 1 1 240px` inside a *column* flex
  container, so the basis was read as a 240px min height — that was the gap. Now `0 0 auto`.
- [x] **Drop the bot / player turn boxes** (`playerPassed`/`botPassed` props gone from
  `TurnBarOverview`; the flags row now renders only when a bot supplies tracker chips).
- [x] **"Turn" → "Bot Turns"**, moved onto the title line (`Era 1 · Phase 5 · Bot Turns 3`);
  the Chronobot's own count follows as `Bot Actions N / min M`.
- [x] **Teal outline around the Exosuit icon** — drop-shadow trace on `.cx-exosuit img`,
  same idiom as `.cx-cmd-marker`.
- [x] **Remove the Ops tracker** (Tech-only chip; the hint text follows).
- [x] **Widen the Exosuit tracker** — `.eoa-flag` is now `inline-flex` + `nowrap` and the row
  is `align-items: stretch`, so every chip is one line at a common height.
- [x] **Bonus fix found while verifying:** phase-entry History labels (`Era 1 · → Warp`)
  were being counted as bot turns — the "not a turn" filter only matched `Power Up:`/`Warp:`
  with a colon. `Bot Turns` now starts each Era at 0.

**History** — ✅ shipped 2026-08-12
- [x] **Call out a Blink.** The label becomes `Era 1 · ⚡ Blink → Assimilate` and the first
  effect line reads `⚡ Blink — Exosuit moved from Construct to Assimilate; its Energy Core
  returns to the supply` (`(the bottom one)` when several share the source space). Driven by
  a per-turn `blinkFromRef` consumed in `finishTurn`, so all three commit paths (Action,
  Valley tile, Hypersync hex) get it and a cancelled check can't leak into a later turn.

---

## Recommended implementation order
1. **Part 1** (test harness: T1 → T2 → T3) — guardrail first. ✅ done
2. **Part 2 D0** (scoring seam), then **D1…D10** one at a time (feedback pause each). ✅ done
3. **Part 3** — A1 (Alternate Timelines) → A2 (Variable Anomalies). ✅ done
4. **Part 4** (F-R → F1 → F2 → F3 → F6). ← built, on staging (F4/F5 dropped 2026-08-12)
5. **F7** (turn-overview + History polish, from the 2026-08-11 playtest). ← in progress

## Open questions
- **New idea (not a strict difficulty increase, deferred):** a *randomized* tile-arrangement
  option — shuffle **all** of the chosen mode's modular-tile slots (not just Slot I↔III like
  D2; every slot the active mode defines, e.g. base's I/II/III, hypersync's I/II/III/V, and
  whatever future modules add). Raised during the D2 discussion; needs its own definition
  later — not in scope for this plan's D-numbered list yet.
- **Combos** (e.g. Fractures + Pioneers/Hypersync) are out of scope here unless trivial.

## Verification (whole effort)
- Build clean; lint (only pre-existing warnings); tests green (base + HFA + Fractures
  playthroughs, plus per-option difficulty unit tests).
- Chronobot + Chronossus base regression: unchanged behavior; pop-ups/text intact.
- Each difficulty option: selectable in Setup, drives the stated engine effect, reflected in
  scoring where applicable.
- Fractures: full guided playthrough with no console errors.

---

# REVIEW

No `/plan review` walkthrough was run for this effort — verification happened continuously
instead, per feature:

- **Automated end-to-end (2026-08-12):** Playwright against the dev server with `Math.random`
  pinned so every Flux draw is a Core — a Fractures game from Setup through Era 1 Action
  Rounds, hitting the two-question placement gate, the Blink check, a Blink into Assimilate,
  and the Operator/shape-die branch. Zero console/page errors.
- **Per-feature live checks** are recorded inline in the log above (mode selectable, setup
  seeds the Flux Pool, both draw outcomes, the combo, dialog flow at 600x800 and 1280x900,
  both tile sides, Undo round-trips through the phase screens).
- **Engine coverage:** 247 tests, including full playthrough variations for base, HFA,
  difficulty options, Alternate Timelines, Variable Anomalies and Fractures.
- **Outstanding:** manual playthrough on device (iPad) + assets/theme pass — user-side, now
  tracked in `TODO.md`.

---

# THE EXECUTION LOG (as written)

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
- [x] **Phase-screen prompt pass** (2026-08-11): one visual language for "the app needs
  something from you" across every non-Action phase — the amber `.place-prompt` box the
  Anomaly/Alternate-Timelines prompts already used now also carries the Paradox tie/lead
  question, the Hypersync extra-roll question, and both bots' Clean Up game-end choice
  (`.capital-check` / `.phase-end-pink` retired). Paradox screen re-ordered to
  intro → roll log → prompt → trackers → verbatim rules, so reference material sits under
  what you act on. Trackers became four icon chips (Paradoxes / Anomalies / Warp tiles /
  Hypersync, the last only in that mode) via a `PARADOX_ICONS` prop the Chronossus
  overrides for its own Warp-tile face. Paradox rolls now render like Warp rolls (numbered
  die + Paradox symbol, symbol hidden on a blank), for both bots. The Anomaly prompt leads
  with "Variable Anomalies —" so it reads as a mode-specific check, not the base −3 VP gain.
- [x] **Prompt box is per-bot themed** (2026-08-11): `.place-prompt` hard-coded amber, which
  clashed with the Chronobot's purple. New `--sp-prompt-rgb` token — violet by default,
  amber under `:root[data-bot='chronossus']`. Inside the box, the Alternate Timelines count
  buttons moved from the Setup flow's indented `.difficulty-sub-value` pills to the same
  `.vp-digit` row the Anomaly/Construct prompts use, and `.pp-sub` swapped its hard-coded
  purple-grey for `--sp-text-mute`.
- [x] **Warp screen matches the Paradox order** (2026-08-11): its two verbatim rules boxes
  moved below the roll/prompt, so both phase screens read intro → action → reference.
- [x] Landing-page Chronossus progress bar 40% → 50%.
- [x] **Hypersync placement keeps the marked-off spaces visible** (2026-08-11): the roll
  step rendered only `available` hexes, so a space marked occupied a moment earlier simply
  vanished. It now renders all 3 with the occupied ones still crossed off (⊘), matching the
  board the player just described. `.hs-hex.dimmed` also dropped its hard-coded purple for
  the theme accent. Verified live: marking space 1 gives `occupied ⊘ / dimmed 2 / rolled 3`.
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

## PART 4 — Fractures of Time (full module) ← in progress
### F-R — Research & design ✅ done (2026-08-11)
- [x] Read the Fractures Chronossus deltas (Solo Opponents pp.11-13); design note in the PLAN
- [x] Design confirmed: the app tracks Exosuit placements and applies the Blink-selection
  rule itself; in Fractures the placement gate splits into "Capital Action space open?" then
  "World Council open?"; World Council matches no Command token and sorts last for the
  bottom-left-most tiebreak; the Valley board stays player-managed (named in text, no art)
- [ ] Pull TTS art for the Valley board / Fractures pieces — deferred to F4 (may not be needed)

### F1 — Mode entry & setup ✅ done (2026-08-11)
- [x] `fractures` mode registered (C04/C05/C06 in slots I/II/III) and un-stubbed in
  `MODULE_CONFIGS`; the "replace C04 with C14" difficulty swaps the family in `getMode`,
  applied before the I/III swap so the two options compose
- [x] The module's other 3 difficulty options (extra starting Flux Cores 1/2/3, leftover
  Flux Core VP, roll a starting Glitch for yourself) in `MODE_DIFFICULTY`
- [x] Setup screens: verbatim Fractures setup box + app-modified bullets (Valley board,
  app-held Flux Pool, no Fracture Device, Energy Core into each placed Exosuit)
- [x] Slice fields seeded at setup: `fluxPool` (1 Core + 3 Casings + extras), `technologies`,
  `operators`; 7 new tests. Verified live: module selectable, all 4 options listed, setup
  text renders, state seeds `{cores:1,casings:3,setAside:0}`

### F2 — Engine: Flux Pool / Blinking ✅ engine done (2026-08-11)
- [x] `fluxPool` draw (`drawFlux`, caller-supplied roll like the Energy Pool): a Flux Core
  is discarded and triggers the Blink, an Empty Flux Casing is set aside
- [x] `placedExosuits` on the slice — `{ action, space: 'action' | 'world-council', hasCore }`
  per placement; `blinkReadyExosuits` / `shouldCheckBlink` implement the p.11 conditions
- [x] `selectBlinkExosuit` implements rule A (matching Command token, smaller number wins)
  then rule B (bottom-left-most). World Council matches no token and sorts last, per the
  confirmed reading. Returns which rule fired + how many Exosuits share that Action, so the
  UI can say "take the bottom one" when the app can't see which space is which
- [x] Clean Up returns the set-aside Casings to the pool and clears `placedExosuits`
- [x] Scoring: `technologyVP` (3 each) + `leftoverFluxVP` (difficulty), both in the total
- [x] 18 new tests (193 total)
- [x] Rule B's ordering confirmed by the user and shipped as `BLINK_SPACE_ORDER`, over a
  `BlinkSpace` type that collapses the app's per-type Action ids into the board's actual
  **Capital Action spaces**: Research, Recruit (incl. Recruit Genius/Research, Genius side
  only), Construct (all types), Mine, World Council last. Rule A matches on the space too,
  so any Construct Exosuit answers a Construct token, and the "take the bottom one" count is
  per space. Time Travel / Remove Anomaly / Reboot place no Exosuit on the Main board, so
  they are not Blink-from positions at all (`blinkSpaceOf` returns null and they're filtered)
- [ ] The Chronossus has no Fracture Device (p.11) — nothing to model

### F3 — Actions, tiles & the Blink flow ✅ done (2026-08-11)
- [x] **Corrected 2026-08-11:** Assimilate (C04/C14) and Extract (C05) are Action spaces on
  the **Valley board**, not pure tile effects — they take an Exosuit. `VALLEY_TILE_ACTIONS`
  + `placesExosuitFor` drive it: the tile dialog gates on "is a Valley Action space open?"
  (else the Valley Capital space, p.11), the placement spends an Exosuit, and the passing
  rule now applies to them. The Valley board is a Blink **destination but never a source**:
  the check runs after the Valley space is confirmed, a Blinked-in Exosuit is removed from
  `placedExosuits` (it's on the Valley board now), and normal placements there are never
  recorded. Power Pack (C06) stays a Chronossus-board effect with no Exosuit.
  `BlinkPanel`/`FluxCasingPanel` were extracted from `DetailPanel` so the tile dialog runs
  the identical check UI
- [x] Fractures tile actions wired end to end: `tile-assimilate` / `tile-extract` /
  `tile-power-pack` ids, C04/C05/C06 (+C14 sharing the Assimilate id via a `tileFamily`
  override), `TileEffect.fluxCores` + `.assimilate`, per-tile instruction copy
- [x] `tileActionAt(posKey)` — the path data names the base-game tile for each slot, so the
  view now resolves a slot to *this mode's* tile action (Fractures was opening Reboot)
- [x] Assimilate rolls the Research shape die in the view; the engine branches Circle /
  Triangle / Square (fewer of, Operator on a tie)
- [x] Placement gate split in Fractures: "Is a <Action> space open (not World Council)?" →
  "Is the World Council space open?" → Failed. The answer lands on `placedExosuits`
- [x] The check is skipped when the pool holds **no Flux Cores**: a draw could then only
  produce Casings, which change nothing that Era and all return in Clean Up, so prompting
  for it is pure noise (documented on `shouldCheckBlink` as a deliberate departure from the
  rulebook's literal "at least 1 token")
- [x] Both check panels show the drawn token's art (`flux-core.png` / `exhausted-flux-core.png`)
- [x] Blink flow: check → `drawFlux` → Casing panel (set aside) or Blink panel naming the
  space, the rule that fired, and "take the bottom one" when several share it. Committing
  moves the Exosuit and drops its Energy Core; no new Exosuit is spent
- [x] **Corrected 2026-08-11:** the Blink check runs once a free space is *confirmed*, not
  before the gate — the Chronossus only Blinks into a space it could have placed into, so
  there has to be a destination first. Order is now: pass check → "is a space open?" (→
  World Council) → Blink check on the confirmed space → the Action's own inputs. Either
  gate answer leads into the check, so it can Blink into World Council too. It still skips
  the pass when a Blink is possible, since Blinking spends no Exosuit from the supply
- [x] 9 new tests (209 total). Verified live: both draw outcomes, the two-question gate
  (World Council recorded), a Blink moving the Research Exosuit to Construct with
  `hasCore:false` and `exosuitsAvailable` unchanged, and Assimilate taking an Operator
- [x] Turn-overview tracking, mirroring the Energy Pool: a `CxFluxPool` chip (Flux Cores /
  Empty Flux Casings, plus a ⊘ count of Casings set aside this Era) and a Tech · Ops chip,
  both Fractures-only. Uses the existing `flux-core.png` / `exhausted-flux-core.png` art

- [x] **Operators completed 2026-08-11 (2nd pass).** The rulebook's module section (p.13)
  carries rules the Appendix line doesn't, and two were missing: an Operator is a
  **wildcard Worker** placed in the topmost empty space of the Worker collection, counting
  as that type "for all purposes, including discarding for 5 VPs" — so it lands in
  `bot.workers` (via `operatorWorkerSlot`) and an Assimilate can now complete the **+5 VP
  set** (`applyWorkerSetBonus`, extracted from `resolveRecruit` and shared). `operatorSlots`
  records which column each Operator sits in so the set discard knows what returns to the
  Valley supply. And **"no Operators left" is a Failed Action for +1 VP**: the dialog rolls
  the shape die first, and when the branch takes an Operator (`assimilateTakesOperator`)
  gates on "are there any left in the Valley?" before resolving
- [x] **Verbatim module-section text** on the tiles: `ModularTile.detail` holds the longer
  write-up (Assimilate + Recruiting Operators, Extract, plus the p.11 Valley placement
  rule) shown under the Appendix summary; the 📖 box now opens for any tile with a
  `detail`, not just B sides. C07–C13's sections (pp.14–17) are still Appendix-only

### F4 / F5 — dropped from the plan (2026-08-12, user request)
The Valley board stays player-managed, so there was no overlay geometry to place (the
module's state shows in the turn overview instead), and the scoring the module needed —
Technologies at 3 VP each + leftover Flux Cores — already shipped in all three score
displays (VP-pill breakdown, side-by-side tally, number-mode list). The remaining optional
items (a calibrate-placed Flux Pool board badge; engine-side Solo Objective scoring) are
not being done: Solo Objectives stay in the player-entered tally, as for every other mode.

### F-combo — Fractures + Hypersync ✅ done (2026-08-11)
- [x] `fractures+hypersync` registered and un-stubbed: C12 (I), C04 (II), C05 (III), C13
  covering Time Travel — Power Pack drops out, per the setup matrix. The C14 difficulty
  still swaps C04 wherever it sits
- [x] Setup flow made combo-aware: both modules' setup boxes render (`includes()` rather
  than `===`) and `modeDifficultyFor` unions both modules' difficulty options
- [x] The Hypersync hex is a Blink destination too — `resolveHypersyncAction` takes
  `blink`/`tokenActions`, moving an Exosuit onto the hex instead of spending one and
  dropping it from `placedExosuits`; the dialog reuses the shared check panels
- [x] 6 new tests. Verified live: the combo is selectable, both difficulty sets and both
  setup boxes appear, and the game seeds a Flux Pool

### F6 — Ship
- [x] 236 tests, build + lint clean (6 added for the Operator wildcard / set-bonus /
  Failed-Action rules)
- [x] Fractures playthrough variation (3 tests): a full game with the Flux Pool, Blinking
  and all three module tiles; leftover-Flux scoring; and 6 consecutive Blinks spending no
  Exosuit. Plus 4 unit tests for the tiles (C05/C05B, C06/C06B Autoleap, C14 via
  `tileFamily`, and the no-pool no-op outside Fractures)
- [x] Automated end-to-end playthrough (2026-08-12, Playwright against the dev server, with
  `Math.random` pinned so every Flux draw is a Core): Fractures game from Setup through
  Era 1 Action Rounds, hitting the two-question placement gate, the Blink check, a Blink
  into Assimilate, and the Operator/shape-die branch — zero console/page errors
- [ ] Manual playthrough **on device** (iPad); assets/theme pass — user-side

### F7 — Turn-overview + History polish ✅ done (2026-08-12)
- [x] Dead space gone: `.eoa-hint`'s `flex: 1 1 240px` was a 240px min *height* in the
  popover's column flex container → `flex: 0 0 auto`
- [x] Pass-state boxes dropped from `TurnBarOverview` (props removed; both bots' call sites
  updated) — the top-bar buttons already say whose turn it is
- [x] Count moved onto the title line and renamed: `Era 1 · Phase 5 · Bot Turns 3`
  (Chronobot: `Bot Actions N / min M`)
- [x] Teal drop-shadow outline on the Exosuit icon; `.eoa-flag` chips are `inline-flex` +
  `white-space: nowrap` in a `stretch` row, so the Exosuit pill no longer wraps taller
- [x] Ops count removed from the Fractures chip (an Operator is a wildcard Worker, already
  visible in the Worker trackers); Tech kept, hint text updated
- [x] History calls out a Blink on both the label (`Era 1 · ⚡ Blink → Assimilate`) and the
  effects (`⚡ Blink — Exosuit moved from Construct to Assimilate; its Energy Core returns
  to the supply`, plus `(the bottom one)` when the source space holds several). A per-turn
  `blinkFromRef` is set wherever a Core draw selects a source and consumed in `finishTurn`,
  covering the Action / Valley-tile / Hypersync-hex paths and cleared on cancel
- [x] Found while verifying: `commitPhase` labels (`Era 1 · → Warp`) were counted as bot
  turns — the filter only excluded `Power Up:`/`Warp:` *with a colon*. Now also excludes
  `· → ` entries, so Bot Turns starts each Era at 0
- [x] Build + 236 tests + lint clean; verified live in a real Fractures game (screenshot of
  the panel: single-line chips, no gap, Blink line in Recent bot turns)

### F8 — Fractures playtest fixes ✅ done (2026-08-12 → 2026-08-13)
The on-device/live playtest pass. All Chronossus-side; the engine's rules didn't change
except where noted (Mine/Recruit-Genius Blink checks, the Valley no-space branch).

**Dialog parity & placement order**
- [x] **Never tell the player to place before the app knows what happens** — the gates were
  instructing a placement and *then* running the Blink check, but a Blink moves an Exosuit
  already on the board. Order is now ask → check → the app picks → the instruction, on every
  Exosuit-placing space (Main board + World Council, the Valley Actions, the Hypersync hex).
  With no check possible (no Cores in the pool, or no Blink-ready Exosuit) the gate instructs
  inline as before. `FluxCasingPanel` → `PlaceExosuitPanel`; the destination is now the space
  actually confirmed (a Blink into World Council used to say "to Construct")
- [x] **Module dialogs render like base-game Action dialogs** — `CxTileDialog` /
  `HypersyncDialog` / `HypersyncTilePrompt` never took `DetailPanel`'s `flow` prop, so on a
  small screen a module Action went full-screen while a board Action didn't. All three now
  render through `renderModDialogs(flow)`
- [x] **Mod-tile taps opened the base game's tile** — `onTileArtClick` read `p.action` (the
  slot's base C01/C02/C03), so tapping Fractures art opened Reboot/Score/Energy Pack. Both
  the tap and the hover title resolve through `tileActionAt(p.key)` now
- [x] **Blink checks reached Mine and Recruit Genius** — neither goes through the shared
  `mech` gate, the only place the check ran, so both always placed a new Exosuit. Routed
  through `runBlinkCheck` via a `postBlinkRef` continuation; Mine checks *after* the
  Resources are picked, since that choice identifies the target space
- [x] **Valley gate rebuilt** — asks about the Action space **and** the Valley Capital
  fallback in one question, with a real "neither is open" that resolves the engine's
  no-space branch (before, a Valley Action could never fail). It also names the printed
  space (Assimilate / Extract), not the tile, so a B side no longer asks about "Assimilate
  and Score"
- [x] **Assimilate** shows the rolled shape as its Breakthrough icon *after* the placement
  settles, with only the branch that came up (Technology card — a new step, previously
  resolved silently — or the Operator question)

**Rule-box placement & copy**
- [x] Blink panels: one box instead of a box-in-a-box, the A/B rule folded into the
  instruction, and the verbatim Solo Opponents p.12 Blink rules added as a collapsed box
- [x] `BlinkRuleBlock` moved out of the Blink step into each dialog's footer — it was the
  only rule box in the app drawn *inside* the action box
- [x] **Every dialog puts its verbatim rule box below the body** (2026-08-13) — `CxTileDialog`
  only showed one for read-only taps, B sides, and tiles with a module write-up, so an A-side
  tile mid-turn had none; `HypersyncDialog` rendered the tile rules inside two of its five
  steps. Both now render in a fixed footer order
- [x] Check panels report the draw instead of handing the player an app-held token
  ("set it aside" / "discard it"); the "Blink check" heading went away — the token says it;
  the Flux-draw caption wraps in a narrow dialog
- [x] B-side tiles restate their A side rather than "Same as C04A, but…" — C04B, C05B, C14A,
  C14B plus the not-yet-implemented C09B/C10A/C10B/C11B. Documented in CLAUDE.md as the one
  knowing departure from verbatim
- [x] The Operator step asks only for the physical action (take an Operator out of the
  Valley); the wildcard / 5-VP-set rule stays in the verbatim box. Fixed a regression from
  the same session where a `botName` cleanup regex stripped the prop from six components
  that still needed it, making the Chronossus say "Chronobot"

**History**
- [x] A Blink is an **effect**, not the headline: the label names the Action again, the Blink
  line names both ends by their Capital Action **space**, and the move replaces "Exosuit
  placed". Shows the Flux Core art via a persisted `{flux}` token (`HistoryText`).
  `(the bottom one)` dropped 2026-08-13 — the Blink dialog already decided which one
- [x] `summarizeChronossusExtras` (pure, 9 tests) adds the module-only deltas the
  Chronobot-shaped `summarizeTurn` couldn't see — Flux Cores, Technologies, Operators,
  Hypersync tiles. Turn overview lists the 3 most recent turns with the same detail
- [x] Landing page: Chronossus 50% → 60%, description now lists Fractures of Time

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
- **Two-tier rule text (2026-08-11):** the Solo Opponents rulebook describes each new module
  Action twice — a one-line Appendix entry (pp.20-21) and a fuller section inside the module
  (Fractures: pp.11-13) — and the tile catalog had only the Appendix tier, which is how the
  Operator wildcard/5-VP-set and "none left → Failed Action" rules got missed. `detail` now
  carries the module-section text per tile; when adding a module, transcribe **both** tiers.
- **Operator discard tie-break (2026-08-11, reversed 2026-08-12):** when a Worker column
  holds both a plain Worker and an Operator, the rulebook doesn't say which the +5 VP set
  discards. First shipped as "keep the wildcard, discard the plain Worker"; **reversed at the
  user's call during the playtest — the set now always discards the Operator.** Noted in code
  and in CLAUDE.md.
- **No Operator tracker in the UI (2026-08-12):** an Operator is a wildcard Worker sitting in
  a Worker column, so the Worker trackers already show it — tapping a Worker badge says how
  many of that column are Operators. The engine still keeps `operators` + `operatorSlots` for
  exactly two reasons: Assimilate's Square result compares Operators to Technologies, and the
  set discard has to know how many go back to the Valley supply.
