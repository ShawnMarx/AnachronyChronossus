# COMPLETED — Pioneers of New Earth (Chronossus module)

**Archived 2026-08-17.** Frozen record — do not edit.

Ran 2026-08-15 → 2026-08-17. Adds the Classic Expansion's **Pioneers of New Earth** module
to the Chronossus, plus the **`fractures+pioneers`** and **`guardians+pioneers`** combos.
The module brings one Action — **Adventure** (tiles C09/C10) — the Chronossus **Exosuit
Upgrade board**, the 36-card Adventure deck in two player-selectable modes, three
difficulty options, and the scoring hooks. Shipped to production **2026-08-17**, with the
landing page moving to 80%.

## What shipped

| Stage | Outcome |
|---|---|
| F1 | `pioneers` state slice + the Exosuit Upgrade board (base Power, Resource slots, VP tokens) |
| F2 | The 36-card Adventure database (verbatim Success boxes, `ongoing` flag) + sliced card art |
| F3 | `resolveAdventure` — the Power sum, deck choice, card choice, the four p.15 conversions, Power Upgrade |
| F4 | Two deck modes (virtual default / shared), toggleable at setup and in ⚙ |
| F5 | The Adventure dialog + the Upgrade-board pop-out |
| F6 | All three modes, their tile layouts, and C10 covering "Recruit Genius or Research" (slot IV) |
| F7 | The three Pioneers difficulty options |
| F8 | Clean Up, History (`summarizeChronossusExtras`), scoring |
| F9 | Tests + scripted playthroughs for all three modes |
| Post | Playtest passes 2026-08-15 → 08-17: the dialog reworked into rulebook order, the passing rule fixed on every path, tally + setup copy, board overlays |

**Final state:** 377 tests, `npm run build` and `npm run lint` clean (only the pre-existing
`only-export-components` warnings). Live at `anachrony.boardgameedge.com`.

## Production notes

- **The deck is chosen BEFORE the die.** `deckFor(powerBeforeRoll)` — Upgrade board + the
  Path-marker bonus, ≥9 → the 10+ deck (Solo Opponents p.15). Every screen now presents it in
  that order too: pre-roll Power → deck → the two cards → the die and the total → the outcome.
  Wording that implied otherwise was the first thing playtesting caught.
- **The card's printed Success box is the PLAYER's rule.** After the four conversions (W →
  VP, Morale → 2 VP each, a Research/Recruit/Construct choice → always Research, ongoing →
  discard for 3 VP + 1 Energy Core) it routinely describes something the bot never does, so
  no dialog shows it. `resolveAdventure` returns `gains` / `actions` / `followUps` instead.
- **The Adventure is an Exosuit placement, off the Main board.** It is in
  `OFF_MAIN_BOARD_ACTIONS`, so the hex pool is a Blink **destination** and never a source
  (nothing is recorded in `placedExosuits`). Off-board placements take **no Energy Core** —
  the core only marks an Exosuit that could Blink.
- **Every path that resolves a rolled Action must run `passesInsteadOfAction`.** Pioneers
  shipped with the covered-space path (C10 over a printed Action) running no pass check at
  all, and the tile-slot path missing the Fractures Blink exemption. The view funnels all of
  them — printed space, tile slot, covered space, and debug taps — through one
  `passIfOutOfFigures` helper.
- **A covering tile has to be taught in three places**: resolution, the board overlay, and
  the Simple Command View. Pioneers is the first module to use slot IV and each was a
  separate bug.
- **Two tile families can share one action id.** C09 and C10 are both `tile-adventure`, so
  the dialog needs the FAMILY passed in — `liveTileFamily` returns whichever the mode lists
  first, which rendered (and resolved) C10 as C09.
- **`cloneChronossus` must deep-copy a new module's slice.** The resolvers mutate in place,
  History diffs pre against post, so a shallow copy makes every one of that module's History
  lines silently vanish. Unit tests passed through this bug; only play caught it.
- **Adventure card follow-ups are instructions, not automation.** Cards that construct a
  building or grant Research/Recruit Actions emit a player instruction; everything the app
  tracks is applied automatically.
- **Browser harnesses kept from this effort:** `pw-adv.mjs` (opens the Adventure dialog and
  screenshots it at a given width — dialog-only layout bugs are invisible in a full-page
  shot), `pw-warp.mjs` (Warp roll vs. tiles shown), `pw-pass.mjs` (edits the persisted save
  to reach states the UI has no control for, e.g. out of Exosuits). Documented in `CLAUDE.md`.

---

# PART 1 — The plan

# PLAN — Pioneers of New Earth (Chronossus module)

> Created 2026-08-15. Adds the **Pioneers of New Earth** module to the Chronossus,
> plus the two combos it unlocks. Requires the Classic Expansion Pack physically.
>
> Sources: **Solo Opponents p.15** (the Chronossus's Pioneers rules — verbatim text for
> the app), **Classic Expansion pp.6–9** (the human module rules), **Classic Expansion
> pp.13–14** (per-card Adventure Appendix), **Solo Opponents pp.19–21** (tile matrix +
> C09/C10 Appendix entries).

## Goal

