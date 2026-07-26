# Build Log

Running log of implementation progress. Newest first.

## 2026-07-25 — Board Explorer (current default view)

Pivoted the default view to a board-first **BoardExplorer** (`src/BoardExplorer.tsx`,
wired in `main.tsx`); the guided game runner (`App.tsx`) is preserved for later.

- **Tap an action tile → detail panel** overlaid on the board's right zone (dark,
  purple Chronobot border). Verbatim rulebook text per action (`rule` in
  `chronobotActions.ts`) + `MECH_PLACEMENT`/`FAILED_ACTIONS`. "places an Exosuit"
  is an inline link to the mech-placement rules.
- **Icons**: 12 action-tile icons cropped from the board into a sprite sheet
  (`public/assets/solo/chronobot-icons.png`, 4×3, 144×90 cells) via
  `src/board/ActionIcon.tsx`; shown 2× in the panel header.
- **Debug harness**: top stats row (VP · Warp · Actions), Reset, seeded with 2 Warp
  tiles + 6 Exosuits. Tapping a tile resolves the action through
  `Chronobot.takeActionTurn`.
- **Mech placement gate**: any mech-placing action prompts Confirm placed / Cannot
  place before spending an Exosuit (Cannot place → +1 VP, no Exosuit).
- **Construct VP entry**: after placement, tap the tile's printed VP — **buildings
  1–4**, **superprojects 3–7** — added to the bot's score, tile discarded; max 3 per
  type (4th fails). Engine scores it via `buildingVP` input.
- **Board trackers** (`BOARD_COUNTERS` in `chronobotHotspots.ts`): 8 on-board count
  badges — Mechs (hexagon), Breakthroughs (bottom-left), Superproject + 4 buildings +
  Anomalies (bottom row).
- **Position calibration**: `pw-validate.mjs` (Playwright, cached Chromium at
  `ms-playwright/chromium_headless_shell-1217`) measures each badge's rendered
  position; plus an in-app **calibrate mode** (toggle in the top bar) — click the
  board to place the selected badge, arrow-keys nudge, panel emits the exact
  `BOARD_COUNTERS` literal.

## 2026-07-22 — Chronobot v1

**Recon / assets**
- Proved the TTS asset pipeline end-to-end: resolve a component GUID (from the mod's
  global Lua `SOLO` table) → its `ImageURL` → the matching file inside the `.ttsmod`
  ZIP → extract. Solo board (both faces), AI die, and action tiles all extract cleanly.
- Extracted to `public/assets/solo/`: `board-chronossus.jpg`, `ai-die.jpg`.
- AI die faces read as numbers paired with a fist/exosuit glyph. **Open item:** confirm
  the exact 6 faces + how they map to the 4 Command tokens (2/3/4/5) with the physical
  die. Engine keeps `aiDieFaces` as configurable data so this is a one-line fix.
- The mod's Lua is a 3D-simulation engine (spatial moves), so it's an oracle for phase
  *text* and setup, not a clean die→action table. Board arrow routing is printed on the
  board; treating it as **seeded + player-correctable** data for v1 rather than guessing
  pixel-perfect geometry (user owns the physical board to verify in testing).

**Engine scope for v1 (Chronobot)**
- Full setup guide + per-Era phase flow: Paradox → Power Up → Warp → Action Rounds →
  Clean Up, then End-of-Game scoring.
- App performs all bot randomness (AI die, paradox die).
- Action Rounds: the valuable core = full **decision resolution** for every Chronobot
  action (Construct / Recruit / Research / Recruit-Genius-or-Research / Mine / Time
  Travel / Remove Anomaly / Reboot) with priority rules + JIT explanations, plus Failed
  Action handling, min-3-actions, and passing logic.
- Bot bookkeeping tracked by the app: exosuits, VP, resources, workers, breakthroughs,
  buildings, superprojects, anomalies, warp tiles, time-travel track, actions this era.
- Where a choice needs physical board info (e.g. which building has higher VP), the app
  states the rule and asks the player to apply it (`requiresInput`).

**Chronobot v1 — DONE (testable).** `npm run dev` then choose Chronobot.
- Engine: `src/engine/bots/chronobot.ts` (pure phase functions + decision helpers),
  `rules/chronobotActions.ts` (action catalog + JIT text), expanded `types.ts`/`state.ts`.
- UI: `src/App.tsx` guided flow — setup checklist → per-Era Paradox/Power Up/Warp/Action
  Rounds/Clean Up → end-game scoring; live Chronobot status panel; collapsible board art;
  action picker with per-action "why?" JIT text; app rolls AI/paradox/shape dice.
- Tests: 21 passing (`npm test`) — decision priorities, phase transitions, failed-action
  handling, pass logic, scoring, and a full-era integration playthrough.
- Verified: `tsc` + `vite build` clean, `oxlint` clean, dev server serves app + assets 200.

**Open items to confirm with the physical game during testing:**
1. AI die faces + how they map to the 4 Command tokens (2/3/4/5). Currently
   `AI_DIE_FACES=[1..6]` in `engine/index.ts` — one-line fix once known.
2. Board arrow routing / which action sits on each token's space. v1 has the player pick
   the action from the grid each roll (also serves as the JIT reference). Once geometry is
   confirmed we can auto-predict the action per die face (the true "roll-outcome grid").
3. Paradox phase: v1 asks "did it gain an Anomaly?" (player resolves the physical roll)
   because anomaly gain depends on maturing Warp tiles the app doesn't fully track.
