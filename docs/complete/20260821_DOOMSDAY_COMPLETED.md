# Doomsday module — COMPLETED

> Archived **2026-08-21**. Implemented 2026-08-17 → 2026-08-18, review pass 2026-08-20,
> promoted to production with `staging` on **2026-08-20**.
>
> With Doomsday, **every module in the Solo Opponents matrix is implemented**.
> This file freezes the plan, the execution log and the review walkthrough as they stood
> at archive time. Do not edit — it is the historical record.

---

# PLAN — Doomsday module

> Status: **in progress** (created 2026-08-17; Feature 1 underway)
> Scope: the **Doomsday** module for the Chronossus — the last unimplemented module.
> Sources: **Solo Opponents p.14** (module), **p.19** (tile matrix + combination limits),
> **p.21** (C07/C08 Appendix text), **Classic Expansion pp.3–5** (Experiments, the
> Doomsday track, Check-for-Impact changes, Planned Experiments variant).

## Overview

Doomsday is the last module in the roadmap and the only one that **combines with nothing**
(Solo Opponents p.19: not with Pioneers, Fractures, Guardians or Hypersync). So it ships as
a **single `doomsday` mode with no combos**.

What it adds:

- **Two Action tiles** — `C07` (slot I, *Level 1 Experiment*) and `C08` (slot II, *Level 2
  Experiment*). `C03` (Energy Pack) stays in slot III. No covering tile (no slot IV/V).
- **A new Action: Experiment.** The Chronossus places an Exosuit on the Experiment hex pool
  space, then runs two independently-failable steps: **Execute Experiment** and **Prepare for
  Experimentation**. On a successful execute it also moves **its** Doomsday tracker and takes
  the VP printed there.
- **The Doomsday board** — a single 10-slot ladder with two tracker tokens (*Save Earth* moves
  up, *Seal Fate* moves down), both starting on the middle slot.
- **A re-cut Timeline.** The Impact tile starts between the **fifth and sixth** Timeline tile
  (not the fourth and fifth), and Classic p.5's Check for Impact can move it **earlier or
  later** every Clean Up. Two hard stops: *Seal Fate* bottoming out resolves the Impact
  **immediately**; *Save Earth* topping out means the Impact **never happens and the game ends
  on the spot**.
- **The "Completed Experiments" Solo Objective card** added to the deck at setup.
- **Three "Increasing the Difficulty" bullets** of its own.

**Requires the Classic Expansion Pack** — state that on the module card at setup.

## Key decisions made during discussion

### D1 — The app does **not** track the Impact tile or the Trajectory dice

Decided 2026-08-18, and it removes a large slice of the original plan. The Check for Impact is
**the player's job**: they roll the Trajectory dice, read both trackers' `+`/`−` symbols and
move the Impact tile themselves. The app has exactly two responsibilities:

1. **Tell them when** — surface the Check for Impact at the right point of Clean Up (Phase 6),
   with the verbatim rule.
2. **Take the outcome as input** — *did the Impact occur this Era?* and *did the game end?*
   (Save Earth locked in).

Consequences: no Trajectory dice roller, no `+`/`−` symbol data, no player-tracker position, no
app-side Impact tile model, and **no two-mode setting or ⚙ toggle** — there is only one flow.
The `+`/`−` column on the board (which the rulebook art partly hides behind a magnifier) is
therefore **not needed at all**.

### D2 — The bot's Doomsday tracker **is** app-tracked; the player physically moves it

The app knows which tracker is the Chronossus's from turn one — Solo Opponents p.14: *"The
Chronossus's preferred marker is always the opposing one to yours."* Setup learns the player's
Path, the bot takes the other for the whole game, so the app always knows its marker's slot and
the VP it earns, with no per-move question. The **player moves the physical token when told**.

The player's own tracker is not tracked at all (D1).

