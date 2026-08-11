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
  rule now applies to them. They are deliberately **not** recorded in `placedExosuits`,
  since the Valley board isn't the Main board and nothing there can Blink. Power Pack
  (C06) stays a Chronossus-board effect with no Exosuit
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

### F4 — Board / view / overlays — mostly N/A (2026-08-11)
- [x] The Valley board stays player-managed (design decision), so there is no new board art
  or overlay geometry to place; the module's state shows in the turn overview instead
- [ ] Optional: a Flux Pool badge on the Chronossus board — the Flux Pool is a separate
  container, not printed on the board, so any badge position would have to be set in
  calibrate mode. Left for the user to place if wanted

### F5 — Scoring & objectives ✅ done (2026-08-11)
- [x] Technologies (3 each) and leftover Flux Cores (difficulty) now show in all three
  score displays: the VP-pill breakdown, the side-by-side tally, and the number-mode list
- [ ] Solo Objectives: the two Fractures cards ("Technology Cards", "Flux on Track") are
  added to the deck in setup text; scoring them stays the player-entered tally, as for
  every other mode

### F6 — Ship
- [x] Fractures playthrough variation (3 tests): a full game with the Flux Pool, Blinking
  and all three module tiles; leftover-Flux scoring; and 6 consecutive Blinks spending no
  Exosuit. Plus 4 unit tests for the tiles (C05/C05B, C06/C06B Autoleap, C14 via
  `tileFamily`, and the no-pool no-op outside Fractures)
- [x] 216 tests, build + lint clean
- [ ] Manual playthrough on device; assets/theme pass

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
