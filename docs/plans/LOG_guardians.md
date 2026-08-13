# LOG — Guardians of the Council (Chronossus module)

Execution tracker. Steps in implementation order; mark `[x]` as completed and note
deviations inline. See `PLAN_guardians.md` for the design and the verbatim rulebook text.

## G-R — Research & design
- [ ] Classic Expansion pp.9-11: how many reserved Guardian Action spaces, whether they can
  run out, and whether powering up a Guardian costs anything the app tracks
- [ ] Confirm "the leftmost available Guardian" (Guardian board slot order) for the instruction
- [ ] Open question 1 answered — what "as if it was a Failed Action" means (VP only, or the
  Chronossus's VP + discard-an-active-Exosuit)
- [ ] Open question 2 answered — Guardian space vs Solo Hypersync tile in the combo

## G1 — Mode entry & setup
- [ ] `CHRONOSSUS_MODES.guardians` (I=C02, II=C11, III=C03)
- [ ] `CHRONOSSUS_MODES['guardians+hypersync']` (I=C12, II=C11, III=C03, V=C13 covers Time Travel)
- [ ] Un-stub both in `MODULE_CONFIGS`
- [ ] Setup screen: verbatim p.16 box + app-modified bullets, combo-aware
- [ ] Slice seeded at setup (`guardians` = 0, or 1 with the difficulty)
- [ ] Tests: tile codes per slot for both modes, incl. the B-side picker and the I/III swap

## G2 — Engine: Guardian state, Power Up, placement
- [ ] `guardians?: { owned: number; powered: number }` on `ChronossusState`
- [ ] Power Up powers Guardians first, then Exosuits (check D4 + the post-Impact cap)
- [ ] `spendExosuit(bot)` helper — Guardians last; replaces the ~6 bare `exosuitsAvailable -= 1`
- [ ] Pass rule counts Guardians (`noExosuitFor` / out-of-Exosuits pass)
- [ ] Guardian Action space fallback: Capital Action with no space → place a Guardian, not a
  Failed Action
- [ ] Unit tests for each

## G3 — Engine: Acquire Guardian (C11)
- [ ] `TILE_EFFECTS` C11A/C11B (Autoleap both sides; C11B +2 VP)
- [ ] `resolveAcquireGuardian` — World Council branch (Exosuit + First Player + free Guardian),
  Worker branch (Most > Scientist > Engineer > Administrator > Genius, no Exosuit), and the
  failed branch (post-Impact or neither possible)
- [ ] `spendWorkerByPriority` helper
- [ ] Unit tests per branch, incl. no Workers, post-Impact, Autoleap advance

## G4 — UI: dialog, trackers, History, art
- [ ] `C11A.png` / `C11B.png` copied from `temp/Mod Tiles/`
- [ ] `AcquireGuardianDialog` — `flow` prop, in `renderModDialogs`, rule box in the footer,
  asks before it instructs
- [ ] Turn-overview Guardians chip (owned · powered), Guardians modes only
- [ ] Placement instructions name a Guardian when one was spent (incl. the fallback)
- [ ] `summarizeChronossusExtras` covers Guardians + the spent Worker

## G5 — Difficulty options
- [ ] `chronossus-guardians-postimpact-2vp`
- [ ] `chronossus-guardians-start-1` (via `applyDifficultySetup`)
- [ ] Both tested and shown in the score-screen setup note

## G6 — Ship
- [ ] Playthrough variations: `guardians`, `guardians+hypersync`
- [ ] Build + tests + lint clean
- [ ] Live verification (both modes), then staging
- [ ] Manual playthrough on device — user-side

---
### Deviations / decisions
_(none yet)_
