# LOG — Guardians of the Council (Chronossus module)

Execution tracker. Steps in implementation order; mark `[x]` as completed and note
deviations inline. See `PLAN_guardians.md` for the design and the verbatim rulebook text.

## G-R — Research & design
- [x] **Open questions 1-3 answered by the user (2026-08-13):** a failed Acquire Guardian is a
  **full** Failed Action (VP + discard an active Exosuit); the **Guardian space beats** the
  Solo Hypersync tile in the combo; and the fallback **can never run out** — each Guardian has
  its own guaranteed space on the Guardian board, the slot holding a Chronossus **Path
  marker** (any of them if several). Consequences: setup must have the player keep Path
  markers to hand, and C11 must instruct placing one when it enlists
- [x] **Classic pp.9-11 read (2026-08-13).** Confirmed: powering up a Guardian costs the bot
  nothing the app tracks; the Guardian space's 1 Water cost is the *player's* and a no-op for
  the Chronossus (which doesn't track Water); any Path-marked slot may be used ("it doesn't
  matter which"); and **Clean Up retrieves Guardians** from both boards while the Path markers
  stay permanently. The "Guardians are treated as though a Genius was placed in them" rule is
  **player-only** and does not apply here — the Chronossus never puts Workers in Exosuits, and
  it is unrelated to the Recruit Genius / Research gate, which asks whether a Genius is
  available *to recruit*
- [x] **No cap on the bot's Guardians** (user, 2026-08-13): the 4 Solo Path markers are a
  component limit, not a rule — a 5th enlist is possible and the player substitutes a marker,
  so the copy carries a note and the engine no cap. The binding limit is the **6 shared
  Guardian miniatures**: C11 takes "the leftmost **available** Guardian", and the app can't
  see how many the player holds, so the Action asks — none available is a Failed Action

## G1 — Mode entry & setup ✅ done (2026-08-13)
- [x] `CHRONOSSUS_MODES.guardians` (I=C02, II=C11, III=C03)
- [x] `CHRONOSSUS_MODES['guardians+hypersync']` (I=C12, II=C11, III=C03, V=C13 covers Time Travel)
- [x] Un-stub both in `MODULE_CONFIGS`
- [x] Setup screen: verbatim p.16 box + app-modified bullets + a "Guardians of the Council
  setup" steps block, all combo-aware (`includes('guardians')`)
- [x] Setup bullet: keep the Chronossus's Path markers to hand for the Guardian board,
  including the rulebook's "not meant to be limited" substitution note
- [x] Slice seeded at setup — `guardians: { owned, powered }`, 0 or 1 under
  `DIFFICULTY_GUARDIANS_START_1`; `undefined` in every other mode
- [x] Tests: 8 mode tests (both modes, D2 swap, B-side, C14 no-op) + 5 seeding tests.
  **260 tests, build + lint clean**
- [x] Verified live (Playwright, Guardians mode start → Era 1 Action Rounds): both modes
  selectable, setup copy renders, D9's World Council checkbox correctly hidden as mandatory,
  and the board lays out C02A / **C11A** / C03A with the copied art loading (no 4xx, no
  console errors)

**Deviations / notes**
- The `guardians` state field landed here rather than in G2: setup has to seed it, and the
  seam (`applyDifficultySetup`) is the same one Fractures/Variable Anomalies use.
- `DIFFICULTY_GUARDIANS_START_1` was defined here so seeding could read it; its Setup-screen
  checkbox is still G5, so the option isn't selectable yet.
- **C11 is inert until G3.** `TILE_ACTION_FAMILY` has no `C11` entry, so tapping the tile
  opens nothing and a marker landing on that slot resolves as "no effect" (the TILE_EFFECTS
  default). No error, but the module isn't playable until G3 adds the action id and resolver.

## G2 — Engine: Guardian state, Power Up, placement ✅ done (2026-08-13)
- [x] `guardians?: { owned, powered }` on `ChronossusState` (landed in G1 with the seeding)
- [x] Power Up powers Guardians first, then Exosuits — the rulebook's own example (needs 4,
  owns 2 → 2 Guardians + 2 Exosuits) is a test. D4's excess-to-VP conversion now measures
  against Guardians + `exosuitsTotal` together, so a bot with Guardians wastes nothing; the
  post-Impact max-4 cap still applies across both
- [x] `spendFigure(bot)` / `nextFigure` / `placeableFigures` — Guardians last, in ONE place;
  replaced all 6 bare `exosuitsAvailable -= 1` sites (Main-board and Valley placements, the
  Hypersync hex, and the three Failed-Action discards)
- [x] Pass rule counts Guardians — `wouldPassOn` reads `placeableFigures`, so it only passes
  once Exosuits AND powered Guardians are gone. `hypersyncPlan.hasExosuit` likewise
