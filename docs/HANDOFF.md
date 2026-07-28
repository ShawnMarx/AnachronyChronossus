# Handoff — 2026-07-27 (Chronobot play view, feature-complete for Phase 5)

Snapshot for continuing without chat context. Read `CLAUDE.md` first (it now
describes the whole BoardExplorer), then this. Longer history: `docs/BUILD-LOG.md`.

## Where things are

- **🚀 LIVE at https://anachrony.boardgameedge.com** — push to `main` auto-deploys
  (GitHub Actions). See `docs/DEPLOYMENT.md`.
- **Entry = `src/AppRoot.tsx`** (wired in `main.tsx`): a **Landing/home screen**
  (`src/Landing.tsx`) picks a Solo opponent → the **Chronobot** opens
  `src/BoardExplorer.tsx`. Chronossus card is "coming soon".
- `npm run build`, `npm test` (**39**), `oxlint` all clean. Working tree committed.

## What the Chronobot view does now (all shipped this session)

The **Action Rounds phase (Phase 5)** is complete as an interactive board:

- **Command tokens + Take Bot Action**: 4 tokens ride two looping Action paths;
  **🎲 Take Bot Action** rolls the AI die (`[2,3,3,4,4,5]`), activates the matching
  token, runs that Action's dialog, and advances the token (with the max-two-per-spot
  stacking/bump rule). All engine-side + tested.
- **Passing & endgame**: You Pass / Take Bot Action → `botPassDecision`/`resolveBotPass`;
  status popover titled **"Era N · Phase M"** with the verbatim passing rule. Eras 5–7
  power up **4** Exosuits. **Trigger End Game** (Eras 5–6, verbatim-rule confirm) / auto
  in Era 7 → **Finish & Score** → score screen (bot total + breakdown + turns; player
  score by number or tally sheet; win/lose).
- **Undo / History / localStorage persistence** (shared Snapshot stack); **⚙ settings
  menu** (History, Debug toggle, dev toggles, Reset Game, Log-in-soon); **Debug OFF =
  play mode** (tiles show rules only). Debug adds **Era −/+** and **Paradox −/+**.
- **Board trackers**: Time Travel marker, **Warp-tile marker**, **3 Paradox slots**,
  resource/worker/building counters (with tooltips) — all calibratable.

Terminology: the physical piece is an **Exosuit** everywhere now (not "mech").

## Next up — the full per-Era phase loop

The app still runs **single Action turns** (Phase 5 only). The next milestone is the
**guided phase-by-phase Era loop** (Preparation → Paradox → Power Up → Warp → Action
Rounds → Clean Up, ×7 Eras, then scoring). Active plan + log:

- `docs/plans/PLAN_chronobot_full_phases.md`
- `docs/plans/LOG_chronobot_full_phases.md`

Foundations already in the engine for it: `Chronobot.setup`, `resolveParadox`,
`resolvePowerUp` (era-based Exosuits), `resolveWarp`, Action-Rounds fns,
`resolveCleanUp`, `startNextEra`, `scoreChronobot`, `PHASE_NUMBER`, `MAX_ERA`,
`endgameTriggered`.

## Gotchas / decisions locked

- Chronobot = the **"Solo Opponents" rulebook** version (4 Command tokens 2–5 + the AI
  die). Board art = `public/assets/solo/board-chronobot.jpg` (1500×1110).
- Overlay positions are **% of the board image**; calibrate in-app (⚙ → Debug →
  calibrate), paste the emitted literal back into the `board/*.ts` data files.
- Power Up Exosuit count is **Era-based** (`chronobotPoweredExosuits`); the old
  "pre/post-Impact" test now asserts the Era-based behavior.
- Reference PDFs/TTS art live outside the repo (see `CLAUDE.md`).
- **Deploy key exposure**: the CI `the deploy key` SSH private key was printed
  to a tool output earlier — **rotate it** (regen keypair, update the Droplet
  `authorized_keys` + repo secret `DEPLOY_SSH_KEY`).

## Paths

- Repo: `c:\repos\AnachronyChronossus`
- Reference: `C:/Users/shawn/OneDrive/Program Development/Anachrony Chronossus/reference/`
- Crop temp (source art): `C:/Users/shawn/OneDrive/Program Development/Anachrony Chronossus/temp/`
- Persistent memory: `C:/Users/shawn/.claude/projects/c--repos-AnachronyChronossus/memory/`
