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
  Regenerate `the deploy key`, update the Droplet's `authorized_keys` for `deploy`
  and the repo secret `DEPLOY_SSH_KEY`, then prove it by watching a `staging` deploy succeed
  and confirming the old key is refused.
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
