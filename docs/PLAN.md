# Anachrony Solo-Guide — Understanding & Build Plan

> Working plan for the app that guides a solo player through Anachrony's automa
> opponents (primary: **Chronossus**; secondary: **Chronobot**). The app runs
> only the *bot's* turns, tells the player where to move physical pieces, and
> performs random draws (e.g. the Chronossus Energy Pool) on the player's behalf.

> **Status (2026-08-15): Chronobot, Chronossus base, all 10 difficulty options, Alternate
> Timelines, Variable Anomalies, Fractures of Time, Guardians of the Council and Pioneers of
> New Earth are complete. Pioneers is on `staging`; everything before it is live in
> production. The active plan is `docs/plans/PLAN_pioneers.md`.**
> Chronobot shipped its full guided Era loop + optional BGE login / My-history / admin
> stats / in-app rules frame (2026-07-31). **Chronossus base shipped 2026-08-09** — the
> shared solo-bot core, engine/view, action tiles, Autoleap, Hypersync module, real
> per-phase bodies, module selection, and scoring are all live
> (`docs/complete/20260809_CHRONOSSUS_BASE_COMPLETED.md`); `chronossus.implemented` is
> `true`. **2026-08-10:** the playthrough test harness, all 10 base+HFA difficulty
> options (D1–D10), and two new extra modules — **Alternate Timelines** and **Variable
> Anomalies** (prioritized ahead of Fractures; Variable Anomalies only needs the
> physical Fractures expansion box, not its main module) — shipped.
> **2026-08-11:** a guided-phase UX pass off playtest feedback — one prompt style across
> every non-Action phase (themed per bot), prompts kept on their phase screen with the
> roll that triggered them, ↶ Undo on the phase screens with every phase advance
> undoable, and the Hypersync/Alternate-Timelines rules sourced verbatim. Parts 1–3 of the
> active plan plus that pass are **merged to `main`/production**.
> **2026-08-11 (later):** **Fractures of Time** (Part 4) is built and on staging — Flux Pool
> + Blinking, the Valley board Actions (Assimilate / Extract / Power Pack, C04–C06 + C14),
> Operators as wildcard Workers, module scoring, and the `fractures+hypersync` combo. The
> Valley board stays player-managed by design, so no new board art was needed.
> **2026-08-12:** the playtest's turn-overview + History polish (F7) shipped — the Turn
> panel lost its dead space and pass-state boxes, the count reads `Bot Turns` on the title
> line, and a Blink is called out in History. Plan items F4 (board overlays) and F5
> (scoring/objectives) were dropped as unnecessary.
> **2026-08-13:** the Fractures playtest-fix pass (F8) — placement now asks, Blink-checks,
> decides, *then* instructs; Mine and Recruit Genius joined the Blink check; module dialogs
> render like base-game Action dialogs and every one puts its verbatim rule box below the
> body; History gained the module-only deltas. **Merged to `main`/production and the whole
> plan archived** to `docs/complete/20260813_CHRONOSSUS_DIFFICULTY_TEST_FRACTURES_COMPLETED.md`.
> The one item it closed unfinished is a manual on-device playthrough.
> **2026-08-14:** **Guardians of the Council** + the `guardians+hypersync` combo shipped —
> the Guardian as a powered-first, placed-last Exosuit, its own reserved board space as a
> no-space fallback, C11 Acquire Guardian, and two difficulty options. Four playtest rounds
> fixed two real rules bugs and a lost-Autoleap bug. Archived to
> `docs/complete/20260814_GUARDIANS_COMPLETED.md`.
> **2026-08-15:** **Pioneers of New Earth** shipped to `staging` with both combos
> (`fractures+pioneers`, `guardians+pioneers`) — the Adventure Action, the Chronossus Exosuit
> Upgrade board, all 36 Adventure cards with the bot's four conversions, two deck modes
> (its own shuffled copy by default, showing real card art), and the first use of the
> slot-IV covering path (C10 over "Recruit Genius or Research"). See
> `docs/plans/PLAN_pioneers.md` + `LOG_pioneers.md`. Remaining candidates (Doomsday,
> Chronossus stats/history) stay in `TODO.md`; each becomes its own `/plan`. The Chronossus knowledge, references, and design
> decisions here remain the source material behind those efforts.

## 1. What the app is (and isn't)

- **Is:** a step-by-step "automa runner." Each Era it walks the player through the
  bot's Paradox → Power Up → Warp → Action Rounds → Clean Up phases, resolving all
  bot randomness (AI die, Energy Pool bag draws, paradox rolls) and telling the
  player exactly which physical pieces to move where.
