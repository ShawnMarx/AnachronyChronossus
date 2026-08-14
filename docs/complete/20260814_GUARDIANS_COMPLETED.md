# COMPLETED — Guardians of the Council (Chronossus module)

**Archived 2026-08-14.** Frozen record — do not edit.

Ran 2026-08-13 → 2026-08-14. Adds the Classic Expansion's **Guardians of the Council**
module to the Chronossus, plus the **`guardians+hypersync`** combo. A Guardian is a
Path-independent Exosuit the bot powers up **first**, places **last**, and can drop onto its
own reserved Guardian board space when the Capital is full — and one new Action tile,
**C11 Acquire Guardian** (an Autoleap). Shipped to production 2026-08-14.

## What shipped

| Stage | Outcome |
|---|---|
| G-R | Rulebook research; three design questions answered by the user, two verified verbatim against the rulebooks |
| G1 | `guardians` + `guardians+hypersync` modes, setup screens, slice seeding, C11 art |
| G2 | Power-up order, `spendFigure` (Guardians last) replacing 6 scattered sites, pass rule, Clean Up, the Guardian board fallback |
| G3 | `resolveAcquireGuardian` — World Council / Worker / failed branches, Era-4 availability gate |
| G4 | The C11 dialog (a `guardianGate` on `CxTileDialog`), trackers, placement copy, History |
| G5 | The module's two difficulty options |
| G6 | Playthrough variations for both modes; the harness gained an `onPhase` hook |
| G7–G10 | Playtest rounds: one figure count, the Guardian-board dialog, History wording, rule-box restyle, Autoleap resume, targeted-Hypersync rules fix, Impact-flag sync |

**Final state:** 320 tests, `npm run build` + `npm run lint` clean (only the pre-existing
`only-export-components` warnings).

## Production notes

- **A Guardian is an Exosuit.** `placeableFigures` / `nextFigure` / `spendFigure` are the one
  place the "Guardians last" rule lives; every placement and Failed-Action discard goes
  through them. Counting (badges, chips, the pass rule, overlay art) always includes
  Guardians — they are named separately only where the player must pull a different
  miniature (Power Up's split, `(inc N Guardians)`, the badge pop-out).
- **`spendGuardian` is deliberately separate.** The Guardian board fallback fires when
  **Action spaces** run out, not figures, so the bot may still hold Exosuits — that space is a
  Guardian's, so it spends one specifically.
- **Acquire Guardian is not an Exosuit-placing Action** (`placesExosuitFor` is false): it only
  places when the World Council space happens to be free, and otherwise spends a Worker. That
  is why it never forces a pass and why none of its failure paths discard a figure.
- **A module's tile needs BOTH maps** — the engine's `TILE_ACTION_FAMILY` *and* the view's
  `FAMILY_TO_TILE_ACTION`. Missing the second left C11 inert: taps did nothing and a marker
  landing on it resolved as "no effect", with no error.
- **Post-Impact is the Era, not just the flag.** `state.impact` is stored, but `startNextEra`
  and (now) the debug Era stepper derive it, and the Guardians branch reads
  `state.impact || isPostImpact(state.era)` so a stale flag can't change a rule.
- **The Guardian board fallback beats Hypersync's Solo-tile fallback** in the combo, and needs
  no question — every Guardian brings its own Path-marked space.
- **Not modelled:** the Guardian board itself (player-managed, like the Valley board), the
  1 Water cost for a player's own Guardian space (the bot pays no costs and the app doesn't
  track Water), and the "treated as a Genius" rule (player-only — the Chronossus never puts
  Workers in Exosuits).

---

