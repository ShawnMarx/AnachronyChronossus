# PLAN — Chronossus difficulty options, playthrough tests, & Fractures of Time

## Overview & goal

Three connected efforts on the now-shipped Chronossus base opponent, in dependency order:

1. **Playthrough test harness (first)** — a reusable end-to-end engine test that drives a
   whole Chronossus game, with a per-mode variation (base, HFA, …). It's the regression
   guardrail that protects the difficulty-engine work and the Fractures module as they land.
2. **Difficulty settings** — the difficulty options are already **stubbed** in the Setup
   flow (visible, disabled). Implement the real **engine logic** for each, **one option at
   a time with a feedback pause**, for the base game and the HFA (Hypersync Future Actions)
   module. Un-stub each as it lands.
3. **Fractures of Time** — the full expansion module (Flux Pool / Cores / Fracture Device,
   X-series actions, expansion objectives), end-to-end, ending with its own playthrough
   test variation.

Every step keeps `npm run build` clean and `npm test` green; the Chronobot and the shipped
Chronossus base must never regress. Rule text shown to players stays **verbatim** where
possible.

Rulebook: `…/reference/Rules/Anachrony-Chronobot-and-Chronossus-Solo-Opponents-…pdf`
(Chronossus base pp. 8–10, difficulty **p. 10**, appendix pp. 19–22). Fractures rules in
`…/reference/Rules/Anachrony-Fractures-of-Time-…pdf` and the Future-Imperfect/HFA rulebook.

### Decisions (confirmed)
- **Sequence:** test harness → difficulty → Fractures.
- **Fractures:** full module in this plan (not just a scaffold).
- **Difficulty:** stubs already exist; work each option **one at a time for feedback**
  (list the option + intended logic, get a thumbs-up, implement, test, un-stub).

### Current-state facts (from the code)
- **No difficulty flag is read by the engine yet.** Only setup-text flags
  (`chronossus-tiles-b-side`, `chronossus-hex-unavailable`) and `chronossus-hypersync-targeted`
  affect anything today, via config/UI — not the engine.
- `scoreChronossus(bot)` takes **only the bot**; scoring-based options (leftover-energy VP,
  failed-action VP) will need `config` (or new counters on `ChronossusState`) threaded in.
- Difficulty is stored as `config.difficulty: string[]`. Options live in
  `DIFFICULTY_OPTIONS` (base) + `MODE_DIFFICULTY.hypersync` (HFA) in
  `src/phases/ChronossusSetupFlow.tsx`; most are rendered disabled ("Coming soon").
- The existing `src/engine/playthrough.test.ts` is **Chronobot-only**.

---

## PART 1 — Playthrough test harness  *(do first)*

Goal: a shared helper that plays a full Chronossus game deterministically (inject dice /
energy draws / answers), asserting it completes, invariants hold, and the score is sane.

### T1. Base-game playthrough test
- [ ] `src/engine/chronossusPlaythrough.test.ts` — drive setup → (per Era) Preparation →
  Paradox → Power Up → Warp → Action Rounds (take turns until both pass) → Clean Up → next
  Era → End Game. Inject deterministic energy draws, AI-die values, and paradox/warp rolls.
- [ ] Assert: no throws; Exosuit/energy/paradox invariants hold each phase; `scoreChronossus`
  returns a coherent breakdown; game ends at `MAX_ERA`.
- [ ] Factor the driver into a reusable `playChronossus({ config, rolls… })` helper so mode
  variations differ only by config + injected values.

### T2. HFA (Hypersync) variation
- [ ] Same driver with the `hypersync` mode config (C12A/C13A tiles, Hypersync Action flow,
  Solo Hypersync tiles). Assert the Hypersync Action + Autoleap paths execute.

### T3. Extensibility
- [ ] Document (in the test file header) how to add a per-mode variation, so **Fractures**
  (Part 3) and future modes drop in a new `describe` with their config. Each new mode ships
  with its playthrough variation.

---

## PART 2 — Difficulty settings (one option at a time)

Each option below is its own execution step: **(a)** restate the rule + intended engine
logic and get feedback, **(b)** implement, **(c)** unit-test, **(d)** enable it in the Setup
flow (move out of "Coming soon"), **(e)** extend the relevant playthrough variation if it
changes end-to-end behavior. Flags/labels are the existing stubs in `ChronossusSetupFlow.tsx`.

**Prereq D0 — scoring seam:** thread `config` (or new `ChronossusState` counters) into
`scoreChronossus` so scoring options (D5, D7) have what they need. One small refactor up front.

### Base-game options (`DIFFICULTY_OPTIONS`)
- [ ] **D1 — `chronossus-tiles-b-side`** (already live) — verify + cover with a test; no new work expected.
- [ ] **D2 — `chronossus-swap-tiles`** — swap Action tiles between the two marked spaces.
  Engine/config: which action sits on which board space must reflect the swap so command
  markers resolve the right tile; plus setup instruction.
