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
- **A failed Acquire Guardian is a full Failed Action** — the Chronossus's usual +1 VP **and
  discard an active Exosuit**, routed through the existing failed-action path (so D7's +2 VP
  option applies too), not a VP-only special case.
- **In the combo, the Guardian space wins.** With no Capital space left, try the Guardian
  fallback first; the Solo Hypersync tile stays the fallback for when nothing can be placed
  at all.
- **Every Guardian has its own guaranteed Action space, so the fallback can never run out.**
  Enlisting a Guardian puts a **Chronossus Path marker** on a slot of the Guardian board, and
  that slot is that Guardian's own uncontested Action space. When a Capital Action (Construct,
  Research, Recruit) has no space left — World Council included — the Guardian goes on the
  Guardian board where a Chronossus Path marker sits; **which marker doesn't matter** if it
  has several. Two consequences the app has to carry: **setup must tell the player to have
  Chronossus Path markers on hand** for the Guardian board, and **C11 must instruct placing
  one** as part of acquiring the Guardian.

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

The three open questions are **answered** (see Decisions above) — what's left is small:

- [ ] Classic Expansion pp.9-11: confirm whether powering up a Guardian costs the Chronossus
      anything the app tracks (the Chronossus pays no Worker/asset costs elsewhere, so this is
      expected to be nothing), and confirm "the leftmost available Guardian" is simply the
      left-to-right order on the Guardian board, so the instruction can name it without the
      app modelling that board.
- [ ] **Is the Chronossus capped at 4 Guardians?** The shared solo components include **4 Solo
      Path markers** while Classic ships 6 Guardian miniatures — if each enlist consumes one
      marker, the bot can hold at most 4. Confirm before G2 sizes the state; if real, the
      Acquire Guardian Action needs an "out of Path markers" branch.

## G1. Mode entry & setup

- [ ] `CHRONOSSUS_MODES.guardians` — I=`C02`, II=`C11`, III=`C03` (per the setup reference
      table and p.16); `guardians+hypersync` — I=`C12`, II=`C11`, III=`C03`, V=`C13` covering
      Time Travel. Un-stub both in `MODULE_CONFIGS`.
- [ ] Setup screen: verbatim p.16 CHANGES AT SETUP box + app-modified bullets (the app holds
      the Guardian count; the Hex Unavailable line already renders via `requiresHexUnavailable`).
      Combo-aware, like Fractures+Hypersync (`includes()`, not `===`).
- [ ] **Setup bullet: keep the Chronossus's Path markers to hand** — they mark the Guardian
      board slots the bot enlists into, and each marked slot is a Guardian's own guaranteed
      Action space. The player places them; the app only says when.
- [ ] Seed the slice at setup: `guardians` starts at 0 — or **1 with the difficulty**, which
      also means instructing a starting Path marker + Guardian at setup.

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
      with no space left including World Council, place a Guardian **on the Guardian board, on
      a slot holding a Chronossus Path marker** (any of them, if several) and perform the
      Action — **not** a Failed Action, no +1 VP, no Exosuit discard. Slots into the existing
      no-space gate branch, and takes priority over the Solo Hypersync tile in the combo. Since
      every Guardian brings its own space, the only condition is holding a powered Guardian —
      there is no "space taken" question to ask the player.
- [ ] Unit tests for each of the above, incl. the D4 interaction and the pass rule.

## G3. Engine — Acquire Guardian (C11) & the tile

- [ ] `TILE_EFFECTS.C11A` / `C11B`: `autoleap: true` both sides; C11B adds +2 VP.
- [ ] `resolveAcquireGuardian` branching exactly as p.16: pre-Impact + World Council free →
      Exosuit onto World Council, **becomes First Player** (`state.firstPlayer`), no Action,
      +1 Guardian; World Council taken → spend a Worker by **Most > Scientist > Engineer >
      Administrator > Genius**, +1 Guardian, no Exosuit; neither possible, or post-Impact →
      the full Failed-Action path (+1 VP, or D7's +2, **and discard an active Exosuit**).
- [ ] Both acquiring branches instruct the player to **place a Chronossus Path marker on an
      empty Guardian board slot** and take the leftmost available Guardian — that marker is
      what gives the Guardian its own Action space later.
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

All three opening questions were answered 2026-08-13 and moved into **Decisions** above
(full Failed Action; Guardian space beats the Hypersync tile; every Guardian brings its own
guaranteed space via its Path marker). What remains:

1. **A 4-Guardian cap?** — see G-R. Four Solo Path markers ship in the shared solo components;
   if each enlist consumes one, Acquire Guardian needs an "out of Path markers" branch.

## Verification (whole effort)

- Build clean; lint (only the pre-existing warnings); tests green, incl. new playthrough
  variations for both modes.
- Base / Hypersync / Fractures regression: unchanged behaviour, no Guardian state leaking into
  modes that don't have it (`guardians` stays `undefined`).
- Power Up order visibly correct: with N Guardians owned, the first N powered are Guardians.
- A Capital Action with no space left places a Guardian on a Path-marked Guardian board slot
  and does **not** score the Failed +1 VP (and beats the Hypersync tile in the combo).
- A failed Acquire Guardian takes the full Failed-Action treatment (VP **and** the discard).
- Acquire Guardian: all three branches, First Player set on the World Council branch, and the
  Autoleap advance.