# THE PLAN (as written)

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
- **A failed Acquire Guardian is +VP only — no Exosuit discarded** (revised 2026-08-14 in
  playtest; it was first called as a full Failed Action). Once the World Council space is
  taken the Action falls back to spending a Worker, so it is not an Exosuit placement at all
  (`placesExosuitFor` is false for it) and the discard has nothing to attach to. D7's +2 VP
  still applies to the VP half.
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
- [x] **No Path-marker cap — confirmed verbatim** (user's call 2026-08-13, then verified
      against the rulebook rather than BGG, whose threads block automated fetching). The Solo
      Opponents component list (p.2) states it outright:
      > NOTE: Solo Path markers are not meant to be limited. If they run out, use one of the
      > unused Paths' markers in their place.

      So the engine holds **no cap**; the acquire copy carries that substitution note.
- [x] **The real limit is the 6 shared Guardian miniatures** — C11 recruits "the leftmost
      **available** Guardian", and availability depends on how many the *player* has enlisted,
      which the app cannot see. So Acquire Guardian **asks whether a Guardian is still
      available**; none left → the Failed-Action branch (see G3).
- [x] **"Any Path-marked slot" confirmed** (Classic p.10): a Guardian "may also be placed on
      the hex space from which they were enlisted, marked with your Path marker… **If you have
      multiple Guardians enlisted, it doesn't matter which of the marked hex spaces you use.**"
      Other players may never use a slot marked with your Path marker — hence "uncontested",
      and hence no question to ask the player.
- [x] **The 1 Water cost is a no-op for the bot.** Classic p.10 has the *player* pay 1 Water to
      take a Capital Action from their Guardian space; Solo Opponents p.16 imposes no cost on
      the Chronossus, and the app doesn't track Water at all (same as the Fractures Anomaly
      Remover delta).
- [x] **"Treated as a Genius" does not apply to the Chronossus** (user, 2026-08-13). Classic
      p.10 says Guardians take Actions without Workers and are "always treated as though a
      Genius was placed in them" — that exists for the *player*, who must put Workers in
      Exosuits. The Chronossus never does, so the rule has nothing to attach to. It is **not**
      related to the Recruit Genius / Research gate either: that asks whether a Genius is
      available **to recruit** (a Worker entering the bot's collection), not whether one is
      inside an Exosuit. No work.

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
- [ ] **Clean Up retrieves Guardians too** (Classic p.10): from the Main board like regular
      Exosuits, *and* from the Guardian board's Path-marked spaces. Only Guardians placed this
      Era come back — the Path markers stay put permanently, and `owned` never decreases.
      `powered` resets like `exosuitsAvailable`.
- [ ] Unit tests for each of the above, incl. the D4 interaction, Clean Up, and the pass rule.

## G3. Engine — Acquire Guardian (C11) & the tile

- [ ] `TILE_EFFECTS.C11A` / `C11B`: `autoleap: true` both sides; C11B adds +2 VP.
- [ ] **Question order (confirmed 2026-08-13):** with a figure available, C11 opens by asking
      whether the **World Council space is open** — yes routes to that method. Otherwise it is
      **not an Exosuit Action at all** and goes straight to spending a Worker, so the question
      is not asked (`acquireGuardianAsksWorldCouncil`). Past that, the only failure paths are
      **no Guardian remains** and **no Workers in the bot's pool** (plus post-Impact, which is
      its own rule).
