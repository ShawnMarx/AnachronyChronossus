# PLAN — Chronossus Playtest Fixes

## Overview & goal

A batch of 11 fixes and enhancements from a recent Chronossus solo play (iPad). They
span three areas: **bugs** (save error, reroll-on-undo), **rules/flow polish** (Paradox
roll logic, Hypersync entry, Superproject VP), and **score-screen UX** (breakout,
side-by-side tally, shareable image). Goal: make the end-game and the Paradox/Hypersync
flows correct and pleasant on a tablet, and let the player capture/share the result.

Most items live in `src/ChronossusGame.tsx` (the Chronossus play view) and the shared
`DetailPanel` / `WarpPhaseBody` / `ParadoxPhaseBody` exported from
`src/BoardExplorer.tsx`; a couple touch `src/engine/bots/chronossus.ts` and
`src/game/undo.ts`.

Decisions confirmed with the user:
- **#7 share** → generate a PNG in-browser and hand it to the OS **share sheet (Web Share
  API)**, with a Download/open fallback on desktop.
- **#8 Paradox** → cap possible rolls at **min(Era−1, bot Warp tiles on Timeline)** and
  replace the per-tile "tile X of Y" walk with a single repeating "still leads/ties? roll
  again / done" loop; keep the Hypersync extra-roll line.
- **#2 recruit** → tell the player to **discard the recruited Worker tile from the board**
  (mirrors how Construct says "then discard it").

---

## Items

