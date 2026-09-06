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

Live at **https://anachrony.boardgameedge.com** — a **public static site** on a shared host. Pushing to `main`
auto-deploys via GitHub Actions (`.github/workflows/deploy-production.yml`): it SSHes to the host, `git reset --hard origin/main`, `npm ci`, `npm run build`;
**nginx serves the built `dist/` directly** — no backend, no systemd service,
no `sudo` in the deploy path. CI uses a dedicated deploy key (repo secrets `PROD_HOST` + `DEPLOY_SSH_KEY`).
Host, vhosts and key rotation live in the private BGE infrastructure repo; this repo
keeps only a stub (`docs/DEPLOYMENT.md`). **Staging** mirrors it at
`anachrony.staging.boardgameedge.com`, deploying on push to the **`staging`** branch (same host, its own directory) — work lands there first, then `staging → main`.
Not yet done (deferred): access-gating via `auth.boardgameedge.com`, and listing on the
`boardgameedge.com` landing page.

## Architecture

The rules engine is deliberately **UI-agnostic and pure** — no React, no randomness
inside; callers pass in rolled dice / player answers.

```
src/
  engine/
    types.ts                  resources, workers, buildings, breakthrough shapes
    state.ts                  GameState + ChronobotState + Phase machine + Instruction;
                              phases preparation(1)…cleanup(6) + PHASE_NUMBER; firstPlayer,
                              chronobot.paradoxes tracker (0–2), extraTurnAfterPassUsed
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
  i18n/
    surface.ts                translatable surface: flat `key -> English default`, DERIVED
                              from the catalogs (a new tile joins it automatically)
    uiStrings.ts              the app's own voice (chrome) — its own source of truth
    catalog.ts                locale discovery (`import.meta.glob`) + per-key fallback
    I18nProvider.tsx          context + `useT()`; persisted choice (try/catch, non-module-scope)
    localized.ts              `useTile` / `useAction` / `usePhaseMeta` / `useRule` — catalog
                              entries with translated fields swapped in
    locales/en.json           GENERATED (`UPDATE_LOCALES=1 npm test`); + README.md for translators
  board/
    chronobotHotspots.ts      CHRONOBOT_HOTSPOTS (tap tiles) + BOARD_COUNTERS (badges), % pos
    chronobotPaths.ts         SHORT_PATH/LONG_PATH marker anchors (%), command-marker art
    timeTravelTrack.ts        TIME_TRAVEL_TRACK (7 spots) + WARP_MARKER + PARADOX_SLOTS layouts
    ActionIcon.tsx            renders one icon from the sprite sheet
  game/
    flow.ts                   pure phase-flow: Era sequence, Era-1 Paradox skip, End-Game exit
  phases/
    PhaseScreen.tsx           splash-banner shell (Era N · Phase M) + This-Phase/Status tab
    RulesBox.tsx              collapsible VERBATIM rulebook-text box (preamble on Setup only)
    SetupFlow.tsx             Start flavor → Difficulty (4 opts) → Setup instructions
    phaseMeta.ts              per-phase name/overview/verbatim rules + ENDGAME_RULES
  AppRoot.tsx                 view switch: Landing (home) → BoardExplorer (wired in main.tsx)
  Landing.tsx                 home screen: pick a Solo opponent (Chronobot ready; Chronossus soon)
  BoardExplorer.tsx           the Chronobot play view — renders the full phase flow; see below
public/assets/solo/           board art + chronobot-icons.png sprite sheet;
                              resources/ workers/ breakthroughs/ (cube/figure/shape art),
                              commands/marker-{2,3,4,5}.png (Command tokens),
                              timetravel-marker.png, warp-tile.png, paradox.png
public/                       favicon.ico + favicon-{16,32,512}.png + apple-touch-icon.png +
                              anachrony-logo.png (impossible-triangle; for the landing page)
```

### BoardExplorer (the Chronobot play view)

