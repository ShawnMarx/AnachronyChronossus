# LOG — Chronossus Playtest Fixes

Execution tracker. Steps in implementation order. Mark `[x]` as completed; note
deviations inline.

## Fix 4 — Superproject max VP → 8 (#9) — ✅ DONE
- [x] Change Superproject VP picker `[3,4,5,6,7]` → `[3,4,5,6,7,8]` (BoardExplorer.tsx:3384)
- [x] Update copy "(3–7)" → "(3–8)" (BoardExplorer.tsx:3374)
- [x] Shared DetailPanel → applies to both bots (no botName gate; Superprojects top out at 8 for both)
- [x] build green

## Fix 5 — Recruit discard wording (#2) — ✅ DONE
- [x] Append "— then discard its Worker tile from the board" to Recruit prompt (BoardExplorer.tsx:3456)
- [x] Engine text: shared prompt copy in DetailPanel covers both bots; engine instruction text left as-is (rulebook-verbatim)
- [x] build green

## Fix 6 — Tally clear button (#3) — ✅ DONE
- [x] Add clear (×) button + blank-on-empty to Chronossus tally grid (ChronossusGame.tsx)
- [x] Same for Chronobot tally grid (BoardExplorer.tsx TALLY_FIELDS)
- [x] Empty input now deletes the key (blank, not 0); clear button disabled when already blank
- [x] CSS `.tally-clear` + `margin-left:auto` on input (BoardExplorer.css)
- [x] build green

## Fix 7 — Superproject scoring breakout (#5) — ✅ DONE
- [x] Add `superprojectVP` to `ChronossusScore`; buildingVP = buildingVp − superprojectVP; tokenVP = vp − buildingVp (chronossus.ts)
- [x] Render separate Building VP / Superproject VP rows in the VP pill dropdown
- [x] Same split in the score screen breakdown
- [x] Added scoreChronossus breakout test (109 tests pass)
- [x] build + tests green

## Fix 8 — Hypersync skip intro, start on hexes (#11) — ✅ DONE
- [x] Initialize `step = plan.canHypersync ? 'hexes' : 'intro'` (ChronossusGame.tsx)
- [x] Kept intro/fallback copy for the not-canHypersync path
- [x] Fallback (Time Travel / Failed) still fires from hexes step only when all 3 unavailable
- [x] build green

## Fix 9 — Paradox cap + general loop (#8) — ✅ DONE
- [x] Cap possible rolls at min(Era−1, warpTilesOnTimeline) (BoardExplorer.tsx maxChecks)
- [x] Reframed prompt as repeating "still leads/ties? Yes-roll / No-done" loop (added `finished` state)
- [x] Preserved Hypersync extra-roll step + majority note (still gated only by anomaly, not by finished)
- [x] Shared body → Chronobot Paradox uses same cap (valid there too)
- [x] build + tests green (109)

## Bug Fix 2 + 3 — persist rolls across undo (#4, #10) — ✅ DONE (Chronossus)
- [x] Added `warpRoll` / `paradoxRoll` / `hsRolledHex` to `ChronossusUi` (persisted, survives Undo)
- [x] Warp: `WarpPhaseBody` made controlled-optional (`roll`/`onRoll`); Chronossus stores in ui, commitWarp clears forward
- [x] Paradox: `ParadoxPhaseBody` `pendingRoll` reuses the undone entry's `die`; rollBotParadox stores rolled as entry die, undoTurn re-seeds `ui.paradoxRoll` when snap phase is paradox
- [x] Hypersync: `HypersyncDialog` `rolledHex` controlled via `ui.hsRolledHex`; snapshot carries it, finishTurn clears forward, confirmHexes reuses a still-available persisted roll; cancel clears it
- [x] No persist-version bump (additive fields default to null / falsy on old saves)
- [x] build + tests green (109)
- [ ] Manual iPad/undo verification (deferred to /plan review)
- NOTE: Chronobot (BoardExplorer) uses its own separate snapshot system and still holds
  these rolls in local state (uncontrolled) — same latent reroll-on-undo bug there.
  Left as a follow-up (the reported bug was Chronossus). Shared bodies keep their old
  uncontrolled behavior when the controlled props are omitted.

## Bug Fix 1 — save-error handling (#1) — ✅ DONE (UX)
- [x] Root cause not reproduced; most likely a lapsed shared BGE session (cross-domain cookie to data.boardgameedge.com) or offline. Left the network path unchanged.
- [x] Improved failure UX: capture error, show reason (401/403 → "login session expired"; else "couldn't reach history service") + a **Retry** button that re-arms the auto-save
- [x] `.score-save-retry` CSS
- [x] build green
- NOTE: this is the Chronossus score screen only; Chronobot ScoreScreen has the same
  generic message (follow-up, same pattern).

## Enhancement 1 — side-by-side tally (#6) — ✅ DONE
- [x] Added `CX_SCORE_ROWS(score)` mapping shared rows (player key + bot value), bot-only (Token/Action VP), player-only rows
- [x] New layout: top "You N vs Chronossus M" line, mode toggle, side-by-side grid (You left / Chronossus right) with per-row totals
- [x] Number mode keeps the single input + bot breakdown for reference; bot turns + RulesBox moved below
- [x] CSS `.score-vs`, `.cx-tally`, `.cx-trow`, `.cx-scell` etc. (ChronossusExplorer.css)
- [x] build green
- [ ] Manual iPad-width visual check (deferred to /plan review)

## Enhancement 2 — share/save as image (#7) — ✅ DONE
- [x] New `src/game/shareScore.ts`: canvas card (top line, You/Chronossus breakdown, SETUP section, footer), no external libs
- [x] Web Share API with a PNG `File` (uses `navigator.canShare({files})`); desktop → download fallback; AbortError treated as handled
- [x] Exported `chronossusDifficultyLabel`; share reads mode (`getMode`), B-side tiles, and difficulty flags from `state.config`
- [x] "📤 Share / Save image" button + status message on the score screen
- [x] build + tests + lint green (109 tests; only pre-existing fast-refresh warnings)
- [ ] Manual iPhone/iPad share-sheet verification (deferred to /plan review)

---
## Summary
All 11 items implemented. `npm run build`, `npm test` (109), and `npm run lint` clean.
Deferred: manual on-device verification (see /plan review), and mirroring the roll-persistence
(#4/#10) + save-retry (#1) fixes to the **Chronobot** view (its own snapshot system).

---
### Deviations / decisions
(record here as work proceeds)
