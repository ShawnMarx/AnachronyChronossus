# LOG — BoardExplorer Enhancements

Execution tracker for `PLAN_explorer_enhancements.md`. Steps in implementation
order. Mark `[x]` as completed; note deviations inline.

---

## Feature 2 — Tracker tooltips + building VPs

- [x] 2.1 Engine: add `buildingVps: Record<BuildingType, number[]>` and
      `superprojectVps: number[]` to `ChronobotState`; seed empty in
      `emptyChronobotState`.
- [x] 2.2 Engine: in `takeActionTurn`, push the constructed tile's VP into the
      matching list (building + superproject cases). Keep aggregate `buildingVp`.
- [x] 2.3 Engine tests: a case asserting the per-type VP list fills correctly.
- [x] 2.4 UI: tooltip builder for every `BOARD_COUNTERS` badge; building/superproject
      tooltips show `label ×count — VP: a, b, …`.
- [x] 2.5 build + test + lint clean.

## Feature 1 — Debug on/off toggle

- [x] 1.1 Add a persisted `debug` flag (state); turn the `DEBUG` badge into a toggle.
- [x] 1.2 Debug OFF: `onTileClick` opens a read-only rule panel (verbatim rule
      expanded, mech-placement collapsed); no engine activation.
- [x] 1.3 Debug OFF: hide the calibrate control (force calibrate off) and the
      outlines control (force outlines off).
- [x] 1.4 CSS for the toggle + read-only rule panel.
- [x] 1.5 build + test + lint clean.

## Feature 3 — Shared backbone + Undo

- [x] 3.1 Define `Snapshot` type and a `commit(nextState, nextTokens, meta)` helper
      that pushes the prior snapshot to the undo stack and records a history entry.
- [x] 3.2 Route all committed turns through `commit`: `resolve`, `resolveBotPass`
      path, `playerPass`, era transitions.
- [x] 3.3 `undo()` pops + restores the prior snapshot (state, tokens, botDie,
      activeToken); button disabled when the stack is empty.
- [x] 3.4 Cap the undo stack (e.g. 50). CSS for the button.
- [x] 3.5 build + test + lint clean; manual check that undo re-shows the same die.

## Feature 4 — History right pane

- [x] 4.1 `HistoryPane` component rendering the snapshot list newest-first
      (Era · die · action · effect summary).
- [x] 4.2 Toggle button in the top-right; right-docked pane; open/closed state.
- [x] 4.3 CSS for the pane + toggle.
- [x] 4.4 build + test + lint clean.

## Feature 5 — Persistence + Reset Game

- [x] 5.1 `persist.ts` (or inline): versioned `localStorage` save/load of
      `{ current, undo stack, history, debug }`.
- [x] 5.2 Load-on-mount (schema-version guarded); save-on-change effect.
- [x] 5.3 Relabel Reset → "Reset Game" with a confirm that clears storage + re-inits.
- [x] 5.4 build + test + lint clean; manual refresh-persistence check.

## Feature 6 — Full-screen dialogs on small screens

- [x] 6.1 CSS media query (~640px): `.detail-panel` fills the viewport
      (`position: fixed; inset: 0`), scrollable body, larger close target.
- [x] 6.2 Ensure desktop `hotspot.panel` positions still win above the breakpoint.
- [x] 6.3 build + lint; manual check at a narrow width.

## Feature 7 — Bottom bar → dismissible tooltip

- [x] 7.1 Replace the always-on `EndOfActionsBar` with a top-bar status chip that
      toggles a large popover holding the same details.
- [x] 7.2 Dismiss the popover when a top action fires (Take Bot Action / You Pass /
      tile click) and on outside-click / Esc.
- [x] 7.3 CSS for the chip + popover.
- [x] 7.4 build + test + lint clean.

---

## Deviations / decisions during execution

_(record here as steps are executed)_

- Enhancement (requested mid-build): the History pane now **shifts the board left**
  when there's room (≥760px) instead of overlaying it; narrow screens keep the overlay.
- Bug fixed during F7: in play mode, Take Bot Action was opening the read-only rule
  view. Added a `force` flag / `ruleView` state so a die-driven bot turn always
  resolves (read-only applies only to a player free-tap).
