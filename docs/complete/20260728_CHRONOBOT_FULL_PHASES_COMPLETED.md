# COMPLETED — Chronobot full phase set

**Archived:** 2026-07-28 · **Status:** shipped to production (auto-deployed to
https://anachrony.boardgameedge.com). Build + tests + lint green.

Turned the Chronobot experience from a Phase-5-only board harness into the full
guided Era loop: Landing → Start/Difficulty/Setup → Era N (Phase 1 Preparation →
2 Paradox → 3 Power Up → 4 Warp → 5 Action Rounds → 6 Clean Up) → next Era or End
Game. Every non-Action phase uses the `PhaseScreen` splash shell with verbatim
rulebook boxes and a read-only Chronobot-Status tab.

---

# Original plan

# PLAN — Chronobot full phase set

## Overview & goal

Turn the Chronobot experience from the current "Phase-5 board only" debug harness
into a **guided, phase-by-phase Era loop** covering the whole rulebook flow:

Start / Difficulty → Setup → **Era N**: Phase 1 Preparation → Phase 2 Paradox →
Phase 3 Power Up → Phase 4 Warp → Phase 5 Action Rounds → Phase 6 Clean Up →
(next Era, or End-Game scoring).

Every phase **except Phase 5** shows a **splash banner** (the Chronobot hero image)
with the rulebook **overview** text, a collapsible **verbatim rules** box, and that
phase's controls — plus a **"Chronobot Status"** tab that swaps in the full Phase-5
board (read-only outside the Action Rounds). Phase 5 *is* the board we already built.

The app tracks **all** bot VP (including Anomalies at −3 and building VP as tiles are
discarded, not placed). Rule text shown to the player is verbatim from the
"Chronobot & Chronossus Solo Opponents" rulebook where the spec quotes it.

### Decisions locked in (from planning Q&A)

- **Power Up count is Era-based** (Eras 1–4 → 6 Exosuits, Eras 5–7 → 4). Keep
  `chronobotPoweredExosuits(era)`; **reconcile the failing "pre/post-Impact" test**
  to assert the Era-based behavior. (Impact ≈ after Era 4, so Era is a correct proxy.)
- **"Play without your Leader power"** is an **informational** difficulty reminder
  only (the app never runs the human's turn) — shown on Setup/Status, no engine effect.
- **Persist the whole flow**: extend the localStorage save (bump schema) with phase,
  era, first-player, impact, difficulty, and the paradox tracker. Refresh resumes
  mid-phase.
- **Status tab is read-only** outside Phase 5: the board renders live trackers but
  hotspots aren't tappable during phases 1–4/6.

---

## Current state (what already exists)

- **Engine is mostly there.** `src/engine/bots/chronobot.ts` has pure resolvers:
  `setup`, `resolveParadox`, `resolvePowerUp`, `resolveWarp`, `takeActionTurn`,
  `resolveBotPass`, `resolveCleanUp`, `startNextEra`, `scoreChronobot`, plus token /
  path logic and decision helpers. `state.ts` has a `Phase` machine
  (`PHASE_ORDER`, `PHASE_NUMBER`) starting at `paradox`.
- **The UI never walks the phases.** `BoardExplorer.tsx` (~2500 lines) mounts the
  board in a permanent Phase-5-ish mode with a **debug** Era +/- and Paradox +/-.
  The paradox *tracker* (0–3) lives only in the UI (`paradoxes` state), not the engine.
- **Gaps found:** no `preparation` phase; `firstPlayer` isn't modeled; only one
  difficulty flag (`DIFFICULTY_MIN_ACTIONS_6`); `rollParadoxDie` faces are
  `[0,0,1,1,2,3]` (spec wants **1 blank / 4 single / 1 double = `[0,1,1,1,1,2]`**);
  `resolveParadox` takes a pre-computed `gainedAnomaly: boolean` instead of
  accumulating a tracker; `scoreChronobot` does **not** subtract Anomalies (−3 each).

---

## Feature list (implementation order)

### Feature 1 — Engine & state foundations
The pure, tested substrate everything else builds on. No UI.

- **Add `preparation` phase.** Extend `Phase`, `PHASE_ORDER` (prepend `preparation`),
  and `PHASE_NUMBER` (`preparation: 1`). Paradox stays `2` … Clean Up `6`.
- **Paradox tracker in engine state.** Add `paradoxes: number` (0–2 carry; hitting
  3 → reset to 0 + gain Anomaly) to `ChronobotState`. Remove the UI-only tracker in
  Feature 2.
- **First player.** Add `firstPlayer: 'bot' | 'player'` to `GameState`; Era 1 = `'bot'`.
- **Difficulty constants** (`chronobot.ts`): keep `DIFFICULTY_MIN_ACTIONS_6`; add
  `DIFFICULTY_REBOOT_ADVANCE = 'reboot-advance'`,
  `DIFFICULTY_NO_LEADER = 'no-leader'` (informational),
  `DIFFICULTY_BOT_EXTRA_TURN = 'bot-extra-turn'`.
- **Paradox die faces** → `[0,1,1,1,1,2]` in `rollParadoxDie` (used by Paradox *and*
  Warp). Update the doc comment.
- **Rework `resolveParadox`** to accept a rolled paradox count (0/1/2) and accumulate:
  add to `bot.paradoxes`; on `>= 3` reset to `0`, `anomalies += 1` (capped at 3),
  remove one Warp tile from the Timeline, and signal "stop rolling." Return enough for
  the UI to know whether to keep offering a roll. Keep the verbatim detail text.
- **Anomaly scoring.** `scoreChronobot` subtracts `anomalies * 3`; expose an
  `anomalyVP` line item. Reflect −3/anomaly in the VP breakdown pill/score screen.
- **Reboot-advance difficulty.** When `DIFFICULTY_REBOOT_ADVANCE` is on and the active
  token lands on `reboot`, immediately advance it again so it performs a real Action
  (in `takeActionTurn` / token-advance path). Add the rule note to the UI later.
- **Bot-extra-turn difficulty.** When `DIFFICULTY_BOT_EXTRA_TURN` is on, the bot takes
  **one additional turn after you pass** before it may pass (extend `botPassDecision` /
  pass logic).
- **Reconcile the Power Up test** to the Era-based decision (6 in Eras 1–4, 4 in 5–7);
  keep `chronobotPoweredExosuits(era)`.
- **Tests:** paradox accumulation + anomaly reset + cap; anomaly scoring; reboot-advance;
  bot-extra-turn; paradox-die distribution; preparation phase ordering.

**Files:** `src/engine/state.ts`, `src/engine/bots/chronobot.ts`, `src/engine/index.ts`,
`src/engine/bots/chronobot.test.ts`.

### Feature 2 — Phase-flow controller + full persistence
A single source of truth that advances phases/Eras by calling the engine resolvers.

- **Flow model.** Introduce a phase-flow layer (either a `usePhaseFlow` hook or a
  reducer in a new `src/game/` module) holding `config`(difficulty), `era`, `phase`,
  `firstPlayer`, `impact`, and delegating to `Chronobot.*` resolvers. Transitions:
  Prep→(Era 1: skip Paradox)→Power Up→Warp→Actions→Clean Up→next Era Prep, or
  →End-Game when `endgameTriggered` and the Era ends.
- **Persistence v6.** Extend the saved shape (bump `PERSIST_VERSION` to 6) to include
  `phase`, `era`, `firstPlayer`, `impact`, `config.difficulty`, and the engine paradox
  tracker; drop the UI-only `paradoxes`. Update `peekSavedChronobot`/resume so the
  Landing "Continue" resumes the exact phase.
- **Reset / New game** starts at the **Start/Difficulty** screen (Feature 4).

**Files:** `src/BoardExplorer.tsx` (persistence + wiring), new flow module, `Landing.tsx`.

### Feature 3 — App shell: splash banner + Chronobot Status tab
The reusable frame for every non-Action phase.

- **`PhaseScreen` shell:** header **"Era N · Phase M — <Name>"**, the Chronobot hero
  **splash banner**, the rulebook **overview** paragraph, phase-specific body/controls,
  and a **tab switch**: *This Phase* ⇄ *Chronobot Status* (the full board, read-only).
  Phase 5 renders the board directly (no splash), reachable through the normal flow.
- **`RulesBox`** collapsible: shows **verbatim** rulebook text with the standard
  preamble — "This is the rule as written in the rulebook; below are the changes for
  this app" — used wherever the spec supplies a verbatim block. A shared component so
  every phase uses the same affordance (spec calls these out repeatedly).
- **Read-only board mode:** a prop that disables hotspots/turn controls when the
  Status tab is shown outside Phase 5.
- **Home icon** already returns to Landing (built); keep it visible in the shell.

**Files:** new `src/phases/PhaseScreen.tsx` + `RulesBox.tsx` (+ CSS), `BoardExplorer.tsx`.

### Feature 4 — Start screen, Difficulty selection & Setup
- **Start / flavor:** the Chronobot origin flavor paragraph (verbatim from spec) on a
  splash, leading into difficulty.
- **Difficulty selection:** the four "Increasing the Difficulty" options as toggles,
  with the verbatim intro text. Selections map to the Feature-1 difficulty flags
  (Leader-power = informational). Persist into `config.difficulty`.
- **Setup Instructions screen:** a `RulesBox` with the **verbatim** setup rules, then
  the **app-modified** setup rules (no Chronobot board needed, etc.), then the
  "Basic adjustments" note: the app tracks all bot VP; per-action rules are shown when
  taken; **building VP is counted as tiles are discarded, not placed**.
- **Flow:** Landing **Play ▶** → Start/flavor → Difficulty → Setup → **Era 1 Phase 1**.

**Files:** new `src/phases/StartScreen.tsx`, `DifficultyScreen.tsx`, `SetupScreen.tsx`,
`Landing.tsx`, flow module.

### Feature 5 — Phase 1 Preparation
- Overview text (verbatim); body: **"No changes for Chronobot."** Continue advances to
  Phase 2 (or Phase 3 in Era 1, since Paradox is skipped). Uses `PhaseScreen`.

### Feature 6 — Phase 2 Paradox
- **Skipped in Era 1** (auto-advance with a short note).
- Gate: **only roll when the Chronobot has ≥ your Warp tiles** — prompt the player
  ("Does the Chronobot have at least as many Warp tiles as you? oldest-tie counts").
- **"Roll for Bot's Paradox?"** button → `rollParadoxDie` (show the die's paradox
  symbols), accumulate on the tracker; **keep rolling until the bot gains an Anomaly**
  (then it resets to 0, gains the Anomaly = −3 VP line item, removes a Warp tile, and
  stops); if already at 3 Anomalies, no gain/removal. Then **Confirm → Phase 3**.
- Verbatim rules box (the "rolls for Paradoxes last…" block).

### Feature 7 — Phase 3 Power Up
- Body: **"Power up N Exosuits"** (Era-based 6/4), pile markers on the upper-right hex;
  no Energy/Water. `resolvePowerUp`. Verbatim box ("In pre-Impact Eras…").

### Feature 8 — Phase 4 Warp
- Turn-order note driven by `firstPlayer`. Prompt the player to place their **0–2**
  Warp tiles, then **"Roll for Bot's Warp"** → `rollParadoxDie` (0/1/2) → place that
  many bot Warp tiles (any tile; bot gains nothing). `resolveWarp`. Verbatim box.

### Feature 9 — Phase 5 Action Rounds (existing board) integration
- **Begin-phase splash:** "Ready to begin?" → **"Your Turn First"** if the player is
  First Player, else **"Take Bot Action to begin the phase."**
- Add the **verbatim AI-die rules box** inside the **Actions popout** ("On the
  Chronobot's turn, roll the AI die…").
- Existing turn/pass/board logic stays; on Action Rounds end → **ask "Did you take the
  First Player spot?"** → set `firstPlayer` for next Era → Phase 6.

### Feature 10 — Phase 6 Clean Up + End-Game
- Verbatim box ("Retrieve the Chronobot's Exosuits…"). Retrieve Exosuits; **check
  Impact** (player marks `impact` if it happened) and game end. `resolveCleanUp`.
- Continue → **next Era Phase 1**, unless End-Game was triggered → **scoring screen**
  with the verbatim End-Game stats box ("does not lose VPs for Warp tiles… 1 VP per
  Breakthrough, +2 per complete set… more points than the Chronobot → you win").

---

## Recommended order & rationale

1. **F1 Engine** — pure/tested foundation; nothing renders correctly without the
   paradox tracker, first-player, difficulty flags, die faces, and anomaly scoring.
2. **F2 Flow + persistence** — the spine that sequences phases and survives refresh;
   needed before any phase screen is meaningfully testable.
3. **F3 Shell** — the reusable `PhaseScreen` + `RulesBox` + read-only board, so every
   phase screen is a thin body.
4. **F4 Start/Difficulty/Setup** — entry into the loop; unblocks end-to-end testing and
   is the user's requested first checkpoint ("apply and test through these before the
   following").
5. **F5–F8** Prep → Paradox → Power Up → Warp — the pre-Action phases, in order.
6. **F9** Action Rounds integration — wrap the existing board in the flow.
7. **F10** Clean Up + End-Game — closes the Era loop and the game.

Natural test checkpoints: after **F4** (start → setup reachable, difficulty persists),
after **F8** (walk Era 1 Prep→Warp), after **F9** (play an Era's actions), after **F10**
(full multi-Era game to scoring).

## Open questions / deferred

- **Impact flag UX:** with Era-based Power Up, `impact` is only needed for Clean Up's
  Collapsing-Capital text and end-game timing — confirm the minimal "mark Impact"
  control at Clean Up is enough (assumed yes).
- **Paradox gate input:** the app can't see the player's Warp count, so Phase 2 asks
  the player whether the bot ties/leads. Acceptable (assumed yes).
- **Debug controls:** keep the existing Era/Paradox debug +/- available behind the ⚙
  menu for testing, or retire them once the flow drives everything? (Lean: keep under
  debug.)
- **Chronossus** remains out of scope (Coming Soon).


---

# Execution log

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
- **Game-end moved to Clean Up (post-review tweak).** Removed the Phase-5 top-bar
  "Trigger End Game" / "Finish & Score" buttons (and `EndgameConfirm` + the score
  modal). Game end is now decided in Clean Up: Eras 5–6 show "Flip using the usual
  procedure the Collapsing Capital tiles, then check for game end" with
  "Game continues — start Era N+1" vs "The game ended — Finish & Score"; Era 7 always
  ends; Eras 1–4 just start the next Era. `CleanUpPhaseBody` added; `endGameNow` sets
  `phase:'endgame'`.
- **Paradox flow reworked (post-review tweak).** No separate roll button — answering
  "Yes — it ties or leads" rolls immediately. Asks per past Timeline tile, up to
  Era − 1 times, stopping early on an Anomaly or when the bot has 0 Warp tiles.
- **Actions intro (bot first).** When the Chronobot is First Player, the intro's button
  is a real "Take Bot Action" that fires the bot turn (not just a dismiss).

---

## Production notes (maintenance)

- **App entry / rendering.** `main.tsx` → `AppRoot` → `Landing` | `BoardExplorer`.
  `BoardExplorer` renders the entire Era loop by switching on `state.phase`
  (`setup` → `SetupFlow`; non-Action phases → `PhaseScreen` + a per-phase body;
  `actions` → the board; `endgame` → `ScoreScreen`).
- **Engine is pure + tested.** Phase resolvers live in `src/engine/bots/chronobot.ts`
  (`rollParadox`/`endParadoxPhase`, `resolvePowerUp`, `resolveWarp`, `takeActionTurn`,
  `resolveBotPass`, `resolveCleanUp`, `startNextEra`, `scoreChronobot`). Phase
  *sequencing* (Era-1 Paradox skip, End-Game exit) is `src/game/flow.ts`.
- **Verbatim rulebook text** lives in `src/phases/phaseMeta.ts` (overviews + per-phase
  rules + `ENDGAME_RULES`) and `src/engine/rules/chronobotActions.ts` (`rule` fields).
  Keep these exact to the "Chronobot & Chronossus Solo Opponents" rulebook.
- **Persistence.** `localStorage` key `anachrony:chronobot`, schema **v6**. The whole
  flow lives in `GameState` (phase/era/firstPlayer/impact/config.difficulty +
  `chronobot.paradoxes`). Bump `PERSIST_VERSION` whenever the `GameState` shape changes.
- **Difficulty flags** (`config.difficulty`): `min-actions-6`, `reboot-advance`,
  `bot-extra-turn` (all engine-honored) and `no-leader` (informational only).
- **Button theming**: `--act` (pale yellow-green, bot actions) / `--pass` (pink) in
  `src/index.css`.
- **Post-plan tweaks folded in**: game-end decided in Clean Up (not the top bar);
  Paradox rolls per past Timeline tile up to Era−1×; Impact reminder at Era-4 Clean Up;
  legacy `App.tsx`/`useGame.ts` + `resolveParadox` shim removed.

## Deferred (see TODO.md)
- `impact` GameState flag is reminder-only (Era-4 Clean Up note); no logic reads it.
- Narrow top bar ≤390px: the ⚙ menu wraps to row 2 (acceptable; could tighten).
- **Chronossus** automa — next roadmap item, its own plan.
