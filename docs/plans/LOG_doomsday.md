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
  difficulty option flips it), which tracker each side moves, the pre-seeded Path markers
  line with its count, and that **you run Check for Impact yourself** — the one part of a
  Doomsday game the app does not do, so setup is where to say so.
- The verbatim `RulesBox` is unchanged: it is p.14's "CHANGES AT SETUP", which IS the
  Chronossus setup rules, and matches the Pioneers/Guardians boxes.
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

- **7.6 needed no change, and that is the right answer.** Experiment VP and track VP are
  added to `bot.vp` as they are earned, so they already land in the pill's **Token VP** line
  — exactly like Guardians' and the Adventure's VP. The pill only breaks out module VP that
  is *derived at scoring time* (Technologies, leftover Flux). Same for the player's tally:
  Experiment cards pay VP **tokens** (Classic p.4 step 4), which the existing "Victory Point
  tokens" field already covers.
- **7.7 shipped as a status chip, not a board overlay.** The Doomsday board is a separate
  physical board that the app never renders, so there is no board art to position an overlay
  against — a `%`-anchored marker would have nothing to sit on. The chip beside the Guardians
  / Hypersync ones shows the tracker's name, its slot (`n/10`) and the Experiment count, with
  a tooltip giving the VP for its current slot and whether the tracks are locked.
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