- [x] Clean Up resets `powered` to 0 and keeps `owned` (Path markers never leave the board)
- [x] Guardian board fallback: a Capital Action with no space left places a Guardian on a
  Path-marked slot and resolves normally — no +1 VP, no discard. Checked BEFORE the Hypersync
  Solo-tile branch, so it wins in the combo (tested)
- [x] 22 new tests (282 total); build + lint clean; base/HFA/Fractures playthroughs unaffected

**Deviations / notes**
- **Failed-Action discards use the same order.** "Discard an active Exosuit" goes through
  `spendFigure`, so with no plain Exosuits left it discards a Guardian. The rulebook only
  spells the Guardians-last ordering out for *placement*; a Guardian is an Exosuit the bot
  has, so this seemed the honest reading. Flagged in the code comment.
- **New result fields** `figurePlaced` / `usedGuardianSpace` on `ChronossusActionResult` — the
  engine decides which figure goes down, so the view has to be told in order to say "place a
  Guardian". G4 consumes them.
- The Guardian-space fallback keys off the existing `noSpaceAvailable` / `hypersyncNoTile`
  inputs, so no new question is asked of the player (every Guardian brings its own space).

## G3 — Engine: Acquire Guardian (C11) ✅ done (2026-08-13)
- [x] `tile-acquire-guardian` action id + label; `TILE_ACTION_CODE`/`TILE_ACTION_FAMILY`
  entries, so the tile resolves through the same machinery as every other module tile
- [x] `TILE_EFFECTS` C11A/C11B — `acquireGuardian` + Autoleap both sides, C11B +2 VP (scored
  for resolving the Action, whichever branch runs). `future: true` dropped from both
- [x] `resolveAcquireGuardian` — World Council branch (places a figure, **First Player**,
  free Guardian), Worker branch (no figure), and the failed branch as a **full** Failed
  Action (VP + discard). Post-Impact fails; the difficulty option scores 2 VP with no discard
- [x] `guardianWorkerToSpend` — "Most", then Scientist > Engineer > Administrator > Genius
- [x] Both acquiring branches instruct placing a Path marker on an empty Guardian board slot,
  with the "not meant to be limited" substitution note
- [x] `shouldAskGuardianAvailable(era)` — true only in Era 4 (can't empty earlier; Eras 5+
  fail post-Impact regardless)
- [x] Verbatim p.16 module-section text added as `ModularTile.detail` on both sides (the
  two-tier rule-text convention)
- [x] 12 new tests (294 total); build + lint clean

**Deviations / notes**
- **`placesExosuitFor('tile-acquire-guardian')` is FALSE.** The Action only places when the
  World Council space happens to be free, and otherwise spends a Worker — if it counted as an
  Exosuit-placing Action, a bot out of Exosuits would *pass* on the tile instead of taking the
  Worker option it is still entitled to. The resolver does its own placing. Tested.
- **No Blink interaction to worry about:** the rulebook forbids Fractures + Guardians, so a
  Guardians game never has a Flux Pool.
- The World Council branch falls through to the Worker option when the bot has no figure to
  place — "if it cannot do either option" reads as per-option, not "option 1 only".
