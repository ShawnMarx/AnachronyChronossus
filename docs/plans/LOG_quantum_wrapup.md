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

- [x] 9.1 Regenerate the `the deploy key` keypair.
- [x] 9.2 Update the Droplet's `deploy` `authorized_keys` and the repo secret `DEPLOY_SSH_KEY`;
      remove the old key.
- [x] 9.3 Prove it with a real `staging` deploy, and confirm the old key is refused.
- [~] 9.4 Add the link back to `boardgameedge.com` from the Landing screen (+ the support
      message, if the donation platform is decided by then).
- [~] 9.5 Confirm the Anachrony card renders on the live BGE landing page; strike the stale
      `TODO.md` line.
- [x] 9.6 Update `docs/DEPLOYMENT.md` for the rotated key.

**Deviations / decisions:**

- **Key rotated 2026-08-21.** New pair `the deploy key`, added to the
  Droplet's `authorized_keys` **before** the old one was removed, proven by an SSH login and
  then by a real staging deploy (run 32484632286, success). Only then was the old
  `the deploy key` line dropped, and a second deploy (run 32484794877, success)
  proved CI still works without it. The local private key was deleted; the only copy is the
  GitHub secret. Pre-rotation backup left at `the host's key-list backup`.
  `authorized_keys` is shared with the other BGE repos, so the removal matched the key's
  comment exactly rather than rewriting the file.
- The rotation runbook is now in `docs/DEPLOYMENT.md` as a 9-step add-before-remove recipe.
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