Ship `pioneers`, `fractures+pioneers` and `guardians+pioneers` as playable Chronossus
modes: the Chronossus Exosuit Upgrade board, the **Adventure** Action (C09/C10) with both
of its steps, the 36-card Adventure deck in two player-selectable modes, the three
Pioneers difficulty options, and the Clean Up / History / scoring hooks.

## Research already done (do not redo)

Settled before this plan was written — treat as fact:

- **Adventure die = a plain d6, faces 1–6** (Power icon art). Confirmed off the TTS die
  texture (GUID `20cae0`, 1800×1800). No custom face distribution — `rollAdventureDie()` is
  a d6. **The six face images are already extracted** to
  `public/assets/solo/chronossus/adventure-die-{1..6}.png` (LOG step 2.5, done 2026-08-15) —
  the app prefers real component art over stand-in glyphs, as with the AI and shape dice.
  Atlas geometry, since it is not obvious: **3×3 of 600px cells with the top row blank**;
  faces occupy rows 1–2 (values 2,4,5 / 1,3,6), and the **1 and 6 are rotated 180°**.
- **36 Adventure cards, 18 per deck, all distinct** (one copy of each). Corroborated three
  ways: the TTS object tree (CardIDs `511xx` / `512xx`, 18 each), the Classic reference
  card's quantity table (p.8), and the Appendix (pp.13–14).
- **Card art extracts cleanly** from the TTS mod's two deck sheets (both 1925×2400, 5×4
  grids → 385×600 per card). Validated visually as a contact sheet. Crops want a ~1%
  margin trim to drop a sliver of the neighbouring card.
- **The full name → deck-index → Power mapping is confirmed** (read off the art, and the
  per-power counts match the reference card exactly). See the appendix at the bottom of
  this file — that table is verified, use it directly.
- **The mode → tile matrix already exists** in `src/board/chronossusModes.ts`; the three
  Pioneers rows are known (see Feature 6).

## What the module adds

**Setup** (Solo Opponents p.15): place C03A/I, C09A/II, C02A/III, and **C10A covering the
printed "Recruit Genius or Research" Action space**; add the "Successful Adventures" Solo
Objective card; give the Chronossus its **Exosuit Upgrade board, A side up**.

**The Chronossus Exosuit Upgrade board** — new tracked state:
- Base Power **2** (A side) / **3** (B side).
- One slot per Resource, worth **+2 / +3 / +3 / +4** (Titanium / Gold / Uranium /
  Neutronium — confirm the pairing against the board art in F1).
- **VP tokens** placed on it are worth a further **+2** (A) / **+3** (B) Power each, and by
  default do **not** count as VP (a difficulty option flips that).

**New Action — Adventure** (C09 A/B, C10 A/B): place an Exosuit on the Adventure hex pool
space and a Path marker on the highest available strength bonus, then two steps in order
(*"It is possible for one of these steps to fail. If this happens, ignore that step."*):

1. **Perform Adventure** — sum Power (Upgrade board + the Path-marker strength bonus).
   **≥9 → draw 2 from the 10+ deck, else 2 from the 5+ deck.** Roll the Adventure die and
   add it. Take **the card with the highest Power requirement it meets**; unselected cards
   go to the bottom of their deck. **If it meets neither, it gains 1 VP** and both cards go
   back. If a card was selected it receives that card's benefit, then discards the card.
   Note the bot **never resolves a Failure box**, never pays Water, and never draws extra
   cards for Breakthroughs.
   **Four special cases** (verbatim, p.15): W → **1 VP per 2 W (round up)**; each Morale
   increase → **2 VP**; a choice of Research / Recruit / Construct → **always Research**;
   an ongoing (purple) benefit → **discard it, gain 3 VP and 1 Energy Core instead**.
2. **Power Upgrade** — move a Resource from the Chronossus's board to the Upgrade board.
   It must be one with a free slot; among options pick **whichever it has the most of**;
   tie → **Titanium > Gold > Uranium > Neutronium**. If no Resource can be placed or no
   slot is free, place **1 VP token** from the supply on the Upgrade board instead.

**Clean Up:** also retrieve the bot's Path markers from the Adventure Power slots.

**Three new difficulty options** (p.15): flip some/all new Action tiles to B; flip the
Upgrade board to B; **VP tokens on the Upgrade board count as VP**.

## Key decisions made during discussion

1. **Two Adventure-deck modes, virtual is the default.**
   - **Virtual deck (default):** the app holds its own shuffled 5+/10+ decks, draws the 2
     cards itself, **shows the real card art**, and states what the bot does. The player's
     physical Adventure decks are never touched by the bot — which also means the bot's
     draws can't deplete or reorder the player's deck.
   - **Shared deck:** the bot draws from the same physical deck. The app tells the player
     its Power, which deck to draw 2 from, and to take the higher-Power card it meets; the
     player enters the card name(s). Faithful to the printed rules, at the cost of taps.
   - Selectable **at module selection** *and* toggleable later in **⚙ settings**.
2. **Power slots: ask every time.** The Adventure board's strength-bonus column is shared
   with the player's own Path markers, which the app cannot see, so it never assumes — it
   asks which is the highest free slot on every Adventure Action. (Consistent with the
   "never tell the player to place before the app knows what happens" convention.)
3. **All three modes ship together** — `pioneers`, `fractures+pioneers`,
   `guardians+pioneers`. Guardians landed 2026-08-14, so the combo work is cheapest now.