- **Isn't:** a simulation of the *human's* game. The player tracks their own board,
  resources, and VP physically. The app only needs enough game state to drive bot
  decisions (Timeline warp counts, Impact status, era, the bot's own tallies).
- **Login:** optional, via the shared auth system (staging). Only gates saved stats
  (win/loss, scores, difficulty). The whole app must work fully logged-out.
- **Hosting:** Digital Ocean, same pattern as GameBrain / Bullet / Marvel.

## 2. Reference materials (outside the repo)

`C:/Users/shawn/OneDrive/Program Development/Anachrony Chronossus/reference/`

| Source | Use |
|---|---|
| `Rules/Anachrony-Chronobot-and-Chronossus-Solo-Opponents…pdf` (24 pp) | **Primary source of truth** for both automas |
| `Rules/The-Chronobot-PnP.pdf` | Official PnP for Chronobot solo components |
| `Rules/Anachrony-Essential-Edition…pdf` | Base game rules (Action definitions the automas reference) |
| `Rules/Anachrony-Fractures-of-Time / Future-Imperfect / Classic…pdf` | Module rules that alter automa setup/behavior |
| `TTS Mod/*.ttsmod` (ZIP) | Art library. `Mods/Workshop/3712676277.json` = save; images hash-named under `Mods/Images/` |

**Reading pipeline (important):** the rulebooks are icon-heavy; `pdftotext` garbles
them. **PyMuPDF (`import fitz`) renders pages to clean PNGs** and is the reliable way
to read the visual rules and matched components. (Native Python → use `C:/…` paths.)

**TTS matching reality:** TTS objects are mostly generically named ("Card",
"Custom_Model"), and images are hash-named — so art must be matched **visually /
positionally**, not by nickname. The user confirmed the mod has **no scripted solo
logic** but **does** have setup scripting worth following for board/piece layout.

## 3. Game understanding — current state

### Shared solo components (double-sided Chronobot / Chronossus)
Solo board, Solo banner + standee, 8 Solo Warp tiles, 6 hex Exosuit markers,
4 Command tokens (colored rims), AI die (= the Flux die, reused), 8 Solo Objective
cards, 4 Solo Path markers.

### Chronossus-specific
Chronossus board side; Action tiles **C01–C14** (A/B sides); 5 Energy Core + 5
Exhausted Energy Core tokens; an "Energy Pool" container; Empty Flux Casing tokens.

### Chronobot automa (base-game only, simpler — foundation for Chronossus)
- **Power Up:** pre-Impact powers up 6 exosuits, post-Impact 4. No resource cost.
- **Actions** with fixed priority rules: Construct (higher-VP building), Recruit
  (Genius > Administrator > Engineer > Scientist), Research (roll shape die),
  Mine Resource (Neutronium > Uranium > Gold > Titanium), Time Travel, Remove
  Anomaly (discard 2 cubes: Titanium > Gold > Uranium > Neutronium), Reboot (does
  nothing, not a failed action), Recruit Genius/Research, never Evacuates.
- **Failed Action** → places Exosuit + 1 VP instead of effect.
- Takes **≥ 3 Actions**; out of exosuits → one Time Travel then passes.

### Chronossus automa (primary target — builds on Chronobot)
Per-Era phases:
1. **Paradox** — same as Chronobot (on Anomaly, stop; remove a Warp tile from the
   Timeline tile where it has most, oldest if tied; cap 3 anomalies).
2. **Power Up** — draw **3 tokens from the Energy Pool**. Pre-Impact powers up
   `3 + X` exosuits, post-Impact `2 + X`, where X = non-exhausted Energy Cores drawn
   (max 6 / 4). Return **1** drawn Exhausted core to the pool; remove the other drawn
   tokens from the game. If < 3 tokens remain, draw as many as possible. **← the app
   performs this bag draw.**
3. **Warp** — Chronossus places Warp tiles = rolled paradoxes; player chooses 0–2.
4. **Action Rounds** — roll AI die; perform the Action above/below the numbered
   token, then advance it. Command tokens follow their rim-colored arrow. **Autoleap
   (!)** resolves that tile immediately, then advances one more space (two actions).
   Failed Action → **1 VP + discard an active Exosuit** (harsher than Chronobot).
   Passes when out of exosuits.
5. **Clean Up** — retrieve exosuits; flip Collapsing Capital tiles after Impact.

- **Action tiles C01A/C02A/C03A** at setup (base). Modules swap in C04–C14 per the
  **"Reference Table of Action Tiles Used in Each Module"** (appendix, PDF page 18) —
  this table *is* the engine's per-expansion config and has been captured visually.
- **Solo Objectives** (8; reveal 3; score highest Bronze/Silver/Gold reached):
  Workers, Breakthroughs, Water, Occupied Building Spots, Morale, Sum of Time-Travel
  Range, Superprojects, Successful Time Travels.
- **Difficulty knobs:** flip tiles to B side, swap tile slots, +cores, extra power-up,
  leftover-core VP, fewer objectives, +VP per Failed Action, distinct Research shapes.

### Open verification items (need a page render to confirm exact icons/numbers)
- Exact Action-tile A/B effects for C01–C14 (appendix pp. 18–19) — icon-level.
- The AI-die faces and the Chronossus board's arrow routing / slot ↔ number mapping.
- Chronossus end-scoring "1 VP per Breakthrough +2 per set" (OCR showed a garbled
  "12" — cross-check against the image).
- Module-specific automa changes (Fractures, Doomsday, Pioneers, Guardians, Hypersync).

## 4. Assessment of the two existing apps

| | **profdrdre/chronobot** | **chomyczek/boardgame.bot.chronossus** |
|---|---|---|
| Scope | Chronobot only | Chronossus only |
| Stack | HTML/JS + Pixi.js, client-side | Python, `src/{core,cli}`, tests + CI |
| UI | Browser canvas | CLI / library (no web UI) |
| Draws for user | Not evident | Rule-following aid; player keeps physical pieces |
| Login / stats | None | None |
| Hosting | No deploy docs | No releases; the Chronossus one isn't hosted |

**Takeaways for our design:**
- Neither covers **both** bots, **expansions/modules**, **optional login + stats**, or
  a **guided-instruction web UI** — which is exactly our differentiated scope.
- `profdrdre/chronobot` is a useful **UX reference** for on-screen piece layout, but
  Pixi.js canvas is heavier than we need; our React + instruction-list model is simpler
  and more maintainable.
- `chomyczek/boardgame.bot.chronossus` is the most valuable **logic reference** — it
  encodes the Chronossus decision procedure and has tests. It's Python, so not directly
  reusable in our TS engine, but worth porting its decision tables / reading its tests
  as an oracle. Worth a deeper source read before we implement Action resolution.
- Confirms our architecture choice: keep a **framework-agnostic TS `BotModule` engine**
  (already scaffolded) so both bots + modules plug in, with React only rendering
  instructions.

## 5. Confirmed decisions (2026-07-22)

- **Build order:** Base **Chronobot** → **Chronossus base** → **Chronossus + Fractures
  of Time**. (Chronobot is base-game only — confirmed by the rulebook.)
- **Art source:** **TTS art, hand-matched** (build a hash→component manifest).
- Still open: shared-auth integration contract for the optional login/stats.

## 5b. UX design decisions (2026-07-22)

- **Two views of the Action Rounds phase:**
  - *Board view* — faithful render of the solo board (TTS art) showing current
    Command-token positions and their colored arrow routing (spatial reference).
  - *Roll-outcome grid* (**the fast default**) — every AI-die outcome shown at once,
    one row each: **current action / what resolves this turn (incl. Autoleap chain) /
    what it advances to**. The player scans all outcomes, then **taps the rolled
    number** to apply it. Collapses "read board → trace arrow → recall rule" to one tap.
- **App performs ALL bot randomness** — it auto-rolls the AI die and draws the Energy
  Pool (and paradox rolls). The player never handles the bag or the AI die.
- **Just-in-time rule explanations on every action** — each instruction shows the
  imperative result, with tap-to-expand "why"/priority detail. Baseline copy adapted
  from the mod's authored XmlUI phase text + rulebook (fits `Instruction{text,detail}`).
- **Improvement thesis vs. existing apps:** they are *bookkeeping trackers* (one bot,
  no modules, no explanations, no draws-for-you, not all hosted). Ours is a **guide**
  that teaches + decides + does the randomness, works for a first-time automa player,
  supports both bots + modules, and offers optional login/stats.

## 6. Build phases

- **Phase 0 — Knowledge capture. ✅ done** for Chronobot (rules transcribed into
  `chronobotActions.ts` + `phaseMeta.ts`). Chronossus icon/tile capture (§Open
  verification items) still pending when Phase 2 begins.
- **Phase 1 — Chronobot engine. ✅ done.** Pure phase functions + decision helpers in
  `src/engine/bots/chronobot.ts`, fully unit-tested.
- **Phase 3 — Guided web UI. ✅ done** (for Chronobot). The full per-Era phase loop
  (Landing → Start/Difficulty/Setup → Phases 1–6 → End Game) ships in `BoardExplorer`
  + `src/phases/` + `src/game/flow.ts`. Deployed to Digital Ocean.
- **Phase 2 — Chronossus base engine. ✅ done (2026-08-09).** Energy Pool bag draws,
  phases, Action tiles C01A–C03A, Autoleap, failed-action penalty, Solo Objective scoring,
  plus (2026-08-10) the playthrough test harness and all 10 difficulty options.
- **Phase 4 — Modules/expansions. ← IN PROGRESS.** Shipped: **Hypersync Future Actions**
  (2026-08-09), **Alternate Timelines** + **Variable Anomalies** (2026-08-10), **Fractures
  of Time** and the `fractures+hypersync` combo (2026-08-13), **Guardians of the Council**
  and `guardians+hypersync` (2026-08-14). Remaining: Doomsday, Pioneers — each its own
  `/plan`, via the C04–C14 tile table + per-module deltas.
- **Phase 5 — Optional login + stats.** Shared-auth (staging) integration; persist
  results only when logged in. (Chronobot already deploys to Digital Ocean.)
- **Cross-cutting — Asset pipeline.** Script to extract TTS images, render thumbnails,
  and hand-map hash→component into an asset manifest the UI imports.

## 7. Remaining open items
- Everything Chronobot-specific is **done** (see the completed archive). Open work is
  **Chronossus** and beyond; loose ends are tracked in `TODO.md` (incl. confirming the
  **shared-auth** integration contract before Phase 5).
