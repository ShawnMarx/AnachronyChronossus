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
- **Operator discard tie-break (2026-08-11):** when a Worker column holds both a plain Worker
  and an Operator, the rulebook doesn't say which the +5 VP set discards. We discard the
  plain Worker and keep the wildcard; noted in code and in the player-facing instruction.
