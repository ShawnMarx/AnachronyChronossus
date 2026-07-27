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
npm test         # vitest run  (29 tests; keep green)
npm run lint     # oxlint
```

React 19 + Vite + TypeScript. No backend yet. Optional login (shared auth, later)
would only gate saved stats.

## Deployment

Live at **https://anachrony.boardgameedge.com** — a **public static site** on the
shared BoardGameEdge (BGE) DigitalOcean Droplet (`the deploy host`). Pushing to `main`
auto-deploys via GitHub Actions (`.github/workflows/deploy-production.yml`): it SSHes
to the Droplet as `deploy`, `git reset --hard origin/main`, `npm ci`, `npm run build`;
**nginx serves `/var/www/anachrony/dist` directly** — no backend, no systemd service,
no `sudo` in the deploy path. CI uses a dedicated `the deploy key` deploy key
(repo secrets `PROD_HOST` + `DEPLOY_SSH_KEY`). Full runbook, nginx block, and server
setup live in **`docs/DEPLOYMENT.md`**. Not yet done (deferred): staging, access-gating
via `auth.boardgameedge.com`, and listing on the `boardgameedge.com` landing page.

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
    chronobotHotspots.ts      CHRONOBOT_HOTSPOTS (tap tiles) + BOARD_COUNTERS (badges:
                              8 counters + 4 resource + 4 worker trackers), % positions
    timeTravelTrack.ts        TIME_TRAVEL_TRACK: 7 marker spots + markerWidth (% points)
    ActionIcon.tsx            renders one icon from the sprite sheet
  BoardExplorer.tsx           DEFAULT VIEW (wired in main.tsx) — see below
  App.tsx                     guided game runner (built earlier; NOT the current view)
  useGame.ts                  React hook over the engine (used by App.tsx)
public/assets/solo/           board art + chronobot-icons.png sprite sheet;
                              resources/ workers/ breakthroughs/ (cube/figure/shape art),
                              timetravel-marker.png
```

### BoardExplorer (current default view)

Board-first: the Chronobot solo board fills the viewport. Tap an action tile → a
dark, purple-bordered detail panel overlays the board's right zone. Every one of the
**8 base actions** resolves through `Chronobot.takeActionTurn` via a guided per-action
dialog, each ending with a green **▶ Start Your Turn** that commits + closes the panel.
Full-rules 📖 collapsibles (verbatim `rule` text) render *outside/below* the orange
action boxes. Still a debug harness (top stats, Reset, seeded 2 Warp + 6 Exosuits).

Per-action flows (see `docs/HANDOFF.md` for the full list):
- **Mech-placement gate** (Confirm placed / Cannot place) precedes Exosuit-spending
  Capital actions; Cannot place → no-space failed action (+1 VP, no Exosuit).
- **Construct**: gate → tap the tile's printed VP (buildings 1–4, superprojects 3–7;
  engine input `buildingVP`, tracked in `buildingVp`); max 3/type → Failed Action.
- **Mine** (not Capital): "mining space open?" → cube picker (all 4 in priority order,
  ×2 by double-click, `minedResources`). **Recruit**: gate → worker picker
  (`recruitedWorker`). Both auto-fire the **+5 VP set bonus** on completing all 4 types.
- **Recruit Genius / Research**: Genius+space? → recruit Genius, else the Research flow.
  **Research**: app rolls the shape die (`shape`) → shows the shape + per-shape tally.
- **Remove Anomaly**: never places a mech, no player choice (state-determined).
  **Time Travel**: no mech; removes a Warp tile + advances the marker. **Reboot**: nothing.
- **VP pill** (top bar) is expandable: total · token · bldg · time travel · breakthrough.
- **Board overlays** (`BOARD_COUNTERS`): 8 count badges + 4 resource + 4 worker trackers;
  the Breakthroughs badge is **clickable** → per-shape popover. A **Time Travel marker**
  rides its 7-spot track (`TIME_TRAVEL_TRACK`), scoring 0/2/4/6/8/10/12 VP.
- **Calibrate mode** (top-bar toggle): click board to place the selected badge, arrow-keys
  nudge (0.2% / Shift 1%); also covers the 7 Time Travel spots + a marker-width slider.
  The panel emits ready-to-paste `BOARD_COUNTERS` **and** `TIME_TRAVEL_TRACK` literals.

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
