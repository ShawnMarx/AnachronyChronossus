# PLAN — Guardians of the Council (Chronossus module)

## Overview & goal

Implement the **Guardians of the Council** module for the Chronossus, plus the
**Guardians + Hypersync** combo. Guardians is a Classic Expansion module that adds a new,
Path-independent Exosuit type — the **Guardian** — which the Chronossus powers up first,
places last, and can drop onto a reserved Guardian Action space when the Capital is full.
It also brings one new Action tile (**C11 — Acquire Guardian**, an Autoleap).

Scope confirmed 2026-08-13: **`guardians` + `guardians+hypersync`**, with the app doing
**full tracking** (the engine owns the Guardian counts, the power-up order, the
place-Guardians-last rule and the Guardian-Action-space fallback; the player is only asked
what the app cannot see). `guardians+pioneers` waits for Pioneers; **Fractures + Guardians
is forbidden by the rulebook** (Solo Opponents p.18), so there is no such combo to build.

Rulebook: **Solo Opponents p.16** (the whole Chronossus delta, transcribed verbatim below)
and the **Classic Expansion rulebook pp.9-11** for the module's own rules (Guardian board,
enlist cost, the designated Guardian Action spaces). Appendix tile text for C11A/C11B is
already in `chronossusTiles.ts`.

### Decisions (confirmed 2026-08-13)
- **Scope:** `guardians` + `guardians+hypersync`.
- **Full tracking:** engine-side Guardian state and rules, not player-applied.
- **Art:** `C11A.png` / `C11B.png` already exist in
  `…/OneDrive/Program Development/Anachrony Chronossus/temp/Mod Tiles/` (167×114, same as
  every other tile) — copy them in; no TTS extraction and no placeholder needed.

### Verbatim source (Solo Opponents p.16)

> **GUARDIANS OF THE COUNCIL** — THIS REQUIRES THE CLASSIC EXPANSION PACK TO PLAY.
> All of the Guardians of the Council module and Chronossus base rules apply, unless noted
> below.
>
> **CHANGES AT SETUP**
> - Place the following Action tiles (with the marked sides face up) on the empty spaces of
>   the Chronossus board: C02A to the (I) empty space. C11A to the (II) empty space.
> - Leave C03A in play.
> - Add the "Guardians" Solo Objective card to the Solo Objective deck.
> - Cover the right World Council Action space with a Hex Unavailable tile (as noted in the
>   Guardians of the Council rules for 2 players).
>
> **3 POWER UP PHASE** — The Chronossus first powers up as many Guardians as it can, then it
> powers up its own Exosuits (e.g. if it needs to power up 4 Exosuits and has 2 Guardians, it
> will power up both of them and 2 of its own).
>
> **GAMEPLAY CHANGES** — When deciding which Exosuit to place, the Chronossus places
> Guardians last. If it wants to take a Capital Action (Research, Recruit, Construct) and
> there are no Action spaces remaining (including the World Council Action space), it places
> a Guardian (if it has any) on the reserved Guardian Action space and performs the Capital
> Action. This means the Action is not a Failed Action, so it does not take 1 VP.
>
> **NEW ACTION: ACQUIRE GUARDIAN** — IF THIS ACTION IS SELECTED BEFORE IMPACT:
> - The Chronossus places an Exosuit on the World Council Action space and becomes the First
>   Player (if possible), but it does not perform an Action. Instead, it recruits the leftmost
>   available Guardian at no additional cost.
> - If the World Council Action space is already taken, it spends a Worker (Most > Scientist >
>   Engineer > Administrator > Genius), then acquires a Guardian without placing an Exosuit.
>
> If it cannot do either option, or the Impact has already happened, it gains 1 VP, as if it
> was a Failed Action.
>
> **INCREASING THE DIFFICULTY**
> - Flip the new Action tile to its B side.
> - When resolving the Acquire Guardian Action post-Impact, the Chronossus scores 2 VPs instead.
> - The Chronossus starts the game with 1 Guardian.

### Current-state facts (from the code)
- `guardians` / `guardians+hypersync` are **stubbed** (`available: false`) in
  `MODULE_CONFIGS` (`ChronossusSetupFlow.tsx`) and absent from `CHRONOSSUS_MODES`.
- `requiresHexUnavailable(modeId)` (`chronossusModes.ts:155`) **already returns true** for any
  id containing `guardians` — the Hex Unavailable setup line is done.
