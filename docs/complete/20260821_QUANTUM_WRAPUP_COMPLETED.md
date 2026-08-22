# Quantum Loops + project wrap-up — COMPLETED

> Archived **2026-08-21**, the day it was planned and executed. Shipped to `staging`
> (`1f2c0a0`) and verified against the deployed site.
>
> **This closes Phase 4.** Every module and add-on in the Solo Opponents matrix is now
> implemented, and the landing card reads 100%.
>
> No `REVIEW_` file was produced — the effort was verified by browser harnesses rather than
> a walkthrough (see Production Notes). Frozen record; do not edit.

---

# PLAN — Quantum Loops + project wrap-up

> Status: **not started** (created 2026-08-21)
> Scope: the **Quantum Loops** add-on module — the last unimplemented feature — plus the
> four wrap-up items chosen with it. Finishing this takes the landing card from **90% to
> 100%** and closes Phase 4 of `docs/PLAN.md` for good.
> Sources: **Solo Opponents p.18** (the Chronossus's Quantum Loops rules + its two
> difficulty bullets), **p.19** (combination table), **Future Imperfect pp.7–8** (the
> module itself: the card offer, the Quantum Warp tile, the Preparation refill).

## Overview

Quantum Loops is by far the smallest module in the matrix, because **the Chronossus barely
touches it**. Solo Opponents p.18 gives it no setup changes, no Action tile, and exactly one
mechanic: a die roll in the Warp Phase that permanently removes a card from the player's
offer.

What it adds, in full:

- **Warp Phase (4).** *"In each Warp Phase, when the Chronossus places at least one warp tile,
  roll the AI die. On a roll of 4, remove the Quantum Loop card farthest from the draw deck
  from play."*
- **Action Rounds (5).** The Chronossus never interacts with Quantum Loops and never *returns*
  a card, so cards removed in the Warp Phase are **permanently** out. When the **player**
  returns a card, it goes back to the row **farthest from the draw deck**.
- **Setup.** No changes — only the row convention: *"Keep the Quantum Loop cards in a row,
  adding new ones closest to the draw deck."* That convention is what makes "farthest from the
  draw deck" mean something, so it is the one setup line worth showing.
- **Cosmic Data Leak.** If the **player** gains that card, draw 2 unused Solo Objectives and
  put them into play.
- **Two difficulty bullets:** also remove on a roll of **5**; and the Chronossus **receives
  2 VP** whenever it removes a card.
- **Requires the Future Imperfect expansion.**

It is an **extra module** (a multi-select checkbox), not a base mode: p.19 lists Variable
Anomalies, Quantum Loops and Alternate Timelines as the three that *"do not affect Action tile
placement"*, and Quantum Loops appears in none of the "cannot be combined with" lists — so it
combines with **every** base mode, **including Doomsday**. It therefore slots in beside
`EXTRA_MODULE_VARIABLE_ANOMALIES` / `EXTRA_MODULE_ALTERNATE_TIMELINES` with no combo work at
all.

## Key decisions made during discussion

### D1 — The app does **not** model the card row (confirmed 2026-08-21)

Instruct only. The app rolls the AI die and says *"remove the Quantum Loop card farthest from
the draw deck"*. It does not track the 3-card offer, the face-down deck, which cards are out,
or how many have been removed.

Why: the **player** also takes and returns cards, and Preparation refills the offer from the
deck — any model the app kept would drift silently within an Era, exactly as Doomsday's
Experiment cards would have. This is CLAUDE.md's *"decide what NOT to model before building a
module"* rule applied a second time. Nothing else in the app reads the row, so the model would
have earned nothing even if it stayed accurate.

Consequence: **no `ChronossusState` slice for Quantum Loops** — only VP (which already has a
home) and the History line. The removal is an instruction plus a History entry, and that is the
whole feature.

### D2 — The app rolls the AI die itself; the player answers nothing

Consistent with everything else: the app performs the bot's randomness. The Warp screen shows
the rolled face (the existing black-with-red-numeral `.bot-die`) and states the outcome. There
is no question to ask — unlike Alternate Timelines, which must ask what colour the tiles landed
on because the app does not track Timeline slots.