4. **Both deck modes share one card database.** Name, Power, Success box, and a
   purple/ongoing flag, transcribed from Classic pp.13–14. Only the virtual mode
   additionally needs the 36 sliced art assets.
5. **The Failure box is not transcribed.** The Chronossus never resolves one — it takes a
   card only when it meets the requirement, else gains 1 VP. Storing Failure text would be
   dead data. (Revisit only if a future module lets the bot fail an Adventure.)

## Features, in implementation order

### Feature 1 — Engine: Pioneers state + the Exosuit Upgrade board
`src/engine/bots/chronossus.ts`, `src/engine/state.ts`

- Extend `ChronossusState` with a `pioneers` block: `upgradeBoardSide: 'A' | 'B'`,
  `upgradeResources` (which Resource slots are filled), `upgradeVpTokens: number`,
  `adventuresCompleted: number` (for the "Successful Adventures" Solo Objective and the
  score breakdown), and the deck state (Feature 4).
- `chronossusPower(state)` — base (2/3) + filled Resource slots + VP tokens × (2/3). Pure
  and unit-tested; every other feature reads Power through it.
- `powerUpgradeChoice(state)` — the Step 2 decision: free slot, most-of, tie order
  Titanium > Gold > Uranium > Neutronium, else the VP-token fallback.
- **Confirm the Resource → slot-value pairing (+2/+3/+3/+4) against the Chronossus Upgrade
  board art** before wiring it; the rulebook prints the numbers but not the pairing.

### Feature 2 — The Adventure card database + art
new `src/data/adventureCards.ts`, `public/assets/solo/chronossus/adventures/`

- Transcribe all 36 cards: `id`, `deck` (`'5+' | '10+'`), `name`, `power`, `success` (the
  verbatim Success box), `ongoing: boolean` (the purple cards). Names/Power/index are
  already verified — see the appendix table below; the Success text comes from Classic
  pp.13–14.
- **Machine-readable bot outcome per card** — the special-case conversions resolved at
  build time where they're unambiguous (W → VP, Morale → 2 VP, ongoing → 3 VP + 1 Energy
  Core, choice → Research), plus a plain-language line for anything the app can't apply to
  a physical board it can't see (free buildings, Recruit/Research Actions, Time Travel
  advances). The dialog shows the card and states what the bot does.
- Extract the 36 card images from the TTS mod (script in the scratchpad already proven):
  slice both sheets 5×4, trim a ~1% margin, export web-sized WebP/JPEG. Note the repo is
  private because board art is copyrighted — these go in the same asset tree.
- Extract the **6 Adventure die faces** from the same mod (texture GUID `20cae0`, 3×2 atlas
  of 600×600; rotate the 1 and 6 faces 180° back upright) → square face images, so the
  rolled die shows real art like the AI / shape dice do.

### Feature 3 — Engine: the Adventure Action
`src/engine/bots/chronossus.ts`, `src/board/chronossusTiles.ts`

- `resolveAdventureAction(state, input)` — the two ordered steps, pure, with the die roll
  and the drawn cards passed **in** (the caller rolls/draws), matching the existing engine
  contract. Handles: deck choice at Power ≥9, "highest requirement it meets", the
  meets-neither 1 VP, the card's converted benefit, then Step 2's Power Upgrade, and the
  "if a step fails, ignore that step" note.
- Register the Action in **both** action maps — `TILE_ACTION_FAMILY` / `TILE_ACTION_CODE`
  in `chronossusTiles.ts` **and** `FAMILY_TO_TILE_ACTION` in `ChronossusGame.tsx`. This is
  the exact bug Guardians' C11 shipped with (tile rendered, tap did nothing, marker landed
  as "no effect", no error). C09 **and** C10 both map to the Adventure Action.
- `placesExosuitFor('adventure')` → **true**, and add it to `OFF_MAIN_BOARD_ACTIONS` — the
  Adventure hex pool is on the Adventure mini-board, not the Main board, so it is a Blink
  destination but never a source, exactly like the Valley spaces.
- Tile deltas: C09B "+1 VP", C10B "+1 Energy Core"; C10A is "same as C09A".

### Feature 4 — Deck modes (virtual / shared)
`src/engine/bots/chronossus.ts`, `src/phases/ChronossusSetupFlow.tsx`, settings menu

- Deck state in `ChronossusState.pioneers`: draw piles + discard for each deck, seeded and
  shuffled at setup (virtual mode). Shuffling is app randomness, like the Energy Pool.
- Unselected cards go to the **bottom** of their deck; a selected card is **discarded**
  after use — model both so a long game stays faithful.
- **Serializable** — the deck must survive the Snapshot/undo stack and the versioned
  `localStorage` save, and Undo must re-show the *same* draw (the roll-persistence rule the
  Chronossus already follows).
- Mode picker at module selection + a ⚙ settings toggle. Switching mid-game needs a defined
  behaviour — proposal: allow it, and on switching *to* virtual, reshuffle a fresh deck
  minus anything already discarded (flag in the log if this proves confusing in playtest).

### Feature 5 — View: the Adventure dialog + Upgrade board display
`src/ChronossusGame.tsx`, `src/board/chronossusHotspots.ts`

