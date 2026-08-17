# Build Log

Running log of implementation progress. Newest first.

## 2026-08-17 — Fractures of Time: the Era Zero Warp, and a game two Eras shorter

Two rules from the Fractures rulebook had never been implemented, both of them about the
*shape of the game* rather than any one Action — which is exactly why nothing caught them:
every unit test and the full-game playthrough agreed with each other on a Timeline that was
wrong.

- **The Era Zero Warp Phase** (Fractures p.6). "At the beginning of the game, before
  starting the regular round sequence for Era 1, perform a Warp Phase (but no other
  Phases), placing the Warp tiles on the Era Zero tile." A new `era0warp` phase sits
  between Setup and Era 1's Preparation for every Fractures mode; the header reads
  **Era 0 · Phase 4** while `state.era` stays 1, since Era Zero has a Timeline tile but is
  not an Era of the round sequence. The screen is the normal Warp body with Era-Zero copy
  and the "you may not warp an Exosuit" rule. Its consequence had been missed too: Era 1's
  **Paradox phase is no longer skipped** in a Fractures game, and `pastTimelineTiles`
  counts the Era Zero tile, so Era 1 offers the roll it always should have.
- **Fractures is a 5-Era game** (Fractures p.4) — "only three Eras pre-Impact and two Eras
  post-Impact, plus an Era Zero" — where the app was still playing all 7 with the Impact
  after Era 4. Era counts are now per-config (`maxEraFor` / `postImpactEraFor` /
  `isPostImpact(era, config)`), reached through a new `SoloEngine.maxEraFor` seam. The real
  bug was in the Clean Up screen, where the three branches were literals: `era === 4` for
  the Impact note and `era === 5 || era === 6` for the Collapsing-Capital choice. All three
  are derived now, and verified in the browser at each Era.

The seam is written up in `CLAUDE.md`: a module may re-cut the Timeline, so no rule may
hard-code an Era number. Still open (`TODO.md`): Fractures + Pioneers grants a Power Upgrade
right after the Era Zero Warp (p.15), and the Solo Opponents book doesn't say whether the
Chronossus takes it.

## 2026-08-17 — Pioneers to production, and the playtest pass that got it there

Pioneers of New Earth (with `fractures+pioneers` and `guardians+pioneers`) is **live in
production**; the landing page moves to 80%, the module is archived in
`docs/complete/20260817_PIONEERS_COMPLETED.md`, and no plan is active. Doomsday is the one
module left.

The day's work was playtest feedback, and two items were rules bugs rather than copy:

- **The passing rule was missing on paths that could reach the Adventure.** The
  covered-space path (a rolled marker landing on the printed Action C10 covers) ran no
  check at all, so the bot adventured with no Exosuits left; the tile-slot path checked but
  skipped Fractures' Blink exemption, so it passed when it should have Blinked onto the
  Adventure board. Debug taps on a tile had the same hole while taps on a printed space did
  not. The whole decision is now `Chronossus.passesInsteadOfAction` behind one view helper
  that every path calls.
