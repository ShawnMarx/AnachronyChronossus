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