### Bug Fix 1 — "Couldn't save automatically" at game end (#1)
- **What:** The score screen auto-saves via `recordGame(...)` (a backend call in
  `src/data/gameData.ts`); on failure it shows `Couldn't save automatically.`
  ([ChronossusGame.tsx:3311-3335](../../src/ChronossusGame.tsx#L3311-L3335),
  message at [:3434](../../src/ChronossusGame.tsx#L3434)).
- **Changes:** Investigate why it fails for this user (auth/network/endpoint). At minimum
  improve the failure UX: show the reason, add a **Retry** button, and don't leave the
  player stuck. If it's an expected "not logged in / offline" case, message it as such
  rather than a generic error. Confirm `recordGame` payload/endpoint matches the deployed
  backend.
- **Files:** `src/ChronossusGame.tsx`, `src/data/gameData.ts`.

### Bug Fix 2 — Reroll on undo of Hypersync choice (#4)
- **What:** `HypersyncDialog` keeps `rolledHex` in local component state
  ([ChronossusGame.tsx:2452](../../src/ChronossusGame.tsx#L2452),
  `rollSpace` at [:2466](../../src/ChronossusGame.tsx#L2466)). On Undo the dialog
  remounts and re-randomizes.
- **Changes:** Persist the rolled Hypersync space so undo/re-entry re-shows the **same**
  roll instead of rolling anew (same pattern the AI die uses — surfaced through the ui
  slice / a per-turn stored value rather than fresh `Math.random()` on mount).
- **Files:** `src/ChronossusGame.tsx` (+ possibly `src/game/undo.ts` ui slice).
- **Depends on / shares plumbing with:** Bug Fix 3.

### Bug Fix 3 — No reroll when backing to a phase (#10)
- **What:** `WarpPhaseBody` (`rolled` local state,
  [BoardExplorer.tsx:1993-2011](../../src/BoardExplorer.tsx#L1993-L2011)) and
  `ParadoxPhaseBody` (`rolls`/`asked`, [:2068-2102](../../src/BoardExplorer.tsx#L2068-L2102))
  hold roll results locally. Navigating back (Undo) remounts them and lets the player
  re-roll a different value.
- **Changes:** Persist the phase roll(s) so returning to the Paradox or Warp phase shows
  the already-rolled result and does not re-randomize. Store rolled values on committed
  state / ui slice keyed to Era+phase; the body reads the stored value on mount.
- **Files:** `src/BoardExplorer.tsx` (shared bodies), `src/ChronossusGame.tsx`,
  `src/game/undo.ts`.

### Fix 4 — Superproject max VP → 8 (#9)
- **What:** Superproject VP digit picker offers `[3,4,5,6,7]`
  ([BoardExplorer.tsx:3384](../../src/BoardExplorer.tsx#L3384)); text says "3–7"
  ([:3374](../../src/BoardExplorer.tsx#L3374)).
- **Changes:** Add `8` → `[3,4,5,6,7,8]`; update the "(3–7)" copy to "(3–8)". Shared
  `DetailPanel`, so it applies to both bots (verify Chronobot Superprojects also top out
  at 8; if the Chronobot differs, gate by botName).
- **Files:** `src/BoardExplorer.tsx`.

### Fix 5 — Recruit wording: discard the Worker tile (#2)
- **What:** The Recruit prompt doesn't tell the player to discard the recruited Worker
  tile ([BoardExplorer.tsx:3450-3457](../../src/BoardExplorer.tsx#L3450-L3457)).
- **Changes:** Append "— then discard it from the board" (matching the Construct copy at
  [:3379](../../src/BoardExplorer.tsx#L3379)). Check the engine's recruit instruction text
  ([chronossus.ts](../../src/engine/bots/chronossus.ts) / chronobot) for the same
  omission and align it.
- **Files:** `src/BoardExplorer.tsx` (+ engine instruction text if present).

### Fix 6 — Tally clear button (#3)
- **What:** Number inputs in the tally grid are hard to clear to blank on iPad; once a `0`
  is there it's fiddly ([ChronossusGame.tsx:3395-3407](../../src/ChronossusGame.tsx#L3395-L3407);
  Chronobot tally `TALLY_FIELDS` at [BoardExplorer.tsx:2215](../../src/BoardExplorer.tsx#L2215)).
- **Changes:** Add a small **clear (×)** button beside each tally input that resets that
  field to blank; consider treating `0` as blank in display. Apply to both tally grids.
- **Files:** `src/ChronossusGame.tsx`, `src/BoardExplorer.tsx`, CSS.

### Fix 7 — Break out Superproject VP in scoring & VP dropdown (#5)
- **What:** `scoreChronossus` lumps Superprojects into `buildingVP` (`bot.buildingVp`)
  ([chronossus.ts:771-790](../../src/engine/bots/chronossus.ts#L771-L790)); the live VP
  pill ([ChronossusGame.tsx:3220-3222](../../src/ChronossusGame.tsx#L3220-L3222)) and
  score screen ([:3355](../../src/ChronossusGame.tsx#L3355)) show only "Building VP".
  `bot.superprojectVps[]` is already tracked separately.
- **Changes:** Add `superprojectVP` to `ChronossusScore` (sum of `superprojectVps`), make
  `buildingVP` exclude it (Buildings only), and render both as separate line items in the
  VP dropdown **and** the score screen. Update `ChronossusScore` interface + any tests.
- **Files:** `src/engine/bots/chronossus.ts`, `src/ChronossusGame.tsx`, tests.
- **Feeds:** Fix 8 (side-by-side line items).

### Fix 8 — Hypersync: skip intro, start on the 3 hexes (#11)
- **What:** When a Hypersync Action is possible (pending tile + available Exosuit), the
  dialog opens on an **intro** step with a "Check Hypersync hexes" button before showing
  the 3 hexes ([ChronossusGame.tsx:2449](../../src/ChronossusGame.tsx#L2449) initial
  `step='intro'`; intro at [:2526-2563](../../src/ChronossusGame.tsx#L2526-L2563);
  hexes at [:2564-2598](../../src/ChronossusGame.tsx#L2564-L2598)).
- **Changes:** When `plan.canHypersync`, initialize `step` directly to `'hexes'` (skip the
  intro click). Only fall back to Time Travel / Failed Action once **all 3 hexes are
  marked unavailable** (already the `confirmHexes` behavior). Keep the intro/fallback copy
  for the not-`canHypersync` case.
- **Files:** `src/ChronossusGame.tsx`.

### Fix 9 — Paradox roll logic: cap + general loop (#8)
- **What:** `ParadoxPhaseBody` walks "Past Timeline tile X of Y" with `maxChecks = Era−1`
  ([BoardExplorer.tsx:2074](../../src/BoardExplorer.tsx#L2074),
  question copy [:2147-2161](../../src/BoardExplorer.tsx#L2147-L2161)).
- **Changes:** Cap possible rolls at **min(Era−1, bot Warp tiles on Timeline)**, and
  reframe the prompt as a single repeating "Does the {bot} still have the most (or
  tied-most) Warp tiles on a Timeline tile? — Roll again / Done" loop rather than a
  numbered per-tile walk. Keep the existing **Hypersync extra-roll** line/step
  ([:2162-2177](../../src/BoardExplorer.tsx#L2162-L2177)) and the Hypersync majority note.
  Shared body → verify Chronobot Paradox phase still reads correctly (cap is valid there
  too). Update/adjust related tests.
- **Files:** `src/BoardExplorer.tsx`, tests.

### Enhancement 1 — Side-by-side tally layout (#6)
- **What:** Score screen stacks bot breakdown then a separate player tally
  ([ChronossusGame.tsx:3347-3419](../../src/ChronossusGame.tsx#L3347-L3419)).
- **Changes:** Redesign as a **two-column, line-item-aligned** layout: shared categories
  (Buildings, Superprojects, Time Travel, Breakthroughs, sets, Anomalies…) as rows with
  the **bot's value pre-filled on the right** and the **player's input on the left**;
  player-only lines (e.g. Solo Objectives, resources, Morale, VP tokens) appear as extra
  rows under the player column. Top line = **bot total vs. player total**. Reuse the
  Superproject breakout from Fix 7 so bot lines map to player lines.
- **Files:** `src/ChronossusGame.tsx`, CSS (`ChronossusExplorer.css`).
- **Depends on:** Fix 7.

### Enhancement 2 — Share/save scores as an image (#7)
- **What:** New capability: export a results summary the player can save/share from any
  device.
- **Changes:** Add a **Share / Save image** button on the score screen that renders a PNG
  (canvas-drawn, self-contained — no external libs) whose **top line is bot vs. player
  score**, followed by the score breakdown, then the **modes used and difficulty
  selections** for the game. Hand the PNG to the OS **share sheet via the Web Share API**
  (`navigator.share` with a `File`), falling back to download/open-in-new-tab on desktop.
  Pull mode/difficulty from game config (`config.chronossusMode` / `tileSides` /
  difficulty).
- **Files:** `src/ChronossusGame.tsx` (+ a small canvas render helper), config read.
- **Depends on:** Fix 7 (breakout), Enhancement 1 (final line items).

---

## Recommended implementation order

Low-risk correctness first, then the score-screen stack (which build on each other):

1. **Fix 4** — Superproject max 8 (trivial).
2. **Fix 5** — Recruit discard wording (trivial).
3. **Fix 6** — Tally clear button.
4. **Fix 7** — Superproject scoring breakout (engine + UI; unblocks Enh 1 & 2).
5. **Fix 8** — Hypersync skip-to-hexes.
6. **Fix 9** — Paradox cap + loop (with tests).
7. **Bug Fix 2 + Bug Fix 3** — persist Hypersync / Paradox / Warp rolls across undo
   (shared plumbing; do together).
8. **Bug Fix 1** — save-error handling / retry.
9. **Enhancement 1** — side-by-side tally (needs Fix 7).
10. **Enhancement 2** — share-as-image (needs Fix 7 + Enh 1).

## Open questions / notes
- Confirm whether the **Chronobot** Superproject max is also 8 (Fix 4) and whether its
  Paradox cap change (Fix 9) is desired there too — both use the shared components, so the
  change lands in both unless gated by `botName`.
- Bug Fix 1 root cause (why the save failed for this user) is unknown until reproduced;
  the fallback UX work is safe to do regardless.
