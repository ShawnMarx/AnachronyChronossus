# PLAN — Chronossus (base game) solo opponent

**Status:** parked (concept) · finalized but not started — parked 2026-07-31 after
Chronobot reached its main stopping point. Promote back to `docs/plans/` with
`/plan create` when picked up. The original empty execution log was dropped on parking.
**Scope:** Base-game Chronossus only. Fractures of Time (Flux Pool / Flux Cores /
Fracture Device) and other modules are explicitly deferred to a later iteration.
**Gating:** Chronossus mode is **admin-only** (`shawn@shawnmarx.com` / `dumah`) or any
local run. Everyone else keeps the existing "Coming Soon" card. In dev this is free —
`fetchMe()` already returns `{ isAdmin: true }` on local runs.

## Overview & goal

Add a second guided solo opponent — **Chronossus** — reusing as much of the Chronobot
machinery as possible. The rulebook itself frames Chronossus as "Chronobot + deltas"
("The following rules explanation assumes you have read and are familiar with the
Chronobot rules"), so the right architecture is a **shared solo-bot core** with a
small, well-defined set of Chronossus-specific behaviors layered on top.

Primary player-visible deliverables:
1. Chronossus playable end-to-end for the base game (Setup → 6 Eras → Score).
2. A Chronossus-specific **color theme** derived from the board art.
3. An on-screen **Energy Pool tracker** (`#/#` Energized / Exhausted) and the top-bar
   `Actions #` button repurposed to `# Exo`.
4. Admin-gated landing card.

---

## What's already in place (verified this session)

- **Board art:** `public/assets/solo/board-chronossus.jpg` ✓ (1500×1110-class, same
  layout family as Chronobot). **Hero:** `chronossus-hero.jpg` ✓.
- **Shared engine seam:** `GameState` already splits shared fields (`era`, `impact`,
  `phase`, `firstPlayer`, `playerPassed`, `endgameTriggered`, `log`…) from a
  bot-specific `chronobot: ChronobotState` slice. `Phase`, `PHASE_ORDER`,
  `PHASE_NUMBER` are bot-agnostic. `src/game/flow.ts` phase-flow is largely reusable.
- **Registry:** `chronossus.ts` scaffold exists (`implemented: false`); `BotModule`
  metadata drives the Landing card + "Coming Soon".
- **Auth/gating:** `useAuth().user.isAdmin` + `isLocalRun()` already exist — no new
  auth work needed, just consumption.

## Asset findings (TTS mod + rulebook)

Extracted `Anachrony [ Scripted - Expansions ] (3712676277).ttsmod` and mapped
Nicknames → art. Results:

| Piece | Source status | Recommendation |
|---|---|---|
| Chronossus board | ✓ already in repo | done |
| Chronossus hero | ✓ already in repo | done |
| Energy Core / Exhausted Energy Core | TTS has only a **3D `Custom_Model` texture** (green hex, glowing) — projection-distorted, not a clean flat icon | **Crop from rulebook p.8** (crisp token art shown next to "5 Energy Core / 5 Exhausted Energy Core tokens"). User to provide crops. |
| **Flux Cores / Flux Pool** | TTS objects exist (purple canister texture) | **Fractures of Time only — DEFER.** Confirms flux device is a later phase, not base. |
| 3 modular Action tiles (C01/C02/C03, A & B sides) | Printed on board's dashed empty spaces (I/II/III) + full art in **appendix pp.19–20** | Crop A & B faces from appendix. |
| Command tokens (4, colored rims) | On board; Chronobot's `marker-{2,3,4,5}.png` may be reusable but Chronossus rims are **differently colored** (must follow matching-color arrows) | Start by reusing Chronobot markers; swap for Chronossus-tinted variants if visually wrong. |
| Warp tiles / warp marker | `warp-tile.png` shared ✓ | reuse |
| Time Travel marker | `timetravel-marker.png` shared ✓ (track is identical: 2/4/6/8/10/12) | reuse |
| Solo Objective cards (3) | Appendix pp.21–22 | Represent as **UI tracker** (Bronze/Silver/Gold levels); optional card crops for flavor. |

**Reference paths:** rulebook at `…/reference/Rules/Anachrony-Chronobot-and-Chronossus-
Solo-Opponents-…pdf` — **Chronossus section = pp. 8–10 (rules), appendix pp. 19–22**
(0-indexed PDF pages 7–9 and 18–22). TTS extraction lives in this session's scratchpad.

## Color scheme (from the board)

Board palette is distinctly warmer than the Chronobot's: **burnt orange / rust**
(`~#C4551F`), **amber-gold** highlights (`~#E8922E`), a bright **fiery core** cream/white
burst center, deep **charcoal-brown** shadow, with **teal** (`~#2E8C8C`) and **cobalt**
token-rim accents. Deliverable: a `--chrono-*` CSS custom-property theme scoped to the
Chronossus view (mirror the existing Chronobot styling, retinted). Exact hexes to be
sampled from `board-chronossus.jpg` during Feature 2.

---

## Mechanism deltas: Chronossus vs. Chronobot (base game)

Transcribed from rulebook pp. 8–10. **Same as Chronobot** unless listed:

| Area | Chronossus behavior |
|---|---|
| **Components** | 6 Exosuits, 8 Warp tiles, **no** starting assets/workers. 4 Command tokens with **colored rims** (follow matching-color arrows). **No Focus marker.** |
| **Energy Pool** | A bag of **5 Energy Cores + 5 Exhausted Energy Cores**. This replaces the Chronobot's fixed power-up counts. |
| **Setup** | Place 3 modular Action tiles (C01A/C02A/C03A) on the marked empty spaces. Reveal **3 Solo Objective cards** (shuffle, no Endgame Condition cards). Chronossus is **First Player in Era 1**; player gets **+1 Water**. |
| **1 Preparation** | Same as Chronobot. |
| **2 Paradox** | **Identical** to Chronobot. |
| **3 Power Up** | Draw **3 tokens** from Energy Pool. Power up **3+X** Exosuits before Impact (max 6) / **2+X** after Impact (max 4), where **X = non-exhausted cores drawn**. Then **return 1 drawn Exhausted core** to the pool, **remove all other** drawn tokens from the game. If **<3 tokens** remain, draw as many as possible next time. |
| **4 Warp** | Same as Chronobot (place Warp = rolled Paradoxes). |
| **5 Action Rounds** | Roll AI die → perform Action **above _or_ below** the token bearing that number (possibly on an Action tile), then advance the token one space. |
| **Autoleap** | If a token moves onto a space with the **Autoleap symbol (!)**, immediately resolve that tile's action, **then advance one more** → **two actions in one turn** (rolled + autoleap). |
| **Gaining Energy Cores** | Some actions add **1 non-exhausted Energy Core** to the pool (end of that action). Never interact with Exhausted cores this way. |
| **Passing** | When out of Exosuits, Chronossus passes the **next** time an action would require placing an Exosuit. **Token does not advance on a pass.** Both passed → phase ends. (No fixed "min 3 actions" like Chronobot.) |
| **Failed Action nuance** | If it gains 1 VP for being unable to place an Exosuit (no free space), it **additionally discards an active Exosuit**. |
| **6 Clean Up** | Same as Chronobot. |
| **Scoring** | 1 VP/Breakthrough + 2/complete shape set; **no VP loss** for Warp tiles left on Timeline; **PLUS** highest level reached on each of the 3 **Solo Objectives** (Bronze/Silver/Gold). |
| **Difficulty options** | Flip Action tiles to B side; swap tiles between spaces; +1/2/3 Energy Cores at start; +1 free Exosuit/Era (excess → 2 VP/core); leftover non-exhausted cores = 1 VP each; fewer/no Solo Objectives; +2 VP per Failed Action; Research always takes a new shape. |

**Action catalog (C01–C13 etc.):** the individual action rules are largely unchanged
from the Chronobot; the appendix (pp.19–20) lists the A/B variants that differ. These
map onto the existing `chronobotActions.ts` catalog — Chronossus needs a parallel/augmented
catalog for the tile-specific (Cxx A/B) actions and Autoleap wiring.

---

## Recommended architecture — the shared framework

The user's instinct is right: build a **common core, define the differences**. Proposed
shape (incremental, regression-safe — Chronobot behavior must not change):

1. **Generalize the bot slice.** Rename/abstract so `GameState` holds `bot: SoloBotState`
   (a discriminated union or a `botId` + per-bot slice). Keep `chronobot` working
   unchanged; add `chronossus` alongside. Shared top-level fields stay put.
2. **`SoloBot` module interface** (extend `BotModule`): pure phase functions
   (`preparation`, `paradox`, `powerUp`, `warp`, `actionTurn`, `cleanUp`, `score`) +
   decision helpers + `passDecision`. Chronobot's existing functions become its
   implementation; Chronossus provides its own. `src/game/flow.ts` calls the interface,
   not `Chronobot.*` directly.
3. **Reuse verbatim:** Paradox, Warp, Preparation, Clean Up phase logic and the
   Time Travel track are shared — Chronossus should call the same code paths.
4. **Chronossus-specific engine:** Energy Pool draw/refill, Power-Up count math,
   Action-tile + Autoleap resolution, Energy-Core gaining, Solo-Objective scoring.
5. **UI parameterization:** `BoardExplorer` becomes theme/asset/bot aware (board image,
   color vars, path anchors, top-bar tracker) rather than hardcoded to Chronobot.

**Guardrail:** every refactor step keeps `npm test` (39 tests) green and `npm run build`
clean. Add Chronossus unit tests as each decision helper lands.

---

## Feature list & implementation order

Ordered so the engine is proven before UI, and Chronobot never regresses.

**Feature 1 — Shared solo-bot framework (refactor, no behavior change).**
Introduce the `SoloBot` interface + generalized state slice; route `flow.ts` through it;
Chronobot re-expressed as an implementation. Tests stay green. *Files:* `engine/state.ts`,
`engine/bots/BotModule.ts`, `engine/bots/chronobot.ts`, `engine/index.ts`, `game/flow.ts`.

**Feature 2 — Assets & Chronossus theme.**
Land cropped assets (energy core / exhausted / action tiles), add `chronossus-icons`
handling if a sprite sheet is needed, and a retinted `--chrono-*` CSS theme sampled from
the board. *Files:* `public/assets/solo/chronossus/*`, `BoardExplorer.css`, a theme module.

**Feature 3 — Chronossus engine: state + Power Up (Energy Pool).**
`ChronossusState` (energyPool energized/exhausted counts, 6 Exosuits, action tiles,
solo objectives), `emptyChronossusState`, Power-Up draw/power/refill math with tests.
*Files:* `engine/state.ts`, `engine/bots/chronossus.ts`, `engine/rules/chronossusActions.ts`,
`engine/bots/chronossus.test.ts`.

**Feature 4 — Chronossus engine: Action Rounds, Action tiles, Autoleap, passing, gaining cores.**
AI-die → above/below token, tile resolution, Autoleap double-action, Energy-Core gain,
pass rule (token doesn't advance), Failed-Action discard nuance. Tests for each.
**Generalize the token model first:** the Chronobot's advance/stacking logic
(`advanceActiveToken`, the two-shared-path assumption, and the paired-marker split) is
written around Token 3 on the Short path + 2/4/5 on one shared Long path. Chronossus needs
**N independent per-token routes that can co-occupy a space** (see Feature 6 / paths). So
rework the engine model to: each token advances along **its own** ordered route; the
stacking/bump (max-two-per-spot) and paired-split rules key off *board spot occupancy by any
token(s)*, not off a single shared path. This is engine work, not just board coordinates —
land it before wiring the Action Rounds turn loop, with unit tests for overlapping-occupancy
and bump cases.

**Feature 5 — Chronossus engine: scoring + Solo Objectives.**
`scoreChronossus` (breakthroughs + sets + solo-objective levels), objective definitions
(appendix pp.21–22). Tests.

**Feature 6 — UI: BoardExplorer for Chronossus.**
Board image + theme + path anchors (calibrate command-token steps on the Chronossus
board), per-phase bodies, action/Autoleap dialogs, Solo-Objective tracker, score screen.
Repurpose top-bar `Actions #` → **`# Exo`**; add **Energy Pool `#/#`** tracker
(Energized / Exhausted). *Files:* `BoardExplorer.tsx`, new `board/chronossusPaths.ts`,
`board/chronossusHotspots.ts`, `phases/*`.

**Reuse coordinate mappings for matching action *spaces* (but NOT the paths):** the two
solo boards share the same layout family — **many action spaces are identical** (Mine,
Power Plant, Recruit, Factory, Water, Time Travel, Research, Lab, Remove Anomaly, the Time
Travel track, etc.). For every *hotspot/tap-tile* that matches, **carry over the existing
`chronobotHotspots.ts` %-anchors as the starting coordinates** rather than re-calibrating
from scratch — then only nudge the Chronossus-specific spots (the 3 modular Action-tile
slots I/II/III, the Autoleap markers, the Energy Pool area). Verify with `pw-validate.mjs`.

**Command-token paths are a full rebuild, not a reuse.** The Chronobot model (Token 3 on
one Short path, 2/4/5 on one shared Long path — `SHORT_PATH`/`LONG_PATH` in
`chronobotPaths.ts`) does **not** carry over. On Chronossus **each of the 4 command tokens
follows its own unique route** (it must follow the arrow of its matching rim color), and
**those routes overlap** — different tokens pass through the *same board space* at different
points in their sequences. Implications for `chronossusPaths.ts`:
- Model **4 separate ordered anchor lists** (one per token 2/3/4/5), each its own colored
  route — not two shared paths.
- A given board coordinate can appear in **multiple** tokens' sequences (overlapping spots),
  so anchors are keyed per-token-per-step, not globally unique. The stacking/bump rule and
  the paired-marker split logic must handle multiple *different* tokens sharing a spot.
- These paths must be **calibrated from scratch** on the Chronossus board (calibrate mode
  → per-token step anchors); none of the Chronobot path %-anchors are valid here.

**Dev-flow harness (build Feature 6 against this):** while developing, the Chronossus
view should **boot straight into Phase 5 (Action Rounds) in Debug mode** — skip
Setup → Preparation → Paradox → Power Up → Warp — seeded with **4 powered Exosuits**
available, so command-token movement, the AI die, action tiles, and Autoleap can be
exercised turn-after-turn without replaying the earlier phases each time. Gate this behind
the existing Debug toggle (Debug-only; never fires in play mode) so it never leaks into a
real game. This is a testing shortcut, not the real entry point — the full
Setup → … → Phase 5 flow still ships for actual play.

**Feature 7 — Landing + admin gating.**
Chronossus card becomes **playable when `isAdmin || isLocalRun`**, else "Coming Soon".
Wire `AppRoot`/`main.tsx` to launch the Chronossus view. Flip `chronossus.implemented`.
*Files:* `Landing.tsx`, `AppRoot.tsx`, `main.tsx`, `engine/bots/chronossus.ts`.

**Feature 8 — Playthrough test + polish.**
End-to-end Chronossus playthrough test (mirror `playthrough.test.ts`), persistence
(save/undo/history keyed per bot), mobile checks.

---

## Deferred (future iterations)

- **Fractures of Time**: Flux Pool / Flux Cores / Fracture Device, the `X`-series
  actions (X06/X08/X13), expansion Solo Objectives (appendix p.22).
- Other modules/expansions (Doomsday, Pioneers, etc.).
- Chronossus-specific stats/history in `AdminStats`.

## Open questions

1. **Framework depth (Feature 1):** full `SoloBot` interface refactor up front, or build
   Chronossus alongside Chronobot and extract shared code opportunistically? Plan assumes
   a *pragmatic* refactor (generalize the state slice + a thin interface), not a
   ground-up rewrite. Confirm appetite.
2. **Command-token art:** reuse Chronobot's `marker-{2..5}.png`, or produce
   Chronossus-tinted rims to match the colored-arrow rule? (Defaulting to reuse first.)
3. **Solo Objectives UI:** tracker-only, or also show cropped card art?
4. **Persistence:** one saved slot per bot, or shared? (Assuming per-bot.)
