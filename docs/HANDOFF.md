# Handoff — 2026-07-26 (main actions complete)

Snapshot for continuing without this chat's context. Read `CLAUDE.md` first, then
this. Longer history is in `docs/BUILD-LOG.md`.

## Where things are

- **Default view = `src/BoardExplorer.tsx`** — board-first explorer + debug harness.
  All **eight base Chronobot actions** now resolve through the engine with guided,
  per-action dialogs (below). `App.tsx` (guided game runner) still exists but is not
  the current view.
- `npm run build`, `npm test` (21), `oxlint` all clean.
- **Working tree has this session's work UNCOMMITTED** (new assets + engine/UI edits).
  Last commit is `a0bb07c`. Commit before/after starting the next feature.

## Actions implemented this session (BoardExplorer dialogs)

Every action ends with a green **▶ Start Your Turn** that commits to the engine and
closes the panel. Full-rules 📖 collapsibles render *outside/below* the orange boxes.

- **Construct** (`construct-*`, superproject): mech gate → tap the tile's printed VP
  (highlights; re-pickable) → Start. Max 3 of a type / no Breakthrough (superproject)
  → **Failed Action** notice (still places an Exosuit, +1 VP). VP goes to `buildingVp`.
- **Mine Resource** (NOT a Capital action): Q "Is there one or more Mining Action
  space available?" → **Yes**: pick the 2 gained cubes — all 4 shown in priority order
  **Neutronium > Uranium > Gold > Titanium** (lacking-first), top-2 pre-selected,
  **click a cube twice for ×2**; instruction says place the mech in the matching Mine
  space + discard those cubes from the board. **No** → no-space Failed (+1 VP, no mech).
  **+5 VP** set bonus auto-fires when all 4 resource types are held.
- **Recruit** (Capital): mech gate → single-select **Worker** — 4 figures in priority
  **Genius > Administrator > Engineer > Scientist** (missing-first), top pre-selected.
  **+5 VP** set bonus auto-fires on completing all 4 worker types (discard one of each).
- **Recruit Genius / Research** (branch check, no mech gate first): Q "Genius available
  **and** an open Recruit space (or World Council)?" → **Yes**: place mech on Recruit
  space + recruit a Genius (+1 VP, remove from board). **No**: the *exact* Research flow
  (mech gate labelled **Research** → shape roll).
- **Research** (Capital): mech gate → app **rolls the shape die** → shows the rolled
  Breakthrough icon + running per-shape tally → Start. Only the shape matters.
- **Remove Anomaly** (**never places a mech**, no player choice): determined by state —
  has an Anomaly AND ≥2 cube-value (Neutronium = 2)? **Yes**: discard the determined
  cubes + remove 1 Anomaly. **No**: Failed Action, +1 VP (no Exosuit).
- **Time Travel** (no mech): Warp tiles left → orange box "remove one Warp tile…" →
  Start advances the marker 1 spot + decrements Warp. No Warp → Failed (+1 VP).
- **Reboot**: "Reboot: Chronobot does nothing." → Start.

## Engine additions (`src/engine`)

- `ChronobotState.buildingVp` — Construct/Superproject tile VP tracked apart from `vp`.
- `ActionTurnInput`: `minedResources`, `recruitedWorker`, `shape` (now honored),
  `geniusAvailable` (now honored).
- Decision/scoring helpers (all exported via `Chronobot.*`): `rankMineResources`,
  `mineResourceOrder`, `recruitWorkerOrder`, `TIME_TRAVEL_VP`, `timeTravelSpot`,
  `timeTravelVp`, `breakthroughVp`, `SET_BONUS_RESOURCES`.
- Mine & Recruit **set bonuses now fire on completion** (add, then check all 4).
- `remove-anomaly` def → `placesExosuit: false` (never spends an Exosuit, even on fail).

## Assets + board data (new)

- `public/assets/solo/resources/{neutronium,uranium,gold,titanium}.png` (cubes)
- `public/assets/solo/workers/{genius,administrator,engineer,scientist}.png` (figures)
- `public/assets/solo/breakthroughs/{circle,triangle,square}.png` (shape tiles)
- `public/assets/solo/timetravel-marker.png` (hex marker)
- `src/board/timeTravelTrack.ts` — `TIME_TRAVEL_TRACK` = 7 calibrated `spots` + `markerWidth`.
- `BOARD_COUNTERS` gained 4 resource + 4 worker trackers (positions calibrated in-app).

## UI features (new)

- **VP pill is expandable** (top bar): collapsed = total; expands to
  **token · bldg · time travel · breakthrough**. `total = token + bldg + tt + bt`.
