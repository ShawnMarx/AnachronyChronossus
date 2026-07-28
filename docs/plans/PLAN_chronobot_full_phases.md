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
