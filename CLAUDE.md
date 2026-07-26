# CLAUDE.md

Guidance for working in this repo. Keep it accurate as the code evolves.

## What this is

A solo-play web app that guides a single player through **Anachrony** against an
automated opponent. It runs only the *bot's* turns and tells the player where to
move physical pieces; it does **not** simulate the human's game. The app performs
the bot's randomness (dice, bag draws) so the player doesn't.

- **Chronobot** — base-game automa. **Primary focus right now.** We target the
  Chronobot as described in the **"Chronobot & Chronossus Solo Opponents" rulebook**:
  **4 Command tokens** (numbered 2–5) + the **AI die** (the Flux die reused), on the
  shared Solo board (Chronobot side). Verbatim rules come from that rulebook (pp. 4–6).
  (There is also an older Print-and-Play Chronobot with 6 tokens + a D6 — *not* what
  this app targets.)
- **Chronossus** — the more complex automa; **later** (registered but not implemented).

Unofficial fan aid; requires owning the physical game. Roadmap: Base Chronobot →
Chronossus base → Chronossus + Fractures of Time.

## Run / build / test

```bash
npm install
npm run dev      # Vite dev server (default port 5173; a session may run it on 5199)
npm run build    # tsc -b + vite build  (must stay clean)
npm test         # vitest run  (21 tests; keep green)
npm run lint     # oxlint
```

React 19 + Vite + TypeScript. No backend yet. Optional login (shared auth, later)
would only gate saved stats.

## Architecture

The rules engine is deliberately **UI-agnostic and pure** — no React, no randomness
inside; callers pass in rolled dice / player answers.

```
src/
  engine/
    types.ts                  resources, workers, buildings, breakthrough shapes
    state.ts                  GameState + ChronobotState + Phase machine + Instruction
    rules/chronobotActions.ts action catalog; `rule` = VERBATIM rulebook text;
                              MECH_PLACEMENT / FAILED_ACTIONS; priority arrays
    bots/
      chronobot.ts            the automa: pure phase fns + exported decision helpers
      chronobotMeta.ts        registry descriptor (id/name/implemented)
      chronossus.ts           scaffold (implemented:false)
      BotModule.ts            metadata-only registry
    index.ts                  public API: `Chronobot.*`, dice rollers, AI_DIE_FACES
  board/
    chronobotHotspots.ts      CHRONOBOT_HOTSPOTS (tap tiles) + BOARD_COUNTERS (badges),
                              positions as % rects/points over the board image
    ActionIcon.tsx            renders one icon from the sprite sheet
  BoardExplorer.tsx           DEFAULT VIEW (wired in main.tsx) — see below
  App.tsx                     guided game runner (built earlier; NOT the current view)
  useGame.ts                  React hook over the engine (used by App.tsx)
public/assets/solo/           board art + chronobot-icons.png sprite sheet
```

### BoardExplorer (current default view)

Board-first: the Chronobot solo board fills the viewport. Tap an action tile → a
dark, purple-bordered detail panel overlays the board's right zone showing the
**verbatim** rule. It doubles as a **debug harness**: tapping a tile resolves that
action through `Chronobot.takeActionTurn` and updates live counters.

Key interactions already built:
- **Mech-placement gate**: any mech-placing action prompts *Confirm placed / Cannot
  place* before an Exosuit is spent (Cannot place → the "no available space" failed
  action: +1 VP, no Exosuit).
- **Construct VP entry**: after placement, tap the tile's printed VP — **buildings
  1–4**, **superprojects 3–7** — added to the bot's score; max 3 per building type
  (4th fails). Engine input: `buildingVP`.
- **8 on-board count badges** (`BOARD_COUNTERS`): Mechs (hexagon), Breakthroughs
  (bottom-left), Superproject + 4 buildings + Anomalies (bottom row).
- **Calibrate mode** (toggle in the top bar): click the board to place the selected
  badge, arrow-keys nudge (0.2% / Shift 1%); the panel emits a ready-to-paste
  `BOARD_COUNTERS` literal. Use this for any new on-board position instead of guessing.

## Positioning board overlays

The board image is `public/assets/solo/board-chronobot.jpg` (1500×1110). All overlay
positions are **percentages** of the board image; `.board-wrap` has `aspect-ratio:
1500/1110`, so % maps 1:1 to the art. To validate rendered positions:

```bash
node pw-validate.mjs shot.png   # Playwright: prints each badge's measured %, saves screenshot
```

`pw-validate.mjs` uses the cached Chromium at
`C:/Users/shawn/AppData/Local/ms-playwright/chromium_headless_shell-1217/...` — update
that path if the cached version changes. Prefer **in-app calibrate mode** for setting
new positions; use this script to verify.

## Reference materials (outside the repo)

`C:/Users/shawn/OneDrive/Program Development/Anachrony Chronossus/reference/`
- `Rules/Anachrony-Chronobot-and-Chronossus-Solo-Opponents…pdf` — **the** rulebook we
  target (Chronobot rules pp. 4–6 transcribed verbatim into `chronobotActions.ts`).
- `Rules/The-Chronobot-PnP.pdf` — older PnP Chronobot (different: 6 tokens + D6). Not
  our target, but a component reference.
- Other rulebooks (Essential, Fractures, Future-Imperfect, Classic).
- `TTS Mod/*.ttsmod` — a ZIP; art extracted from `Mods/Images/` (hash-named). Read
  PDFs/art with **PyMuPDF** (`import fitz`) — native Python, use `C:/…` paths.

## Conventions

- Keep the engine pure and tested; add unit tests for new decision logic.
- Rule text shown to players should be **verbatim** from the rulebook where possible.
- Match surrounding code style; `npm run build` and `npm test` must stay clean before
  committing.
- Board art is copyrighted → the GitHub repo is **private**.
