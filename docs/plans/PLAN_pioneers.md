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