### D3 — The Warp screen stays **one screen** (the one-screen-prompts rule)

Quantum Loops fires **after** the Chronossus has placed its Warp tiles, and Alternate Timelines
already intercepts that same moment with its own question. Chaining them — place → ask about
positive spaces → *then* a second screen for the die — is precisely the pattern the 2026-08-20
Check-for-Impact rework removed.

So: the Warp screen shows the Paradox roll, the placement instruction, the Alternate Timelines
question (when on) and the Quantum Loops die + its outcome **together**, and the single
"continue" button commits all of it as **one** snapshot and **one** History entry. The QL die
is rolled when the placement roll is known (it only fires on ≥1 tile), so it is on screen
before the player answers anything.

### D4 — VP only exists under difficulty bullet 2

Base Quantum Loops scores the Chronossus nothing — the removal is pure denial. The 2 VP is a
difficulty option, so it folds into the ordinary token VP line, like Alternate Timelines'
per-space bonus. **No new score-screen row** (contrast Doomsday's Experiment cards, which
needed one because the physical cards are discarded).

### D5 — Scope of the wrap-up half

**In** (chosen 2026-08-21): the landing card's 90% → 100%; Chronobot parity with the
Chronossus's Undo/roll-persistence and phase-screen work; the die art on the existing Paradox
and Research/Assimilate rolls; and the publishing finishers.

**Out:** access-gating / SSO via `auth.boardgameedge.com`, making the GitHub repo public, the
score-tally export format, `AdminStats`' Chronossus-specific stats, and the module-section
rules text for C07–C13. All stay in `TODO.md`.

**Already done, discovered while planning:** the BGE **landing-page listing** — Anachrony is
already an `AppCard` in `boardgameedge/services/landing/src/bge_landing/config.py` (slug
`anachrony`, icon `clock`). The `TODO.md` line claiming otherwise is stale; F9 only has to
confirm it renders in prod and then strike the line.

---

## Feature 1 — Quantum Loops: knowledge capture and registration

**Goal:** the verbatim text and the module's existence, before any behaviour.

- New `src/engine/bots/quantumLoops.ts`, mirroring `doomsday.ts`'s shape:
  `EXTRA_MODULE_QUANTUM_LOOPS = 'quantum-loops'`, the two difficulty flags, the verbatim
  p.18 strings (`QUANTUM_LOOPS_REQUIREMENT`, `QUANTUM_LOOPS_SETUP_RULE`,
  `QUANTUM_LOOPS_WARP_RULE`, `QUANTUM_LOOPS_ACTION_RULE`, `QUANTUM_LOOPS_DIFFICULTY_RULE`),
  and the pure removal helper (F2).
- `ChronossusSetupFlow.tsx` — flip `{ id: 'quantum-loops', available: false }` to `true` and
  point it at the shared constant rather than the bare string, as the other two extras do.
- `EXTRA_MODULE_LABELS` already carries `'quantum-loops': 'Quantum Loops'` — no change, so
  `selectedModeLabels` (turn overview, End Game) lights up for free.

**Files:** new `src/engine/bots/quantumLoops.ts`; `src/phases/ChronossusSetupFlow.tsx`.

## Feature 2 — Engine: the Warp-phase AI-die check

- Pure helper in `quantumLoops.ts`:
  `quantumLoopRemoval({ tilesPlaced, roll, difficulty })` → `{ removes: boolean; vp: number }`.
  Removes on **4**, and on **5** with `DIFFICULTY_QL_REMOVE_ON_5`; `vp` is 2 with
  `DIFFICULTY_QL_2VP` **and** a removal, else 0. `tilesPlaced === 0` → never rolls, never
  removes (the rule is conditioned on placing at least one tile).
- `resolveWarp` takes the rolled face as a trailing optional argument
  (`quantumRoll: number | null = null`) and applies the VP + the instruction. The caller rolls,
  as everywhere else — the engine stays pure. If the signature needs a sixth argument later,
  convert it to an options bag then, not now.
- The instruction text names the card position in bold, per the bold-every-location rule:
  *"Remove the Quantum Loop card **farthest from the draw deck** from play — permanently."*