- **C11A/C11B tile text already exists** in `CHRONOSSUS_TILES`, marked `future: true`, with
  the Appendix wording (incl. "See page 16 for details"). No `TILE_EFFECTS` entry yet.
- `state.impact` is real and read by the engine (`isPostImpact(era)`, Eras 5+; `resolvePowerUp`
  uses it) — the pre/post-Impact branch has what it needs. (`TODO.md`'s "impact is
  reminder-only" note is about the **Chronobot**.)
- Exosuits are spent at ~6 sites in `resolveAction`/`resolveTimeTravel`/`resolveHypersyncAction`
  as bare `bot.exosuitsAvailable -= 1`, and the pass rule reads `noExosuitFor` →
  `bot.exosuitsAvailable <= 0`. Both need to become Guardian-aware in one place.
- Solo Objectives are player-entered in the tally for every mode, so the "Guardians" Solo
  Objective card is **setup text only** — no scoring work.

---

## G-R. Research & design

- [ ] Read the Classic Expansion rulebook's Guardian chapter (pp.9-11) for the two facts the
      Solo Opponents delta assumes: **how many reserved Guardian Action spaces exist** (and
      whether they can run out — "their own designated Action spaces, where they can take a
      Capital Action without being contested"), and whether powering up a Guardian costs the
      Chronossus anything it tracks.
- [ ] Confirm what "the leftmost available Guardian" means physically (Guardian board slots,
      left to right) so the instruction can name it without the app modelling the board.
- [ ] Resolve the two open questions below with the user before G3.

## G1. Mode entry & setup

- [ ] `CHRONOSSUS_MODES.guardians` — I=`C02`, II=`C11`, III=`C03` (per the setup reference
      table and p.16); `guardians+hypersync` — I=`C12`, II=`C11`, III=`C03`, V=`C13` covering
      Time Travel. Un-stub both in `MODULE_CONFIGS`.
- [ ] Setup screen: verbatim p.16 CHANGES AT SETUP box + app-modified bullets (the app holds
      the Guardian count; the Hex Unavailable line already renders via `requiresHexUnavailable`).
      Combo-aware, like Fractures+Hypersync (`includes()`, not `===`).
- [ ] Seed the slice at setup: `guardians` starts at 0 (or 1 with the difficulty).

## G2. Engine — Guardian state, Power Up, placement

- [ ] State on `ChronossusState`: `guardians?: { owned: number; powered: number }` — `owned`
      is the count enlisted, `powered` how many are powered up and unplaced this Era.
      `undefined` outside the module, exactly like `fluxPool` / `technologies`.
- [ ] **Power Up:** `resolvePowerUp` splits the powered number — Guardians first, then own
      Exosuits (`powered = min(owned, attempted)`, `exosuitsAvailable = attempted - powered`,
      still capped by `exosuitsTotal`). Check the interaction with **D4** (+1 free Exosuit and
      its excess→+2 VP conversion) and with the max-4 post-Impact cap.
- [ ] **Place Guardians last:** centralize the ~6 bare `exosuitsAvailable -= 1` sites into one
      `spendExosuit(bot)` helper that takes a plain Exosuit while any remain and only then a
      Guardian, reporting which it spent so the instruction can say "place a **Guardian**".
- [ ] **Pass rule:** `noExosuitFor` / the out-of-Exosuits pass must count Guardians too — it
      only passes when both are gone.
- [ ] **Guardian Action space fallback:** for a Capital Action (Research / Recruit / Construct)
      with no space left including World Council, place a Guardian on the reserved Guardian
      Action space and perform the Action — **not** a Failed Action, no +1 VP, no Exosuit
      discard. Slots into the existing no-space gate branch.
- [ ] Unit tests for each of the above, incl. the D4 interaction and the pass rule.

## G3. Engine — Acquire Guardian (C11) & the tile

- [ ] `TILE_EFFECTS.C11A` / `C11B`: `autoleap: true` both sides; C11B adds +2 VP.
- [ ] `resolveAcquireGuardian` branching exactly as p.16: pre-Impact + World Council free →
      Exosuit onto World Council, **becomes First Player** (`state.firstPlayer`), no Action,
      +1 Guardian; World Council taken → spend a Worker by **Most > Scientist > Engineer >
      Administrator > Genius**, +1 Guardian, no Exosuit; neither possible, or post-Impact →
      the Failed-Action branch (see Open question 1).
- [ ] A `spendWorkerByPriority` helper for the Most-first ordering (the existing Recruit and
      Remove-Anomaly priorities are the same shape but different orders).
- [ ] Unit tests per branch, incl. no-Workers, post-Impact, and the Autoleap advance.

## G4. UI — dialog, trackers, History, art

- [ ] Copy `C11A.png` / `C11B.png` from `temp/Mod Tiles/` into
      `public/assets/solo/chronossus/tiles/`.
- [ ] `AcquireGuardianDialog`, built to the module-dialog conventions in CLAUDE.md: takes
      `flow`, renders through `renderModDialogs(flow)`, verbatim 📖 rule box **in the footer**,
      and **asks before it instructs** (World Council free? → the app decides → the
      instruction). Ends with the standard commit button.
- [ ] Turn-overview chip: Guardians (owned · powered), Guardians-modes only — same shape as
      the Fractures chips. Text-only unless Guardian piece art turns up; per the no-decorative-
      icons convention, no stand-in glyph.
- [ ] Placement instructions name a Guardian whenever the app spent one, including the
      Guardian-Action-space fallback.
- [ ] Extend `summarizeChronossusExtras` so History shows Guardians acquired / spent and the
      Worker spent on an Acquire (check both tile sides and the combo).

## G5. Difficulty options

The B-side option is the existing per-tile `chronossus-tiles-b-side` picker — no new flag.
Two new flags in `MODE_DIFFICULTY.guardians` (unioned automatically for the combo by
`modeDifficultyFor`):

- [ ] `chronossus-guardians-postimpact-2vp` — post-Impact Acquire Guardian scores **2 VP**
      instead of the Failed-Action 1 VP.
- [ ] `chronossus-guardians-start-1` — starts the game with **1 Guardian**, via the existing
      pure `applyDifficultySetup(bot, config)`.
- [ ] Tests for both; both appear in the score-screen setup note (`chronossusDifficultyLabel`).

## G6. Ship

- [ ] Playthrough variations (Part 1 seam): `guardians` and `guardians+hypersync` full games.
- [ ] `npm run build` + `npm test` + `npm run lint` clean.
- [ ] Live verification in a real game (both modes), then staging.
- [ ] Manual playthrough on device — user-side.

---

## Recommended implementation order

1. **G-R** — settle the two open questions and the Classic-rulebook facts first; they change
   G2/G3's shape.
2. **G1** — mode + setup, so the module is selectable and the tiles land in the right slots.
3. **G2** — the state and the three placement/power-up rules (the module's real substance).
4. **G3** — the new Action on top of that state.
5. **G4** — dialog, trackers, History, art.
6. **G5** — the two difficulty flags.
7. **G6** — playthroughs, checks, ship.

## Open questions

1. **What exactly is "as if it was a Failed Action"?** A Chronossus Failed Action is harsher
   than the Chronobot's: +1 VP **and discard an active Exosuit**. p.16 says a failed Acquire
   Guardian "gains 1 VP, as if it was a Failed Action". *Recommendation:* route it through the
   existing failed-action path (VP + discard), so D7's +2 VP option and the discard stay
   consistent with every other Failed Action — but it is arguably VP-only.
2. **In the Hypersync combo, which no-space fallback wins?** Both modules define one: place a
   Guardian on the reserved Guardian Action space (not a Failed Action) vs. place a Solo
   Hypersync tile (also not a Failed Action). *Recommendation:* try the **Guardian** first —
   it is a real placement onto a reserved space, and the Hypersync tile is explicitly the
   fallback for when nothing can be placed at all.
3. **Do the reserved Guardian Action spaces run out?** (G-R research item.) If there are fewer
   spaces than Guardians, the fallback needs a limit and the player has to be asked.

## Verification (whole effort)

- Build clean; lint (only the pre-existing warnings); tests green, incl. new playthrough
  variations for both modes.
- Base / Hypersync / Fractures regression: unchanged behaviour, no Guardian state leaking into
  modes that don't have it (`guardians` stays `undefined`).
- Power Up order visibly correct: with N Guardians owned, the first N powered are Guardians.
- A Capital Action with no space left places a Guardian and does **not** score the Failed +1 VP.
- Acquire Guardian: all three branches, First Player set on the World Council branch, and the
  Autoleap advance.