- **A failed Time Travel resolved silently** — with no Warp tiles on the Timeline the +VP
  showed only in History. It now opens its dialog and says so, for both bots, using the
  difficulty-adjusted VP (which also fixed a hardcoded "+1 VP" on Remove Anomaly's failure).

The rest was the Adventure dialog reworked into the rulebook's own order — pre-roll Power
(the Upgrade-board chip + the Path marker) → the deck that Power picked → both drawn cards
→ only then the die and the total → what the Chronossus takes. A card's printed Success box
is the *player's* rule and is never shown; `resolveAdventure` returns what the bot actually
got. Also: the End Game tally gained its missing module lines (Technologies shared,
Fracture Device, Glitches −2, Hypersync tiles −4), setup names every module's Solo Objective
card in one step, Fractures got its own setup section, off-board placements no longer ask
for an Energy Core, Warp shows one tile per Paradox rolled, and History drops the bare
"→ Phase" row when that phase reports its own result.

Three browser harnesses were kept and documented: `pw-adv.mjs`, `pw-warp.mjs`, and
`pw-pass.mjs` — the last edits the persisted save to reach states the UI has no control
for (out of Exosuits), which is how both passing bugs were confirmed fixed.

## 2026-08-16 — Pioneers UI pass (playtest feedback)

Follow-ups on the module shipped the day before, all from playing it rather than from
tests. Two were real bugs behind accurate-looking surfaces: **C10 rendered and resolved as
C09** (both families share the one `tile-adventure` action, so the first-listed family won —
meaning C10B's +1 Energy Core could never have applied), and an Adventure tile **described
itself as "the Chronossus does nothing this turn"**, the fallback meant for Reboot. The SCV
also named the printed Action on the space C10 covers.

The Adventure dialog now opens on its first step rather than a summary behind a ▶ button,
carries one generic Adventure rule box across all four tiles, and — in shared-deck mode —
rolls first, then asks which single card the bot takes from a filtered dropdown.

Added the **Exosuit Upgrade board pop-out**: the real component art with its state marked
on it, reachable from the Exo tracker on the board and in the turn overview. The **Paradox
die** now shows its real face in the Warp and Paradox phases, for both bots.

Still open, and deliberately not claimed as done: the `fractures+pioneers` Blink-check →
Adventure gate has never run in a browser, and nothing has been checked on a device.

## 2026-08-15 — Pioneers of New Earth

The Classic expansion's Pioneers module for the Chronossus, plus both combos it unlocks
(`fractures+pioneers`, `guardians+pioneers`). The module adds one Action — **Adventure**
(tiles C09/C10) — and one piece of state, the **Chronossus Exosuit Upgrade board**.

An Adventure runs two ordered steps. **Perform Adventure**: the app asks which strength-bonus
slot the player put the bot's Path marker on (that column is shared with the player's own
markers, so it never assumes), adds it to the Upgrade board's Power, picks the 5+ or 10+ deck
at the 9 threshold, rolls the Adventure die, and takes the card with the **highest Power
requirement it meets** — or gains 1 VP if it meets neither. **Power Upgrade**: it moves the
Resource it has most of onto its Upgrade board (ties Titanium > Gold > Uranium > Neutronium),
or places a VP token when nothing fits. All 36 Adventure cards are transcribed with the four
p.15 conversions applied (W → VP, Morale → 2 VP, choices → Research, purple/ongoing → discard
for 3 VP + 1 Energy Core).

**Two deck modes**, chosen at module selection and switchable in ⚙: the bot draws from its own
shuffled copy and the app **shows the real card art** (default — your physical decks are never
touched), or it draws from your decks and you name the cards.

Pioneers is the first module to use **slot IV**, covering the printed "Recruit Genius or
Research" space with C10 — which needed a board overlay of its own, since only Hypersync's
C13-over-Time-Travel had that path.

Playing it surfaced a bug tests had missed: `cloneChronossus` was shallow, so `resolveAdventure`
wrote through to the pre-turn state and every Pioneers History line diffed to nothing. Fixed
with a regression test. New art extracted from the TTS mod: the 36 Adventure cards, the C09/C10
tiles (whose B-side art independently confirmed their coded effects), both Upgrade board sides,
the Adventure die faces, and a Power fist icon. Also extracted, but not yet wired up, the
shared Paradox and Research-shape die faces (see `TODO.md`).

## 2026-08-14 — Guardians of the Council

The Classic expansion's Guardians module for the Chronossus, plus the `guardians+hypersync`
combo — archived as `docs/complete/20260814_GUARDIANS_COMPLETED.md`. A Guardian is a
Path-independent Exosuit the bot powers up **first**, places **last**, and can drop onto its
own reserved Guardian board space when the Capital is full; C11 Acquire Guardian is the new
Action tile.

- **One figure count, one code path.** `spendFigure` / `nextFigure` / `placeableFigures`
  replaced six scattered `exosuitsAvailable -= 1` sites, so "Guardians last" holds for
  Main-board and Valley placements, the Hypersync hex and the Failed-Action discards at once.
  Power Up splits its number Guardians-first (the rulebook's own 4-with-2-Guardians example is
  a test), the pass rule counts both, and Clean Up resets `powered` while `owned` persists.
- **The Guardian board fallback**: a Capital Action with no space left anywhere places a
  Guardian on a Path-marked slot and resolves normally — no +1 VP, no discard. It beats
  Hypersync's Solo-tile fallback in the combo and needs no question, because every Guardian
  brings its own space.
- **Acquire Guardian** asks only what the app can't see: whether the World Council space is
  open (and only when it has a figure to place — otherwise it isn't an Exosuit Action at all),
  and, in Era 4 alone, whether a Guardian is still on the board. Post-Impact it fails for VP.
- **Playtesting drove four rounds of fixes**, including two genuine rules bugs: the board
  fallback was spending a plain Exosuit rather than a Guardian (it fires when Action *spaces*
  run out, not figures), and the targeted-Hypersync difficulty matched the **bot's** pending
  tiles instead of the **player's**, which is the whole point of the option.
- **Also fixed along the way:** an Autoleap dialog closed mid-chain was lost (Take Bot Action
  re-rolled instead of resuming — the owed leap is persisted now); the debug Era stepper
  didn't set the Impact flag, so every post-Impact rule silently kept pre-Impact behaviour;
  two hard-coded Chronobot purples in shared CSS; tracker popovers that stacked instead of
  replacing; and a play-mode tap printing an app-voice line as if the tile had acted.
- **Rule boxes are now one thing everywhere** — labels lost their "rules"/"rulebook text"
  suffixes, and `RulesBox` matches the dialogs' 📖 bars (accent tint, chevron right), in the
  phase screens, setup, the turn overview and every dialog.
- 320 tests, build + lint clean. Landing page: Chronossus 60% → 70%.

## 2026-08-13 (later) — Guardians of the Council (build stages G1–G6)

The Classic expansion's Guardians module for the Chronossus, plus the
`guardians+hypersync` combo — built stage by stage (see the 2026-08-14 entry above for the
playtest rounds and the archive link).
A Guardian is a Path-independent Exosuit the bot powers up **first**, places **last**, and
can drop onto its own reserved space when the Capital is full.

- **Setup & modes.** `guardians` lays C02 / **C11** / C03 into the three tile slots (the combo:
  C12 / C11 / C03 + C13 covering Time Travel); both were un-stubbed in the module picker.
  `worldCouncilMandatory` already covered Guardians, so the Hex Unavailable line was free. The
  setup screen carries the verbatim p.16 box plus the two things the module needs from the
  player: keep the Chronossus's **Path markers** to hand, and place/retrieve the miniatures.
- **The rules that touch every placement.** `spendFigure` / `nextFigure` / `placeableFigures`
  put "Guardians last" in one place and replaced all six scattered `exosuitsAvailable -= 1`
  sites, so Main-board and Valley placements, the Hypersync hex and the Failed-Action discards
  all follow it at once. Power Up splits its number Guardians-first (the rulebook's own
  4-with-2-Guardians example is a test), the pass rule counts both, and Clean Up resets
  `powered` while `owned` persists — a Guardian's Path marker never leaves its slot.
- **The Guardian board fallback.** A Capital Action with no space left anywhere — World
  Council included — places a Guardian on a Path-marked slot and resolves **normally**: no
  +1 VP, no discard. It beats Hypersync's Solo-tile fallback in the combo, and needs no
  question, because every Guardian brings its own space.
- **Acquire Guardian (C11).** Asks whether the World Council space is open (only when it has
  a figure to place — otherwise it isn't an Exosuit Action at all), then either places there
  and takes First Player, or spends a Worker (Most > Scientist > Engineer > Administrator >
  Genius) and places nothing. Post-Impact, no Guardian left, or no Workers → a full Failed
  Action. The "is a Guardian still available?" prompt only appears in Era 4: the shared six
  can't run out earlier, and Eras 5+ fail regardless.
- **Reading as one figure count** (playtest feedback). Power Up says *"Powered up 5 in total —
  1 Guardian and 4 normal Exosuits"*; the Exosuit badge, its pop-out and the board marker art
  all count Guardians in the same pile, with the split in the pop-out; the turn chip reads
  `5 Exo (inc 1 Guardian)` beside `0/1 Guardian` for one it couldn't power up.
- **Two bugs the playtest surfaced.** The view's `FAMILY_TO_TILE_ACTION` had no `C11`, so the
  tile was inert — a marker landing on it silently did nothing (the engine and view keep
  separate maps; a module's tile needs both). And the board fallback called `spendFigure`,
  which takes a plain Exosuit while any remain — but it fires when **Action spaces** run out,
  not figures, so it now spends a Guardian specifically.
- 306 tests (four new end-to-end playthrough variations), build + lint clean. The playthrough
  helper gained an `onPhase` hook for per-Era state that Clean Up resets.

## 2026-08-13 — Fractures playtest fixes, and Fractures ships to production

The playtest-fix pass on Fractures of Time (logged as F8), then the whole effort — the
playthrough test harness, all 10 difficulty options, Alternate Timelines, Variable Anomalies
and Fractures — merged to `main` and deployed. Archived as
`docs/complete/20260813_CHRONOSSUS_DIFFICULTY_TEST_FRACTURES_COMPLETED.md`; no plan is active.

- **Ask, check, decide, *then* tell the player to place.** The gates were instructing a
  placement and only then running the Blink check — but a Blink moves an Exosuit already on
  the board, so the instruction came before the app knew what should happen. Every
  Exosuit-placing path now asks whether the space is free, runs the check, lets the app pick
  the Exosuit, and only then gives the instruction; with no check possible (no Cores in the
  pool, or no Blink-ready Exosuit) it instructs inline exactly like a base-game Action.
- **Mine and Recruit Genius were walking past the Blink check.** Neither uses the shared
  `mech` placement gate — the only place the check ran — so both always placed a new Exosuit
  even when the Chronossus should have Blinked. Both now route through `runBlinkCheck` via a
  continuation ref; Mine checks *after* the Resources are picked, since that choice is what
  identifies the space it's heading for.
- **The Valley gate asks a question that can be answered.** It now asks whether the Action
  space *or* the Valley Capital fallback is open, with a real "neither" that resolves the
  engine's no-space branch — before, the negative answer always placed on the Capital space,
  so a Valley Action could never fail. It also names the printed space (Assimilate / Extract)
  rather than the tile, so a B side no longer asks about "Assimilate and Score".
- **Module dialogs match base-game Action dialogs.** `CxTileDialog` / `HypersyncDialog` /
  `HypersyncTilePrompt` never took `DetailPanel`'s `flow` prop, so on a small screen a module
  Action went full-screen while a board Action didn't; all three render through
  `renderModDialogs(flow)` now. And every dialog puts its **verbatim rule box below the
  body**: the tile dialog used to show one only for read-only taps, B sides and tiles with a
  module write-up, the Hypersync dialog only in two of its five steps, and `BlinkRuleBlock`
  was drawn *inside* the action box.
- **History shows what the module did.** A Blink is an effect rather than the headline — the
  label names the Action, the Blink line names both ends by their Capital Action *space*, and
  it replaces "Exosuit placed" since nothing came from the supply. It carries the Flux Core
  art through a persisted `{flux}` token. `summarizeChronossusExtras` adds the pools
  `summarizeTurn` can't see (Flux Cores, Technologies, Operators, Hypersync tiles).
- **Operators are Workers.** The +5 VP set now always discards the Operator when a column
  holds both (a table call — the rulebook doesn't say), tapping a Worker badge says how many
  of that column are Operators, and there's no separate Operator tracker anywhere.
- Landing page: Chronossus 50% → 60%, now listing Fractures of Time. 247 tests, build + lint
  clean; deployed to production as `cbf6578` (39 commits).

## 2026-08-12 — Turn-overview + History polish (Fractures playtest feedback)

Part 4's F7 from `docs/plans/PLAN_chronossus_difficulty_test_fractures.md`, all view-side —
no rules change. F4 (board overlays) and F5 (scoring/objectives) were dropped from the plan:
the Valley board stays player-managed so there was no overlay work, and the scoring the
module needed already shipped.

- **The Turn overview reads as one panel again.** The long gap under the explanation text
  was `.eoa-hint`'s `flex: 1 1 240px` — in the popover's *column* flex container that basis
  is a 240px minimum height, not a width. The pass-state boxes ("You: active / Bot: active")
  are gone: the top-bar buttons already say whose turn it is. The turn count moved onto the
  title line and got a name — `Era 1 · Phase 5 · Bot Turns 3` (the Chronobot reads
  `Bot Actions N / min M`). Tracker chips are now `inline-flex` + `nowrap` in a stretch row,
  so "4 Exo" stops wrapping into a taller pill, and the Exosuit icon carries a teal outline.
  The Fractures chip lost its Ops count — an Operator is a wildcard Worker, so it is already
  visible in the Worker trackers.
- **A Blink no longer hides in History.** It reads as a normal placement otherwise, because
  a Blink spends no Exosuit from the supply and the state diff shows nothing moving. The
  entry is now labelled `Era 1 · ⚡ Blink → Assimilate` with a first effect line naming
  source, destination and the returned Energy Core (plus "(the bottom one)" when several
  Exosuits share the source space). One per-turn ref, consumed at commit, covers all three
  paths (Action, Valley tile, Hypersync hex).
- **Bot Turns was counting phase advances.** `commitPhase` writes `Era 1 · → Warp` labels,
  but the "not a turn" filter only matched `Power Up:` / `Warp:` *with a colon*, so every
  Era opened with the count already at 2. Fixed alongside the rename that exposed it.
- Verified end to end with Playwright against a real Fractures game (Flux draws pinned to
  Cores): the two-question placement gate, the Blink check, a Blink into Assimilate, and the
  panel itself — no console errors. 236 tests, build + lint clean.
- **Mod-tile taps showed the wrong tile's details** (playtest report, same day). The tap
  handler and the hover tooltip read `p.action` — the tile `chronossusPaths.ts` names for
  that slot, which is always the *base* game's C01/C02/C03 — so a Fractures game rendered
  C04/C05/C06 art but opened Reboot / Score / Energy Pack. Both now go through
  `tileActionAt(p.key)`, the same mode-aware lookup the die-driven turn and the SCV rows
  already used. Noted while confirming: with the SCV panel open it covers all three tile
  spaces, so ◂ Hide is required to reach them — left as is by choice.

## 2026-08-11 — Fractures of Time (Chronossus module) on staging

Part 4 of `docs/plans/PLAN_chronossus_difficulty_test_fractures.md` — the full module,
plus the `fractures+hypersync` combo. The Valley board stays player-managed, so the
module's state lives in the turn overview rather than in new board art.

- **Flux Pool + Blinking.** A second container (Flux Cores + 3 Empty Flux Casings) the
  Chronossus draws from before each Exosuit Action: a Core is spent to Blink, a Casing is
  set aside until Clean Up. Blink selection follows the rulebook's A/B rules (an Exosuit on
  another Command token's Action, smaller number winning; else bottom-left-most). The check
  runs *after* a free space is confirmed — the bot only Blinks into a space it could have
  placed into — and is skipped when the pool holds no Cores (documented departure from the
  literal "at least 1 token", since a Casing-only draw changes nothing that Era).
- **Valley Actions.** Assimilate (C04/C14) and Extract (C05) are Action spaces on the Valley
  board, so they take an Exosuit and gate on "is a Valley Action space open?" (else the
  Valley Capital space). The Valley board is a Blink **destination but never a source**;
  `placesExosuitFor` / `OFF_MAIN_BOARD_ACTIONS` now generalize that for the modules to come.
  Power Pack (C06) stays a Chronossus-board effect. Tile art added for C04–C06 + C14A/B.
- **Operators, in full.** The rulebook prints each new Action twice — a one-line Appendix
  entry and a fuller module-section write-up — and only the Appendix text had been
  captured, which left two rules unimplemented. An Operator is now a **wildcard Worker**:
  it fills the topmost empty space of the Worker collection and counts as that type for
  everything, so an Assimilate can complete the **+5 VP Worker set** (that discard returns
  Operators to the Valley supply; a column holding both discards the plain Worker first —
  our call, the rulebook is silent). And with **no Operators left** the branch is a Failed
  Action for +1 VP, which the Assimilate dialog now asks about after rolling the shape die.
- **Rules text.** Tiles carry a `detail` field with the verbatim module-section text
  (Assimilate + Recruiting Operators, Extract, the Valley placement rule), shown under the
  Appendix summary in the tile's 📖 rules box — which now opens for any tile that has one,
  not just B sides. C07–C13's own longer sections are still Appendix-only.
- **Scoring + combo.** Technologies (3 VP each) and the leftover-Flux-Core difficulty option
  appear in all three score displays. `fractures+hypersync` is un-stubbed per the setup
  matrix (C12 in slot I, C04/C05 in II/III, C13 covering Time Travel, Power Pack dropping
  out), with both modules' setup boxes and difficulty options unioned. 236 tests.

## 2026-08-11 — Guided-phase UX pass (prompts, Undo, rule sourcing)

Playtest feedback on the non-Action phase screens, worked through in order. All on staging.

- **Player prompts read as one thing.** Every "the app needs an answer from you" moment now
  uses the same box: the Paradox tie/lead and Hypersync extra-roll questions, the Clean Up
  game-end choice (both bots), the Alternate Timelines positive-space question, and the
  Variable Anomaly gain. The box tint became a `--sp-prompt-rgb` token (violet for the
  Chronobot, amber for the Chronossus) after the hard-coded amber clashed with the purple
  scheme; `.pp-sub` and the in-prompt number pickers were re-themed the same way.
  `.capital-check` / `.phase-end-pink` / `.va-candidate` retired.
- **Prompts stay on their phase screen.** The Alternate Timelines question had been
  replacing the whole Warp body and the Anomaly prompt was a modal over the Paradox log —
  both left the player answering with the triggering roll off-screen. `WarpPhaseBody` and
  `ParadoxPhaseBody` gained a `followUp` slot; both screens now read intro → what happened →
  what you must answer → trackers → verbatim rules.
- **Anomaly gain reworked** to the Construct pattern: state the verbatim criteria, the
  player applies it and reports only the taken tile (VP row, then a yes/no on Warp-tile
  retrieval, which commits). `resolveVariableAnomalyGain` takes one candidate, not two.
- **Undo on the phase screens**, the same control as the Action Rounds bar, plus
  `commitPhase` so phase advances that change nothing else are still undoable. Rolls are
  restored, never re-rolled.
- **Rule sourcing.** Confirmed the Hypersync Paradox rules (majority, zero-Warp exception,
  most-Hypersync extra roll) are verbatim Future Imperfect p.5 and unamended by Solo
  Opponents p.17 — now shown as a `RulesBox`. Alternate Timelines' p.18 Warp order
  ("decide first, then roll") replaced the contradicting base turn-order note.
- **Smaller fixes:** Paradox rolls render like Warp rolls (numbered die + Paradox symbol);
  four icon trackers on the Paradox screen; the Hypersync placement step keeps marked-off
  spaces visible instead of dropping them; landing-page Chronossus progress 40% → 50%.

## 2026-08-10 — Chronossus difficulty options shipped; Alternate Timelines & Variable Anomalies added ahead of Fractures

Parts 2 and 3 of `docs/plans/PLAN_chronossus_difficulty_test_fractures.md` are done, all
on staging (`https://anachrony.staging.boardgameedge.com`).

- **Difficulty options D1–D9** (base game) all implemented and un-stubbed, one at a time
  with a design-confirmation pass each: tile-swap (Slot I↔III), extra starting Energy
  Cores, extra powered Exosuit (+VP overflow), leftover-Energy-Core VP, fewer Solo
  Objectives, Failed-Actions-score-VP, Research-takes-a-new-shape, and the World Council
  checkbox (found to be dead code — the selectable-options filter had dropped it; fixed).
  D0 scoring seam threads `config.difficulty` into `scoreChronossus` for the one option
  that's an end-game addition (D5); D7 scores live mid-game instead, since it isn't one.
  Sub-selector values (D3/D6) now show wherever difficulty is listed.
- **Bug fixes found along the way:** the Setup flow listed physical actions the app
  already handles as if the player had to do them by hand; the turn-overview popover had
  `difficulty={[]}` hardcoded (never showed selections); `summarizeTurn`'s history line
  hardcoded "+1 VP" for Failed Actions, contradicting D7's +2; Research's message always
  claimed "the shape die shows X" even when D8 forced the pick; D5's leftover-Energy-Core
  VP only showed at End Game, not mid-game.
- **Alternate Timelines & Variable Anomalies** (new Part 3, prioritized ahead of Fractures
  after research showed Variable Anomalies only needs the physical Fractures expansion
  box, not its main module/mechanics — both are on Solo Opponents rulebook p.18).
  Alternate Timelines: Warp Phase scores 2/3 VP per positive-effect space the Chronossus's
  Warp tiles land on (player-reported). Variable Anomalies: replaces the flat −3 VP/Anomaly
  with a held-tile VP list (`anomalyVps`, mirrors `buildingVps`); gaining defers to a new
  player-input modal, removing always takes the largest penalty (engine already knows the
  values). New `GameConfig.extraModules` multi-select seam.
- **Anomaly gain prompt reworked** (same-day playtest note): it had asked for *both* offer
  tiles and let the engine pick, unlike every other player-reported value. Now it mirrors
  Construct — states the verbatim RECEIVING ANOMALIES criteria (Solo Opponents p.18, shown
  in a `RulesBox`), the player applies it, and reports only the taken tile: a VP digit row
  (−2…−6) plus a yes/no "does it retrieve a Warp tile". `resolveVariableAnomalyGain` takes
  one candidate instead of two.
- **Hypersync Paradox rules sourced.** Checked a doubt about whether Hypersync tiles really
  count toward the Warp-tile majority: they do — Future Imperfect p.5, along with the
  zero-Warp exception and the most-total-Hypersync extra roll, and Solo Opponents p.17
  carries the module over without amending the Paradox Phase. Added all three verbatim as a
  `RulesBox` in `ParadoxPhaseBody`'s Hypersync branch (the prompts were app-voice only).
- 26 new tests (168 total); build/lint clean throughout.

## 2026-08-09 — Chronossus base shipped; next effort planned

Chronossus base is officially done and live. Details in
`docs/complete/20260809_CHRONOSSUS_BASE_COMPLETED.md`.

- `chronossus.implemented` → `true` (base game + Hypersync module live).
- Removed the dead `default: setup` case in `ChronossusGame.tsx` (unreachable).
- Closed out `PLAN_chronossus_base.md` (all of Part A + B1/B3/B4 done, B5 shipped, B2
  dropped as player-managed); archived to `docs/complete/`.
- Docs process: added a "Docs & notes maintenance" section to `CLAUDE.md` and a
  user-level `/recap` skill for end-of-session note upkeep.
- Started the next effort: `PLAN_chronossus_difficulty_test_fractures.md` — playthrough
  test harness (base + HFA), then difficulty options one at a time, then Fractures of Time.

## 2026-08-08 — Chronossus playtest fixes (11 items)

A batch of bug/flow/score-screen fixes from an iPad solo play. Details in
`docs/complete/20260808_CHRONOSSUS_PLAYTEST_FIXES_COMPLETED.md`.

- **Bugs:** persist Paradox/Warp/Hypersync rolls across Undo (`ChronossusUi` gains
  `warpRoll`/`paradoxRoll`/`hsRolledHex`); save-error UX with a Retry button.
- **Rules/flow:** Paradox roll cap `min(Era−1, warpTilesOnTimeline)` + repeating
  leads/ties loop; Hypersync starts on the 3 hexes (skips the intro); Recruit tells the
  player to discard the Worker tile; Superproject max VP → 8.
- **Score screen:** Superproject VP broken out from Building VP in scoring + VP pill;
  side-by-side You-vs-Chronossus tally; share/save the result as a PNG via the Web Share
  API (`src/game/shareScore.ts`), download fallback on desktop.
- **Follow-ups (TODO):** on-device verification; mirror roll-persistence + save-retry to
  the Chronobot view (its own snapshot system).

## 2026-08 — Chronossus base underway (Part A parity + B1 tiles/Autoleap)

Active plan: `docs/plans/PLAN_chronossus_base.md`. Base-game Chronossus only; opened to
everyone on the landing page.

- **Shared solo-bot core:** `SoloEngine` interface + registry (`engine/bots/soloEngine.ts`);
  `flow.ts` routes through `engineFor(state.config.bot)`; Chronobot re-expressed as an
  implementation. `chronossus?` slice on `GameState`.
- **Chronossus engine:** `ChronossusState`, `EnergyPool` draw + power-up math,
  `resolveAction` (all base actions + A/B action tiles + energy-core gain), **Autoleap**,
  `resolveHypersyncAction`, passing, `scoreChronossus`. Unit-tested.
- **Chronossus view:** `ChronossusGame.tsx` full Era loop on the shared `PhaseScreen`;
  Phase 5 renders the real board with the shared `DetailPanel`. 4 command-marker routes
  (`chronossusPaths.ts`), calibrate mode, board overlays.
- **Part A parity:** extracted shared modules used by both views — `useUndoableGame` +
  `undo.ts` (Chronossus undo/history/persistence), `HistoryPane`, `ReadyToBegin`,
  `FirstPlayerPrompt`, `TurnTracker`, `DebugBar`, `useMediaQuery`, `BadgePopover`/
  `ShapeIcon`, Simple Command View.

## 2026-07-31 — Optional BGE login: My-history + admin stats + in-app rules

See `docs/complete/20260731_AUTH_STATS_HISTORY_RULES_COMPLETED.md`.

- Optional shared-BGE login (whole app works logged-out); server-backed My-history +
  admin Overall-stats with BG Stats import/export; in-app GameBrain rules frame.

## 2026-07-28 — Full guided Era loop + landing page (Chronobot complete)

Chronobot is feature-complete and live. Details in
`docs/complete/20260728_CHRONOBOT_FULL_PHASES_COMPLETED.md`.

- **Landing/home screen** (`AppRoot` → `Landing` → `BoardExplorer`): pick a Solo
  opponent (Chronobot ready; Chronossus "Coming Soon"); a home icon returns here, and
  a cached game prompts Continue-vs-New.
- **Full phase flow**: `BoardExplorer` renders the whole Era loop by switching on
  `state.phase` — Setup (`SetupFlow`: flavor → difficulty → verbatim/app-modified
  setup) → Phases 1–6 via the `PhaseScreen` splash shell (`src/phases/`, sequencing in
  `src/game/flow.ts`) → End Game score screen. Paradox/Warp dice flows, First-Player
  handling, and game-end decided in Clean Up (Eras 5–6 flip Collapsing Capital tiles).
- **Engine**: `preparation` phase, paradox tracker, `firstPlayer`, difficulty flags
  (`reboot-advance`/`bot-extra-turn`/`min-actions-6`/`no-leader`), corrected Paradox die
  `[0,1,1,1,1,2]`, `rollParadox`/`endParadoxPhase`, Anomaly scoring (−3). Persistence v6.
- **Removed** the unwired legacy runner (`App.tsx`/`useGame.ts`) + `resolveParadox` shim.
- Button theming via `--act` (yellow-green) / `--pass` (pink) CSS vars.

## 2026-07-25 — Board Explorer (current default view)

Pivoted the default view to a board-first **BoardExplorer** (`src/BoardExplorer.tsx`,
wired in `main.tsx`); the guided game runner (`App.tsx`) is preserved for later.

- **Tap an action tile → detail panel** overlaid on the board's right zone (dark,
  purple Chronobot border). Verbatim rulebook text per action (`rule` in
  `chronobotActions.ts`) + `MECH_PLACEMENT`/`FAILED_ACTIONS`. "places an Exosuit"
  is an inline link to the mech-placement rules.
- **Icons**: 12 action-tile icons cropped from the board into a sprite sheet
  (`public/assets/solo/chronobot-icons.png`, 4×3, 144×90 cells) via
  `src/board/ActionIcon.tsx`; shown 2× in the panel header.
- **Debug harness**: top stats row (VP · Warp · Actions), Reset, seeded with 2 Warp
  tiles + 6 Exosuits. Tapping a tile resolves the action through
  `Chronobot.takeActionTurn`.
- **Mech placement gate**: any mech-placing action prompts Confirm placed / Cannot
  place before spending an Exosuit (Cannot place → +1 VP, no Exosuit).
- **Construct VP entry**: after placement, tap the tile's printed VP — **buildings
  1–4**, **superprojects 3–7** — added to the bot's score, tile discarded; max 3 per
  type (4th fails). Engine scores it via `buildingVP` input.
- **Board trackers** (`BOARD_COUNTERS` in `chronobotHotspots.ts`): 8 on-board count
  badges — Mechs (hexagon), Breakthroughs (bottom-left), Superproject + 4 buildings +
  Anomalies (bottom row).
- **Position calibration**: `pw-validate.mjs` (Playwright, cached Chromium at
  `ms-playwright/chromium_headless_shell-1217`) measures each badge's rendered
  position; plus an in-app **calibrate mode** (toggle in the top bar) — click the
  board to place the selected badge, arrow-keys nudge, panel emits the exact
  `BOARD_COUNTERS` literal.

## 2026-07-22 — Chronobot v1

**Recon / assets**
- Proved the TTS asset pipeline end-to-end: resolve a component GUID (from the mod's
  global Lua `SOLO` table) → its `ImageURL` → the matching file inside the `.ttsmod`
  ZIP → extract. Solo board (both faces), AI die, and action tiles all extract cleanly.
- Extracted to `public/assets/solo/`: `board-chronossus.jpg`, `ai-die.jpg`.
- AI die faces read as numbers paired with a fist/exosuit glyph. **Open item:** confirm
  the exact 6 faces + how they map to the 4 Command tokens (2/3/4/5) with the physical
  die. Engine keeps `aiDieFaces` as configurable data so this is a one-line fix.
- The mod's Lua is a 3D-simulation engine (spatial moves), so it's an oracle for phase
  *text* and setup, not a clean die→action table. Board arrow routing is printed on the
  board; treating it as **seeded + player-correctable** data for v1 rather than guessing
  pixel-perfect geometry (user owns the physical board to verify in testing).

**Engine scope for v1 (Chronobot)**
- Full setup guide + per-Era phase flow: Paradox → Power Up → Warp → Action Rounds →
  Clean Up, then End-of-Game scoring.
- App performs all bot randomness (AI die, paradox die).
- Action Rounds: the valuable core = full **decision resolution** for every Chronobot
  action (Construct / Recruit / Research / Recruit-Genius-or-Research / Mine / Time
  Travel / Remove Anomaly / Reboot) with priority rules + JIT explanations, plus Failed
  Action handling, min-3-actions, and passing logic.
- Bot bookkeeping tracked by the app: exosuits, VP, resources, workers, breakthroughs,
  buildings, superprojects, anomalies, warp tiles, time-travel track, actions this era.
- Where a choice needs physical board info (e.g. which building has higher VP), the app
  states the rule and asks the player to apply it (`requiresInput`).

**Chronobot v1 — DONE (testable).** `npm run dev` then choose Chronobot.
- Engine: `src/engine/bots/chronobot.ts` (pure phase functions + decision helpers),
  `rules/chronobotActions.ts` (action catalog + JIT text), expanded `types.ts`/`state.ts`.
- UI: `src/App.tsx` guided flow — setup checklist → per-Era Paradox/Power Up/Warp/Action
  Rounds/Clean Up → end-game scoring; live Chronobot status panel; collapsible board art;
  action picker with per-action "why?" JIT text; app rolls AI/paradox/shape dice.
- Tests: 21 passing (`npm test`) — decision priorities, phase transitions, failed-action
  handling, pass logic, scoring, and a full-era integration playthrough.
- Verified: `tsc` + `vite build` clean, `oxlint` clean, dev server serves app + assets 200.

**Open items to confirm with the physical game during testing:**
1. AI die faces + how they map to the 4 Command tokens (2/3/4/5). Currently
   `AI_DIE_FACES=[1..6]` in `engine/index.ts` — one-line fix once known.
2. Board arrow routing / which action sits on each token's space. v1 has the player pick
   the action from the grid each roll (also serves as the JIT reference). Once geometry is
   confirmed we can auto-predict the action per die face (the true "roll-outcome grid").
3. Paradox phase: v1 asks "did it gain an Anomaly?" (player resolves the physical roll)
   because anomaly gain depends on maturing Warp tiles the app doesn't fully track.