Because the app knows its own marker's position, it **can** detect the moment the bot's marker
reaches its own final slot and fire that hard stop itself, without asking. The other end
(the player's marker) arrives via the D1 input.

### D3 — The bot's VP on a slot combines **both** Path columns

The ladder prints a VP for each Path column, and a human takes only their own side's. The bot
does not — p.14: *"taking any printed VP on it — regardless of which Path that VP belongs to."*
So the bot's value per slot is **left + right as a single gain**. Slots 2 and 9 pay **4**.

### D4 — Experiments are **not** modelled as a Timeline; the app asks at the Action

No model of which Experiment card sits under which Timeline tile. The Experiment dialog
**states the rule** (verbatim) and asks what is on the table:

- **Step 1 (Execute):** *"Is there a Level N Experiment with a Chronossus Path marker on it?"*
  If yes, the player takes the **leftmost** such one and enters **its VP value** (2 or 3),
  which the bot gains. If none, the step fails and is skipped.
  **Skip this question on the first Experiment Action of a game** — no Path markers exist yet.
  Ask every time after that: the player can *remove* a Chronossus Path marker on their own turn
  (p.14), so the app can never assume one is still out. The skip is **disabled** when the
  "pre-seed Path markers" difficulty is on, since markers exist from turn one.
- **Step 2 (Prepare):** instruct the player to place a Chronossus Path marker per the rule
  (Level 1 before Level 2; ties → furthest in the past; never the card under the next Era)
  with a **Placed / Cannot** gate, matching the existing placement-gate shape.
- Both steps can fail independently (p.14's NOTE) and one failing does **not** cancel the other.

### D5 — Scope calls

- **In:** `C07A/B` + `C08A/B` **tile art**. All **three difficulty bullets**. The **Completed
  Experiments** objective card as setup text (`MODULE_OBJECTIVE_CARDS`).
- **Out:** Experiment **card** art, Doomsday **board** art, and any new iconography around the
  Experiment Action — Guardians and Pioneers shipped without their equivalents.
- **Out:** combos (the rulebook forbids all of them), and everything D1 removes.

---

## Feature 1 — Knowledge capture *(in progress)*

**Goal:** every number and player-facing string exists as data before any flow is built.

- [DONE] The board is a **single continuous 10-slot ladder**, both trackers starting on the
  middle slot. The TTS mod does **not** contain the Doomsday board (all 379 images checked);
  the Classic rulebook is the only source — p.3 for the ladder, p.4's two worked examples for
  the Path-column semantics (they show the track unoccluded).
- **The ladder, per D3** — one combined VP value per slot for the bot:

  | Slot | Left VP | Right VP | **Bot gains** | |
  |---|---|---|---|---|
  | 1 | — | 3 | **3** | top/final — Save Earth locked → game ends, no Impact |
  | 2 | 2 | 2 | **4** | |
  | 3 | 1 | — | **1** | |
  | 4 | 1 | — | **1** | |
  | 5 | 1 | — | **1** | |
  | 6 | — | — | **0** | **START** — both trackers |
  | 7 | 1 | — | **1** | |
  | 8 | 1 | — | **1** | |
  | 9 | 2 | 2 | **4** | |
  | 10 | — | 2 | **2** | bottom/final — Seal Fate locked → Impact resolves immediately |

  Column ownership (four Path symbols, four corners): left = **Dominance** up / **Progress**
  down; right = **Harmony** up / **Salvation** down. Retained for setup copy and the tooltip;
  the engine only needs the combined column.
- Transcribe verbatim into `chronossusTiles.ts` (`ModularTile.rule`) and a new Doomsday
  constants module: C07A/B + C08A/B Appendix text (p.21); the Experiment Step 1 / Step 2 /
  NOTE / tracker paragraphs (p.14); the three difficulty bullets (p.14); Classic p.5's Check
  for Impact and Planned Experiments text for the Clean Up rule box.
- Per convention, **C07B/C08B restate their A side in full** rather than "Same as C07A, but …".

**Files:** `src/board/chronossusTiles.ts`, new `src/engine/bots/doomsday.ts`.

## Feature 2 — Mode, tiles and art

- `chronossusModes.ts` — add the `doomsday` mode: `I → C07`, `II → C08`, `III → C03`, no
  `covers`. Refresh the file header (no longer a stub) and its tests.
- `ChronossusSetupFlow.tsx` — flip `{ id: 'doomsday', available: false }` to `true`.
- Extract `C07A/B` + `C08A/B` art into `public/assets/solo/chronossus/tiles/`.
- **Both** action maps (CLAUDE.md's Guardians C11 lesson): `TILE_ACTION_FAMILY` /
  `TILE_ACTION_CODE` in `chronossusTiles.ts` **and** `FAMILY_TO_TILE_ACTION` in
  `ChronossusGame.tsx`. New ids: `tile-experiment-1`, `tile-experiment-2`.
- `tileText.ts` — `TILE_DESC` + `tileInstruction` for both families and both sides, or the
  tiles fall through to Reboot's "does nothing" text.

## Feature 3 — Engine: state slice and the Experiment Action

- `ChronossusState.doomsday` — bot tracker side (`'save-earth' | 'seal-fate'`), bot tracker
  slot, `experimentsCompleted`, `experimentActionRun`, and `impactOccurred` (see F4).
- **Deep-copy the slice in `cloneChronossus`** — CLAUDE.md calls this out: a shallow-copied
  module slice writes through to the caller's pre-turn state and every History line for the
  module silently diffs to nothing. The unit tests do not catch it; Pioneers shipped it.
- `resolveDoomsdayAction(level, input)` in `doomsday.ts`:
  - Step 1: given "an Experiment with our marker exists" + its VP → gain that VP, increment
    `experimentsCompleted`, and — **if the tracks aren't locked** — advance the bot's tracker
    one slot and gain that slot's combined VP (D3).
  - Step 2: emit the Path-marker placement instruction with its priority rule.
  - B sides: C07B adds 1 Energy Core; C08B adds 1 VP **and** 1 Energy Core.
  - Detect the bot's marker reaching its final slot → fire the matching hard stop (D2).
- **Placement:** a plain figure placement on a shared hex pool. The on/off-Main-board split
  serves Fractures' Blink only, and Doomsday combines with nothing — so **no Energy Core**
  (that is the Blink marker, not a general placement cost) and nothing recorded as
  Blink-able.
- **Run `passesInsteadOfAction`** on this path like every other rolled Action, via
  `passIfOutOfFigures`. `placesExosuitFor` returns true for both new ids.

## Feature 4 — The Impact Era becomes an answer, not a calculation

**Goal:** `isPostImpact` tells the truth when the Impact Era is neither fixed nor computable.

- Today `postImpactEraFor(config)` / `maxEraFor(config)` are **config-keyed and static**
  (Fractures' 5-Era re-cut). Doomsday cannot compute its Impact Era at all — per D1 the app
  learns it from the player. So: widen the seam to `postImpactEraFor(config, state?)` and, for
  Doomsday, derive from a **stored** `doomsday.impactOccurred` Era rather than from the Era
  number. `MAX_ERA` stays 7.
- **This is a deliberate departure from CLAUDE.md's "post-Impact is derived from the Era"
  rule** — under Doomsday the Era genuinely cannot determine it. Note it in CLAUDE.md at
  cleanup so the next module doesn't "fix" it back.
- Doomsday's **default** before any answer: the Impact tile starts between the 5th and 6th
  Timeline tile → the Impact would resolve in **Era 5's Clean Up**, so post-Impact begins at
  **Era 6** (base is Era 5). That default holds until the player reports otherwise.
- Guard the debug Era stepper so it reads the same seam.

## Feature 5 — Clean Up: prompt the check, take the outcome

- At the right point in Clean Up (Phase 6), show the **Check for Impact** instruction with the
  verbatim Classic p.5 text in a `RulesBox`, then collect:
  - *Did the Impact occur this Era?* → sets `impactOccurred`.
  - *Did the game end?* (Save Earth locked) → straight to the score screen; **no Impact and no
    Evacuation ever happens**.
- When the **bot's own** marker hits its final slot the app already knows (D2) — fire that
  branch without asking, and say which one happened.
- Re-verify the existing Clean Up branches (Impact note / Collapsing-Capital choice / final
  Era) now that the Impact Era is an answer; Collapsing Capital keys off post-Impact Eras.

## Feature 6 — Setup flow

- **Path question** — which tracker the *player* moves (Harmony/Dominance → *Save Earth*;
  Salvation/Progress → *Seal Fate*). The Chronossus takes the other for the whole game.
- **"Requires the Classic Expansion Pack"** on the module card.
- Setup instructions: place C07A/C08A, leave C03A, place the Doomsday board and Trajectory
  dice, both trackers on their start slots, Impact tile between the 5th and 6th Timeline tile,
  the Level 1 / Level 2 Experiment card layout, and the Planned Experiments variant on by
  default (p.14 recommends it for early plays).
- `MODULE_OBJECTIVE_CARDS` — `['doomsday', ['Completed Experiments']]`.
- **Difficulty bullets** (new flags in `doomsday.ts`, registered in `ChronossusSetupFlow.tsx`):
  1. B-side flips for C07/C08 — reuses the shared `chronossus-tiles-b-side` flag.
  2. `DIFFICULTY_DOOMSDAY_NO_PLANNED` — play without the Planned Experiments variant.
  3. `DIFFICULTY_DOOMSDAY_SEED_MARKERS` — pre-seed Path markers on one or more **future**
     Experiments at setup (setup text + count sub-selector; also disables D4's first-run skip).

## Feature 7 — UI, History and scoring

- **Dialogs** — `CxTileDialog` gains the Experiment flow (Step 1 question → VP entry → Step 2
  gate), rendered through `renderModDialogs(flow)` like every other module dialog or it goes
  full-screen on a tablet while base Actions do not.
- **Rule boxes in the dialog footer**, never inside a `.place-prompt` step box.
- **History** — extend `summarizeChronossusExtras` for the Doomsday deltas (tracker slot,
  Experiments completed, track VP); `summarizeTurn` cannot see module-only pools. Check both
  tile sides.
- **VP pill** — fold Experiment VP and track VP into the breakdown.
- **Board overlay** — a compact readout of the bot's tracker slot, in the style of the Time
  Travel / Warp markers. The player's tracker is not shown (not tracked).

## Feature 8 — Tests and browser verification

- Unit tests: the Experiment resolver (both levels, both sides, each step failing alone,
  tracks-locked suppression); the slot→combined-VP lookup incl. slots 2 and 9 paying 4;
  `postImpactEraFor` driven by a stored answer; the bot's marker reaching a final slot firing
  each hard stop; the pass rule on the new ids; the `tileText` coverage assertions.
- `cloneChronossus` deep-copy test for the Doomsday slice.
- **Browser checks — the unit tests do not catch these:**
  - `node pw-check.mjs "Doomsday" doomsday` — tile art present, no broken images.
  - `SHOT_DIR=/tmp node pw-adv.mjs <url> 1000` — the Experiment dialog at a narrow width.
  - `pw-pass.mjs`-style save editing — a zero-figure Experiment turn, and each hard stop.
  - Play a real turn and confirm the Doomsday History lines appear (the deep-copy symptom is
    silence, not an error).
- `npm run build` + `npm test` clean.

## Recommended implementation order

1. **F1 Knowledge capture** — the ladder and the verbatim text.
2. **F2 Mode, tiles and art** — makes the module selectable and visible.
3. **F3 Engine** — the Experiment resolver, pure and tested, before any UI.
4. **F4 Impact-Era seam** — shared code; land it on its own and re-run the full suite.
5. **F5 Clean Up** — the prompt and the two outcome inputs.
6. **F6 Setup** — needs F3's state slice and F4's stored field.
7. **F7 UI/History/scoring.**
8. **F8 Tests and browser verification** — throughout; the browser sweep lands last.

## Deferred / out of scope

- Trajectory dice, the `+`/`−` symbol column, the Impact tile model, and the player's tracker
  position — all the player's job per D1.
- Experiment card art, Doomsday board art, new Experiment iconography.
- Any Doomsday combo.
- Chronossus-specific stats/history in `AdminStats` (separate `TODO.md` item).

---

# LOG — Doomsday module

Execution tracker for `PLAN_doomsday.md`. Mark `[x]` when done, `[~]` when partial.
Note deviations and decisions inline under each step.

---

## Feature 1 — Knowledge capture

- [x] 1.1 Locate a usable source for the Doomsday board.
- [x] 1.2 Transcribe the VP ladder.
- [x] 1.3 Resolve the Path-column semantics and the bot's per-slot value.
- [x] 1.4 Create `src/engine/bots/doomsday.ts` with the ladder constant + difficulty flags.
- [x] 1.5 Transcribe C07A/B + C08A/B rule text into `chronossusTiles.ts` (B sides restate A in
      full, per the `ModularTile.rule` convention).
- [x] 1.6 Transcribe the p.14 Experiment paragraphs + difficulty bullets, and Classic p.5's
      Check-for-Impact / Planned-Experiments text.
- [x] 1.7 Lock the transcription in with unit tests (`doomsday.test.ts`, 15 tests).

**Deviations / decisions:**

- The board is **one continuous 10-slot ladder**, not two halves — both trackers start on the
  middle slot (slot 6).
- The **TTS mod does not contain the Doomsday board** (all 379 images checked, plus the
  workshop JSON's 21 nicknamed objects). The Classic Expansion rulebook is the only source:
  p.3 for the ladder art, and p.4's two worked examples — which show the track **unoccluded**,
  unlike p.3 where a magnifier callout covers the middle of the `+`/`−` column.
- **Path columns** (four Path symbols, four corners): left = **Dominance** upward /
  **Progress** downward (small VP, initial steps); right = **Harmony** upward / **Salvation**
  downward (large VP, last two steps). p.4 Example 1 strikes through the Harmony value on a
  Dominance move and Example 2 does the reverse, confirming a human takes only their own side.
- **Confirmed with the user 2026-08-18:** the VP values below are correct, and the **bot
  combines left + right into a single gain** (p.14's "regardless of which Path that VP belongs
  to"). Slots 2 and 9 therefore pay **4**.
- **Trajectory / `+`/`−` symbols dropped entirely** (see PLAN D1) — not needed, so the
  magnifier-occluded column is a non-issue.
- The C07A/B + C08A/B Appendix `rule` strings were **already** in `chronossusTiles.ts` and
  already written out in full (the Appendix does not use "Same as C07A, but …" for these), so
  the B-side restatement convention needed no deviation — only the shared `EXPERIMENT_DETAIL`
  module-section text was added, wired to all four tiles. They stay `future: true` until F2.
- Verbatim constants added to `doomsday.ts`: `DOOMSDAY_REQUIREMENT`, `DOOMSDAY_SETUP_RULE`,
  `DOOMSDAY_DIFFICULTY_RULE`, `DOOMSDAY_CHECK_FOR_IMPACT_RULE`,
  `DOOMSDAY_PLANNED_EXPERIMENTS_RULE`, plus `DOOMSDAY_DEFAULT_IMPACT_ERA = 5`.
- **Feature 1 complete.** `npm run build`, `npm run lint` and `npm test` (404) all clean.

### Doomsday track — final

| Slot | Left VP | Right VP | **Bot gains** | |
|---|---|---|---|---|
| 1 | — | 3 | **3** | top/final — Save Earth locked → game ends, no Impact |
| 2 | 2 | 2 | **4** | |
| 3 | 1 | — | **1** | |
| 4 | 1 | — | **1** | |
| 5 | 1 | — | **1** | |
| 6 | — | — | **0** | **START** — both trackers |
| 7 | 1 | — | **1** | |
| 8 | 1 | — | **1** | |
| 9 | 2 | 2 | **4** | |
| 10 | — | 2 | **2** | bottom/final — Seal Fate locked → Impact resolves immediately |

## Feature 2 — Mode, tiles and art

- [x] 2.1 Add the `doomsday` mode to `chronossusModes.ts` (`I→C07`, `II→C08`, `III→C03`).
- [x] 2.2 Update the `chronossusModes.ts` header comment (no longer a stub) + its tests.
- [x] 2.3 Flip `{ id: 'doomsday', available: true }` in `ChronossusSetupFlow.tsx`.
- [x] 2.4 Extract `C07A/B` + `C08A/B` art into `public/assets/solo/chronossus/tiles/`.
- [x] 2.5 Add `tile-experiment-1` / `tile-experiment-2` to `TILE_ACTION_FAMILY` +
      `TILE_ACTION_CODE` (engine) **and** `FAMILY_TO_TILE_ACTION` (view). Both maps.
- [x] 2.6 Add `TILE_DESC` + `tileInstruction` entries for both families, both sides.
- [x] 2.7 Browser check: `pw-check.mjs "Doomsday" doomsday` — the board lays out **C03A,
      C07A, C08A**, no broken images, no page errors.

**Deviations / decisions:**

- **The tile art already existed, pre-cropped.** `~/OneDrive/Program Development/Anachrony
  Chronossus/temp/Mod Tiles/` holds all 28 tiles at the shipped 167×114; `C06A.png` there is
  byte-identical to the repo's copy, confirming it as the canonical source. Crops generated
  from the rulebook Appendix were discarded in favour of it. **Use that folder for any future
  module's tile art** — no cropping needed.
- **C07 and C08 get separate action ids** (`tile-experiment-1` / `tile-experiment-2`), not one
  shared id. They are genuinely different Actions (Level 1 vs Level 2), so Pioneers'
  C09/C10 `liveTileFamily` ambiguity cannot arise here.
- `TileEffect` gained `experiment?: 1 | 2` — the level, rather than a boolean plus a second
  field, since the level is the only thing that differs between the two tiles.
- The four tiles dropped `future: true`; `tileInstruction` describes the Experiment before the
  flat gains so the B sides read "executes a Level 2 Experiment … and scores +1 VP".
- `pw-check.mjs` had another session's scratchpad path hard-coded for its screenshot; it now
  honours `SHOT_DIR` like `pw-adv.mjs` / `pw-warp.mjs` / `pw-pass.mjs` do.
- **Feature 2 complete.** 409 tests, build and lint clean.

## Feature 3 — Engine: state slice and the Experiment Action

- [x] 3.1 Add the `ChronossusState.doomsday` slice (tracker side + slot,
      `experimentsCompleted`, `experimentActionRun`, `impactOccurred`).
- [x] 3.2 Deep-copy the slice in `cloneChronossus`.
- [x] 3.3 Write `resolveDoomsdayAction(level, input)` — Step 1, Step 2, independent failure,
      tracker move + combined slot VP when unlocked, B-side bonuses.
- [x] 3.4 Fire the matching hard stop when the bot's own marker reaches its final slot.
- [x] 3.5 Wire `placesExosuitFor` (true, Main board) — **not** in `OFF_MAIN_BOARD_ACTIONS`,
      and it does take an Energy Core.
- [x] 3.6 Route the new action ids through `passIfOutOfFigures` / `passesInsteadOfAction`.
- [x] 3.7 Tests: 32 in `doomsday.test.ts` (resolver, both hard stops, lock conditions, the
      whole turn through `Chronossus.resolveAction`, the deep-copy guard) + the pass-rule
      case in `chronossus.test.ts`. 427 total, build and lint clean.

**Deviations / decisions:**

- **The pass rule came for free.** `wouldPassOn` keys off `placesExosuitFor`, so adding the
  two ids there is the whole of step 3.6 — no separate wiring, and the test proves it.
- **The on/off-Main-board distinction is MOOT for Doomsday** (corrected 2026-08-18). It only
  exists to serve Fractures' Blink — which Exosuits can move, and what the Energy Core marks
  — and Doomsday combines with nothing (Solo Opponents p.19), so no Doomsday game has a Flux
  Pool for any of it to mean anything against. The Experiment placement is therefore a plain
  figure placement: **no Energy Core instruction** (the first draft invented one — the engine
  never mentions a Core on placement anywhere else) and no `placedExosuits` recording (dead
  code). The ids stay out of `OFF_MAIN_BOARD_ACTIONS` but nothing turns on that. The hex pool
  is shared by any number of figures, so unlike a Capital Action it can never run out of
  space.
- **`playerTrackerFinal` lives in state, not in the Action input.** The Clean Up question
  (F5) is its only writer, so the resolver reads the slice rather than having every caller
  re-supply it.
- The B sides' printed bonus is announced BEFORE the two steps and stands whether or not
  either step succeeds — it is granted for resolving the Action, not for succeeding, the
  same call Guardians' C11B makes.
- `GameConfig.doomsdayPlayerPath` added; the setup seed defaults to the player on Harmony
  (so the bot takes Seal Fate) until F6 asks the question.
- **Known gap until F7:** the view does not yet pass an `experiment` input, so in the browser
  an Experiment tile currently places its Exosuit and resolves nothing else. The dialog that
  supplies the answers is Feature 7.
- **Feature 3 complete.**

## Feature 4 — The Impact Era becomes an answer, not a calculation

- [x] 4.1 Widen `postImpactEraFor(config)` to `postImpactEraFor(config, state?)`; update all
      call sites to keep going through the seam.
- [x] 4.2 Derive Doomsday's post-Impact from the stored `doomsday.impactOccurred` answer.
- [x] 4.3 Default before any answer: Impact in Era 5's Clean Up → post-Impact begins Era 6.
- [x] 4.4 Verify the debug Era stepper reads the same seam.
- [x] 4.5 Note the deliberate departure from CLAUDE.md's "derived from the Era" rule.

**Deviations / decisions:**

- **The slice stores an Era, not a flag.** `impactEra: number | null` (the Era whose Clean Up
  resolved the Impact) rather than `impactOccurred: boolean` — the first post-Impact Era is
  simply that + 1, and the default (`DOOMSDAY_DEFAULT_IMPACT_ERA = 5`, so Era 6) stands until
  the player answers. A boolean could say *that* the Impact happened but never *when*.
- **`earthSaved` is its own flag, and a test caught why.** With Earth saved the Impact never
  resolves, so NO Era is post-Impact — but `impactEra === null` also describes a game that
  simply has not reached it yet. Without the distinction a saved-Earth game still read Era 6
  as post-Impact. `postImpactEraFor` now returns `MAX_ERA + 1` in that case, so every
  `era >= …` comparison keeps working untouched.
- Every other mode is bit-for-bit unchanged: the new `bot` parameter is optional and only
  consulted under `isDoomsdayMode`, with a test asserting a Doomsday slice cannot leak into
  a base or Fractures game.

## Feature 5 — Clean Up: prompt the check, take the outcome

- [x] 5.1 Surface the Check for Impact at the right point of Clean Up, with the verbatim
      Classic p.5 text in a `RulesBox`.
- [x] 5.2 Collect "did the Impact occur this Era?" → sets `impactOccurred`.
- [x] 5.3 Collect "did the game end?" (Save Earth locked) → score screen; no Impact, no
      Evacuation.
- [x] 5.4 When the bot's own marker hits its final slot, fire that branch without asking and
      say which one happened.
- [x] 5.5 Re-verify the existing Clean Up branches (Impact note / Collapsing Capital / final
      Era) now that the Impact Era is an answer.

**Deviations / decisions:**

- The Clean Up screen asks in the order the rules resolve: **"Is either tracker locked in?"**
  first (Save Earth topmost / Seal Fate bottommost / Neither), then, only on *Neither*,
  **"Did the Impact occur at the end of this Era?"** The rest of the screen is withheld until
  the check is answered — with a movable Impact tile it has nothing true to say before then.
- When the **Chronossus's own** marker is on its final slot the screen says so before asking,
  since the app knows that without being told.
- The predictive "The Impact occurs now" note is suppressed for Doomsday only. Every other
  mode keeps it exactly as before.
- `answerCheckForImpact` is **pure** (returns a new slice) because Clean Up commits it as a
  phase transition, not as part of a bot turn — with a test asserting the caller's state is
  untouched.
- `checkedEra` lives in the slice rather than component state, so the answer survives a
  reload and participates in Undo/History like everything else.

## Feature 6 — Setup flow

- [x] 6.1 Path question → assign the Chronossus the opposing tracker for the whole game.
- [x] 6.2 "Requires the Classic Expansion Pack" on the module card.
- [x] 6.3 Setup instructions (tiles, Doomsday board, Trajectory dice, tracker starts, Impact
      tile between the 5th and 6th Timeline tile, Experiment card layout, Planned Experiments).
- [x] 6.4 `MODULE_OBJECTIVE_CARDS` — `['doomsday', ['Completed Experiments']]`.
- [x] 6.5 Difficulty bullet 1 — C07/C08 B-side flips via the shared `chronossus-tiles-b-side`.
- [x] 6.6 Difficulty bullet 2 — `DIFFICULTY_DOOMSDAY_NO_PLANNED`.
- [x] 6.7 Difficulty bullet 3 — `DIFFICULTY_DOOMSDAY_SEED_MARKERS` (+ count sub-selector, and
      it disables the first-run Step 1 skip).

**Deviations / decisions:**

- The Path question is a **radio group beside the module choice**, modelled on Pioneers'
  deck-mode selector — not a difficulty option, since it is not a difficulty at all. Each
  Path spells out which tracker you move and which the Chronossus takes, so the answer is
  self-checking.
- The app-voice setup list shows **only the Chronossus-specific parts** (corrected
  2026-08-18). The first draft restated the base module's setup — where the Impact tile
  goes, how the Experiment cards are dealt, what the Planned Experiments variant does — but
  the established pattern is to defer that with "as for a 2-player game" (the shared "Setup
  for this app" block already says to set one up) and list only what the Chronossus changes.
  Compare Guardians' "Set up the Guardian board as for a 2-player game" and Fractures' "Set
  up the Valley board as if it was a 2-player game".
- What survives: the 2-player deferral (naming the face-up/face-down Level 2 stack, since a
  difficulty option flips it), the tracker division of labour, the pre-seeded Path markers
  line with its count, and that **you run Check for Impact yourself** — the one part of a
  Doomsday game the app does not do, so setup is where to say so.
- **"The Chronossus moves the Seal Fate tracker" was wrong** (corrected 2026-08-18). The
  player moves every physical token; the app only *owns* the bot's tracker position, and only
  so it knows the VP each of its Experiments earns. The setup text now states which track the
  player's Path puts them on, that the Chronossus scores on the opposing one, and that the
  player moves both tokens — and it links that to the Trajectory roll, which needs the (+)/(−)
  symbols beside **both** trackers' current slots each Clean Up.
- The verbatim `RulesBox` is unchanged: it is p.14's "CHANGES AT SETUP", which IS the
  Chronossus setup rules, and matches the Pioneers/Guardians boxes.
- **The Path question is its own screen step** (`'path'`, between Modules and Difficulty;
  corrected 2026-08-18). It was first put beside Pioneers' deck-mode question on the module
  page, where it was easy to miss — and unlike the deck mode it is not a preference, it
  decides which half of the Doomsday track the whole game runs on. Each option now states
  which tracker **you** control and which the Chronossus takes, with p.14's verbatim
  "preferred marker" paragraph below.
- **Feature 6 complete.**

## Feature 7 — UI, History and scoring

- [x] 7.1 Experiment flow in `CxTileDialog` (Step 1 question → VP entry → Step 2 gate).
- [x] 7.2 Render it through `renderModDialogs(flow)` so it matches base Action dialogs.
- [x] 7.3 Rule boxes in the dialog footer, never inside a `.place-prompt` box.
- [x] 7.4 Confirm C07 vs C08 each render their own art, name and rule box.
- [x] 7.5 Extend `summarizeChronossusExtras` for the Doomsday deltas; check both tile sides.
- [x] 7.6 Fold Experiment VP + track VP into the VP pill breakdown.
- [x] 7.7 Board overlay for the bot's tracker slot (the player's is not tracked).

**Deviations / decisions:**

- **7.6, final: the Experiment cards get a breakout line; the Doomsday track does not.**
  The Chronossus **discards each Experiment card as it claims it**, so unlike a Technology or
  a Guardian there is nothing left on the table to recount — the app's running total is the
  only record either side has, which is why it needs its own line (and its own row in the
  player's tally). **Doomsday track VP is ordinary VP**, granted as the marker is pushed
  along the track (the multiplayer rule, kept in solo), so it belongs in the plain token line
  like any other scoring and is deliberately NOT tracked separately.
  Implementation note: `experimentVp` is already inside `bot.vp`, so `scoreChronossus` splits
  it **out of** `tokenVP` rather than adding it on top — a test asserts
  `tokenVP + experimentVP === bot.vp` so the total can never inflate.
- **7.7 shipped as a status chip, not a board overlay.** The Doomsday board is a separate
  physical board that the app never renders, so there is no board art to position an overlay
  against — a `%`-anchored marker would have nothing to sit on. The chip beside the Guardians
  / Hypersync ones shows the tracker's name, its slot (`n/10`) and the Experiment count, with
  a tooltip giving the VP for its current slot and whether the tracks are locked.
- **Level 1 vs Level 2 was already correct** (verified 2026-08-18, `L2=1` on
  `pw-doomsday.mjs`): Step 1 asks for the level printed on the tile that was activated — C07
  asks "Level 1", C08 asks "Level 2". Step 2 is deliberately the same text on both, because
  the rulebook's preparation rule is level-agnostic (Level 1 before Level 2, whichever tile
  ran it).
- **Feature 7 complete.**

## Feature 8 — Tests and browser verification

- [x] 8.1 Unit tests — Experiment resolver: both levels, both sides, each step failing alone,
      tracks-locked suppression.
- [x] 8.2 Unit tests — slot→combined-VP lookup, incl. slots 2 and 9 paying 4.
- [x] 8.3 Unit tests — `postImpactEraFor` driven by the stored answer; each hard stop firing
      when the bot's marker reaches a final slot.
- [x] 8.4 Unit tests — pass rule on the new action ids; `tileText` coverage assertions.
- [x] 8.5 Unit test — `cloneChronossus` deep-copies the Doomsday slice.
- [x] 8.6 `node pw-check.mjs "Doomsday" doomsday` — tile art present, no broken images.
- [x] 8.7 `pw-adv.mjs` at 1000px — the Experiment dialog's real width.
- [x] 8.8 `pw-pass.mjs`-style save editing — zero-figure Experiment turn, and each hard stop.
- [x] 8.9 Play a real turn in the browser; confirm Doomsday History lines appear.
- [x] 8.10 `npm run build` + `npm test` clean.

**Deviations / decisions:**

- The browser sweep runs from a new **`pw-doomsday.mjs`**, which drives a real rolled turn
  (patching the save to park a Command marker on the C07 slot and re-rolling until the AI die
  picks marker 2). Its modes:

  | Env | What it proves | Result |
  |---|---|---|
  | *(none)* | All three dialog steps render; History shows both Doomsday lines | **OK** |
  | `FIRST=1` | The first Experiment of a game SKIPS Step 1's question | **OK** |
  | `STOP=1` | Tracker one step from the end fires the hard stop | **OK** |
  | `PASS=1` | 0 figures + a rolled Experiment passes instead of resolving | **OK** |
  | `NARROW=1` | At a 1000px viewport the dialog is 279px, not full-screen | **OK** |
  | `CLEANUP=1` | Both Check-for-Impact questions ask in order; `impactEra` recorded | **OK** |
  | `CLEANUP=1 EARTH=1` | "Earth is saved" ends the game, sets `earthSaved`, records no Impact Era | **OK** |

  No page errors in any run. `pw-check.mjs "Doomsday" doomsday` re-run at the end: C03A /
  C07A / C08A on the board, no broken images.
- The History check is the one that mattered most — it is the only way to see that the
  `cloneChronossus` deep-copy is genuinely working, since the failure mode is silence.
- **Feature 8 complete. 447 tests, build and lint clean.**

## Review walkthrough (2026-08-20)

Run against production-bound `staging`. Two changes came out of it, both recorded in
`REVIEW_doomsday.md`'s "Bugs found and fixed":

- **Clean Up's Check for Impact is one screen.** The two chained prompts became three toggles
  (max one on) plus the ordinary Era-end button, which carries the answer and becomes
  "Earth is saved — Finish & Score" for the game-ending outcome. `finishCleanUp` replaced
  `answerImpactCheck` + `afterCleanUp`, so the check and the end of the Era commit together as
  one History entry, and the check is recorded even when nothing is reported (`checkedEra`
  stays truthful). `needsImpactCheck` is no longer read by the view — the screen shows the
  toggles whenever no Impact Era is recorded — but stays in the engine, tested.
- **Its verbatim rule box moved to the foot** of the screen, along with three other non-Action
  screens that had the same problem (Variable Anomalies' box was *inside* its `.place-prompt`;
  both Setup screens; both score screens).

`pw-doomsday.mjs` `CLEANUP=1` and `CLEANUP=1 EARTH=1` were rewritten for the toggles and both
pass. Doomsday promoted to production with the rest of `staging` on 2026-08-20.

**Not done:** the walkthrough's remaining sections (verdict lines are still blank) and
`/plan cleanup` — the effort has not been archived to `docs/complete/` yet.

---

# REVIEW — Doomsday module

A walkthrough you can follow from a phone or tablet. Each section is one thing to try and
what you should see. Mark each ✅ PASS / ❌ FAIL / ⚠️ PARTIAL as you go.

Where to play it: **staging** — https://anachrony.staging.boardgameedge.com

> Doomsday requires the **Classic Expansion Pack** physically. You can click through most of
> this without the components, but the Experiment steps ask what is on your table.

---

## 1. Setup — picking the module

1. Landing → **Chronossus** → **Continue**.
2. On the module list, pick **Doomsday**.
3. Look for the **"Doomsday — which Path are you playing?"** radio group.

**Expect:** four Paths. Harmony and Dominance each say *you* move "Save Earth" and the
Chronossus moves "Seal Fate"; Salvation and Progress say the reverse.

4. Tick **Doomsday: play without the Planned Experiments variant**, then untick it again.
5. Tick **Doomsday: it starts with Path markers on future Experiments** and set the count.
6. **Continue** to the setup instructions.

**Expect:**
- A verbatim **"Doomsday — setup"** box: requires the Classic Expansion Pack, C07A to (I),
  C08A to (II), leave C03A, add the **"Completed Experiments"** Solo Objective card.
- An app-voice **"Doomsday setup"** list of only the Chronossus-specific parts — it should
  **defer the base module's setup** to "as for a 2-player game" rather than restating it:
  1. Set up the Doomsday board / Experiment cards / Impact tile as for a 2-player game,
     naming the **face-up** Level 2 stack with the Planned Experiments variant on and the
     **face-down** one with it off.
  2. Which track **your Path** puts you on, and that the Chronossus scores on the opposing
     one.
  3. That **you move both physical tokens** — the app only tracks where the bot's marker
     sits (so it knows its VP) and tells you when to advance it — and that you need both
     positions each Clean Up to read the (+)/(−) symbols for the Trajectory roll.
  4. Keeping the Chronossus's Path markers to hand.
  5. The pre-seeded markers line, with your chosen count (only if that option is on).
  6. That **you** run Check for Impact each Clean Up — the app never rolls the Trajectory
     dice or tracks the Impact tile.

  It should NOT re-teach where the Impact tile goes, how the Experiment cards are dealt, or
  what the Planned Experiments variant does — that is base-module setup the player does as
  normal for two players.

**Verdict:**

## 2. The board

1. **Continue** through to Era 1.

**Expect:** the Chronossus board shows **C07** in slot I, **C08** in slot II, **C03** in
slot III. No tile covering any printed Action space.

2. Find the status chips near the turn overview.

**Expect:** a chip reading e.g. **"Seal Fate 6/10 · 0 Exp"**. Tap/hover it.

**Expect tooltip:** which tracker it moves and why, the slot's VP, and that it takes **both**
Paths' printed values unlike you.

**Verdict:**

## 3. The first Experiment of the game

Roll **🎲 Take Bot Action** until a marker lands on **C07** or **C08**.

**Expect:** the dialog opens **straight on Step 2 — Prepare for Experimentation**. It should
NOT ask whether an Experiment carries a Path marker — none can be out yet.

> If you turned on the pre-seed difficulty, it **should** ask. That is the intended exception.

**Expect the Step 2 text:** place a Path marker on a face-up Experiment with none, **Level 1
before Level 2**, **furthest in the past** to break a tie, never the one under the next Era.

Press **▶ Start Your Turn**.

**Verdict:**

## 4. A later Experiment — all three steps

Roll until another Experiment comes up.

1. **Expect Step 1:** *"Is there a Level N Experiment … with one of the Chronossus's Path
   markers on it?"* — with a note that it takes the **leftmost**.
2. Answer **Yes**.
3. **Expect the VP step:** "What is the Victory Point value printed on that Experiment?" with
   **2 VP** and **3 VP** buttons, and a line below saying which tracker will move and the VP
   it will score there.
4. Pick one, then **▶ Start Your Turn**.

**Expect afterwards:**
- The status chip's slot has moved one step and the Exp count went up.
- **History** shows *"Executed an Experiment (N completed)"* and *"Moved the … tracker one
  step (+N VP printed there)"*.
- The VP pill total went up by the card VP **plus** the track VP.

**Verdict:**

## 5. Both steps can fail

1. On an Experiment, answer Step 1 with **"✗ None — skip this step"**.

**Expect:** it still goes on to Step 2 — a failed step is skipped, not fatal.

2. On another, answer Step 2 with **"✗ All of them already have one"**.

**Expect:** the turn still commits, and if Step 1 succeeded the VP and tracker move still
happened.

**Verdict:**

## 6. Clean Up — Check for Impact

Play to the end of an Era and reach **Clean Up**.

> Reworked 2026-08-20 (see "Bugs found and fixed"): the check is **one screen**, not two
> chained prompts.

**Expect, on the ordinary Clean Up screen:**
- The usual "retrieve the Exosuits" note.
- A note telling you to roll the two Trajectory dice and move the Impact tile.
- **"Did any of these happen? Tap one if so — otherwise just end the Era."** with three
  toggles: *"Save Earth" reached its topmost slot*, *"Seal Fate" reached its bottommost
  slot*, *The Impact occurred*.
- The **End the Era — start Era N ▶** button, right there on the same screen.
- A collapsible **📖 Doomsday — Check for Impact** box with the verbatim rule, at the foot.

1. Tap a toggle, then tap it again.

**Expect:** it turns on (✓) and back off; tapping a second toggle moves the tick rather than
adding one — at most one can be on.

2. With nothing ticked, press **End the Era**.

**Expect:** the Era ends normally, and this Era is not asked again.

**Verdict:**

## 7. The Impact, when you say so

Reach a Clean Up, tick **The Impact occurred** and press **End the Era**.

**Expect:** from the **next** Era on, Power Up gives **2+X Exosuits (max 4)** instead of
3+X (max 6), and the Collapsing Capital check appears in Clean Up. It should follow the Era
*you* named, not a fixed Era 5 or 6.

**Verdict:**

## 8. The two hard stops

1. **Seal Fate bottommost.** In Clean Up, tick *"Seal Fate" reached its bottommost slot* and
   press **End the Era**.

**Expect:** the Impact is recorded for this Era and the game continues post-Impact.

2. **Save Earth topmost.** In a later game, tick *"Save Earth" reached its topmost slot*.

**Expect:** the exit button changes to **"Earth is saved — Finish & Score ▶"**; pressing it
ends the game and goes to the score screen. No Impact, no Evacuation.

3. If the **Chronossus's own** marker reaches the end of the ladder during an Experiment,
   the turn should say so itself (*"the Impact is mitigated and the game is over"* or
   *"resolve the Impact immediately"*) without waiting to ask you.

**Verdict:**

## 9. Out of Exosuits

Play an Era until the Chronossus has no figures left, then roll onto an Experiment.

**Expect:** it **passes** rather than asking you to place an Exosuit it does not have.

**Verdict:**

## 10. Tap explanations

With **Debug** off, tap the C07 and C08 tiles on the board.

**Expect:** a read-only panel with that tile's own art, name and **expanded** verbatim rule —
C07 must show C07's text and C08 must show C08's, never each other's.

**Verdict:**

---

## Follow-ups / edge cases to consider

- B-side tiles: with "Flip Action tiles to their B side" on, C07B should add 1 Energy Core and
  C08B should add 1 VP **and** 1 Energy Core on top of the Experiment itself.
- The score screen's player tally: Experiment card VP goes under **Victory Point tokens**, and
  the "Completed Experiments" objective under **Solo Objectives**.
- Undo across an Experiment turn and across a Check-for-Impact answer.

## Bugs found and fixed during review

- **2026-08-20 — Check for Impact was two screens.** It asked "is either tracker locked in?"
  first and only then, on a separate screen, "did the Impact occur?", with the Era-end button
  hidden behind both and the rest of Clean Up invisible while it ran. Reworked to three
  toggles (max one on) on the ordinary Clean Up screen, with the Era-end button carrying the
  answer — and becoming "Earth is saved — Finish & Score" for the outcome that ends the game.
  One commit, one History entry (`finishCleanUp` replaced `answerImpactCheck` +
  `afterCleanUp`). `pw-doomsday.mjs`'s `CLEANUP=1` and `CLEANUP=1 EARTH=1` runs were updated
  to drive the toggles; both pass.
- **2026-08-20 — the verbatim rule box sat above the prompt** on that screen (and on three
  other non-Action screens). All four now put the rulebook text at the foot, under what the
  player has to act on.

---

## Production Notes

**Shipped state.** `doomsday` is a standalone Chronossus mode with no combos (Solo Opponents
p.19 forbids all of them). Tiles: C07 → slot I, C08 → slot II, C03 → slot III, no covering
tile. 447 tests green; build and lint clean at archive time.

**Things a future session must not "fix" back:**

- **Doomsday is the one place post-Impact is NOT derived from the Era.** Everywhere else
  `isPostImpact(era, config)` rules. Doomsday's Impact tile starts a slot later and the
  Trajectory dice move it every Clean Up, and the app deliberately models none of that — so
  `postImpactEraFor(config, bot)` reads `bot.doomsday.impactEra` under `isDoomsdayMode` only,
  falling back to `DOOMSDAY_DEFAULT_IMPACT_ERA = 5`. Already recorded in `CLAUDE.md`.
- **`earthSaved` is a separate flag from "no Impact Era yet".** With Earth saved NO Era is
  post-Impact, so `postImpactEraFor` returns `MAX_ERA + 1`. Conflating the two silently left a
  saved-Earth game running the 2+X Power Up from Era 6.
- **No Energy Core on the Experiment placement.** The Core is Fractures' Blink marker; Doomsday
  combines with nothing, so there is no Flux Pool for it to mean anything against.
- **Check for Impact is the player's job.** The app prompts and records the answer — it never
  rolls the Trajectory dice, reads the `+`/`−` symbols, or tracks the Impact tile's position.
- **The bot's Doomsday tracker slot is app-owned; every physical token is player-moved.** The
  app tracks the slot only so it knows the VP each Experiment earns.
- **C07/C08 have separate action ids** (`tile-experiment-1` / `tile-experiment-2`) because they
  are genuinely different Actions — Pioneers' `liveTileFamily` ambiguity cannot arise here.
- **Experiment card VP gets its own score line; Doomsday track VP does not.** The bot discards
  each Experiment card as it claims it, so the app's total is the only record; track VP is
  ordinary VP. `scoreChronossus` splits `experimentVp` **out of** `tokenVP`, with a test
  asserting `tokenVP + experimentVP === bot.vp`.

**Verification harness.** `pw-doomsday.mjs` drives a real rolled Experiment turn in a browser;
its modes (`FIRST` / `STOP` / `PASS` / `NARROW` / `CLEANUP` / `CLEANUP=1 EARTH=1`) all passed.
The History check is the load-bearing one — a shallow-copied module slice fails silently.

**Left open at archive time** (carried to `TODO.md`):

- The **review walkthrough's remaining sections** were never walked — sections 1–5 and 7–10
  have blank verdict lines. It needs the **Classic Expansion Pack** physically on the table
  for the Experiment steps. Sections 6 and 8's Check-for-Impact behaviour *was* exercised
  (that is where the two bugs above came from) and is covered by `pw-doomsday.mjs`.
- **Experiment / Doomsday-board iconography** — deliberately out of scope, as with Guardians
  and Pioneers. Revisit as one pass across all modules rather than per module.
- **Module-section rules text** for C07–C13 (Solo Opponents pp.14–17) still only carries the
  Appendix line for the tiles outside Fractures.
