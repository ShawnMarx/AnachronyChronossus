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
npm test         # vitest run  (39 tests; keep green)
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
    state.ts                  GameState + ChronobotState + Phase machine + Instruction;
                              PHASE_NUMBER (rulebook: Action Rounds = Phase 5), endgameTriggered
    rules/chronobotActions.ts action catalog; `rule` = VERBATIM rulebook text;
                              MECH_PLACEMENT / FAILED_ACTIONS / PASSING_RULE /
                              ENDGAME_TRIGGER_RULE / PLAYER_SCORING_RULE; priority arrays
    bots/
      chronobot.ts            the automa: pure phase fns + decision helpers; Command-token
                              paths + stacking rule; MAX_ERA; chronobotPoweredExosuits(era)
      chronobotMeta.ts        registry descriptor (id/name/implemented)
      chronossus.ts           scaffold (implemented:false)
      BotModule.ts            metadata-only registry
    index.ts                  public API: `Chronobot.*`, dice rollers, AI_DIE_FACES=[2,3,3,4,4,5]
  board/
    chronobotHotspots.ts      CHRONOBOT_HOTSPOTS (tap tiles) + BOARD_COUNTERS (badges), % pos
    chronobotPaths.ts         SHORT_PATH/LONG_PATH marker anchors (%), command-marker art
    timeTravelTrack.ts        TIME_TRAVEL_TRACK (7 spots) + WARP_MARKER + PARADOX_SLOTS layouts
    ActionIcon.tsx            renders one icon from the sprite sheet
  AppRoot.tsx                 view switch: Landing (home) → BoardExplorer (wired in main.tsx)
  Landing.tsx                 home screen: pick a Solo opponent (Chronobot ready; Chronossus soon)
  BoardExplorer.tsx           the Chronobot play view — see below
  App.tsx                     older guided game runner (NOT wired; kept for reference)
  useGame.ts                  React hook over the engine (used by App.tsx)
public/assets/solo/           board art + chronobot-icons.png sprite sheet;
                              resources/ workers/ breakthroughs/ (cube/figure/shape art),
                              commands/marker-{2,3,4,5}.png (Command tokens),
                              timetravel-marker.png, warp-tile.png, paradox.png
public/                       favicon.ico + favicon-{16,32,512}.png + apple-touch-icon.png +
                              anachrony-logo.png (impossible-triangle; for the landing page)