- **Breakthroughs badge is clickable** → popover with per-shape counts (circle/tri/sq).
- **Time Travel marker** rides its track (purple silhouette outline + drop shadow);
  advances one spot per Time Travel; position scores 0/2/4/6/8/10/12 VP.
- **Calibrate mode** now covers badges **+ the 7 Time Travel spots + a marker-width
  slider**, and emits BOTH the `BOARD_COUNTERS` and `TIME_TRAVEL_TRACK` literals.

## Passing & End of Actions (done this session — rulebook p. 6)

Implemented the "Passing and End of Actions" rule in the engine and surfaced it in
BoardExplorer (the default view).

- `botPassDecision` **corrected**: rule 2 ("if you pass first and the bot has met its
  minimum, the Action Rounds Phase ends immediately") is now checked *before* the
  out-of-Exosuits branch, so a player pass **preempts** the owed final Time Travel of
  rule 1. Returns the same 4 tags as before (`continue` / `must-continue-min3` /
  `time-travel-then-pass` / `pass`), typed as `BotPassDecision`.
- **Minimum Actions is now config-driven**: `chronobotMinActions(state)` returns 3, or 6
  when `config.difficulty` includes `DIFFICULTY_MIN_ACTIONS_6` (`CHRONOBOT_MIN_ACTIONS`
  const). The rulebook's "Increasing the Difficulty" list confirms 3→6 is a hard-mode
  toggle. `actionRoundsCanEnd` uses this minimum.
- New `Chronobot.resolveBotPass(state) → ActionTurnResult`: orchestrates the terminal
  outcomes — plain `pass` marks the bot passed (with an "ends immediately" instruction
  when applicable); `time-travel-then-pass` takes one Time Travel turn (counts as an
  Action) then passes; the "keep going" tags return an explanatory instruction and leave
  state unchanged. The Time Travel effect was factored into a shared `resolveTimeTravel`.
- **BoardExplorer** gained an `EndOfActionsBar` footer strip: You/Bot pass chips, an
  `Actions N / min M` counter, a **🛑 I pass** button, a decision hint, and a green
  **▶ Resolve the Chronobot's pass** button on terminal decisions, plus a
  "✓ Action Rounds Phase ends" note when `actionRoundsCanEnd`.
- Tests: 8 new engine cases (rule-2 precedence, the out-of-Exosuits preemption, min-6
  difficulty, `resolveBotPass` outcomes). `npm test` = **29 green**; build + lint clean.
- Note: difficulty flags (`min-actions-6`, "extra turn after you pass") are **defined but
  not yet wired into any setup UI** — the engine honors `min-actions-6`; the extra-turn
  option is unimplemented.

## Next up (new session): Phase & turn tracking

The app currently runs **single action turns** only (debug harness). Next: build the
**per-Era phase/turn structure** on top of the engine's existing phase functions
(`Chronobot.setup`, power-up, Action Rounds, `botPassDecision`, `actionRoundsCanEnd`,
`resolveBotPass`, `markBotPassed` / `markPlayerPassed`, Era advance, `scoreChronobot`).
Goal: guide the player through a full Chronobot turn/Era — AI-die roll picking the active
Command token, action-round flow, pass logic, and Era clean-up — rather than free-tapping
tiles.

## Gotchas / decisions locked

- Chronobot = the **"Solo Opponents" rulebook** version (4 Command tokens 2–5 + the AI
  die / Flux die), not the older PnP. Board art = `public/assets/solo/board-chronobot.jpg`.
- Overlay positions are **% of the board image** (1500×1110); marker width is % of board
  width. Don't switch to pixel positioning. Calibrate in-app, paste the literal back.
- `AI_DIE_FACES` in `engine/index.ts` is still a placeholder `[1..6]` — verify vs the
  physical die when wiring turn tracking.
- `pw-validate.mjs` hardcodes the cached Chromium path (`chromium_headless_shell-1217`).
- Reference PDFs/art live outside the repo (see `CLAUDE.md`); read with PyMuPDF.
- Open question: an extra `Operator.png` sits in the crop temp folder — not one of the 4
  engine worker types; left unused pending clarification.

## Paths

- Repo: `c:\repos\AnachronyChronossus`
- Reference: `C:/Users/shawn/OneDrive/Program Development/Anachrony Chronossus/reference/`
- Crop temp (source art): `C:/Users/shawn/OneDrive/Program Development/Anachrony Chronossus/temp/`
- Persistent memory: `C:/Users/shawn/.claude/projects/c--repos-AnachronyChronossus/memory/`
