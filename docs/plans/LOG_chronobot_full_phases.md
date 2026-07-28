# LOG — Chronobot full phase set

Execution tracker for `PLAN_chronobot_full_phases.md`. Mark each step `[x]` when done;
note deviations/decisions inline. `npm run build` + `npm test` must stay green.

---

## Feature 1 — Engine & state foundations ✅ COMPLETE
- [x] 1.1 Add `preparation` to `Phase`, prepend to `PHASE_ORDER`, add `preparation: 1`
      to `PHASE_NUMBER` (state.ts).
- [x] 1.2 Add `paradoxes: number` to `ChronobotState` (+ `emptyChronobotState`); add
      `firstPlayer: 'bot' | 'player'` to `GameState` (Era 1 = `'bot'`).
- [x] 1.3 Add difficulty constants `DIFFICULTY_REBOOT_ADVANCE`, `DIFFICULTY_NO_LEADER`,
      `DIFFICULTY_BOT_EXTRA_TURN` (keep `DIFFICULTY_MIN_ACTIONS_6`).
- [x] 1.4 Set `rollParadoxDie` faces to `[0,1,1,1,1,2]`; update comment.
- [x] 1.5 New `rollParadox(state, rolled)` accumulates on the tracker, resets+Anomaly
      at ≥3 (cap 3, carries overflow), removes a Warp tile, signals `stop`. Added
      `endParadoxPhase`. Kept a compat `resolveParadox(state, boolean)` for the legacy
      runner + existing tests.
- [x] 1.6 `scoreChronobot` subtracts `anomalies * 3` (`ANOMALY_VP`), adds `anomalyVP`;
      score screen shows the Anomalies line when > 0.
- [x] 1.7 Reboot-advance via optional `advanceActiveToken(state, token, rebootAdvances)`.
- [x] 1.8 Bot-extra-turn: `extraTurnAfterPassUsed` flag on GameState, `continue-extra`
      decision in `botPassDecision`, spent in `resolveBotPass`; reset in `startNextEra`.
- [x] 1.9 Power Up test already Era-based (6 in 1–4, 4 in 5–7) — passing.
- [x] 1.10 Tests added: paradox accumulate/reset/cap/overflow/capped, anomaly scoring,
      reboot-advance, bot-extra-turn (on/off), die distribution. Updated the playthrough
      test (next Era → `preparation`). **49 tests green; build + lint clean.**

### Deviations
- `startNextEra` now advances to `preparation` (Phase 1), not `paradox`. Paradox tracker
  persists across Eras (only resets on Anomaly), so it is NOT reset in `startNextEra`.
- Kept legacy boolean `resolveParadox` as a thin compat shim rather than porting the old
  `App.tsx`/`useGame.ts` guided runner (out of scope; not the current view).

## Feature 2 — Phase-flow controller + full persistence ✅ COMPLETE
- [x] 2.1 `src/game/flow.ts` (pure): `ERA_PHASE_SEQUENCE`, `startFirstEra`,
      `advanceFromPreparation` (Era-1 Paradox skip), `paradoxSkipped`, `isFinalEra`,
      `finishEra` (next Era vs End Game). 6 tests in `flow.test.ts`.
