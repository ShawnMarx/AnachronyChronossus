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

## G2 — Engine: Guardian state, Power Up, placement
- [ ] `guardians?: { owned: number; powered: number }` on `ChronossusState`
- [ ] Power Up powers Guardians first, then Exosuits (check D4 + the post-Impact cap)
- [ ] `spendExosuit(bot)` helper — Guardians last; replaces the ~6 bare `exosuitsAvailable -= 1`
- [ ] Pass rule counts Guardians (`noExosuitFor` / out-of-Exosuits pass)
- [ ] Clean Up retrieves Guardians (both boards); `owned` persists, `powered` resets
- [ ] Guardian Action space fallback: Capital Action with no space → place a Guardian on a
  Path-marked Guardian board slot, not a Failed Action; wins over the Hypersync tile in the
  combo; no "is it free?" question, since every Guardian brings its own space
- [ ] Unit tests for each

## G3 — Engine: Acquire Guardian (C11)
- [ ] `TILE_EFFECTS` C11A/C11B (Autoleap both sides; C11B +2 VP)
- [ ] Acquire Guardian asks "is a Guardian still available?" first; none → Failed Action.
  Only asked **from Era 4** (can't be exhausted earlier), and Eras 5+ are post-Impact Failed
  Actions anyway — so the prompt effectively appears only in Era 4
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