- [ ] Acquire Guardian **asks whether a Guardian is still available** on the Guardian board
      (the 6 miniatures are shared with the player, so the app can't know). None available →
      the Failed-Action branch, before the World Council question is even asked. **Only ask
      from Era 4 on**: the board cannot be emptied earlier (user's analysis 2026-08-13 — the
      bot only acquires via C11, and even with you taking one each time the supply can't run
      out before Era 4), and Eras 5+ are post-Impact, where the Action is a Failed Action
      regardless. So in practice the question surfaces **only in Era 4** — the same
      don't-prompt-for-nothing rule as Fractures' "skip the Blink check with no Cores in the
      pool". Note the "start with 1 Guardian" difficulty shifts the supply by one; the Era-4
      question covers it either way.
- [ ] `resolveAcquireGuardian` branching exactly as p.16: pre-Impact + World Council free →
      Exosuit onto World Council, **becomes First Player** (`state.firstPlayer`), no Action,
      +1 Guardian; World Council taken → spend a Worker by **Most > Scientist > Engineer >
      Administrator > Genius**, +1 Guardian, no Exosuit; neither possible, or post-Impact →
      the full Failed-Action path (+1 VP, or D7's +2, **and discard an active Exosuit**).
- [ ] Both acquiring branches instruct the player to **place a Chronossus Path marker on an
      empty Guardian board slot** and take the leftmost available Guardian — that marker is
      what gives the Guardian its own Action space later. If the bot has run out of Path
      markers (a 5th Guardian), the copy says to substitute any spare token.
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

_None open._ (The 4-Path-marker question was answered 2026-08-13: no cap in the engine — the
player substitutes a marker in the unlikely 5th-Guardian case. The binding limit is the 6
shared Guardian miniatures, handled as a question in the Acquire Guardian flow.)

## Verification (whole effort)

- Build clean; lint (only the pre-existing warnings); tests green, incl. new playthrough
  variations for both modes.
- Base / Hypersync / Fractures regression: unchanged behaviour, no Guardian state leaking into
  modes that don't have it (`guardians` stays `undefined`).
- Power Up order visibly correct: with N Guardians owned, the first N powered are Guardians.
- A Capital Action with no space left places a Guardian on a Path-marked Guardian board slot
  and does **not** score the Failed +1 VP (and beats the Hypersync tile in the combo).
- A failed Acquire Guardian takes the full Failed-Action treatment (VP **and** the discard),
  including when the player reports no Guardian is left on the Guardian board.
- Acquire Guardian: all three branches, First Player set on the World Council branch, and the
  Autoleap advance.

---

# REVIEW

No scripted `/plan review` — verification was continuous, and the user playtested the module
in the live app across 2026-08-13/14, which drove stages G7–G10.

- **Automated:** 320 tests, including four end-to-end playthrough variations (`guardians`
  ×3 and `guardians+hypersync`), the rulebook's own Power-Up example, and per-branch unit
  tests for Acquire Guardian.
- **Live (Playwright + manual):** both modes selectable; setup copy; the board laying out
  C02A/C11A/C03A; the C11 dialog's three steps; the Guardian-board fallback flowing into
  Construct's VP tap; History lines; the Autoleap chain and its resume-after-close; the
  post-Impact difficulty; the targeted-Hypersync flow.
- **Everything the playtest reported is fixed and logged** in G7–G10 below — including two
  real rules bugs (the fallback spending an Exosuit instead of a Guardian, and targeted
  Hypersync matching the bot's tiles instead of the player's).

---

# THE EXECUTION LOG (as written)

Execution tracker. Steps in implementation order; mark `[x]` as completed and note
deviations inline. See `PLAN_guardians.md` for the design and the verbatim rulebook text.

## G-R — Research & design
- [x] **Open questions 1-3 answered by the user (2026-08-13):** a failed Acquire Guardian is a
  Failed Action (**revised 2026-08-14 to VP only, no discard** — see G10); the **Guardian space beats** the
  Solo Hypersync tile in the combo; and the fallback **can never run out** — each Guardian has
  its own guaranteed space on the Guardian board, the slot holding a Chronossus **Path
  marker** (any of them if several). Consequences: setup must have the player keep Path
  markers to hand, and C11 must instruct placing one when it enlists
- [x] **Classic pp.9-11 read (2026-08-13).** Confirmed: powering up a Guardian costs the bot
  nothing the app tracks; the Guardian space's 1 Water cost is the *player's* and a no-op for
  the Chronossus (which doesn't track Water); any Path-marked slot may be used ("it doesn't
  matter which"); and **Clean Up retrieves Guardians** from both boards while the Path markers
  stay permanently. The "Guardians are treated as though a Genius was placed in them" rule is
  **player-only** and does not apply here — the Chronossus never puts Workers in Exosuits, and
  it is unrelated to the Recruit Genius / Research gate, which asks whether a Genius is
  available *to recruit*
- [x] **No cap on the bot's Guardians** (user, 2026-08-13): the 4 Solo Path markers are a
  component limit, not a rule — a 5th enlist is possible and the player substitutes a marker,
  so the copy carries a note and the engine no cap. The binding limit is the **6 shared
  Guardian miniatures**: C11 takes "the leftmost **available** Guardian", and the app can't
  see how many the player holds, so the Action asks — none available is a Failed Action

## G1 — Mode entry & setup ✅ done (2026-08-13)
- [x] `CHRONOSSUS_MODES.guardians` (I=C02, II=C11, III=C03)
- [x] `CHRONOSSUS_MODES['guardians+hypersync']` (I=C12, II=C11, III=C03, V=C13 covers Time Travel)
- [x] Un-stub both in `MODULE_CONFIGS`
- [x] Setup screen: verbatim p.16 box + app-modified bullets + a "Guardians of the Council
  setup" steps block, all combo-aware (`includes('guardians')`)
- [x] Setup bullet: keep the Chronossus's Path markers to hand for the Guardian board,
  including the rulebook's "not meant to be limited" substitution note
- [x] Slice seeded at setup — `guardians: { owned, powered }`, 0 or 1 under
  `DIFFICULTY_GUARDIANS_START_1`; `undefined` in every other mode
- [x] Tests: 8 mode tests (both modes, D2 swap, B-side, C14 no-op) + 5 seeding tests.
  **260 tests, build + lint clean**
- [x] Verified live (Playwright, Guardians mode start → Era 1 Action Rounds): both modes
  selectable, setup copy renders, D9's World Council checkbox correctly hidden as mandatory,
  and the board lays out C02A / **C11A** / C03A with the copied art loading (no 4xx, no
  console errors)

**Deviations / notes**
- The `guardians` state field landed here rather than in G2: setup has to seed it, and the
  seam (`applyDifficultySetup`) is the same one Fractures/Variable Anomalies use.
- `DIFFICULTY_GUARDIANS_START_1` was defined here so seeding could read it; its Setup-screen
  checkbox is still G5, so the option isn't selectable yet.
- **C11 is inert until G3.** `TILE_ACTION_FAMILY` has no `C11` entry, so tapping the tile
  opens nothing and a marker landing on that slot resolves as "no effect" (the TILE_EFFECTS
  default). No error, but the module isn't playable until G3 adds the action id and resolver.

## G2 — Engine: Guardian state, Power Up, placement ✅ done (2026-08-13)
- [x] `guardians?: { owned, powered }` on `ChronossusState` (landed in G1 with the seeding)
- [x] Power Up powers Guardians first, then Exosuits — the rulebook's own example (needs 4,
  owns 2 → 2 Guardians + 2 Exosuits) is a test. D4's excess-to-VP conversion now measures
  against Guardians + `exosuitsTotal` together, so a bot with Guardians wastes nothing; the
  post-Impact max-4 cap still applies across both
- [x] `spendFigure(bot)` / `nextFigure` / `placeableFigures` — Guardians last, in ONE place;
  replaced all 6 bare `exosuitsAvailable -= 1` sites (Main-board and Valley placements, the
  Hypersync hex, and the three Failed-Action discards)
- [x] Pass rule counts Guardians — `wouldPassOn` reads `placeableFigures`, so it only passes
  once Exosuits AND powered Guardians are gone. `hypersyncPlan.hasExosuit` likewise
- [x] Clean Up resets `powered` to 0 and keeps `owned` (Path markers never leave the board)
- [x] Guardian board fallback: a Capital Action with no space left places a Guardian on a
  Path-marked slot and resolves normally — no +1 VP, no discard. Checked BEFORE the Hypersync
  Solo-tile branch, so it wins in the combo (tested)
- [x] 22 new tests (282 total); build + lint clean; base/HFA/Fractures playthroughs unaffected

**Deviations / notes**
- **Failed-Action discards use the same order.** "Discard an active Exosuit" goes through
  `spendFigure`, so with no plain Exosuits left it discards a Guardian. The rulebook only
  spells the Guardians-last ordering out for *placement*; a Guardian is an Exosuit the bot
  has, so this seemed the honest reading. Flagged in the code comment.
- **New result fields** `figurePlaced` / `usedGuardianSpace` on `ChronossusActionResult` — the
  engine decides which figure goes down, so the view has to be told in order to say "place a
  Guardian". G4 consumes them.
- The Guardian-space fallback keys off the existing `noSpaceAvailable` / `hypersyncNoTile`
  inputs, so no new question is asked of the player (every Guardian brings its own space).

## G3 — Engine: Acquire Guardian (C11) ✅ done (2026-08-13)
- [x] `tile-acquire-guardian` action id + label; `TILE_ACTION_CODE`/`TILE_ACTION_FAMILY`
  entries, so the tile resolves through the same machinery as every other module tile
- [x] `TILE_EFFECTS` C11A/C11B — `acquireGuardian` + Autoleap both sides, C11B +2 VP (scored
  for resolving the Action, whichever branch runs). `future: true` dropped from both
- [x] `resolveAcquireGuardian` — World Council branch (places a figure, **First Player**,
  free Guardian), Worker branch (no figure), and the failed branch as a **full** Failed
  Action (VP + discard). Post-Impact fails; the difficulty option scores 2 VP with no discard
- [x] `guardianWorkerToSpend` — "Most", then Scientist > Engineer > Administrator > Genius
- [x] Both acquiring branches instruct placing a Path marker on an empty Guardian board slot,
  with the "not meant to be limited" substitution note
- [x] `shouldAskGuardianAvailable(era)` — true only in Era 4 (can't empty earlier; Eras 5+
  fail post-Impact regardless)
- [x] Verbatim p.16 module-section text added as `ModularTile.detail` on both sides (the
  two-tier rule-text convention)
- [x] 12 new tests (294 total); build + lint clean

**Deviations / notes**
- **`placesExosuitFor('tile-acquire-guardian')` is FALSE.** The Action only places when the
  World Council space happens to be free, and otherwise spends a Worker — if it counted as an
  Exosuit-placing Action, a bot out of Exosuits would *pass* on the tile instead of taking the
  Worker option it is still entitled to. The resolver does its own placing. Tested.
- **No Blink interaction to worry about:** the rulebook forbids Fractures + Guardians, so a
  Guardians game never has a Flux Pool.
- The World Council branch falls through to the Worker option when the bot has no figure to
  place — "if it cannot do either option" reads as per-option, not "option 1 only".
- **Question order confirmed by the user (2026-08-13):** with a figure available C11 opens on
  "is the World Council space open?"; with none it is not an Exosuit Action at all and goes
  straight to the Worker option, so the question isn't asked
  (`acquireGuardianAsksWorldCouncil`, which G4's dialog gates on). The engine's branch order
  already matched; the final Failed-Action copy was reworded, since the only way to reach it
  is an empty Worker pool — it used to read "can neither place… nor spend a Worker".

## G4 — UI: dialog, trackers, History, art ✅ done (2026-08-13)
- [x] `C11A.png` / `C11B.png` copied in (done in G1)
- [x] The Acquire Guardian flow is a **`guardianGate` on `CxTileDialog`**, not a new dialog —
  see the deviation below. Steps: availability (Era 4) → World Council (only when it has a
  figure) → the instruction → commit. Rule box stays in the footer; `flow` and
  `renderModDialogs` come free
- [x] Turn-overview chip `powered/owned Guardians`, Guardians modes only, with a hint saying
  they power up first and are placed last
- [x] `DetailPanel` gained `figure` — the base-Action placement gate says "place the
  Chronossus's **Guardian**" once its own Exosuits are gone (Chronobot/other modes unaffected)
- [x] `summarizeChronossusExtras`: Guardians acquired, the Worker spent to acquire one, and a
  Guardian placed (the Exosuit count doesn't move, so nothing else would say so) + 4 tests
- [x] 299 tests, build + lint clean. Verified live end to end: the C11 dialog asks, decides
  and instructs; History reads `Era 1 · Acquire Guardian / Exosuit placed / Acquired 1
  Guardian`; the chip shows `0/1 Guardians`

**Deviations / notes**
- **No separate `AcquireGuardianDialog`.** The plan called for one, but `CxTileDialog` already
  carries the tile art, name, rule box, `flow` handling and commit button, and it already has
  a gate prop for exactly this shape (`valleyGate`). A `guardianGate` alongside it is less
  code and inherits the module-dialog conventions instead of re-implementing them.
- **Found while wiring: `FAMILY_TO_TILE_ACTION` in the view had no `C11`.** `tileActionAt`
  returned null, so tapping the tile did nothing at all and a marker landing on it would have
  silently resolved as "no effect" — the G1 note said the tile was inert, and this was why.
  The engine-side `TILE_ACTION_FAMILY` and the view-side map are separate lists; a new
  module's tile has to be added to BOTH.

## G5 — Difficulty options ✅ done (2026-08-13)
- [x] Both registered in `MODE_DIFFICULTY.guardians`, so `modeDifficultyFor` offers them for
  `guardians` **and** unions them with Hypersync's in the combo
- [x] `chronossus-guardians-postimpact-2vp` — engine side shipped in G3
- [x] `chronossus-guardians-start-1` — engine side shipped in G1; the Setup screen now also
  tells the player to hand it a Guardian and place a Path marker at setup
- [x] `chronossusDifficultyLabel` needed no change (it already reads every `MODE_DIFFICULTY`
  entry), so both show in the score-screen setup note and the share summary
- [x] 2 new tests (301 total); build + lint clean. Verified live: both appear on the
  difficulty step for the Guardians mode, and ticking the second adds the setup bullet
- [x] The third rulebook bullet ("flip the new Action tile to its B side") is the existing
  shared `chronossus-tiles-b-side` picker — no new flag, as planned

## G7 — Guardians read as one figure count (playtest feedback 2026-08-13) ✅ done
- [x] **Power Up calls out the split.** The screen said "Powered up N Exosuits" whatever the
  mix; it now reads *"Powered up 5 in total — 1 Guardian and 4 normal Exosuits. It powers up
  as many Guardians as it can first."* The player is pulling two different miniatures, so the
  instruction has to say which
- [x] **The Exosuit badge counts every figure it can place** (Exosuits + powered Guardians),
  with the breakdown in its tooltip and its pop-out: *5 powered figures to place / Normal
  Exosuits 4 / Guardians 1 powered · 1 enlisted*
- [x] **The turn-overview chip merged**: `5 Exo (inc 1 Guardian)` instead of a separate
  Guardians chip the player had to add up. The second chip shows what the figure count
  can't — `powered/total`, e.g. **`0/1 Guardian`** when it holds one it could not power up
  this Era. ("Enlisted" as a label was rejected by the user; the counts say it better.)
- [x] **The turn overview puts every rule box at the bottom**, like the Action dialogs: the
  bot's-turn text used to sit mid-panel above the difficulty list. Order is now bot's turn →
  module rules → passing. `TurnBarOverview` gained an `extraRules` slot for the active
  module (the Chronobot passes nothing, so it is unaffected)
- [x] **New Guardians rule box** in that footer — the verbatim p.16 POWER UP PHASE and
  GAMEPLAY CHANGES paragraphs, i.e. exactly how the bot uses Guardians for its Actions
  (powered first, placed last, and the Guardian board space that stops a no-space Capital
  Action being a Failed Action)
- [x] Verified live with the start-with-1-Guardian difficulty; 305 tests, build + lint clean

**Deviation / note**
- **Corrected same day (user):** "an exo is an exo — some are just better, it should be shown
  together". The board overlay art had been left counting plain Exosuits only; it now counts
  powered Guardians too, and `overlayCount` in `botOverlays.ts` gained the same rule so every
  consumer agrees. The pop-out is the one place the two are broken apart.

## G8 — Guardian-board placement had no dialog (playtest 2026-08-13) ✅ done
- [x] **The fallback now has its own step.** "Cannot place" on a Capital Action used to jump
  straight to the resolution, so the player was never told to put a Guardian anywhere. New
  `guardianSpace` pending step: *"No Action space was open, so the Chronossus places a
  **Guardian** on the **Guardian board**, on an open space marked with one of its **Path
  markers** — and performs the Action from there."* Confirming it falls into the Action's
  normal sub-flow (Construct's VP tap, Mine's resources…), so nothing is skipped
- [x] Checked **before** the Hypersync Solo-tile fallback in the view too, matching the engine
- [x] **Bug found by the History line it printed:** the engine's fallback called
  `spendFigure`, which takes a plain Exosuit while any remain — so it was spending an Exosuit
  and History read "Exosuit placed". The fallback fires when **Action spaces** run out, not
  figures, so the bot can still hold Exosuits; the reserved space is a Guardian's. New
  `spendGuardian(bot)` takes a Guardian specifically. Test added with 4 Exosuits still in hand
- [x] History now reads `Factory taken (1 VP)` + `Placed 1 Guardian`
- [x] 306 tests, build + lint clean; verified live end to end
- [x] **Pass hint corrected too**: `chronossusTurnHint` said "out of Exosuits — it passes
  next time" whenever `exosuitsAvailable` hit 0, which is wrong while a Guardian is still
  powered. It now reads `placeableFigures`, and says "only Guardians left to place" in that
  state
- [x] **Autoleap chain verified** (die pinned to a 3 so marker 3 walks onto the C11 slot):
  the dialog opens with the Autoleap note *and* the World Council question

## G9 — Passing, History and the HFA substitution (playtest 2026-08-13) ✅ done
- [x] **History shows the roll behind a pass.** Both Chronossus pass sites now hand `commit`
  the die and a reason: *"Rolled onto Construct — Superproject, which needs a figure placed /
  Out of Exosuits and Guardians — it passes"*. They were passing neither before
- [x] **The Chronobot needed no behaviour change** (user, 2026-08-14). Its final Time Travel is
  the *guaranteed* Action of that turn, so there is no die to read — it is a **turn stated in
  History, just without a roll**. A roll was briefly added and reverted; what stayed is the
  History entry saying why (`Out of Exosuits — its final Time Travel, then it passes`). Its
  other "pass" is the phase ending after you passed, which isn't a turn at all
- [x] **Turn overview is z-index 90**, above the action dialog (80) and its small-screen
  full-screen form (65) — it was 62, i.e. underneath
- [x] **HFA: a Solo Hypersync tile stands in for the Exosuit** (user's call). `wouldPassOn`
  takes an optional `{ era, active }` and returns false while a tile can be placed, so the bot
  keeps acting instead of passing; the view then opens the tile prompt directly rather than
  asking a placement question it cannot satisfy
- [x] **Capital Actions only** — one shared `CAPITAL_ACTION_IDS` in the engine, which the view
  now builds its `CAPITAL_ACTIONS` set from, so the tile substitution and the Guardian board
  space can't drift apart. Mine / Time Travel / Remove Anomaly / Reboot are excluded, with
  tests both ways (verified live too: it passed on Mine Resource, correctly)
- [x] **History docked open by default** for both bots (it was opt-in)
- [x] 314 tests, build + lint clean

## G10 — Playtest round 2 (2026-08-14) ✅ done
- [x] **Autoleap could be lost.** Closing an Autoleap dialog dropped the resolution it still
  owed (the marker had already moved and the turn was committed), so Take Bot Action rolled a
  fresh die and the Action never happened. `ui.owedLeap` now persists it: Take Bot Action
  re-opens the dialog, a reload resumes it, and leaving the phase clears it
- [x] **Tracker chip popovers**: shared open state (`TapFlagRow`) — each held its own, so
  tapping the next one stacked another popover instead of replacing it
- [x] **Two hard-coded Chronobot purples** in shared CSS stayed purple in a Chronossus game —
  the SCV show/hide hover and the chip popover's background/text. Both use theme tokens now
- [x] **C12/C13's read-only tap** dumped its rule text raw with no 📖 collapsible — the only
  dialog that didn't match. Same box as everywhere else, opened
- [x] **Play-mode taps show only the rule box** (no app-voice "what it does" line, which read
  as if the tile had been activated); C11 gained its own description/instruction text
- [x] **History**: Power Up counts Guardians in the total and splits the lines; a Guardian on
  its own board space says so; a pass records the die and why; "Out of Exosuits" covers
  Guardians rather than naming them separately
- [x] **Rule boxes**: labels lost their "rules"/"rulebook text" suffixes, and `RulesBox` now
  matches the dialogs' 📖 bars (accent tint, chevron right) everywhere
- [x] **The debug Era stepper didn't set the Impact flag**, which is what made the
  post-Impact 2 VP difficulty look broken: stepping to Era 5 left `impact` false, so every
  post-Impact rule (Acquire Guardian's branch, Power Up's 2+X) kept its pre-Impact
  behaviour. `startNextEra` had always derived it; the debug jump now does too, and the
  engine reads `state.impact || isPostImpact(state.era)` so a stale flag (or an old save)
  can't change a rule. 3 tests, incl. "scores exactly 2 VP and nothing else changes"
- [x] **A failed Acquire Guardian discards nothing** (revised from the G-R call). It was
  taking the Chronossus's usual "+VP and discard an active Exosuit", but with the World
  Council space taken this Action spends a Worker instead — it is not an Exosuit placement,
  which is exactly why `placesExosuitFor` is false for it. All three failure paths are now
  VP-only, in the engine and the dialog copy
- [x] **Targeted Hypersync (D10) was reading the wrong tiles** — a rules bug, not just copy.
  The rulebook says the Chronossus takes the space "corresponding to **one of your** pending
  Hypersync tiles"; the dialog matched the **bot's** own. The flow is now: mark the occupied
  hexes → *"Does one of the available spaces match a Hypersync tile YOU have pending from a
  prior Era?"* → yes, place on your furthest-in-the-past one; no, fall through to the normal
  roll. The verbatim difficulty text is a footer rule box, and the Setup option's detail now
  quotes it in full
- [x] **Debug**: a Hypersync-tile stepper that adds to the furthest-back PRIOR Era, so a
  retrievable tile can be set up for testing (the current Era is only a fallback once the
  past is full)
- [x] 316 tests, build + lint clean throughout

## G6 — Ship ✅ engine/UI done (2026-08-13); on-device pass outstanding
- [x] Playthrough variations: `guardians` (3 tests — a full game acquiring/powering/placing
  Guardians, the Guardians-first power-up split per Era, and the Guardian board fallback
  keeping a no-space Capital Action from failing) and `guardians+hypersync` (1 test)
- [x] **`onPhase(phase, state)` hook added to the playthrough helper** — Guardians' per-Era
  `powered` count is reset by Clean Up, so the end of a run can't see it. Documented in the
  test-file header for the next module
- [x] Build + 305 tests + lint clean
- [x] Live verification: Guardians mode end to end (setup → the C11 dialog's three steps →
  History), and the combo's difficulty step showing both modules' options
- [x] Manual playthrough — done by the user across 2026-08-13/14; every report from it is
  fixed and logged in G8/G9/G10 above

---
### Deviations / decisions
_(none yet)_