- [x] 2.2 Persistence bumped to v6; the whole flow already lives in `GameState`
      (phase/era/firstPlayer/impact/config.difficulty). Migrated the UI-only
      `paradoxes` state onto `state.chronobot.paradoxes` (single source of truth; undo
      snapshots `state` so it's covered); dropped the persisted `paradoxes` field.
- [x] 2.3 Landing Continue/New already wired; Continue resumes the persisted `state`
      (incl. `phase`). Start-screen routing for New game lands in Feature 4.
- [x] 2.4 Build + 55 tests green; persistence round-trip intact.

### Deviations
- Kept `initDebugState` entry phase at `'actions'` so the current board keeps working
  until the phase screens exist (Features 3–10). No user-visible change yet.
- Flow lives in `src/game/flow.ts` as pure functions (not a hook/reducer) — the phase
  screens will call these directly; state still lives in `BoardExplorer` for now.

## Feature 3 — App shell: splash banner + Chronobot Status tab ✅ COMPLETE
- [x] 3.1 `src/phases/PhaseScreen.tsx`: header "Era N · Phase M — Name", hero splash
      banner, overview slot, body (`children`), This-Phase ⇄ Chronobot-Status tabs
      (`statusView` node), optional `headerRight` + `onHome`.
- [x] 3.2 `src/phases/RulesBox.tsx` collapsible with verbatim tag + preamble.
- [x] 3.3 Read-only board mode: `readOnly` prop on `BoardExplorer` disables hotspots
      and the Take-Bot-Action / You-Pass controls.
- [x] 3.4 `src/phases/phases.css` (shell/banner/tabs/rules) + `phaseMeta.ts` (verbatim
      overviews + rules per phase, `ENDGAME_RULES`). Build green.

### Note
- Components are presentational/plumbing; they become visible when Feature 4 wires the
  phase render switch into the app entry (Start → Setup → Era 1).

## Feature 4 — Start, Difficulty & Setup ✅ COMPLETE (awaiting user checkpoint)
- [x] 4.1 `SetupFlow.tsx` Start/flavor splash (verbatim Chronobot origin paragraph).
- [x] 4.2 Difficulty selection: 4 toggles + intro; map to the Feature-1 flags; written
      to `config.difficulty` via `beginWithDifficulty` (persisted with state).
- [x] 4.3 Setup screen: `RulesBox` verbatim setup + app-modified list + the "app tracks
      all VP; building VP counted as discarded" note.
- [x] 4.4 Restructured `BoardExplorer` render into a per-phase switch: `setup` →
      SetupFlow; non-Action phases → `PhaseScreen` (splash + overview + `PhaseBody` +
      VP pill + Chronobot-Status tab showing the read-only board); `actions` → the board.
      New games now start at `setup` (`initNewGame`); `beginWithDifficulty` → `startFirstEra`.
- [x] 4.5 **Checkpoint (verify):** walked Landing → Start → Difficulty → Setup → Prep →
      (Era-1 Paradox skip) → Power Up → Status tab via Playwright — all render correctly.
      Build + 55 tests green.

### Notes / partials carried into later features
- `PhaseBody` is the shared skeleton (note + verbatim RulesBox + Continue). `advancePhase`
  calls the real resolvers, so Power Up/Warp/Clean Up already function; Paradox currently
  just `endParadoxPhase` (no roll UI) and Warp uses 0 — the roll UIs land in F6/F8.
- Action Rounds → Clean Up hand-off (and the first-player prompt) is Feature 9; until then
  the loop is walkable up to the Action Rounds board.

## Feature 5 — Phase 1 Preparation ✅ COMPLETE
- [x] 5.1 Preparation screen (overview + "No changes for Chronobot") → advances via
      `advanceFromPreparation` to Phase 2, or Phase 3 in Era 1 (Paradox skipped).

## Feature 6 — Phase 2 Paradox ✅ COMPLETE
- [x] 6.1 Era-1 skip handled at the flow level (`advanceFromPreparation`).
- [x] 6.2 `ParadoxPhaseBody` warp-count gate: "The Chronobot ties or leads — roll" vs
      "I have more Warp tiles — skip".
- [x] 6.3 Roll loop: 🎲 Roll → `rollParadox` accumulates the tracker (readout shown),
      until Anomaly (reset, −3 VP line, Warp removed; capped at 3), then "Continue to
      Power Up". Verified Era 2 roll → anomaly at 3.
- [x] 6.4 Verbatim rules box.

## Feature 7 — Phase 3 Power Up ✅ COMPLETE
- [x] 7.1 Power Up body: N Exosuits (6/4), "collect to place when prompted" note,
      `resolvePowerUp`, verbatim box.

## Feature 8 — Phase 4 Warp ✅ COMPLETE
- [x] 8.1 `WarpPhaseBody`: turn-order note driven by `firstPlayer`, verbatim box,
      "🎲 Roll for the Chronobot's Warp" → shows the rolled Paradox count (die badge),
      states placement (or "no Warp tiles" on 0), then Continue → `resolveWarp(n)`.
- [x] 8.2 Verified Era 1 Prep → Power Up → Warp (roll + result + continue) via Playwright.

### Note
- Feature 8 pulled ahead of Features 5–7 in response to user testing (Phase 4 needed the
  real roll UI). Rules-box preamble reworded (Setup-only, no "verbatim" tag), and the
  Power Up note now says "collect Exosuits to place when prompted" instead of the hex-pile.

## Feature 9 — Phase 5 Action Rounds integration ✅ COMPLETE
- [x] 9.1 `ActionsIntro` begin-phase splash (once per Era): "Take Bot Action to begin"
      (bot First Player) or "Your turn first" (player First Player).
- [x] 9.2 Verbatim AI-die rules box (`PHASE_META.actions.rules`) inside the Actions popout
      (DetailPanel).
- [x] 9.3 End-of-actions banner when `actionRoundsCanEnd` → `FirstPlayerPrompt` sets
      `firstPlayer` → `resolveCleanUp` advances to Phase 6.
- [x] 9.4 Verified via injected near-end state: banner → prompt → Clean Up.

## Feature 10 — Phase 6 Clean Up + End-Game ✅ COMPLETE
- [x] 10.1 Clean Up body (in `PhaseBody`): overview + verbatim box; "End the Era".
- [x] 10.2 "End the Era" → `finishEra`: next Era Phase 1, or `endgame` → `ScoreScreen`
      (now rendered for the `endgame` phase) with the verbatim `ENDGAME_RULES` box and
      the Anomalies (−3) line; win/lose vs your entered score.
- [x] 10.3 Verified endgame score screen via injected Era-7 state.

### Note
- Impact is not yet a Clean Up prompt (Power Up is Era-based per the locked decision, so
  it isn't needed for the count); the `impact` flag remains available if we later want the
  Collapsing-Capital timing. Deferred as a minor follow-up.

---

### Deviations & decisions
- (record here as execution proceeds)