**Renders the whole guided Era loop**, switching on `state.phase`:
Setup → **1 Preparation → 2 Paradox → 3 Power Up → 4 Warp → 5 Action Rounds →
6 Clean Up** → next Era, or **End Game**. Non-Action phases use the `PhaseScreen`
shell (Chronobot splash banner, verbatim rulebook `RulesBox`, per-phase body) with a
**Chronobot Status** tab flipping to the read-only board; **Phase 5** is the board
itself. Phase transitions call the pure engine resolvers via `src/game/flow.ts`
(`startFirstEra`, `advanceFromPreparation` — Era 1 skips Paradox — `finishEra`).
Per-phase bodies live in `BoardExplorer.tsx`: **Setup** (`SetupFlow`: flavor →
difficulty → verbatim + app-modified setup), **Paradox** (answer "ties/leads" → rolls
`rollParadox`, per past Timeline tile up to Era−1×, stop on Anomaly / 0 Warp),
**Warp** (roll the Paradox die → place N), **Power Up**/**Preparation** (note + Continue),
**Clean Up** (retrieve; Eras 5–6 flip Collapsing Capital tiles → game-continues vs ended).

The board fills the viewport, top-aligned (shrinks in place when the top bar wraps). The
**8 base actions** resolve through `Chronobot.takeActionTurn` via guided per-action
dialogs, each ending with **▶ Start Your Turn**; the dialog also shows a verbatim
AI-die `RulesBox`. Full-rules 📖 collapsibles (verbatim `rule` text) render below the
boxes. Terminology: the physical piece is an **Exosuit** (not "mech") in all displayed text.

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

**Passing, First Player & endgame.** Each Action Rounds phase opens with a **Ready to
begin** intro (fires the first **Take Bot Action** when the bot is First Player).
**You Pass** + **Take Bot Action** drive `botPassDecision` / `resolveBotPass` (out of
Exosuits → final Time Travel then pass; you-pass preempts once the min is met; the
`bot-extra-turn` difficulty grants one more). When both have passed and the min is met, a
banner → the **First-Player prompt** (sets next Era's `firstPlayer`) → **Clean Up**.
**Eras 5–7** the bot powers up **4** Exosuits (`chronobotPoweredExosuits`), else 6.
**Game end is decided in Clean Up** (not the top bar): Eras 5–6 flip Collapsing Capital
tiles → *game continues* vs *game ended*; Era 7 always ends → the **score screen**
(`scoreChronobot` total + breakdown incl. Anomalies −3 + bot turns; verbatim
`ENDGAME_RULES`; player score via number or a `PLAYER_SCORING_RULE` tally; win/lose).

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

**Debug controls** live in one shared `DebugBar` (jump-to-phase incl. End Game, Era,
Paradox, Impact, End Actions, Warp tiles, Time Travel, Hypersync tiles, **Exosuits**). The
Exosuits stepper exists so the out-of-figures state — where the bot passes instead of
acting — is reachable by clicking; before it, `pw-pass.mjs` had to hand-edit the saved game.
Prefer adding a stepper here over save-file surgery in a new harness.

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
node pw-check.mjs "<Module label>" <slug>   # renders a mode; prints its board tiles + broken images
SHOT_DIR=/tmp node pw-adv.mjs http://localhost:5173/ 1000   # opens Pioneers' Adventure dialog
SHOT_DIR=/tmp node pw-warp.mjs http://localhost:5173/ 6      # Warp roll vs. tiles shown
SHOT_DIR=/tmp node pw-pass.mjs http://localhost:5173/ "<mode label>"   # pass-at-0-figures
SHOT_DIR=/tmp node pw-quantum.mjs        # Quantum Loops' Warp check (ROLL= ALT= UNDO= SETUP=)
SHOT_DIR=/tmp node pw-shapedie.mjs       # the shape die on Research; ASSIM=1 for Assimilate
SHOT_DIR=/tmp node pw-chronobot-parity.mjs   # phase-screen Undo/History + roll persistence
SHOT_DIR=/tmp node pw-descriptors.mjs    # a coerced descriptor / an unresolved key on screen
SHOT_DIR=/tmp node pw-nostorage.mjs      # the app under a localStorage that THROWS (BOT=chronobot)
SHOT_DIR=/tmp node pw-i18n-snapshot.mjs  # 36 screens: text + layout geometry + screenshot
node pw-i18n-diff.mjs <before> <after>   # compare two captures (text/layout strict, pixels budgeted)
node pw-i18n-dropin.mjs                  # proves a dropped-in locale file works, then removes it
node pw-i18n-review.mjs --pseudo         # fake +40% accented locale: finds hard-coded + clipped text
LANG_CODE=de MODES=all node pw-i18n-review.mjs   # EN-vs-language capture of every screen + report.html
LANG_CODE=de MODES=all SIDES=B node pw-i18n-review.mjs   # again for the B-side tiles
COVERAGE=1 LANG_CODE=zz node pw-i18n-review.mjs  # with --markers first: which keys a run never showed
```

`pw-pass.mjs` reaches a state the UI has no control for: it edits the persisted save
(`localStorage['anachrony:chronossus']`) to zero the bot's figures and park a Command marker
on the Action under test, then rolls for real. Use that trick for any rule that only fires
deep into a game. Note a debug board **tap** is the free-tap path (it moves no marker), so it
cannot stand in for a rolled turn.

`pw-adv.mjs` shoots the **dialog element** at a given viewport width, so a dialog docked on
a narrow board is seen at its real width — dialog-only layout bugs (a title running under
the ✕, a Power line wrapping mid-sum) are invisible in a full-page screenshot.

`pw-check.mjs` drives a real browser through setup into a mode and reports which tile images
are on the board plus any that failed to load — how Pioneers' missing C09/C10 art and its
missing slot-IV overlay were both caught. Run it for every new module/combo.

`pw-nostorage.mjs` guards a **degraded-mode guarantee**: privacy-restricted browsers do not
make `localStorage` absent, they make every access **throw**, so `if (window.localStorage)`
passes and the access is what dies — a blank page for an SPA, which nobody reports. Every
storage access here is inside `try/catch` and none runs at module scope; the harness proves
it by playing both bots against a storage whose every method throws. The same guarantee
covers blocked cookies (`bge_anon` simply isn't minted). **Uncounted and unsaved but
playable is the required failure; a blank screen is not.** Run it after touching persistence.

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

## Docs & notes maintenance

Where written knowledge lives and **when to update it**. The `/recap` skill (end of a
work session) is just "do the applicable items below." Only touch a doc when the session
actually changed something it covers — don't churn docs for no-op sessions.

| Doc | What it is | Update when |
|---|---|---|
| `docs/BUILD-LOG.md` | Running, **newest-first** narrative changelog (the "why" behind the code). | A meaningful feature/milestone shipped. Prepend a dated entry; link the `docs/complete/` archive if one exists. Group small same-session changes into one entry. |
| `docs/PLAN.md` | Master design doc + **single pickup point**: what the app is/isn't, references, reading pipeline, phased roadmap, and links to the active scoped plan(s). **Not** a per-feature tracker. | The overall status/roadmap shifts — **including whenever `/plan cleanup` closes an effort** (refresh the `> Status (YYYY-MM-DD)` header + roadmap so the pickup point stays true). Leave design/reference sections stable; point at the active `docs/plans/PLAN_*` file rather than duplicating it. |
| `docs/plans/PLAN_<name>.md` + `LOG_<name>.md` | Active per-effort plan + execution tracker (managed by the `/plan` skill). | During execution — mark `[x]`/`[~]`, note deviations. When an effort finishes, `/plan cleanup` archives it to `docs/complete/`, deletes the source files, updates `TODO.md`, **and refreshes `docs/PLAN.md`'s status/roadmap** (see above). |
| `docs/complete/YYYYMMDD_*_COMPLETED.md` | Frozen archive of a finished effort (plan + log + review + production notes). | Created by `/plan cleanup`; **don't edit after archiving** (historical record). |
| `docs/DEPLOYMENT.md` | Deployment runbook (hosting, nginx, CI, staging). | Deploy/infra/hosting details change. Living reference, not a log. |
| `TODO.md` | Loose ends and deferred work; bigger items graduate to a `/plan`. | A follow-up/deferred item surfaces, or a listed item gets done (check/remove it). |
| `CLAUDE.md` | This file — durable guidance for working here. | A permanent convention, architecture seam, or workflow changes. Keep accurate as code evolves. |
| `~/.claude/projects/…/memory/` | Auto-memory (cross-session facts). | See the memory rules in the system prompt; not part of `/recap`. |

**End-of-session recap flow:** BUILD-LOG entry for what shipped → tick/prune TODO.md →
update any active `LOG_`/`PLAN_` in `docs/plans/` → refresh PLAN.md's status header only if
the roadmap moved → update DEPLOYMENT.md / CLAUDE.md only if their subject changed. Note
what you changed (or that nothing needed it) at the end.

## Adding a module that brings its own board

Fractures (Valley board) and Hypersync (Hypersync board) both add Exosuit **placement
locations that are not on the Main board**; Pioneers and Guardians will do the same. The
Blink rules (Fractures) hinge on that distinction, so it lives in one place:

- `placesExosuitFor(actionId)` — does this Action place an Exosuit at all (a tile Action
  can: Assimilate/Extract are Valley Action spaces; Reboot/Score/Power Pack are not).
- `OFF_MAIN_BOARD_ACTIONS` / `isMainBoardPlacement(actionId)` — where it lands. Off-board
  placements are Blink **destinations but never sources**, so they are not recorded in
  `ChronossusState.placedExosuits`. Add a new module's off-board Actions to that list and
  the Blink selection, the "take the bottom one" counting, and the pass rule all follow.

`resolveHypersyncAction` already records nothing for the same reason.

**An off-board placement takes no Energy Core.** The core is only the marker for "this
Exosuit could Blink", and nothing off the Main board ever can — so the Valley, Adventure and
Hypersync placements never instruct one (and never say "it can never Blink", which only
raises a question the player didn't have). `PlaceExosuitPanel` takes `offBoard` for this.

**Every path that resolves a rolled Action must run `passesInsteadOfAction`.** That one
engine function is `wouldPassOn` plus the Fractures exemption (a Blink moves an Exosuit
already on the Main board, so an empty supply doesn't stop it, and every off-board space is a
legal destination). The view funnels all of them through one `passIfOutOfFigures(actionId)`:
the printed space, a modular tile slot, a tile COVERING a printed space, and the debug
free-taps. Pioneers shipped with the covered-space path running no check at all and the
tile-slot path missing the exemption — both invisible to the unit tests.

**A module's covering tile needs a board overlay too.** A mode can put a tile on slot IV/V,
which COVERS a printed Action space (`CoveredAction`). Resolving it correctly is only half
the job — without an overlay the board still shows the printed Action with no sign a tile
replaced it. Hypersync's C13-over-Time-Travel had that overlay; Pioneers' C10 over "Recruit
Genius or Research" had to add its own. Both live in `ChronossusGame.tsx`'s board layer next
to the slot-tile art.

**Two tile families can share one Action id — carry which one is live.** Pioneers puts C09
in a tile slot and C10 over a printed Action space, and both are `tile-adventure`.
`liveTileFamily` returns whichever family the mode lists FIRST, so C10 rendered C09's art,
name and rule box, and C10B's bonus could never fire. The activated family is tracked in
`pendingTileFamily` and passed to `CxTileDialog` (`family` prop) and `resolveTileSlot`. Set
it **after** `closeDialogs()`, which clears `pendingTile` and the family with it.

**A tile's app-voice text lives in `src/board/tileText.ts`** (`TILE_DESC` for the one-line
Command-view label, `tileInstruction` for the expanded line in its dialog) — pure, so it is
unit-tested. A tile with no branch there falls through to Reboot's "the Chronossus does
nothing this turn", which is what an Adventure tile said on release. Tests assert that no
implemented tile except Reboot describes itself that way and that every in-play tile action
has a Command-view description; a new module must add both entries.

**Deep-copy a new module's state slice in `cloneChronossus`.** The resolvers mutate the bot
in place, so a slice that is only shallow-copied gets written through to the caller's
pre-turn state. History diffs pre against post, so the symptom is silent: every one of that
module's History lines diffs to nothing and simply never appears. Pioneers shipped this bug
and it survived the unit tests — it only showed up when playing a turn in the browser.

**A new module's tile needs BOTH action maps.** The engine has `TILE_ACTION_FAMILY` /
`TILE_ACTION_CODE` (`chronossusTiles.ts`) and the view has its own `FAMILY_TO_TILE_ACTION`
(`ChronossusGame.tsx`). Guardians' C11 shipped in only the first: the tile rendered, but
`tileActionAt` returned null, so tapping it did nothing and a marker landing on the slot
resolved as "no effect" — with no error to notice.

**Guardians: a Guardian is an Exosuit.** `placeableFigures` / `nextFigure` / `spendFigure`
(`chronossus.ts`) are the single place the "Guardians last" rule lives — every placement and
every Failed-Action discard goes through them, so a new Action gets the rule for free.
Counting is always combined (badges, chips, the pass rule, the board's marker art); the two
are named separately ONLY where the player must pull a different miniature — Power Up's
split, the `(inc N Guardians)` chip, the badge pop-out. `spendGuardian` is the one exception:
the Guardian board fallback fires when Action **spaces** run out, not figures, so it spends a
Guardian specifically even while plain Exosuits remain.

**Post-Impact is derived from the Era.** `state.impact` is stored, but `startNextEra` and the
debug Era stepper both set it from `isPostImpact(era, config)`, and rules that branch on it read
`state.impact || isPostImpact(state.era, state.config)`. A stored flag that lags (a debug jump,
an old save) must never change a rule.

**A module can re-cut the Timeline — never hard-code an Era number.** Fractures of Time runs
**Era Zero + Eras 1–5** with the Impact in Era 3's Clean Up ("three Eras pre-Impact and two
post-Impact", Fractures p.4); every other mode is the base 7 Eras / Impact after Era 4. So
`MAX_ERA` / `POST_IMPACT_ERA` are the *defaults*: real code calls `maxEraFor(config)` /
`postImpactEraFor(config)` / `isPostImpact(era, config)` (`bots/chronossus.ts`), and
`flow.isFinalEra` goes through the `SoloEngine.maxEraFor(config)` seam. The Clean Up screen
derives its three branches (Impact note / Collapsing-Capital choice / final Era) from those
too — the old literal `era === 4` and `era === 5 || era === 6` were the bug. Fractures also
adds the one-off **`era0warp`** phase before Era 1 (`flow.hasEraZeroWarp`) and, because of it,
does *not* skip the Era 1 Paradox phase; `flow.pastTimelineTiles` counts the Era Zero tile.

**Doomsday is the one place post-Impact is NOT derived from the Era.** Everywhere else the
rule above holds absolutely. Doomsday starts the Impact tile a slot later (between the fifth
and sixth Timeline tile) AND lets the Trajectory dice move it every Clean Up — and the app
deliberately does not track any of that: **Check for Impact is the player's job**, and the
app only prompts and records the answer. So `postImpactEraFor(config, bot)` takes an optional
bot and, under `isDoomsdayMode` only, reads `bot.doomsday.impactEra` (falling back to
`DOOMSDAY_DEFAULT_IMPACT_ERA`). `earthSaved` is a **separate flag** from "no Impact Era yet":
with Earth saved the Impact never resolves, so NO Era is post-Impact and `postImpactEraFor`
returns `MAX_ERA + 1`. Conflating the two silently left a saved-Earth game running the 2+X
Power Up from Era 6.

**A module's setup block lists only what the Chronossus changes.** The shared "Setup for this
app" text already says to set up a 2-player game, so each module's block defers the base
module's own setup to that ("Set up the Guardian board as for a 2-player game", "as if it was
a 2-player game" for the Valley) and adds only the Chronossus-specific deltas + anything the
app does differently. Doomsday's first draft restated where the Impact tile goes and how the
Experiment cards are dealt — all base-module setup the player does as normal. The verbatim
`RulesBox` beside it is the rulebook's own "CHANGES AT SETUP", which is already Chronossus-only.

**Warp tiles are tracked per Timeline tile, not as a total.** Time Travel "removes any one
Warp tile from the **past** Timeline tile where the bot has the most (oldest if tied)"
(Solo Opponents p.5) — and the Warp phase (4) precedes Action Rounds (5), so the tiles the
bot placed THIS Era sit on the current tile and are not eligible. `warpTilesOnTimeline` is
only the total; `warpTilesByEra` (both bot states, key 0 = Fractures' Era Zero tile) is what
the rules read, through `src/engine/warpTiles.ts` (`warpRemoval` / `pastWarpTiles` /
`placeWarpTiles` / `removeWarpTile`). Every path that adds or removes a tile must keep the
map in step with the total — including the debug stepper. A game already in progress when
the map arrived carries BOTH: anonymous older tiles (total minus what the map accounts for)
plus tracked ones. Those anonymous tiles read as past — which they are — and are removed
first, so the pre-tracking pool drains and the map then answers on its own.

**Decide what NOT to model before building a module.** Doomsday's plan initially had the app
roll the Trajectory dice, track both trackers' `+`/`−` symbols and own the Impact tile's
position; asking first deleted a two-mode setting, a settings toggle and a column of board
data that would never have earned its keep. The same logic drops the Timeline's Experiment
cards: the player can remove one of the bot's Path markers on their own turn, so any model
would drift silently — the dialog states the rulebook's selection rule and asks instead.

**The Main-board / off-board split only matters where Fractures does.** `OFF_MAIN_BOARD_ACTIONS`
and the Energy Core exist to serve the **Blink**. A module that cannot combine with Fractures
(Doomsday) gets neither: no Core on the placement, nothing recorded in `placedExosuits`.
Instructing a Core there has the player reach for a component their game does not use — the
engine mentions one nowhere else, because it lives in Fractures' own gate.

**Modular tile art is already cropped.** All 28 Cnn tiles sit at the shipped 167×114 in
`~/OneDrive/Program Development/Anachrony Chronossus/temp/Mod Tiles/` — copy from there
rather than cropping the rulebook Appendix (the shipped `C06A.png` is byte-identical to it).
The TTS mod does **not** contain the Doomsday board, so its track was transcribed from the
Classic Expansion rulebook and confirmed with the user.

**A module can add no state at all — decide that before writing a slice.** Quantum Loops
(Solo Opponents p.18) is one AI-die roll in the Warp Phase and nothing else: on a 4 the player
removes the Quantum Loop card farthest from their draw deck. The card row is **not modelled** —
the player takes and returns cards and Preparation refills the offer, so any model would drift
inside an Era, exactly as Doomsday's Experiment cards would have. So it has no
`ChronossusState` slice, only an instruction, a History line and (with its difficulty option)
VP. `quantumLoops.ts` holds the verbatim text and one pure helper; `resolveWarp` takes the
rolled face as an argument because the caller rolls, as everywhere else.

**A phase's outcomes belong on the phase's own screen — including ones the app resolves
alone.** The one-screen rule (2026-08-20's Check-for-Impact rework) is not only about
questions. `WarpPhaseBody` takes **`beforeCommit`** for an outcome the app resolves and merely
reports (Quantum Loops' die), which — unlike `followUp` — does not replace the Continue button.
Alternate Timelines was still chaining its own question behind that button until 2026-08-21;
it now renders from `ui.warpRoll` on the screen itself, so the placement, the Quantum Loops
result and the answer commit as **one** entry. **Report a miss, too**: a check that only
appears when it fires is indistinguishable from one that never ran.

**History is docked-open on the board and opt-in on a phase screen.** On the Action Rounds
board the pane is a flex child — it pushes the board aside and the turn log is the main way to
see what the bot just did, so open-by-default is right. On a phase screen (`PhaseHistoryDock`)
it is an **overlay**, so inheriting that default put an empty "No turns taken yet." panel over
the hero art and the phase's own text the moment a game started. Both bots keep a separate
`showPhaseHistory`, defaulting closed, driven by the 🕑 button in the phase header.

**A phase roll belongs on the snapshot, never in the phase body.** Both bots keep the Warp and
Paradox rolls in restorable state (the Chronossus's `ui` slice, the Chronobot's `Snapshot` +
save) so Undo — and a reload — re-show the SAME roll. A roll held in component state is
remounted and silently re-rolled, which is playtest bug #10; the Chronobot carried it until
2026-08-21. A Paradox entry additionally re-seeds its roll from the entry's `die`.

**Two tiles that are genuinely different Actions get separate action ids.** Pioneers' C09/C10
share `tile-adventure` because they *are* the same Action, which is why `liveTileFamily` had to
exist. Doomsday's C07/C08 execute different Experiment levels, so they take
`tile-experiment-1` / `tile-experiment-2` and the ambiguity never arises. Prefer this when the
rules allow it.

## Translation (i18n)

**Adding a language is one file** — drop `src/i18n/locales/<code>.json` in and it appears in
the ⚙ menu. `import.meta.glob` makes the file's presence its registration and the file names
itself through its `$locale` header, so there is no registry, import list or enum to edit.
Keep it that way; a change that requires a second edit to add a language is a regression.

**The corollary: presence IS publication, so an unfinished locale cannot live in that
directory.** `src/i18n/locales/drafts/` is outside the glob (it does not recurse), and that is
where a work-in-progress file goes — `es.json` sits there at 12% of the surface as a worked
example of the file's shape, with `GLOSSARY-es.md` beside it. Judge readiness by **screens
reached, not keys translated**: 174 of 1,450 keys (12%) showed some Spanish on **92% of screens**,
because the translated keys are the high-frequency chrome, so shipping it would have read as
every screen half-broken rather than as a translation in progress. Two consequences worth
knowing: the ⚙ language row is gated on `locales.length > 1`, so with English alone there is no
picker at all; and the suite validates the parent directory only, so anything under `drafts/`
is unvalidated and drifts as the surface grows. To run an EN-vs-target review, `git mv` the
draft up, **rebuild**, serve that build, then move it back.

- **It is an override layer, not a relocation.** English text stays in the catalog the rules
  live in (`chronossusTiles.ts`, `chronobotActions.ts`, `phaseMeta.ts`); `surface.ts` derives
  the `key -> English default` map from them, so a new tile or Action joins the translatable
  surface for free. Lookups fall back to English **per key** — a partial locale file is valid.
- **Verbatim rule text is gated behind `officialRulebook`.** A 📖 box exists to match the book
  in the player's hands, so a locale that has not transcribed from its **official** edition
  keeps English rule text and says so in the box. Its `ui.*` strings are still used.
- **Only publish a key something renders.** A key in the surface costs a translator real
  effort; several exported-but-unrendered rule constants were deliberately left out.
- **Never translate a string that gets persisted.** History entries and turn labels are saved
  as finished sentences, so a translated one would freeze in whatever language was active when
  the turn happened. The `PHASE_META[next.phase]?.name` used for a History label is left on the
  raw catalog for exactly this reason, while the same lookup for display goes through
  `usePhaseMeta()`. Fixing this properly is the `{key, params}` refactor in `TODO.md`.
  **Where one helper serves BOTH a display path and a persisted path, it takes an optional
  `translate` and defaults to English** — `chronossusDifficultyLabel`, `chronobotDifficultyLabel`,
  `spaceLabel`, `chronossusActionLabel`, `describeCubes`, `tileInstruction`, `tileDescription`.
  The view passes `useT()`; anything writing a saved string calls it without. The Blink is the
  clearest case: `BlinkPanel`'s `spaceLabel` translates, while `blinkFromRef`'s `toLabel`, which
  feeds a History line, does not. An engine function that would otherwise return prose returns
  keys instead (`powerBreakdown` -> `{key, params, power}`).
- **A word the app names in more than one place gets ONE key family.** "Neutronium" appeared in
  the board tracker labels, the Mine resource swatches and the Recruit Worker swatches; it is now
  `piece.<key>`, derived from `BOARD_COUNTERS` so a new tracker joins the surface with it. Same
  for `module.<id>` / `extraModule.<id>` (expansion titles), `objectiveCard.<slug>`,
  `blinkSpace.<key>` and `ui.tileAction.<id>`. Deriving from the catalog is the point: a family
  that has to be hand-extended drifts.
- **Verbatim rulebook text belongs in a rule constant, never inline in JSX.** Inline text can
  only be published as `ui.*`, which bypasses the `officialRulebook` gate and invites a fan
  translation of the book. `src/engine/rules/chronossusSetupRules.ts` and
  `chronossusModuleRules.ts` hold the blocks the Chronossus's setup and phase screens show;
  `SetupRules` renders one (paragraphs on a blank line, single newlines as `<br>`).
- **A keyed `title`/`aria-label` is not a keyed UI.** The board hotspots' attributes were keyed
  while the **Simple Command View** still rendered the same Action names as visible text from the
  raw catalog. `pw-i18n-review.mjs` reads RENDERED TEXT, which is why it caught it — run it
  before believing a file is done.
- **A generated locale must exist BEFORE the build you serve.** `import.meta.glob` resolves
  at **build time**, so a `vite preview` build made before `--pseudo` writes `xx.json` (or
  `--markers` writes `zz.json`) contains no such locale: the ⚙ menu cannot switch to it, every
  screen captures in English, and the run reports *hundreds* of "untranslated" lines that are
  really "the locale was never loaded" (675 of them, 2026-08-28). Write the locale, **rebuild**,
  then serve that build. Same family as the next item.
- **Capture the visual baseline in the same build mode you compare against.** `vite dev` and
  `vite build` chunk differently, which changes how many `Math.random` calls precede the app's
  own dice — a dev-server baseline vs a `vite preview` capture showed the AI die as 2 then 4 with
  no code change. Serve both sides with `vite preview` (build `origin/main` in a worktree).
- `en.json` is **generated** — `UPDATE_LOCALES=1 npm test`. The suite also checks every other
  locale file for a valid header, no unknown keys, and `{placeholder}` parity with English.
- **The engine returns `{key, params}`, never prose** (`src/engine/message.ts`). Instructions
  and History lines are PERSISTED, so a finished sentence freezes in the language and wording
  that wrote it; a saved descriptor is re-rendered on every read, which is why this is worth
  doing in an English-only build too — rewording an instruction fixes **old saves**. English
  defaults live per bot, beside the rules, in `bots/<bot>.messages.ts`, and `engine/messages.ts`
  collects them for `surface.ts`. Rules when adding one: a **mid-sentence branch is its own key**
  (a conditional English fragment passed as a param has no grammatical home in another
  language); a **counted noun is a `.one`/`.other` pair** via `plural()`; and a **proper noun is
  written into the sentence, not passed as `{bot}`** — measured, only 9 of the two bots' 79
  strings were shared, and a name in a slot cannot take a case ending. A bare string is a legacy
  saved sentence and still renders as written, so `PersistedGame.version` was NOT bumped.
- **A new module ships its own `bots/<module>.messages.ts`**, beside the rules it describes,
  folded into `engine/messages.ts` — the same way it ships its own tiles. Never a central
  catalog every module edits. The summarizers' English lives in `game/history.messages.ts`.
- **`Text` collides with the DOM's global `Text`.** Widening a field to `Text` without
  importing the type compiles **clean** — against `lib.dom`'s Text node — and then fails as a
  confusing error somewhere else ("`string` is not assignable to `Text`"). Always
  `import type { Text } from '…/engine/message'` in the file that names it.
- **Widening a type will not find the code that breaks.** `${instr.text}` and
  `instrs.map((i) => i.text).join(' ')` are both legal on `string | Msg` and render
  `[object Object]`; `tsc` cannot see either. **Grep for template-literal and `join` reads**
  after converting anything, and run `pw-descriptors.mjs`, which catches that and the other
  invisible failure — a key with no catalog entry rendering as if it were a sentence.
- **What a History entry MEANS is decided by its key, not its prose** (`src/game/historyLabels.ts`).
  Two rules used to parse the English label with a regex — the superseded-arrow-row rule and the
  Chronossus's "turns this Era" count — so rewording a label silently changed a **count the
  player sees**. Every phase-result label must carry `era` and `phase` params, since the
  superseded rule pairs it with the `enteredPhase` row before it.
- **A locale's `officialRulebook` is per BOOK, not per language.** Mindclash publish the base
  game in Spanish, but there is **no Spanish edition of the Solo Opponents rulebook** — so
  `es.json` sets it `false` even though official Spanish terminology exists and is used
  throughout. `src/i18n/locales/GLOSSARY-es.md` records each term with its rulebook page and
  marks with ⚠ every solo-only term that had to be inferred.
- **A sentence with an inline link or bold run stays ONE key**, rendered by `<T>`
  (`src/i18n/Trans.tsx`): `[**Anachrony**](store)`, `**bold**`, `*italic*`, with hrefs passed
  as a `links` prop. Splitting it into `…before`/`…after` fragments reads tidily in the JSON
  and is unusable — word order moves between languages, so the translator cannot put the link
  where their grammar needs it.
- **Do not expect byte-identical screenshots from an i18n conversion.** Moving a string into a
  locale file coalesces JSX text nodes (`in{' '}<a>` becomes one run) and the browser reshapes
  it by a hair: identical text, identical layout, ~180 antialiasing pixels on one line. That is
  why `pw-i18n-snapshot.mjs` also records **layout geometry** (every element and text-run box,
  quantised to 0.5px) and `pw-i18n-diff.mjs` compares text and layout strictly while budgeting
  pixels. A layout regression moves a box and fails; an antialiasing shift does not.
- **The pseudolocale is how you test a translation you cannot read.** `--pseudo` writes a
  locale that is accented, ~40% longer and bracketed; the run then reports `untranslated.md`
  (text still in English = hard-coded, unreachable by any locale file) and
  `layout-faults.md` (clipped / overflowing / sideways-scrolling). Two traps learned the
  hard way: the padding must be **breakable** — a solid run of one character is an
  unwrappable "word" that manufactures overflow no real language causes — and the harness
  must navigate by **class, not by English button text**, or it cannot drive the very app
  it is testing. `FAULT_SELFTEST=1` proves the detector can still fire.
- **`pw-i18n-review.mjs` is how a translator sees their work.** It captures every reachable
  screen in English and the target language, side by side, into `report.html` — the text AND
  a screenshot, because the commonest translation bug is a longer string overflowing its
  button. It reaches the Action dialogs by turning **Debug on and tapping each hotspot**:
  `onTileClick` with `debug` sets the real `pending` flow, so a tap opens the full guided
  dialog exactly as if the die had sent a marker there. `MODES=all` walks every module,
  which is what covers `tile.*` (a tile's text only renders in a mode that places it).
- **A screen's file name is translated too — pair captures by INDEX.** `pw-i18n-review.mjs`
  names each capture after what is on it, so `023-chronobot-action-Mine-Resource.png` is
  `023-chronobot-action-Extraer-Recurso.png` on the Spanish side. `report.html` paired on the
  full name until 2026-08-28 and therefore printed **"not captured"** for every Action and
  tile dialog — the screens a translator most needs. Both runs walk the same route in the
  same order, so the numeric prefix is the key.
- **Report what the sweep missed.** `--markers` writes a locale of `⟦key⟧` markers and
  `COVERAGE=1` then lists every key no screen displayed. A harness that silently shows two
  thirds of the strings is worse than none — the translator would believe they reviewed
  everything. This is also how the dead keys got found: `action.*.summary`/`.jit` (the
  unbuilt guided runner) and the mode labels render nowhere, so they were pulled from the
  surface rather than left for someone to translate blind.

## Conventions

- Keep the engine pure and tested; add unit tests for new decision logic.
- Rule text shown to players should be **verbatim** from the rulebook where possible.
  A **tap explanation** (a read-only tap on a board Action, a modular tile, or an SCV row)
  shows that verbatim text **expanded** — the rulebook text *is* the explanation. Only fall
  back to app-voice copy where no verbatim text exists. Mid-turn dialogs may keep it
  collapsed.
- **Bold every board location the player has to act on.** Anywhere the app tells the
  player where to put (or move) a bot figure, the location name reads `<b>` — both ends of
  a move: "Move its Exosuit from **Mine** (bottom-most space) to **Construct**". The
  placement gates, `BlinkPanel` and `PlaceExosuitPanel` already do it; a new panel must
  too. History strings are persisted, so they can't hold JSX — they carry `**…**`, which
  `src/history/HistoryText.tsx` renders (same mechanism as the `{flux}` icon token).
- **One icon per piece the player has to pick up.** Where a roll produces components, draw
  that many: two Paradoxes draw two Paradox tokens, two Warp tiles draw two tiles. A single
  icon for any non-zero count is the bug — the die face says what was *rolled*, the icons say
  what to *place*, and a boolean test (`n > 0 &&`) silently collapses the two (fixed for the
  Paradox phase 2026-08-22; the Warp phase already did it). A zero roll draws nothing.
- **The BG Stats export is built in the app, not fetched from the data service.**
  `src/data/bgStats.ts`, pure and tested. The service endpoint still exists and is unused: it
  could neither honour the history screen's per-game selection nor know the mode, and it wrote
  `board: "Solo - Chronobot"` on every play, so a Chronossus game imported as a Chronobot one.
  The format is modelled on a **real `.bgsplay` file** rather than guessed — the bot is the
  seat's `role` with `metaData: {"isNpc":1}` (never a `players` entry), mode parts are joined
  with a FULLWIDTH SOLIDUS `／`, the difficulty is the play's `comments`, and each play carries
  a **stable uuid derived from the saved game's id** so a re-export updates rather than
  duplicates. Only the base game is listed; naming an expansion needs its own BGG id.
- **No decorative icons or emoji in the game UI unless asked for**, with one exception:
  real **in-game component art** (the Flux Core, Energy Core, Exosuit, tile and die faces
  in `public/assets/solo/`). Prefer the component's own art over a stand-in glyph — e.g.
  History shows the Flux Core image on a Blink, not a ⚡. History strings are persisted, so
  they carry an icon **token** (`{flux}`) that `src/history/HistoryText.tsx` swaps for the
  art; add new tokens there.
- **Module dialogs render exactly like base-game Action dialogs.** `DetailPanel` takes a
  `flow` prop: absolutely positioned on the board normally, in normal flow under the top
  bar on small screens (`.dp-flow` beats the `max-width: 640px` full-screen rule). Every
  module dialog (`CxTileDialog`, `HypersyncDialog`, `HypersyncTilePrompt`) takes the same
  prop and is rendered through `renderModDialogs(flow)` alongside `renderDetailPanel(flow)`.
  A new module's dialogs must join that helper — otherwise they go full-screen on a tablet
  while base-game Actions don't.
- **Operators (Fractures) are Workers, not a separate resource.** An Operator is a wildcard
  Worker living in a Worker column, so the Worker trackers already show it — no Operator
  tracker in the UI. The engine still keeps `operators` (a count) and `operatorSlots` (which
  column each sits in) for exactly two reasons: Assimilate's **Square** result takes
  whichever of Operators / Technologies it has fewer of, and the +5 VP Worker-set discard
  has to know how many Operators go back to the Valley supply. When a column holds both a
  plain Worker and an Operator, the set **always discards the Operator** (our call; the
  rulebook doesn't say). Tapping a Worker badge shows how many of that column are Operators.
- **A B-side tile's rule text restates its A side.** The rulebook Appendix writes most B
  sides as "Same as C0nA, but …" — copying that verbatim leaves the player reading a tile
  that doesn't say what it does. `ModularTile.rule` in `chronossusTiles.ts` therefore
  restates the A-side text in full and appends the B-side delta (the base and HFA tiles
  already did; Fractures' C04B/C05B/C14A/C14B were brought in line 2026-08-12). This is the
  one place we knowingly depart from verbatim — note it when adding a module's tiles.
- **Never tell the player to place before the app knows what happens.** With Fractures the
  order is: ask whether the space is free → Blink check → the app picks which Exosuit →
  *then* the instruction (move this one, or place a new one). The placement gate therefore
  only ASKS when a Blink check will follow (`DetailPanel`'s `blinkCheck` prop /
  `valleyGate.blinkCheck`, both `Chronossus.shouldCheckBlink`); with no check possible — no
  Flux Cores in the pool, or no Blink-ready Exosuit — it instructs the placement inline,
  exactly like a base-game Action. Non-Fractures games keep the plain one-step gate. A new
  module that adds Exosuit-placing spaces must follow the same shape.
- **Every Exosuit-placing path has to run the Blink check, right after its placement gate.**
  Mine and Recruit Genius shipped broken because they ask their own question instead of using
  the shared `mech` gate — the only place the check ran. Actions with their own gate route
  through `runBlinkCheck` with a `postBlinkRef` continuation (their resume point can't be
  derived from the Action id), and the check goes immediately after **that gate** — Mine's
  "is a Mining space open?", Genius's "is a Genius available?" — never after a later input
  step. An Action with no gate of its own runs it FIRST: the Adventure opens on the check,
  because a Casing with no figure left means it passes, and asking for the Path marker
  before that has the player place a marker for a turn that never happened. The Blink is settled at the Action's granularity ("a Mine Action space"); *which*
  space it is comes from the input that follows, and the step after the check drops its own
  "place the Exosuit" clause (`placementHandled`).
- **The passing rule runs TWICE per Blink-checked Action.** The Fractures exemption only
  stands in for a Blink that might happen: once the check draws an Empty Flux Casing there is
  no Blink, and "the Chronossus places an Exosuit or passes, as usual" (Solo Opponents p.12)
  resolves to the **pass** when no figure is left. So every Casing continuation re-runs
  `passIfOutOfFigures(actionId, { blinkFailed: true })` (which drops the exemption) before
  falling through to the placement, and the panel says it passes rather than asking for an
  Exosuit that does not exist. Shipping only the first check told the player to place a
  figure the bot did not have.
- **Rule boxes live in the dialog footer, never inside a step box.** Every Action / tile /
  module dialog renders its verbatim 📖 collapsibles below `.dp-body`'s step content, in a
  fixed order — the Action's own rule first, then whatever the current step adds (Blink,
  Time Travel, Autoleap, Exosuit placement). `.place-prompt` step boxes must not contain
  one: a rule box drawn inside the amber box is the bug, not the layout.
  **This holds on every screen, not just dialogs** (2026-08-20): the phase bodies, both Setup
  flows and both score screens put their verbatim boxes last too — the app's own instructions
  first, the rulebook text under them. On the score screens "last" means *above* the sticky
  `.score-actions` row, since anything after it renders underneath it.
- **The Turn overview is not Phase-5-only.** Its counts, trackers, modes, difficulty and recent
  bot turns are just as useful between phases, so both bots' `PhaseScreen` headers carry the
  same `.turn-chip` the Action Rounds top bar does. The Chronossus's `<TurnBarOverview>` lives
  in a `turnOverview` const above both returns; the Chronobot's is in its shared `modals`. Off
  the Action Rounds the pass hint would answer a question the player has not reached, so both
  swap it for a neutral line and suppress the "Action Rounds Phase ends" flag
  (`isActionsPhase` gates both).
- **A new module's Action must show up in History.** `summarizeTurn` was written against
  the Chronobot's state, so it cannot see module-only pools; `summarizeChronossusExtras`
  in `ChronossusGame.tsx` adds the Chronossus/Fractures deltas (Flux Cores, Technologies,
  Operators). Extend it when a module adds a tracked resource, and check both tile sides
  (A/B) and the module's combos.
- Match surrounding code style; `npm run build` and `npm test` must stay clean before
  committing.
- Board art is copyrighted → the GitHub repo is **private**.