- `AdventureDialog`, rendered through `renderModDialogs(flow)` with the same `flow` prop as
  every other module dialog, so it doesn't go full-screen on a tablet while base Actions
  don't. Verbatim 📖 rule boxes in the **footer** below `.dp-body`, never inside a
  `.place-prompt` step box.
- Step flow: Exosuit placement gate (with the Blink check where Fractures is in play) →
  **ask the highest free Power slot** → app rolls the die and draws → show the card(s) and
  state the outcome → Step 2 Power Upgrade instruction → ▶ Start Your Turn.
- An **Upgrade board badge / pop-out** on the Chronossus board showing current Power and
  its breakdown (base + each Resource + VP tokens), matching the existing badge pattern.
- Component art over glyphs, per convention — the real Resource cubes and the Power icon.

### Feature 6 — The three modes
`src/board/chronossusModes.ts`, `src/phases/ChronossusSetupFlow.tsx`

Flip `available: true` and fill the slots (matrix rows already known):

| Mode | I | II | III | IV (covers Genius/Research) |
|---|---|---|---|---|
| `pioneers` | C03A | C09A | C02A | C10A |
| `fractures+pioneers` | C05A | C14A | C09A | C10A |
| `guardians+pioneers` | C03A | C09A | C11A | C10A |

- **Slot IV is new ground for a non-Hypersync module** — C10A *covers* the printed "Recruit
  Genius or Research" space (`CoveredAction` already supports `recruit-genius-research`,
  but nothing has used it yet; Hypersync only ever covered Time Travel). Expect the first
  real exercise of that path.
- Per-mode setup text on the setup screen (verbatim), including the "Successful Adventures"
  Solo Objective line and the Upgrade-board A-side instruction.
- `fractures+pioneers`: Recruit Genius / Research is covered, so the Blink rules and the
  Valley board coexist with the Adventure board — check `placeableFigures` and the pass
  rule still count correctly. `guardians+pioneers`: a **Guardian is an Exosuit**, so
  Adventure placement must go through `placeableFigures` / `nextFigure` / `spendFigure`
  and inherit "Guardians last" for free.

### Feature 7 — Difficulty options
`src/engine/bots/chronossus.ts`, `src/phases/ChronossusSetupFlow.tsx`

Three new flags, alongside the existing D1–D10 pattern:
- Flip some/all of the new Action tiles to B (the existing per-tile A/B picker should cover
  this once C09/C10 are registered — verify rather than re-build).
- `pioneers-upgrade-board-b` — Upgrade board B side (base Power 3, VP tokens +3).
- `pioneers-vp-tokens-count` — VP tokens on the Upgrade board count as VP at scoring.

### Feature 8 — Clean Up, History, scoring
`src/engine/bots/chronossus.ts`, `src/game/chronossusHistory.ts`, score screen

- **Clean Up:** retrieve the bot's Path markers from the Adventure Power slots (Classic p.9)
  — a player instruction plus clearing whatever slot state the app holds.
- **History:** extend `summarizeChronossusExtras` with the Pioneers deltas (Power change,
  VP tokens, Adventures completed, the card taken). `summarizeTurn` can't see module-only
  pools — this is the documented seam. Add any new icon token to
  `src/history/HistoryText.tsx`.
- **Scoring:** the score breakdown gains VP tokens **only** when
  `pioneers-vp-tokens-count` is on; "Successful Adventures" stays in the existing
  player-entered Solo Objective tally, with the bot's own count shown as a hint.

### Feature 9 — Tests + playtest
- Unit tests: `chronossusPower` across both board sides, `powerUpgradeChoice` (most-of, all
  four tie steps, both fallbacks), deck selection at the 9 boundary, "highest requirement it
  meets" incl. the meets-neither case, each of the four special-case conversions, and deck
  draw/discard/bottom ordering.
- Mode tests alongside the existing `chronossusModes.test.ts` rows.
- `npm run build` + `npm test` clean; then a playtest round per mode (Guardians needed four
  rounds and surfaced two real rules bugs — budget for the same here).

## Recommended order & rationale

**1 → 2 → 3** first: state, then data, then the Action — each is pure and testable with no
UI. **4** before **5** so the dialog is written against the final deck contract rather than
retrofitted. **6** after the Action exists, since the modes are mostly wiring once
Adventure resolves (and slot IV is the one genuinely new path). **7** is cheap once the
state exists. **8** is the polish seam that's been forgotten before. **9** throughout, then
a real playtest per mode.

## Open questions

- ~~**O1 — Adventure board Power-slot values.**~~ **CLOSED 2026-08-15** off the Adventure
  board art (TTS `PONE.Board` = GUID `8b8548`). The column has **four placeable slots, top
  to bottom: +2, +1, 0, −1**, and a boxed **−3** at the bottom for the "no free Power slots
  at all" case. The rulebook example only showed +2/+1 because a marker covered the rest.
- ~~**O2 — Resource → Upgrade-slot pairing.**~~ **CLOSED 2026-08-15** off the Chronossus
  Exosuit Upgrade board art (Solo Opponents p.15), cross-checked against the repo's own cube
  art: **Titanium +2, Uranium +3, Gold +3, Neutronium +4** (left to right). Note this is
  *not* the tie-break order (Titanium > Gold > Uranium > Neutronium) — they are independent.
  A VP token is worth +2 (A side).
