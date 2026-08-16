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