- [ ] **D3 — `chronossus-extra-energy`** — +1/2/3 Energy Cores in the starting pool (needs a
  1/2/3 sub-selector). Engine: initial `EnergyPool`.
- [ ] **D4 — `chronossus-extra-powerup`** — one extra powered Exosuit each Era for free; if it
  would exceed the Exosuit max, +2 VP per excess drawn core instead (cores still removed).
  Engine: `resolvePowerUp` / `poweredExosuits`.
- [ ] **D5 — `chronossus-leftover-energy-vp`** — each leftover non-exhausted core at game end
  = 1 VP. Engine: `scoreChronossus` (needs D0) + a score-screen line.
- [ ] **D6 — `chronossus-fewer-objectives`** — play with fewer (or no) Solo Objectives.
  Player-side/setup only (reveal N instead of 3); no bot-engine logic. Setup-text + reveal count.
- [ ] **D7 — `chronossus-failed-action-vp`** — +2 VP per Failed Action. Engine: count Failed
  Actions (add a counter if not tracked) + score it (needs D0).
- [ ] **D8 — `chronossus-research-new-shape`** — on Research, take a Breakthrough shape the
  Chronossus doesn't already have. Engine: Research resolution + the shape die/choice.
- [ ] **D9 — `chronossus-hex-unavailable`** (World Council) — cover the right World Council
  space (partly live as a setup line). Verify + finalize; confirm any action-availability effect.

### HFA module option (`MODE_DIFFICULTY.hypersync`)
- [ ] **D10 — `chronossus-hypersync-targeted`** (already live) — verify + test the "take your
  oldest pending tile's space (no random roll)" path.

---

## PART 3 — Fractures of Time (full module)

The largest piece: a new mode with new subsystems. Build on the shared solo-bot core +
mode/tile machinery. Ends with a playthrough variation (Part 1 seam).

### F-R. Research & design
- [ ] Read the Fractures rules (Chronossus deltas) + pull TTS art (see CLAUDE.md pipeline).
  Capture the module's deltas in a short design note in this plan before coding.

### F1. Mode entry & setup
- [ ] Un-stub **Fractures of Time** (and any combos) in `MODULE_CONFIGS`; wire `getMode`
  slots/tiles for it (`chronossusModes.ts`, `chronossusTiles.ts`).
- [ ] Fractures Setup screens (verbatim rulebook + app-modified), including the Flux Pool /
  Cores / Fracture Device components and any tile-layout changes.

### F2. Engine — Flux Pool / Energy Cores / Fracture Device
- [ ] State + types for the Fractures subsystems on the Chronossus slice.
- [ ] Draw/spend/exhaust logic for the Flux Pool + Cores; Fracture Device behavior.
- [ ] Unit tests for each subsystem.

### F3. Engine — X-series actions & tiles
- [ ] X-series Action catalog (the Fractures-specific tiles/actions) in the tile/resolver
  machinery (mirroring how base + HFA tiles resolve). Autoleap where applicable.
- [ ] Unit tests.

### F4. Board / view / overlays
- [ ] Fractures board art + overlays (Flux Pool, Cores, Fracture Device, X-tiles),
  calibrate-mode positions, command-marker routes if they differ.

### F5. Scoring & objectives
- [ ] Fractures expansion scoring deltas + any expansion objectives (confirm player-side vs
  Chronossus-scored — **open question**). Extend `scoreChronossus` + score screen.

### F6. Ship
- [ ] Fractures playthrough test variation (Part 1 seam).
- [ ] `npm run build` + `npm test` + `npm run lint` clean; manual playthrough; assets/theme pass.

---

## Recommended implementation order
1. **Part 1** (test harness: T1 → T2 → T3) — guardrail first.
2. **Part 2 D0** (scoring seam), then **D1…D10** one at a time (feedback pause each).
3. **Part 3** (F-R → F1 → F2 → F3 → F4 → F5 → F6).

## Open questions
- **D2 swap-tiles:** does the app need a full position→tile remap, or is a setup instruction
  enough (does anything downstream read tile-by-position)? Resolve at D2.
- **D7 failed-action-vp:** are Failed Actions already counted anywhere? If not, add a counter.
- **F5:** are Fractures expansion objectives player-scored (like Solo Objectives) or does the
  Chronossus score them? Confirm from the rulebook during F-R.
- **Combos** (e.g. Fractures + Pioneers/Hypersync) are out of scope here unless trivial.

## Verification (whole effort)
- Build clean; lint (only pre-existing warnings); tests green (base + HFA + Fractures
  playthroughs, plus per-option difficulty unit tests).
- Chronobot + Chronossus base regression: unchanged behavior; pop-ups/text intact.
- Each difficulty option: selectable in Setup, drives the stated engine effect, reflected in
  scoring where applicable.
- Fractures: full guided playthrough with no console errors.