- **Question order confirmed by the user (2026-08-13):** with a figure available C11 opens on
  "is the World Council space open?"; with none it is not an Exosuit Action at all and goes
  straight to the Worker option, so the question isn't asked
  (`acquireGuardianAsksWorldCouncil`, which G4's dialog gates on). The engine's branch order
  already matched; the final Failed-Action copy was reworded, since the only way to reach it
  is an empty Worker pool — it used to read "can neither place… nor spend a Worker".

## G4 — UI: dialog, trackers, History, art ✅ done (2026-08-13)
- [x] `C11A.png` / `C11B.png` copied in (done in G1)
- [x] The Acquire Guardian flow is a **`guardianGate` on `CxTileDialog`**, not a new dialog —
  see the deviation below. Steps: availability (Era 4) → World Council (only when it has a
  figure) → the instruction → commit. Rule box stays in the footer; `flow` and
  `renderModDialogs` come free
- [x] Turn-overview chip `powered/owned Guardians`, Guardians modes only, with a hint saying
  they power up first and are placed last
- [x] `DetailPanel` gained `figure` — the base-Action placement gate says "place the
  Chronossus's **Guardian**" once its own Exosuits are gone (Chronobot/other modes unaffected)
- [x] `summarizeChronossusExtras`: Guardians acquired, the Worker spent to acquire one, and a
  Guardian placed (the Exosuit count doesn't move, so nothing else would say so) + 4 tests
- [x] 299 tests, build + lint clean. Verified live end to end: the C11 dialog asks, decides
  and instructs; History reads `Era 1 · Acquire Guardian / Exosuit placed / Acquired 1
  Guardian`; the chip shows `0/1 Guardians`

**Deviations / notes**
- **No separate `AcquireGuardianDialog`.** The plan called for one, but `CxTileDialog` already
  carries the tile art, name, rule box, `flow` handling and commit button, and it already has
  a gate prop for exactly this shape (`valleyGate`). A `guardianGate` alongside it is less
  code and inherits the module-dialog conventions instead of re-implementing them.
- **Found while wiring: `FAMILY_TO_TILE_ACTION` in the view had no `C11`.** `tileActionAt`
  returned null, so tapping the tile did nothing at all and a marker landing on it would have
  silently resolved as "no effect" — the G1 note said the tile was inert, and this was why.
  The engine-side `TILE_ACTION_FAMILY` and the view-side map are separate lists; a new
  module's tile has to be added to BOTH.

## G5 — Difficulty options ✅ done (2026-08-13)
- [x] Both registered in `MODE_DIFFICULTY.guardians`, so `modeDifficultyFor` offers them for
  `guardians` **and** unions them with Hypersync's in the combo
- [x] `chronossus-guardians-postimpact-2vp` — engine side shipped in G3
- [x] `chronossus-guardians-start-1` — engine side shipped in G1; the Setup screen now also
  tells the player to hand it a Guardian and place a Path marker at setup
- [x] `chronossusDifficultyLabel` needed no change (it already reads every `MODE_DIFFICULTY`
  entry), so both show in the score-screen setup note and the share summary
- [x] 2 new tests (301 total); build + lint clean. Verified live: both appear on the
  difficulty step for the Guardians mode, and ticking the second adds the setup bullet
- [x] The third rulebook bullet ("flip the new Action tile to its B side") is the existing
  shared `chronossus-tiles-b-side` picker — no new flag, as planned

## G7 — Guardians read as one figure count (playtest feedback 2026-08-13) ✅ done
- [x] **Power Up calls out the split.** The screen said "Powered up N Exosuits" whatever the
  mix; it now reads *"Powered up 5 in total — 1 Guardian and 4 normal Exosuits. It powers up
  as many Guardians as it can first."* The player is pulling two different miniatures, so the
  instruction has to say which
- [x] **The Exosuit badge counts every figure it can place** (Exosuits + powered Guardians),
  with the breakdown in its tooltip and its pop-out: *5 powered figures to place / Normal
  Exosuits 4 / Guardians 1 powered · 1 enlisted*
- [x] **The turn-overview chip merged**: `5 Exo (inc 1 Guardian)` instead of a separate
  Guardians chip the player had to add up. The second chip shows what the figure count
  can't — `powered/total`, e.g. **`0/1 Guardian`** when it holds one it could not power up
  this Era. ("Enlisted" as a label was rejected by the user; the counts say it better.)
- [x] **The turn overview puts every rule box at the bottom**, like the Action dialogs: the
  bot's-turn text used to sit mid-panel above the difficulty list. Order is now bot's turn →
  module rules → passing. `TurnBarOverview` gained an `extraRules` slot for the active
  module (the Chronobot passes nothing, so it is unaffected)
- [x] **New Guardians rule box** in that footer — the verbatim p.16 POWER UP PHASE and
  GAMEPLAY CHANGES paragraphs, i.e. exactly how the bot uses Guardians for its Actions
  (powered first, placed last, and the Guardian board space that stops a no-space Capital
  Action being a Failed Action)
- [x] Verified live with the start-with-1-Guardian difficulty; 305 tests, build + lint clean

**Deviation / note**
- **Corrected same day (user):** "an exo is an exo — some are just better, it should be shown
  together". The board overlay art had been left counting plain Exosuits only; it now counts
  powered Guardians too, and `overlayCount` in `botOverlays.ts` gained the same rule so every
  consumer agrees. The pop-out is the one place the two are broken apart.

## G6 — Ship ✅ engine/UI done (2026-08-13); on-device pass outstanding
- [x] Playthrough variations: `guardians` (3 tests — a full game acquiring/powering/placing
  Guardians, the Guardians-first power-up split per Era, and the Guardian board fallback
  keeping a no-space Capital Action from failing) and `guardians+hypersync` (1 test)
- [x] **`onPhase(phase, state)` hook added to the playthrough helper** — Guardians' per-Era
  `powered` count is reset by Clean Up, so the end of a run can't see it. Documented in the
  test-file header for the next module
- [x] Build + 305 tests + lint clean
- [x] Live verification: Guardians mode end to end (setup → the C11 dialog's three steps →
  History), and the combo's difficulty step showing both modules' options
- [ ] Manual playthrough on device — user-side

---
### Deviations / decisions
_(none yet)_