- **O3 — Switching deck mode mid-game.** Proposal in Feature 4; confirm in playtest.
- **O4 — Card art licensing.** Same posture as the existing board art: repo stays private.
  Worth a note in the "make the repo public" TODO item, which now has 36 more assets to
  strip or license.

## Deferred / out of scope

- **Doomsday** — combines with nothing (Solo Opponents p.18); its own plan.
- **Fractures + Guardians** — not a legal pairing; nothing to do.
- **Adventure board overlays / art on screen** — the Adventure board stays
  player-managed, exactly like the Valley and Guardian boards. The app names the slot in
  text.
- **Failure-box text** — see decision 5.
- **Sensor Upgrade** — a human-only Action; the Chronossus never takes it.

---

## Appendix — verified Adventure card index

Deck index → name → Power. Read off the TTS art and cross-checked against the Classic
reference card's quantity table (5+: 3×5, 3×6, 4×7, 4×8, 4×9; 10+: 3×10, 2×11, 3×12, 3×13,
2×14, 2×15, 2×16, 1×18). Success/Failure text is in Classic pp.13–14.

**5+ deck (18)**

| # | Card | Power |
|---|---|---|
| 00 | Exosuit Malfunction | 5 |
| 01 | Mystical Teachings | 5 |
| 02 | Raid on Nomad Village | 5 |
| 03 | Nuclear Winter | 6 |
| 04 | Data Archives | 6 |
| 05 | Journey through the Rift | 6 |
| 06 | Irradiated Vermin Tide | 7 |
| 07 | Ancient Gold Mine | 7 |
| 08 | Forgotten Time Capsule | 7 |
| 09 | Passage of the Five Beasts | 7 |
| 10 | Temporal Crack | 8 |
| 11 | Electromagnetic Hurricane | 8 |
| 12 | Tribes of the Outback | 8 |
| 13 | Secret Tunnels | 8 |
| 14 | Old Sewers | 9 |
| 15 | Giant Sandworm | 9 |
| 16 | Hidden Resource Storage | 9 |
| 17 | Cargo Ship Wreckage | 9 |

**10+ deck (18)**

| # | Card | Power |
|---|---|---|
| 00 | Neutronium Cave | 10 |
| 01 | Hostile Nomads | 10 |
| 02 | The Time Maker | 10 |
| 03 | Fountain of Life | 11 |
| 04 | Broadcast from the Past | 11 |
| 05 | Abandoned Factory | 12 |
| 06 | Uncontaminated Reservoir | 12 |
| 07 | Underground Laboratory | 12 |
| 08 | Deserted Carrier | 13 |
| 09 | Ancient Temple Ruins | 13 |
| 10 | Ice-bound Cryochamber | 13 |
| 11 | Rogue AI | 14 |
| 12 | Adrenaline Shots | 14 |
| 13 | Asteroid Debris | 15 |
| 14 | Trails to the Lost City | 15 |
| 15 | Secret Military Facility | 16 |
| 16 | Unstable Neutronium Core | 16 |
| 17 | Metropolis Ruins | 18 |

Known **ongoing (purple)** cards from the Appendix text — the bot discards these for 3 VP +
1 Energy Core: Hidden Resource Storage, Old Sewers, Deserted Carrier, Trails to the Lost
City, Giant Sandworm (permanent +4 Power), Forgotten Time Capsule (endgame effect).
**Confirm the full purple list off the card art during F2** — the purple Success box is the
authoritative marker.

---

# PART 2 — The execution log

# LOG — Pioneers of New Earth

Execution tracker for `docs/plans/PLAN_pioneers.md`. Mark `[x]` done, `[~]` partial.
Note deviations and decisions inline as you go.

---

## Feature 1 — Engine: Pioneers state + Exosuit Upgrade board

- [x] 1.1 Resolve **O2**: confirm the Resource → Upgrade-slot pairing (+2/+3/+3/+4) off the
      Chronossus Exosuit Upgrade board art.
- [x] 1.2 Extend `ChronossusState` with the `pioneers` block (board side, filled Resource
      slots, VP tokens, `adventuresCompleted`); keep it serializable for Snapshot +
      `localStorage`.
- [x] 1.3 `chronossusPower(state)` — base 2/3 + Resource slots + VP tokens ×2/×3.
- [x] 1.4 `powerUpgradeChoice(state)` — free slot, most-of, tie order T > G > U > N, VP-token
      fallback.
- [x] 1.5 Unit tests for 1.3 and 1.4 (both board sides, all four tie steps, both fallbacks).

**Notes:**

---

## Feature 2 — Adventure card database + art

- [x] 2.1 Transcribe all 36 cards to `src/data/adventureCards.ts` (id, deck, name, power,
      verbatim Success box, `ongoing` flag). Index/name/Power are pre-verified in the plan
      appendix; Success text from Classic pp.13–14.
- [x] 2.2 Confirm the full **purple/ongoing** list off the card art (the plan's list is
      partial and marked "confirm").
