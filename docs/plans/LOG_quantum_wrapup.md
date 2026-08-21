# LOG — Quantum Loops + project wrap-up

Execution tracker for `PLAN_quantum_wrapup.md`. Mark `[x]` when done, `[~]` when partial.
Note deviations and decisions inline under each step.

---

## Feature 1 — Quantum Loops: knowledge capture and registration

- [ ] 1.1 Create `src/engine/bots/quantumLoops.ts` with `EXTRA_MODULE_QUANTUM_LOOPS`, the two
      difficulty flags and the verbatim p.18 strings (requirement, setup, Warp, Action Rounds,
      difficulty).
- [ ] 1.2 Flip `{ id: 'quantum-loops', available: true }` in `ChronossusSetupFlow.tsx` and use
      the shared constant instead of the bare string.
- [ ] 1.3 Confirm `EXTRA_MODULE_LABELS` already covers it, so the turn overview and End Game
      list it with no further change.
- [ ] 1.4 Unit-test the transcription (the shape `doomsday.test.ts` uses).

**Deviations / decisions:**

## Feature 2 — Engine: the Warp-phase AI-die check

- [ ] 2.1 `quantumLoopRemoval({ tilesPlaced, roll, difficulty })` → `{ removes, vp }`.
- [ ] 2.2 Removal on 4; on 5 only with `DIFFICULTY_QL_REMOVE_ON_5`.
- [ ] 2.3 2 VP only with `DIFFICULTY_QL_2VP` **and** an actual removal.
- [ ] 2.4 `tilesPlaced === 0` → no roll, no removal.
- [ ] 2.5 Thread the rolled face into `resolveWarp` as a trailing optional argument; apply the
      VP and emit the instruction (bold the card position).
- [ ] 2.6 Confirm Fractures' Era Zero Warp runs the check too.

**Deviations / decisions:**

## Feature 3 — Warp screen: one screen, both modules

- [ ] 3.1 Render the Quantum Loops die + outcome on the Warp screen alongside the Alternate
      Timelines question — no chained prompt.
- [ ] 3.2 Roll the face when the placement count is known; store it in the `ui` slice so Undo
      re-shows the same face.
- [ ] 3.3 One commit, one History entry covering placement + Alternate Timelines + Quantum
      Loops.
- [ ] 3.4 Verbatim 📖 boxes at the foot of the screen, module boxes under the phase's own.

**Deviations / decisions:**

## Feature 4 — Setup, difficulty and the Cosmic Data Leak note

- [ ] 4.1 "Requires the Future Imperfect expansion" on the module checkbox.
- [ ] 4.2 App-voice setup list — only the Chronossus-specific parts; defer the base module's
      setup to "as for a 2-player game".
- [ ] 4.3 Verbatim p.18 "CHANGES AT SETUP" box beside it.
- [ ] 4.4 Cosmic Data Leak reminder — 2 unused Solo Objectives into play if the player gains it.
- [ ] 4.5 Register both difficulty options in `EXTRA_MODULE_DIFFICULTY`; check the picker's
      layout with two of them (a first for an extra module).

**Deviations / decisions:**

## Feature 5 — Tests and browser verification

- [ ] 5.1 Unit tests on `quantumLoopRemoval` — every roll/option combination and the 0-tile case.
- [ ] 5.2 `resolveWarp` tests — VP, instruction, Era Zero, and a no-module game unchanged.
- [ ] 5.3 `pw-quantum.mjs`: the die renders, the outcome reads correctly, History carries the
      line, Undo re-shows the same face.
- [ ] 5.4 A second run with Alternate Timelines also on — one screen, one History entry.
- [ ] 5.5 `npm run build`, `npm run lint`, `npm test` clean.

**Deviations / decisions:**

## Feature 6 — Landing card: 90% → 100%

- [ ] 6.1 `src/Landing.tsx` — `progress={90}` → `100`.
- [ ] 6.2 Sweep the surrounding copy and the module picker for "still to come" wording now that
      nothing is unavailable.

**Deviations / decisions:**

## Feature 7 — Chronobot parity

- [ ] 7.1 Fold the Paradox / Warp rolls into the Chronobot's restored snapshot so Undo
      re-shows the same roll.
- [ ] 7.2 Add the phase-screen ↶ Undo + `commitPhase` (every phase advance undoable).
- [ ] 7.3 Give the Chronobot's phase screens a way into History.
- [ ] 7.4 Browser-verify all three on the Chronobot — the unit suite cannot see them.

**Deviations / decisions:**

## Feature 8 — Die art on the Paradox / Research rolls

- [ ] 8.1 Paradox roll shows `paradox-die-{0,1,2}.png` (both bots, Paradox + Warp phases).
- [ ] 8.2 Research shows the shape die **and** keeps the Breakthrough art beside it.
- [ ] 8.3 Assimilate (C04) shows the die **alone**, no shape art.
- [ ] 8.4 Leave the AI die CSS-drawn.
- [ ] 8.5 Browser-check each at a narrow width.

**Deviations / decisions:**

## Feature 9 — Publishing finishers

- [ ] 9.1 Regenerate the `the deploy key` keypair.
- [ ] 9.2 Update the Droplet's `deploy` `authorized_keys` and the repo secret `DEPLOY_SSH_KEY`;
      remove the old key.
- [ ] 9.3 Prove it with a real `staging` deploy, and confirm the old key is refused.
- [ ] 9.4 Add the link back to `boardgameedge.com` from the Landing screen (+ the support
      message, if the donation platform is decided by then).
- [ ] 9.5 Confirm the Anachrony card renders on the live BGE landing page; strike the stale
      `TODO.md` line.
- [ ] 9.6 Update `docs/DEPLOYMENT.md` for the rotated key.

**Deviations / decisions:**

## Feature 10 — Docs, archive and close-out

- [ ] 10.1 `docs/BUILD-LOG.md` entry.
- [ ] 10.2 `docs/PLAN.md` status header + roadmap — Phase 4 closed, landing at 100%.
- [ ] 10.3 `TODO.md` — tick what this closed; leave the out-of-scope items.
- [ ] 10.4 `CLAUDE.md` — the Quantum Loops conventions, if they earn a line.
- [ ] 10.5 `/plan cleanup` to `docs/complete/`.

**Deviations / decisions:**
