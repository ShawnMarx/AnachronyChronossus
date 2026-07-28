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

## Feature 5 — Phase 1 Preparation
- [ ] 5.1 Preparation screen (overview + "No changes for Chronobot") → Phase 2/3.

## Feature 6 — Phase 2 Paradox
- [ ] 6.1 Era-1 skip with note.
- [ ] 6.2 Warp-count gate prompt (bot ties/leads your Warp tiles).
- [ ] 6.3 Roll loop: paradox die + symbols, accumulate tracker, until Anomaly (reset,
      −3 VP, remove Warp; capped at 3 Anomalies), then Confirm → Phase 3.
- [ ] 6.4 Verbatim rules box.

## Feature 7 — Phase 3 Power Up
- [ ] 7.1 Power Up screen: N Exosuits (6/4), pile note, `resolvePowerUp`, verbatim box.

## Feature 8 — Phase 4 Warp
- [ ] 8.1 Turn-order note; player places 0–2; "Roll for Bot's Warp" → place N;
      `resolveWarp`; verbatim box.
- [ ] 8.2 **Checkpoint:** walk Era 1 Prep→Warp end to end.

## Feature 9 — Phase 5 Action Rounds integration
- [ ] 9.1 Begin-phase splash: "Your Turn First" / "Take Bot Action to begin."
- [ ] 9.2 Verbatim AI-die rules box inside the Actions popout.
- [ ] 9.3 On Action Rounds end, ask "Did you take the First Player spot?" → set
      `firstPlayer`; advance to Phase 6.
- [ ] 9.4 **Checkpoint:** play an Era's action rounds within the flow.

## Feature 10 — Phase 6 Clean Up + End-Game
- [ ] 10.1 Clean Up screen: verbatim box, retrieve, mark Impact, `resolveCleanUp`.
- [ ] 10.2 Continue → next Era Phase 1, unless End-Game → scoring screen with verbatim
      End-Game stats box + win/lose.
- [ ] 10.3 **Checkpoint:** full multi-Era game to final score.

---

### Deviations & decisions
- (record here as execution proceeds)