```

### BoardExplorer (the Chronobot play view)

Board-first: the Chronobot solo board fills the viewport, top-aligned (shrinks in
place when the top bar wraps). The **8 base actions** resolve through
`Chronobot.takeActionTurn` via guided per-action dialogs, each ending with **▶ Start
Your Turn**. Full-rules 📖 collapsibles (verbatim `rule` text) render below the boxes.
Terminology: the physical piece is an **Exosuit** (not "mech") in all displayed text.

**Command tokens + the turn loop (the core mechanic).** The 4 Command tokens (2–5)
travel two looping Action paths — **Short** (Water · Time Travel · Superproject ·
Remove Anomaly) and **Long** (Mine · Power Plant · Recruit · Factory · Reboot ·
Recruit-Genius/Research · Lab · Research). Token 3 rides the Short path; 2/4/5 ride the
Long path. **🎲 Take Bot Action** rolls the AI die (`AI_DIE_FACES=[2,3,3,4,4,5]`, shown
black-with-red-numeral), activates that token at its current step, opens that Action's
dialog, and on commit **advances the token** one step (`Chronobot.advanceActiveToken`,
which enforces the max-two-per-spot **stacking/bump rule**). Paired markers split
(bottom shifts right, top left). Sequences/advancement are engine-side and tested;
the %-anchors live in `board/chronobotPaths.ts`.

Per-action flows: **gate** (Confirm placed / Cannot place) precedes Exosuit-placing
Capital actions. **Construct** → tap the tile's printed VP (`buildingVP`; per-type
lists in `buildingVps`/`superprojectVps` for tooltips). **Mine**/**Recruit** auto-fire
the **+5 VP set bonus**. **Research** rolls the shape die. **Remove Anomaly**/**Time
Travel**/**Reboot** place no Exosuit.

**Passing & endgame.** **You Pass** + **Take Bot Action** drive `botPassDecision` /
`resolveBotPass` (out of Exosuits → final Time Travel then pass; you-pass preempts once
the min is met). The **Actions status chip** opens a popover titled **"Era N · Phase M"**
(`PHASE_NUMBER`) with pass state + a collapsible verbatim `PASSING_RULE`. **Eras 5–7**
the bot powers up **4** Exosuits (`chronobotPoweredExosuits`), else 6. In **Eras 5–6** a
**⚑ Trigger End Game** button shows a confirm with the verbatim `ENDGAME_TRIGGER_RULE`;
**Era 7** (or once triggered) shows **🏁 Finish & Score** → the **score screen**
(`scoreChronobot` total + breakdown + bot turns; player score via number or a tally
sheet from `PLAYER_SCORING_RULE`; win/lose).

**Undo / History / Persistence** share one serializable **Snapshot** stack: `commit()`
pushes the prior snapshot + a per-turn change-list; **↶ Undo** restores it (re-showing
the same die, reused by the next Take Bot Action); **🕑 History** (in the ⚙ menu) renders
the list newest-first and pushes the board left when docked. State auto-saves to
`localStorage` (versioned) and rehydrates on mount.

**Top bar**: expandable **VP pill** (total · token · bldg · time travel · breakthrough,
centered left of Take Bot Action); **⚙ settings menu** (top-right) holds History, the
**Debug** toggle, dev toggles (outlines/calibrate, debug-only), **Reset Game** (confirm),
and a "Log in (soon)" placeholder. **Debug OFF = play mode** (tap tiles → read-only rule
panel only; dev controls hidden). Debug adds **Era −/+** and **Paradox (P) −/+** modifiers.

**Board overlays**: `BOARD_COUNTERS` badges (counts + resource/worker trackers, hover
tooltips; building tooltips list per-tile VP); the Breakthroughs badge → per-shape
popover; the **Time Travel marker** on its 7-spot track (0/2/4/6/8/10/12 VP); the
**Warp-tile marker** (image + count); **3 Paradox slots** (0–3, outer ▶ / middle ◀,
"Paradox N" tooltip) driven by the debug P control.

**Calibrate mode** (⚙ → Debug → calibrate): click the board to place the selected
overlay, arrow-keys nudge (0.2% / Shift 1%); covers badges, the 7 TT spots, the 12
path steps, the Warp marker, and the 3 Paradox slots, with width sliders. The panel
emits ready-to-paste literals for each (`BOARD_COUNTERS`, `TIME_TRAVEL_TRACK`,
`SHORT_PATH`/`LONG_PATH`, `WARP_MARKER`, `PARADOX_SLOTS`).

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
- `TTS Mod/*.ttsmod` — a ZIP; art in `Mods/Images/` (hash-named). To find a specific
  piece, parse `Mods/Workshop/*.json` for the object's `Nickname` (e.g. "Paradoxes"),
  read its `CustomImage.ImageURL` / `CustomMesh.DiffuseURL`, and match the URL's hash
  to the `Mods/Images/…<HASH>.jpg` file. Read PDFs/art with **PyMuPDF** (`import fitz`);
  flatten `.pdn` (Paint.NET) with **pypdn** — native Python, use `C:/…` paths.

## Conventions

- Keep the engine pure and tested; add unit tests for new decision logic.
- Rule text shown to players should be **verbatim** from the rulebook where possible.
- Match surrounding code style; `npm run build` and `npm test` must stay clean before
  committing.
- Board art is copyrighted → the GitHub repo is **private**.
