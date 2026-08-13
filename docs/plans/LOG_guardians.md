# LOG — Guardians of the Council (Chronossus module)

Execution tracker. Steps in implementation order; mark `[x]` as completed and note
deviations inline. See `PLAN_guardians.md` for the design and the verbatim rulebook text.

## G-R — Research & design
- [x] **Open questions 1-3 answered by the user (2026-08-13):** a failed Acquire Guardian is a
  **full** Failed Action (VP + discard an active Exosuit); the **Guardian space beats** the
  Solo Hypersync tile in the combo; and the fallback **can never run out** — each Guardian has
  its own guaranteed space on the Guardian board, the slot holding a Chronossus **Path
  marker** (any of them if several). Consequences: setup must have the player keep Path
  markers to hand, and C11 must instruct placing one when it enlists
- [ ] Classic Expansion pp.9-11: confirm powering up a Guardian costs the Chronossus nothing
  the app tracks, and that "leftmost available Guardian" is just left-to-right board order
- [x] **No cap on the bot's Guardians** (user, 2026-08-13): the 4 Solo Path markers are a
  component limit, not a rule — a 5th enlist is possible and the player substitutes a marker,
  so the copy carries a note and the engine no cap. The binding limit is the **6 shared
  Guardian miniatures**: C11 takes "the leftmost **available** Guardian", and the app can't
  see how many the player holds, so the Action asks — none available is a Failed Action

## G1 — Mode entry & setup
- [ ] `CHRONOSSUS_MODES.guardians` (I=C02, II=C11, III=C03)
- [ ] `CHRONOSSUS_MODES['guardians+hypersync']` (I=C12, II=C11, III=C03, V=C13 covers Time Travel)
- [ ] Un-stub both in `MODULE_CONFIGS`
- [ ] Setup screen: verbatim p.16 box + app-modified bullets, combo-aware
- [ ] Setup bullet: keep the Chronossus's Path markers to hand for the Guardian board
- [ ] Slice seeded at setup (`guardians` = 0, or 1 with the difficulty — which also instructs
  a starting Path marker + Guardian)
- [ ] Tests: tile codes per slot for both modes, incl. the B-side picker and the I/III swap

## G2 — Engine: Guardian state, Power Up, placement
- [ ] `guardians?: { owned: number; powered: number }` on `ChronossusState`
- [ ] Power Up powers Guardians first, then Exosuits (check D4 + the post-Impact cap)
- [ ] `spendExosuit(bot)` helper — Guardians last; replaces the ~6 bare `exosuitsAvailable -= 1`
- [ ] Pass rule counts Guardians (`noExosuitFor` / out-of-Exosuits pass)
- [ ] Guardian Action space fallback: Capital Action with no space → place a Guardian on a
  Path-marked Guardian board slot, not a Failed Action; wins over the Hypersync tile in the
  combo; no "is it free?" question, since every Guardian brings its own space
- [ ] Unit tests for each

## G3 — Engine: Acquire Guardian (C11)
- [ ] `TILE_EFFECTS` C11A/C11B (Autoleap both sides; C11B +2 VP)
- [ ] Acquire Guardian asks "is a Guardian still available?" first; none → Failed Action
- [ ] `resolveAcquireGuardian` — World Council branch (Exosuit + First Player + free Guardian),
  Worker branch (Most > Scientist > Engineer > Administrator > Genius, no Exosuit), and the
  failed branch (post-Impact or neither possible) as a **full** Failed Action — VP + discard
- [ ] Both acquiring branches instruct placing a Chronossus Path marker on an empty Guardian
  board slot and taking the leftmost available Guardian
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
