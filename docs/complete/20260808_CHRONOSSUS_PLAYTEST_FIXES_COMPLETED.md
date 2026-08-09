# COMPLETED — Chronossus Playtest Fixes (2026-08-08)

Archived from `PLAN_chronossus_playtest_fixes.md` + `LOG_chronossus_playtest_fixes.md`.
All 11 items implemented and committed (`25146aa` "Chronossus playtest fixes …" plus the
Autoleap/Hypersync/tally follow-up commits). No `REVIEW_` walkthrough was run; on-device
verification was deferred to `TODO.md`.

---

## Overview & goal

A batch of 11 fixes and enhancements from a Chronossus solo play (iPad), spanning three
areas: **bugs** (save error, reroll-on-undo), **rules/flow polish** (Paradox roll logic,
Hypersync entry, Superproject VP), and **score-screen UX** (breakout, side-by-side tally,
shareable image). Goal: make the end-game and the Paradox/Hypersync flows correct and
pleasant on a tablet, and let the player capture/share the result.

Most items lived in `src/ChronossusGame.tsx` and the shared `DetailPanel` /
`WarpPhaseBody` / `ParadoxPhaseBody` exported from `src/BoardExplorer.tsx`; a couple
touched `src/engine/bots/chronossus.ts` and `src/game/undo.ts`.

Decisions confirmed with the user:
- **#7 share** → generate a PNG in-browser and hand it to the OS **share sheet (Web Share
  API)**, with a Download/open fallback on desktop.
- **#8 Paradox** → cap possible rolls at **min(Era−1, bot Warp tiles on Timeline)** and
  replace the per-tile walk with a single repeating "still leads/ties? roll again / done"
  loop; keep the Hypersync extra-roll line.
- **#2 recruit** → tell the player to **discard the recruited Worker tile from the board**.

---

## Items (as planned)

1. **Bug Fix 1** — "Couldn't save automatically" at game end (#1): improve failure UX.
2. **Bug Fix 2** — Reroll on undo of Hypersync choice (#4): persist the rolled hex.
3. **Bug Fix 3** — No reroll when backing to a phase (#10): persist Paradox/Warp rolls.
4. **Fix 4** — Superproject max VP → 8 (#9).
5. **Fix 5** — Recruit wording: discard the Worker tile (#2).
6. **Fix 6** — Tally clear button (#3).
7. **Fix 7** — Break out Superproject VP in scoring & VP dropdown (#5).
8. **Fix 8** — Hypersync: skip intro, start on the 3 hexes (#11).
9. **Fix 9** — Paradox roll logic: cap + general loop (#8).
10. **Enhancement 1** — Side-by-side tally layout (#6).
11. **Enhancement 2** — Share/save scores as an image (#7).

Implementation order (as executed): Fix 4 → Fix 5 → Fix 6 → Fix 7 → Fix 8 → Fix 9 →
Bug Fix 2+3 (shared plumbing) → Bug Fix 1 → Enhancement 1 → Enhancement 2.

---

## Execution log (all done)

### Fix 4 — Superproject max VP → 8 (#9) — ✅ DONE
- Superproject VP picker `[3,4,5,6,7]` → `[3,4,5,6,7,8]`; copy "(3–7)" → "(3–8)".
- Shared DetailPanel → applies to both bots (no botName gate). Build green.

### Fix 5 — Recruit discard wording (#2) — ✅ DONE
- Appended "— then discard its Worker tile from the board" to the Recruit prompt.
- Engine instruction text left as-is (rulebook-verbatim); shared prompt copy covers both bots.

### Fix 6 — Tally clear button (#3) — ✅ DONE
- Clear (×) button + blank-on-empty for both the Chronossus and Chronobot tally grids.
- Empty input deletes the key (blank, not 0); clear disabled when already blank.
- CSS `.tally-clear` + `margin-left:auto` on input.

### Fix 7 — Superproject scoring breakout (#5) — ✅ DONE
- Added `superprojectVP` to `ChronossusScore`; `buildingVP` = buildingVp − superprojectVP;
  `tokenVP` = vp − buildingVp. Separate rows in the VP pill dropdown and score screen.
- Added a `scoreChronossus` breakout test.

### Fix 8 — Hypersync skip intro, start on hexes (#11) — ✅ DONE
- `step = plan.canHypersync ? 'hexes' : 'intro'`; kept intro/fallback copy for the
  not-canHypersync path; fallback fires from the hexes step only when all 3 unavailable.

### Fix 9 — Paradox cap + general loop (#8) — ✅ DONE
- Cap at `min(Era−1, warpTilesOnTimeline)`; reframed as a repeating "still leads/ties?
  Yes-roll / No-done" loop (added `finished` state); preserved the Hypersync extra-roll
  step + majority note. Shared body → Chronobot Paradox uses the same cap.

### Bug Fix 2 + 3 — persist rolls across undo (#4, #10) — ✅ DONE (Chronossus)
- Added `warpRoll` / `paradoxRoll` / `hsRolledHex` to `ChronossusUi` (persisted, survives
  Undo). Warp/Paradox bodies made controlled-optional; Hypersync `rolledHex` controlled
  via `ui.hsRolledHex`. No persist-version bump (additive fields default falsy on old saves).
- **NOTE:** Chronobot (BoardExplorer) uses its own separate snapshot system and still holds
  these rolls in local (uncontrolled) state — same latent reroll-on-undo bug there.
  Left as a follow-up (see TODO).

### Bug Fix 1 — save-error handling (#1) — ✅ DONE (UX)
- Root cause not reproduced; most likely a lapsed shared BGE session (cross-domain cookie
  to data.boardgameedge.com) or offline. Network path unchanged. Improved failure UX:
  show reason (401/403 → "login session expired"; else "couldn't reach history service")
  + a **Retry** button that re-arms the auto-save. `.score-save-retry` CSS.
- **NOTE:** Chronossus score screen only; Chronobot ScoreScreen has the same generic
  message (follow-up, same pattern).

### Enhancement 1 — side-by-side tally (#6) — ✅ DONE
- `CX_SCORE_ROWS(score)` mapping shared rows (player key + bot value), bot-only
  (Token/Action VP), player-only rows. New layout: top "You N vs Chronossus M" line, mode
  toggle, side-by-side grid with per-row totals. Number mode keeps the single input + bot
  breakdown for reference. CSS in `ChronossusExplorer.css`.

### Enhancement 2 — share/save as image (#7) — ✅ DONE
- New `src/game/shareScore.ts`: canvas card (top line, You/Chronossus breakdown, SETUP
  section, footer), no external libs. Web Share API with a PNG `File`
  (`navigator.canShare({files})`); desktop → download fallback; AbortError treated as
  handled. Exported `chronossusDifficultyLabel`; reads mode/B-side tiles/difficulty from
  `state.config`. "📤 Share / Save image" button + status message.

Post-plan polish (later commits): tally merged the VP-tokens row / absolute values /
auto-negative penalties; share image aligned totals over columns and dropped parenthetical
hints; Hypersync dialog gained a rule box and dropped the Re-roll button.

---

## Verification

`npm run build`, `npm test` (109), and `npm run lint` all clean at completion.

## Production notes / follow-ups (moved to TODO.md)

- Manual on-device (iPad/iPhone) verification of: undo/roll-persistence, side-by-side
  tally at tablet width, and the share-sheet flow — never ran a `/plan review`.
- Mirror the roll-persistence (#4/#10) and save-retry (#1) fixes to the **Chronobot**
  view, which uses its own separate snapshot system and still has the latent reroll bug +
  generic save-error message.