- Era Zero (Fractures' one-off Warp) runs the same path: it is a Warp Phase in which the
  Chronossus places tiles, so the check applies. Note it explicitly in the tests.

**Files:** `src/engine/bots/quantumLoops.ts`, `src/engine/bots/chronossus.ts`.

## Feature 3 — Warp screen: one screen, both modules

- `ChronossusGame.tsx`'s Warp body renders, in order: the Paradox roll and placement note →
  the Alternate Timelines question (when on) → the Quantum Loops die and its outcome (when on
  and ≥1 tile placed) → the continue button. Verbatim 📖 boxes at the **foot**, Action rule
  first — the module boxes go under the phase's own.
- Roll persistence: the QL face lives in the `ui` slice beside `warpRoll` so Undo re-shows the
  same face instead of re-rolling (playtest bug #10's shape).
- One commit, one History entry — the placement line, the Alternate Timelines bonus (if any)
  and the Quantum Loops line together, exactly as `finishWarp` already batches the first two.
- History line: *"Quantum Loops: rolled 4 — removed the card farthest from the draw deck"* /
  *"…rolled 3 — no card removed"*, plus the VP when the difficulty option is on.

**Files:** `src/ChronossusGame.tsx`.

## Feature 4 — Setup, difficulty and the Cosmic Data Leak note

- **Requires the Future Imperfect expansion** on the module checkbox (the same treatment
  Doomsday's Classic Expansion requirement got).
- App-voice setup list — **only what the Chronossus changes**, per the module-setup convention:
  the row convention (new cards closest to the draw deck, so "farthest" is unambiguous), and
  that the app rolls the check each Warp Phase and will tell them which card to remove. It
  must **not** re-teach the offer, the draw deck or the Quantum Warp tile — that is the base
  module's own setup, deferred with "set up the Quantum Loops module as for a 2-player game".
- The verbatim p.18 "CHANGES AT SETUP" box beside it.
- `MODULE_OBJECTIVE_CARDS` — Quantum Loops adds none of its own, but the **Cosmic Data Leak**
  rule does add two: surface it as a setup/reminder line (*if you gain Cosmic Data Leak, draw 2
  unused Solo Objectives and put them into play*), since the End Game screen lists objectives.
- Two difficulty options registered in `EXTRA_MODULE_DIFFICULTY['quantum-loops']` — the first
  extra module with two of them (Alternate Timelines has one), so check the picker's layout.

**Files:** `src/phases/ChronossusSetupFlow.tsx`, `src/engine/bots/quantumLoops.ts`.

## Feature 5 — Tests and browser verification

- Unit tests on the pure helper: removes on 4; not on 3 or 2; on 5 only with the option; 0
  tiles placed never removes; 2 VP only with the option **and** a removal; both options
  together.
- `resolveWarp` tests: the VP lands, the instruction is emitted, Era Zero runs the check, and
  a game **without** the module is bit-for-bit unchanged (the Doomsday-style leak guard).
- A `pw-quantum.mjs` browser run modelled on `pw-doomsday.mjs`: reach the Warp Phase with the
  module on, confirm the die renders, the outcome line reads correctly, History carries the
  line, and Undo re-shows the **same** face. Also once with Alternate Timelines on as well, to
  prove D3's single screen.
- `npm run build`, `npm run lint`, `npm test` clean.

## Feature 6 — Landing card: 90% → 100%

- `src/Landing.tsx:190` — `progress={90}` → `100`, and re-read the surrounding copy/status
  for anything that says a module is still missing.
- Sweep the app for other "still to come" copy: the setup picker's unavailable styling now has
  no unavailable entries, so check that the picker still reads sensibly with every box live.
- `docs/PLAN.md` roadmap + `docs/BUILD-LOG.md` follow in F10.

## Feature 7 — Chronobot parity

The Chronossus's guided-phase work was never mirrored back. Three related `TODO.md` items,
done together because they touch the same seam (`BoardExplorer.tsx`'s own snapshot stack):

- **Roll persistence on Undo** — the Chronobot still has the latent reroll-on-undo bug
  (playtest #4/#10): the Paradox / Warp rolls are not part of the restored snapshot the way
  the Chronossus's `ui.warpRoll` is. Undo must re-show the same roll.
- **Phase-screen ↶ Undo + `commitPhase`** — every phase advance undoable, as on the Chronossus
  phase screens.
- **History from the phase screens** — the pane renders inside the board harness only. Give
  the Chronobot's phase screens the same way in the Chronossus has (or lift the pane); this
  also closes the "History is only visible on the Action Rounds board" item for both bots.

Verify with a Chronobot browser run, not unit tests — the Chronossus playtest proved these are
invisible to the suite.

**Files:** `src/BoardExplorer.tsx`, `src/phases/PhaseScreen.tsx`.

## Feature 8 — Die art on the Paradox / Research rolls

The art is extracted and committed; nothing renders it. Both bots share these dice.

- **Paradox roll** — `paradox-die-{0,1,2}.png` replaces the text readout on the Paradox phase
  (both bots) and on the Warp phase's Paradox roll.
- **Research** — `shape-die-{circle,triangle,square}.png` replaces the **rolled-shape readout
  only**, and the Breakthrough art stays beside it (they are two different things).
- **Assimilate (Fractures, C04)** — the die face **alone**, no shape art beside it: that roll
  resolves to an Operator / Technology / fewer-of, never a Breakthrough.
- The AI die stays CSS-drawn — decided 2026-08-15, do not "finish the set" by rastering it.

**Files:** `src/BoardExplorer.tsx`, `src/ChronossusGame.tsx`, phase bodies, plus a small shared
die-face component if three call sites want one.

## Feature 9 — Publishing finishers

- **Rotate the CI deploy key** (security; the private key was printed to a tool output).
  Regenerate the pair, install the new public half on the host, update the repo secret,
  and prove it with a real deploy before removing the old one. (Procedure lives with the
  infrastructure docs, not in this repo.)
- **Link back to BGE + support** — a link from this app's Landing screen to
  `boardgameedge.com`, with the support message. **Open question:** the donation platform is
  still TBD (Ko-fi / Patreon) — if it is still undecided at execution time, ship the link-back
  and leave the support line for a follow-up rather than blocking.
- **Landing-page listing** — already done (see D5). Confirm the card renders on the live
  landing page, then strike the `TODO.md` line.

## Feature 10 — Docs, archive and close-out

- `docs/BUILD-LOG.md` — one dated entry for the module + the wrap-up.
- `docs/PLAN.md` — status header and roadmap: every module shipped, landing at 100%, Phase 4
  closed; name what is left (Phase 5 login/stats, access-gating, the public-repo prep).
- `TODO.md` — tick what this plan closes; leave the D5 out-of-scope items.
- `CLAUDE.md` — add the Quantum Loops entries if they earn a line: the extra-module shape (a
  module with **no** state slice at all is a first) and the one-screen Warp rule.
- `/plan cleanup` to `docs/complete/YYYYMMDD_QUANTUM_WRAPUP_COMPLETED.md`.

## Recommended implementation order

1. **F1 → F5, Quantum Loops end to end** — it is the feature; the rest is polish. F2 before F3
   (pure before UI), F5 throughout with the browser run last.
2. **F6 Landing 100%** — one line, but only true once F5 passes.
3. **F8 Die art** — self-contained and visible; a good break between the module and the
   Chronobot work.
4. **F7 Chronobot parity** — the largest of the wrap-up items and the only one touching
   `BoardExplorer`'s snapshot stack. Land it alone and re-run everything.
5. **F9 Publishing finishers** — the key rotation is independent of all the code; do it when a
   deploy is due so the rotation is proven by a real run.
6. **F10 Docs and archive.**

## Deferred / out of scope

- Access-gating / SSO via `auth.boardgameedge.com`; making the GitHub repo public.
- The score-tally export format; `AdminStats`' Chronossus-specific stats.
- Module-section rules text for C07–C13; the Doomsday review walkthrough (needs the Classic
  Expansion Pack on the table); the Solo Hypersync tile prompt's missing rule box.
- Any model of the Quantum Loop card row (D1).

---

# LOG — Quantum Loops + project wrap-up

Execution tracker for `PLAN_quantum_wrapup.md`. Mark `[x]` when done, `[~]` when partial.
Note deviations and decisions inline under each step.

---

## Feature 1 — Quantum Loops: knowledge capture and registration

- [x] 1.1 Create `src/engine/bots/quantumLoops.ts` with `EXTRA_MODULE_QUANTUM_LOOPS`, the two
      difficulty flags and the verbatim p.18 strings (requirement, setup, Warp, Action Rounds,
      difficulty).
- [x] 1.2 Flip `{ id: 'quantum-loops', available: true }` in `ChronossusSetupFlow.tsx` and use
      the shared constant instead of the bare string.
- [x] 1.3 Confirm `EXTRA_MODULE_LABELS` already covers it, so the turn overview and End Game
      list it with no further change.
- [x] 1.4 Unit-test the transcription (the shape `doomsday.test.ts` uses).

**Deviations / decisions:**

- Quantum Loops adds **no `ChronossusState` slice at all** — a first. Per D1 the card row is
  not modelled, and the only state it touches is VP, which already has a home.
- The constants are re-exported from `chronossus.ts` so the view and setup flow reach them
  through the `Chronossus` namespace, as the Doomsday ones are.

## Feature 2 — Engine: the Warp-phase AI-die check

- [x] 2.1 `quantumLoopRemoval({ tilesPlaced, roll, difficulty })` → `{ removes, vp }`.
- [x] 2.2 Removal on 4; on 5 only with `DIFFICULTY_QL_REMOVE_ON_5`.
- [x] 2.3 2 VP only with `DIFFICULTY_QL_2VP` **and** an actual removal.
- [x] 2.4 `tilesPlaced === 0` → no roll, no removal.
- [x] 2.5 Thread the rolled face into `resolveWarp` as a trailing optional argument; apply the
      VP and emit the instruction (bold the card position).
- [x] 2.6 Confirm Fractures' Era Zero Warp runs the check too.

**Deviations / decisions:**

- `resolveWarp` takes the rolled face as a 5th optional argument. It stays at positional
  args for now; a 6th would be the point to convert to an options bag.
- The check emits its **own** instruction rather than appending to the Warp one, so a miss
  still reports. A check that only ever appears when it fires is indistinguishable from one
  that never ran.

## Feature 3 — Warp screen: one screen, both modules

- [x] 3.1 Render the Quantum Loops die + outcome on the Warp screen alongside the Alternate
      Timelines question — no chained prompt.
- [x] 3.2 Roll the face when the placement count is known; store it in the `ui` slice so Undo
      re-shows the same face.
- [x] 3.3 One commit, one History entry covering placement + Alternate Timelines + Quantum
      Loops.
- [x] 3.4 Verbatim 📖 boxes at the foot of the screen, module boxes under the phase's own.

**Deviations / decisions:**

- `WarpPhaseBody` (shared with the Chronobot) gained a **`beforeCommit`** slot. Unlike
  `followUp` it does not replace the Continue button — it is for an outcome the app resolves
  itself and only reports, which has to share the screen with the placement.
- The Quantum Loops face is rolled **with** the Warp roll (`rollWarp` sets both), since the
  check is decided the moment the Paradox die is. That is what keeps it on one screen and
  what makes Undo re-show the same face — it lives in the `ui` slice beside `warpRoll`.
- The on-screen outcome is derived from the same pure `quantumLoopRemoval` the engine calls,
  so the screen and the committed state cannot disagree.

## Feature 4 — Setup, difficulty and the Cosmic Data Leak note

- [x] 4.1 "Requires the Future Imperfect expansion" on the module checkbox.
- [x] 4.2 App-voice setup list — only the Chronossus-specific parts; defer the base module's
      setup to "as for a 2-player game".
- [x] 4.3 Verbatim p.18 "CHANGES AT SETUP" box beside it.
- [x] 4.4 Cosmic Data Leak reminder — 2 unused Solo Objectives into play if the player gains it.
- [x] 4.5 Register both difficulty options in `EXTRA_MODULE_DIFFICULTY`; check the picker's
      layout with two of them (a first for an extra module).

**Deviations / decisions:**

- The extras picker gained an optional `note` per add-on for the expansion requirement; it
  is the first extra module that needs one.
- Quantum Loops is also the first extra module with **two** difficulty options (Alternate
  Timelines has one). The picker's layout handles it unchanged.
- The Cosmic Data Leak rule is a **player-side** rule, so it is a setup reminder rather than
  anything in `MODULE_OBJECTIVE_CARDS` — the objectives it adds are drawn during play, not
  seeded into the deck at setup.

## Feature 5 — Tests and browser verification

- [x] 5.1 Unit tests on `quantumLoopRemoval` — every roll/option combination and the 0-tile case.
- [x] 5.2 `resolveWarp` tests — VP, instruction, Era Zero, and a no-module game unchanged.
- [x] 5.3 `pw-quantum.mjs`: the die renders, the outcome reads correctly, History carries the
      line, Undo re-shows the same face.
- [x] 5.4 A second run with Alternate Timelines also on — one screen, one History entry.
- [x] 5.5 `npm run build`, `npm run lint`, `npm test` clean.

**Deviations / decisions:**

- **Found a real bug the unit tests could not see: Alternate Timelines was still a CHAINED
  prompt.** Rolling the Warp asked its "how many landed on a positive space?" question only
  *after* the Continue button — the exact shape D3 says to remove, and it would have put the
  Quantum Loops outcome on one screen and the question on the next. The question now replaces
  the Continue button on the Warp screen itself, so placement + Quantum Loops + Alternate
  Timelines commit as one entry. `altTimelinesPending` state deleted; the question derives
  from `ui.warpRoll`.
- `pw-quantum.mjs` added, modelled on `pw-doomsday.mjs`. Modes: *(none)* removal on a 4,
  `ROLL=3` the miss, `ALT=1` the one-screen rule, `UNDO=1` roll persistence, `SETUP=1` the
  setup block. All pass, no page errors.
- **The Undo check had to undo more than once.** Committing the Warp runs straight into
  Action Rounds and, with the Chronossus as First Player, its first bot turn commits on top —
  so a single Undo measures that turn, not the Warp. The harness now undoes until the phase
  is back to `warp`. Worth remembering for any future phase-level Undo check.
- 493 tests (15 new), build and lint clean.

## Feature 6 — Landing card: 90% → 100%

- [x] 6.1 `src/Landing.tsx` — `progress={90}` → `100`.
- [x] 6.2 Sweep the surrounding copy and the module picker for "still to come" wording now that
      nothing is unavailable.

**Deviations / decisions:**

- The in-fiction "Uploading…" bar now reads **"Upload complete"** at 100% (and its
  aria-label with it) rather than claiming to still be working.
- The card's description was rewritten: it named six modules and said "with more modes on
  the way", which is no longer true. It now names every module including the three add-ons.
- `ComingSoon` needed no change — it returns null on an empty list, so it disappeared by
  itself when the last unavailable entry went.

## Feature 7 — Chronobot parity

- [x] 7.1 Fold the Paradox / Warp rolls into the Chronobot's restored snapshot so Undo
      re-shows the same roll.
- [x] 7.2 Add the phase-screen ↶ Undo + `commitPhase` (every phase advance undoable).
- [x] 7.3 Give the Chronobot's phase screens a way into History.
- [x] 7.4 Browser-verify all three on the Chronobot — the unit suite cannot see them.

**Deviations / decisions:**

- **The rolls moved onto the `Snapshot`,** which now carries `warpRoll` and `paradoxRoll`.
  They had been component state inside the phase bodies, where no snapshot could see them —
  so an Undo remounted the body and re-rolled. `WarpPhaseBody` is now *controlled* for the
  Chronobot as it already was for the Chronossus, and a Paradox entry re-seeds its own roll
  from the entry's `die`, exactly as `undoTurn` does on the other side.
- **They are persisted too** (`PersistedGame.warpRoll` / `.paradoxRoll`). The Chronossus got
  this for free from its `ui` slice; the Chronobot's rolls were invisible to the save, so a
  reload mid-Warp re-rolled as well. No version bump needed — both fields are optional and
  absent means "no roll in progress", which is what an older save means.
- **`commitPhase` added**, and `advancePhase` / `startNextEraNow` / `endGameNow` all route
  through it, so every phase move is an undoable entry labelled "Era N · → Phase".
  `HistoryPane.isSupersededPhaseEntry` already collapses the bare arrow row when the phase's
  own result follows, so this adds no noise to History.
- **`PhaseHistoryDock`** (a wrapper in `HistoryPane.tsx`) gives the pane somewhere to sit on
  a phase screen — it is otherwise a flex child of the Action Rounds board stage. Added to
  **both** bots along with a 🕑 button in the phase header, which closes the standing
  `TODO.md` item for the Chronossus as well as the Chronobot.
- Verified with a new **`pw-chronobot-parity.mjs`**: the History button opens the docked
  pane on a phase screen; the phase-screen Undo is live and moves the phase back
  (warp → powerup); the Warp roll survives Undo unchanged; and the Paradox roll is re-seeded
  from the undone entry (reached by patching the save to an Era 2 Paradox). No page errors.

## Feature 8 — Die art on the Paradox / Research rolls

- [x] 8.1 Paradox roll shows `paradox-die-{0,1,2}.png` (both bots, Paradox + Warp phases).
- [x] 8.2 Research shows the shape die **and** keeps the Breakthrough art beside it.
- [x] 8.3 Assimilate (C04) shows the die **alone**, no shape art.
- [x] 8.4 Leave the AI die CSS-drawn.
- [x] 8.5 Browser-check each at a narrow width.

**Deviations / decisions:**

- **The Paradox die half was already done** — `ParadoxDieFace` (in `BoardExplorer.tsx`)
  renders `paradox-die-{0,1,2}.png` on both the Paradox and Warp phases for both bots. The
  `TODO.md` item was stale on that point; only the shape die was still text.
- Added `ShapeDieFace` beside it, and applied the two different display rules:
  **Research** shows the die face AND keeps the Breakthrough art next to it; **Assimilate**
  (Fractures C04, both its steps) shows the die **alone**, since that roll resolves to an
  Operator / Technology / fewer-of and never to a Breakthrough.
- Verified in a browser with a new **`pw-shapedie.mjs`** (`ASSIM=1` for the Fractures case):
  Research renders 1 die + the Breakthrough art, Assimilate renders 1 die + 0 Breakthrough
  art. Both on real rolled turns, no page errors.
- The AI die stays CSS-drawn, per the 2026-08-15 decision.

## Feature 9 — Publishing finishers

- [x] 9.1 Regenerate the the deploy key keypair.
- [x] 9.2 Install the new public half on the host and update the repo secret; remove the
      old key.
- [x] 9.3 Prove it with a real `staging` deploy, and confirm the old key is refused.
- [~] 9.4 Add the link back to `boardgameedge.com` from the Landing screen (+ the support
      message, if the donation platform is decided by then).
- [~] 9.5 Confirm the Anachrony card renders on the live BGE landing page; strike the stale
      `TODO.md` line.
- [x] 9.6 Update `docs/DEPLOYMENT.md` for the rotated key.

**Deviations / decisions:**

- **Key rotated 2026-08-21.** New pair added to the host **before** the old one was removed,
  proven by an SSH login and then by a real staging deploy, and only then was the old key
  dropped; a second deploy proved CI still worked without it. The local private key was
  deleted — the only copy is the GitHub secret. Full procedure lives with the infrastructure
  docs rather than here.
- The rotation runbook lives with the infrastructure docs, as an add-before-remove recipe.
- **9.5 — the listing was already done, but the prod apex is not serving it.** Anachrony is
  an `AppCard` in `bge_landing/config.py` and the landing service renders it live at
  `staging.boardgameedge.com`. `boardgameedge.com` itself is still a **GoDaddy "Launching
  Soon" placeholder** (checked 2026-08-21). So the card is confirmed on the live landing
  service; the apex cutover is a `boardgameedge` repo concern, not this one.
- **9.4 — the link-back ships env-aware and OFF in prod, deliberately.** `BGE_LANDING_URL`
  in `Landing.tsx` mirrors `bgeAuth.ts`'s hostname sniff: staging (and localhost) point at
  `staging.boardgameedge.com` and render "Part of BoardGameEdge"; prod returns null and the
  line does not render, because linking players from a finished app to a "Launching Soon"
  page is worse than not linking. One line to flip when the apex cuts over — the comment
  says so at the call site.
- **The support / donation message is NOT shipped.** The platform (Ko-fi / Patreon / …) is
  still undecided, and the plan called for shipping the link-back without it rather than
  blocking. Still open in `TODO.md`.

## Feature 10 — Docs, archive and close-out

- [x] 10.1 `docs/BUILD-LOG.md` entry.
- [x] 10.2 `docs/PLAN.md` status header + roadmap — Phase 4 closed, landing at 100%.
- [x] 10.3 `TODO.md` — tick what this closed; leave the out-of-scope items.
- [x] 10.4 `CLAUDE.md` — the Quantum Loops conventions, if they earn a line.
- [ ] 10.5 `/plan cleanup` to `docs/complete/`.

**Deviations / decisions:**

- `CLAUDE.md` gained three entries: a module can add **no state at all**; a phase's outcomes
  (not just its questions) belong on the phase's own screen, with `beforeCommit` for the ones
  the app resolves alone and "report a miss too"; and a phase roll belongs on the snapshot,
  never in the phase body.
- Regression sweep before committing: `pw-doomsday.mjs` (default + `CLEANUP=1`),
  `pw-check.mjs`, `pw-warp.mjs`, plus the three new harnesses. All pass, no page errors.

---

## Production Notes

**What shipped.** Quantum Loops as an add-on module (Warp-Phase AI-die check), the landing
card at 100%, Chronobot Undo/phase-screen parity, the shape-die art on Research and
Assimilate, History on both bots' phase screens, and the CI deploy-key rotation.
493 tests; build and lint clean.

**Invariants a future session should not undo:**

- **Quantum Loops has no state slice, on purpose.** The card row is the player's; the app
  rolls, instructs and logs. See `CLAUDE.md`, "A module can add no state at all".
- **The check reports a miss.** A silent non-event is indistinguishable from a check that
  never ran. `quantumLoopRemoval` returns `rolled: true` on a miss precisely so the view can
  say so.
- **`tilesPlaced === 0` means no roll at all**, not a missed removal — the rule is
  conditioned on the Chronossus placing at least one Warp tile.
- **The Warp screen is one screen.** `beforeCommit` (app-resolved outcomes) sits above
  `followUp` (the player's answer, which replaces Continue). Re-chaining Alternate Timelines
  behind the button would be a regression, not a simplification.
- **Phase rolls live on the snapshot and in the save**, for both bots. Moving one back into a
  phase body re-introduces playtest bug #10.
- **`BGE_LANDING_URL` returns null in prod deliberately** — `boardgameedge.com` is still a
  GoDaddy "Launching Soon" placeholder. Flip that one line when the apex serves the landing
  service (which already lists Anachrony and is live at `staging.boardgameedge.com`).

**Verification harnesses added** (all pass, no page errors):

| Script | Covers |
|---|---|
| `pw-quantum.mjs` | the removal, the miss (`ROLL=3`), the one-screen rule (`ALT=1`), roll persistence (`UNDO=1`), the setup block (`SETUP=1`) |
| `pw-shapedie.mjs` | Research keeps the Breakthrough art beside the die; `ASSIM=1` proves Assimilate shows the die alone |
| `pw-chronobot-parity.mjs` | phase-screen History + Undo, the Warp roll surviving Undo, the Paradox roll re-seeded from its entry |

Two harness lessons worth keeping: the persisted History fields are `undoStack[].effects`
(not `history[].changes`), and a **single Undo after a Warp measures the wrong thing** —
committing the Warp runs into Action Rounds and the bot's first turn commits on top, so undo
until the phase is back.

**Left open** (carried in `TODO.md`):

- The **"support me" / donation** line — platform still undecided, so nothing shipped.
- The **prod apex cutover** for the BGE landing, and with it the link-back appearing in prod.
- Access-gating / SSO, making the repo public, the score-tally export, `AdminStats`'
  Chronossus-specific stats, the module-section rules text for C07–C13, and the on-device
  verification passes.
- **No manual play-through of Quantum Loops** has been done — it is verified by harness and
  unit test only. It needs the **Future Imperfect** expansion on the table.