- [x] 2.3 Add the machine-readable bot outcome per card (the four conversions applied where
      unambiguous + a plain-language line where the app can't touch the physical board).
- [x] 2.4 Extract the 36 card images from the TTS mod (5×4 slices, ~1% margin trim,
      web-sized) into `public/assets/solo/chronossus/adventures/`.
- [x] 2.5 Extract the **6 Adventure die faces** (texture `20cae0`) → done 2026-08-15, ahead
      of the rest of F2. Written to
      `public/assets/solo/chronossus/adventure-die-{1..6}.png` (300×300).
      **Deviation from the plan's geometry:** the atlas is **3×3 of 600px cells with the top
      row blank**, not 3×2 over the full 1800px height. Derived by measuring the ink bounding
      boxes (rows 740–1059 / 1346–1666; cols 92–494 / 677–1107 / 1303–1705), which centre on
      x = 300/900/1500 and y = 900/1500. Faces sit at (col, row) for row ∈ {1,2}. Values by
      cell: r1 → 2, 4, 5; r2 → 1, 3, 6, with the **1 and 6 rotated 180°** in the atlas.
      Verified visually after un-rotating: all six read numeral-left, fist-right.
- [x] 2.6 Spot-check every card image against its database row (name + Power).

**Notes:**

---

## Feature 3 — Engine: the Adventure Action

- [x] 3.1 `rollAdventureDie()` (plain d6) in the engine's dice rollers.
- [x] 3.2 `resolveAdventureAction(state, input)` — Step 1: Power ≥9 deck choice, die add,
      "highest requirement it meets", meets-neither → 1 VP, converted benefit, discard.
- [x] 3.3 Step 2 Power Upgrade via `powerUpgradeChoice`, incl. the VP-token fallback and the
      "if a step fails, ignore that step" note.
- [x] 3.4 Register C09 **and** C10 in `TILE_ACTION_FAMILY` / `TILE_ACTION_CODE`
      (`chronossusTiles.ts`) **and** `FAMILY_TO_TILE_ACTION` (`ChronossusGame.tsx`) — both
      maps, or the tile renders but does nothing (the Guardians C11 bug).
- [x] 3.5 `placesExosuitFor('adventure')` → true; add to `OFF_MAIN_BOARD_ACTIONS` (Blink
      destination, never a source).
- [x] 3.6 Tile side deltas: C09B +1 VP, C10B +1 Energy Core, C10A = same as C09A.
- [x] 3.7 Unit tests: the 9 boundary, highest-it-meets, meets-neither, each of the four
      special-case conversions.

**Notes:**

---

## Feature 4 — Deck modes (virtual default / shared)

- [x] 4.1 Deck state: draw piles + discards for both decks, shuffled at setup (virtual).
- [x] 4.2 Unselected → bottom of deck; selected → discarded after use.
- [~] 4.3 Verify the deck survives Snapshot/undo and the versioned save, and that **Undo
      re-shows the same draw** (the existing roll-persistence rule).
- [x] 4.4 Shared-deck path: prompt for the drawn card name(s) instead of drawing.
- [x] 4.5 Mode picker at module selection + ⚙ settings toggle.
- [x] 4.6 Define + implement mid-game switching (**O3**); flag in playtest if confusing.
- [x] 4.7 Unit tests for draw / bottom / discard ordering.

**Notes:**

---

## Feature 5 — View: Adventure dialog + Upgrade board display

- [x] 5.1 `AdventureDialog` with the `flow` prop, rendered via `renderModDialogs(flow)`.
- [x] 5.2 Step flow: placement gate (+ Blink check under Fractures) → **ask the highest free
      Power slot** (O1) → roll + draw → show card(s) and state the outcome → Step 2
      instruction → ▶ Start Your Turn.
- [x] 5.3 Verbatim 📖 rule boxes in the dialog **footer**, in order; never inside a
      `.place-prompt` box.
- [x] 5.4 Upgrade-board badge / pop-out: current Power + breakdown, real component art.
- [~] 5.5 Check dialog layout at tablet width against a base-game Action dialog.

**Notes:**

---

## Feature 6 — The three modes

- [x] 6.1 `pioneers` slots (C03A/I, C09A/II, C02A/III, **C10A covers Genius/Research**);
      `available: true`.
- [x] 6.2 `fractures+pioneers` (C05A, C14A, C09A, C10A).
- [x] 6.3 `guardians+pioneers` (C03A, C09A, C11A, C10A).
- [x] 6.4 Exercise the **slot IV / `recruit-genius-research` covering path** — first real use;
      verify tap, marker-landing and rule display all resolve.
- [x] 6.5 Verbatim per-mode setup text (incl. the "Successful Adventures" Solo Objective and
      the Upgrade board A-side line).
- [x] 6.6 `guardians+pioneers`: Adventure placement goes through `placeableFigures` /
      `nextFigure` / `spendFigure` so "Guardians last" is inherited.
- [x] 6.7 `fractures+pioneers`: Blink + Valley + Adventure coexist; pass rule and figure
      counts still correct.
- [x] 6.8 Add mode rows to `chronossusModes.test.ts`.

**Notes:**

---

## Feature 7 — Difficulty options

- [x] 7.1 Verify the existing per-tile A/B picker covers C09/C10 once registered.
- [x] 7.2 `pioneers-upgrade-board-b` (base Power 3, VP tokens +3).
- [x] 7.3 `pioneers-vp-tokens-count` (VP tokens count as VP at scoring).
- [x] 7.4 Setup-screen entries + tests.

**Notes:**

---

## Feature 8 — Clean Up, History, scoring

- [x] 8.1 Clean Up: retrieve Path markers from the Adventure Power slots (instruction +
      clear held state).
- [x] 8.2 `summarizeChronossusExtras` — Pioneers deltas (Power, VP tokens, Adventures, the
      card taken); new icon tokens in `src/history/HistoryText.tsx`.
- [x] 8.3 Scoring: VP tokens counted only under `pioneers-vp-tokens-count`; show the bot's
      Adventure count as a hint beside the Solo Objective tally.

**Notes:**

---

## Feature 9 — Tests + playtest

- [x] 9.1 `npm run build` and `npm test` clean.
- [x] 9.2 `npm run lint` clean.
- [x] 9.3 Playtest `pioneers`.
- [x] 9.4 Playtest `guardians+pioneers`.
- [~] 9.5 Playtest `fractures+pioneers`.
- [ ] 9.6 Commit + push to `staging`.

**Notes:**

---

## Deviations & decisions during execution

**2026-08-15 — die art extracted ahead of the plan (F2.5 + two bonus dice).**

- **The TTS die-texture convention:** every die texture in the mod is **1800×1800, a 3×3
  grid of 600px cells, with the top row blank** — the 6 faces sit in rows 1–2. Verified on
  all three dice by measuring ink bounding boxes (they centre on x = 300/900/1500,
  y = 900/1500). Assuming a 3×2 split over the full height is wrong and silently produces
  half-cell-shifted crops.
- **Treatment: raw crop** (user's call, 2026-08-15) — no rim, glow, or background keying.
  Saved at 300×300 PNG.
- Faces only need one image per *distinct* face, not per side.

Written (all raw crops, 300×300):

| File | Source | Cell | Note |
|---|---|---|---|
| `solo/chronossus/adventure-die-{1..6}.png` | `20cae0` | r1: 2,4,5 · r2: 1,3,6 | **1 and 6 rotated 180°** in the atlas |
| `solo/paradox-die-{0,1,2}.png` | `5d08ea` | c0r2 / c0r1 / c2r2 | blank / single / double triangle |
| `solo/shape-die-{circle,triangle,square}.png` | `d6b98c` | c0r2 / c1r1 / c0r1 | all upright |

- The Paradox art independently confirms `rollParadoxDie`'s documented `[0,1,1,1,1,2]`
  (1 blank, 4 single, 1 double), and the shape art confirms `rollShapeDie`'s 2-each split.
- The Paradox and shape dice are **shared by both bots**, so they live in `solo/` beside
  `ai-die.jpg`, not in `solo/chronossus/`. **Assets only — nothing is wired up yet**, and
  displaying them is outside this plan's scope; see the TODO item.

---

**2026-08-15 — build notes, deviations and what stayed open.**

- **Both open questions closed off art, not guesswork.**
  - **O1** — the Adventure board's Power column is **+2 / +1 / 0 / −1** with a boxed **−3**
    for "no free slot" (TTS `PONE.Board`, GUID `8b8548`). The rulebook example only showed
    +2/+1 because a Path marker covered the top of the column.
  - **O2** — the Upgrade board slots are **Titanium +2, Uranium +3, Gold +3, Neutronium +4**
    (left to right), VP token +2 (A) / +3 (B). Confirmed against the repo's own cube art.
    This is deliberately NOT the tie-break order (Titanium > Gold > Uranium > Neutronium);
    `pioneers.ts` says so at both constants, because conflating them is an easy bug.
- **The mode layouts were independently confirmed** by the TTS mod's own setup table
  (`SOLO.Chronossus.Actions.Dispositions`): the PONE row is C03/C09/C02/C10, the
  `FOT+PONE` row C05/C14/C09/C10, and the `GOTC+PONE` row C03/C09/C11/C10 — matching the
  rulebook matrix already in `chronossusModes.ts`.
- **A real bug found by playing it, not by tests: `cloneChronossus` was shallow.**
  `resolveAdventure` mutates the bot in place (as the other resolvers do), so a shallow
  copy of the new `pioneers` slice let it write through to the caller's pre-turn state —
  and since History diffs pre against post, **every Pioneers line silently vanished**. The
  clone now deep-copies `upgraded` and both decks, with a regression test that asserts the
  pre-turn state is untouched. Worth remembering when the next module adds nested state.
- **New assets** — C09/C10 tile art (A and B) was missing entirely; the tiles rendered as
  broken images until extracted. All four came off the mod's 5×3 tile sheet (deck `853`,
  index 5 = C10, 6 = C09, rotated +90 to match the existing tiles). The B-side art also
  independently confirms the effects coded in `TILE_EFFECTS`: C09B **+1 VP**, C10B **+1
  Energy Core**. Also added: the Upgrade board (both sides) and a Power fist icon cropped
  out of the Adventure die.
- **The covering tile had to be drawn too.** Pioneers is the first module to use slot IV,
  and only Hypersync's C13-over-Time-Travel had a render path — so C10 resolved correctly
  but the board still showed the printed "Recruit Genius or Research" with no sign a tile
  had replaced it. Added the matching overlay for `recruit-genius-research`.
- **Adventure card follow-ups are instructions, not automation.** Cards that say "Construct
  1 Factory" or "take 2 Research Actions" emit a player instruction; everything the app
  tracks (VP, Resources, Energy Cores, Workers, Time Travel, Anomalies, Warp tiles) is
  applied automatically. Two app decisions the rulebook does not cover are recorded in
  `adventureCards.ts`: a "1 T/U/G" choice reuses the Mine priority, and Adrenaline Shots'
  "up to 2 Adventure Actions" is **not** taken (the bot takes exactly the one Action its
  Command marker landed on).
- **`pw-check.mjs`** (new, kept) renders a mode in a browser and prints which tile images
  are on the board plus any broken images — how the missing C09/C10 art and the missing
  slot-IV overlay were both caught.

**Left open:**

- **9.5 / 4.3 / 5.5** — `fractures+pioneers` was verified by render check (correct tiles, no
  errors) and by unit tests for the Blink interaction, but the scripted playthrough never
  rolled onto its Adventure (C09 sits at marker 5 step 4 there) so the **Blink-check →
  Adventure gate was not exercised in a browser**. Undo/roll-persistence and the tablet-width
  dialog layout are likewise untested on a device. All three want a manual pass.

**2026-08-15 (later) — UI follow-ups from playing it.**

- **The Adventure tile described a different tile.** `tileInstruction` had no `adventure`
  branch, so C09A/C10A (whose only effect IS the Adventure) fell through to the Reboot
  fallback — "The Chronossus does nothing this turn" — and the B sides announced just their
  bonus. `TILE_DESC` had the same hole. Both moved to a pure `src/board/tileText.ts` so they
  can be unit-tested (importing the view pulls in browser-only auth), with tests that no
  implemented tile except Reboot may describe itself as doing nothing and that every in-play
  tile action has a Command-view description.
- **The SCV named the printed Action on a covered space** — Pioneers' C10 over "Recruit
  Genius or Research" showed the Action the tile had replaced. Now driven off `slotCovering`
  for any `CoveredAction`, so the next module's covered space works without a new special
  case. That makes **three** places slot IV had to be taught about covering: resolution, the
  board overlay, and the SCV.
- **The Exosuit Upgrade board pop-out** — a button under the Exo tracker (both in the turn
  overview and on the main board, under the `mech` badge) opens the real board art with its
  state marked on it: a Resource cube over each filled slot, and a tracker on the VP-token
  box that reads as the Power those tokens add and swaps to the token count when tapped.
  Slot coordinates (`UPGRADE_SLOT_POS` / `UPGRADE_VP_POS`) are measured off the art by eye —
  calibrating them properly is in `TODO.md`, since calibrate mode doesn't reach a modal.
- **The Paradox die is now shown as its real face** in both the Paradox and Warp phases, for
  both bots — the extracted blank / single / double art instead of a teal number chip. It
  replaces the roll readout only; the Paradox token and Warp tile still show beside it.

**2026-08-16 — the Adventure dialog reworked off playtest feedback.**

- **C10 rendered and resolved as C09 — a rules bug, not just cosmetics.** Both families map
  to the one `tile-adventure` action, and `liveTileFamily` returns whichever the mode lists
  first, so C10's dialog showed C09's art, name and verbatim rule box **and C10B's +1 Energy
  Core could never have applied**. The activated family is now carried in
  `pendingTileFamily` and threaded to both `CxTileDialog` (via a new `family` prop) and
  `resolveTileSlot`. Watch the ordering: it must be set *after* `closeDialogs()`, which
  clears `pendingTile` and the family with it — that caught me once already.
- **The dialog opened on a summary, not a step.** It led with the whole Action described
  behind a ▶ Start Your Turn, so the player dismissed a paragraph before being asked
  anything. It now opens directly on step 1 — place the Exosuit and Path marker, answer
  which Power slot — with the board's Power and "then it rolls the Adventure die" as
  context. Driven by an effect on `pendingTile`, so every route into the tile (marker,
  covering space, Autoleap) lands on the same first screen.
- **One generic Adventure rule box.** All four tiles now carry the p.15 Adventure section
  verbatim in `ModularTile.detail`, so the 📖 box reads the same whichever tile is on
  screen, with that tile's own Appendix line above it carrying its bonus — the mod-specific
  rule is shown without needing a box of its own. **The rulebook's SPECIAL CASES bullets are
  deliberately NOT in the box** (user's call): they surface per card, at the moment they
  apply, as the result panel's conversion line.
- **Shared-deck mode reshaped to how it is actually played.** Instead of naming both drawn
  cards, the app rolls, shows the total Power, and asks which single card the Chronossus
  takes — a dropdown of that deck's 18 cards, alphabetical, minus any it already holds, with
  cards above its Power disabled and a "Neither (+1 VP)" option that maps onto the engine's
  empty-draw branch. **Deviation from the request:** the "Draw 2 cards from the X deck" line
  sits on the *second* step, not the first, because X depends on the slot bonus and cannot
  be named until the slot is answered.
- **Layout trap worth remembering:** `.place-prompt` is a height-constrained flex column, so
  a `<p>` added after the button row collapses to height 0 and its text overprints the
  buttons. `flex: 0 0 auto` did **not** fix it; the line had to move above the buttons.
- Also: the pop-out's board art went up 50% (with the overlay markers scaled to match, the
  Resource cubes nudged inside their cards, and the VP tracker moved beside the printed
  "1 token → +2 Power" box rather than over it), and the standalone Power fist is outlined
  in teal — it is dark red on transparent and was vanishing against the warm dark panels.
