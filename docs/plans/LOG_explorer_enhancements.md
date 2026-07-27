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

- [ ] 3.1 Define `Snapshot` type and a `commit(nextState, nextTokens, meta)` helper
      that pushes the prior snapshot to the undo stack and records a history entry.
- [ ] 3.2 Route all committed turns through `commit`: `resolve`, `resolveBotPass`
      path, `playerPass`, era transitions.
- [ ] 3.3 `undo()` pops + restores the prior snapshot (state, tokens, botDie,
      activeToken); button disabled when the stack is empty.
- [ ] 3.4 Cap the undo stack (e.g. 50). CSS for the button.
- [ ] 3.5 build + test + lint clean; manual check that undo re-shows the same die.

## Feature 4 — History right pane

- [ ] 4.1 `HistoryPane` component rendering the snapshot list newest-first
      (Era · die · action · effect summary).
- [ ] 4.2 Toggle button in the top-right; right-docked pane; open/closed state.
- [ ] 4.3 CSS for the pane + toggle.
- [ ] 4.4 build + test + lint clean.

## Feature 5 — Persistence + Reset Game

- [ ] 5.1 `persist.ts` (or inline): versioned `localStorage` save/load of
      `{ current, undo stack, history, debug }`.
- [ ] 5.2 Load-on-mount (schema-version guarded); save-on-change effect.
- [ ] 5.3 Relabel Reset → "Reset Game" with a confirm that clears storage + re-inits.
- [ ] 5.4 build + test + lint clean; manual refresh-persistence check.

---

## Deviations / decisions during execution

_(record here as steps are executed)_
