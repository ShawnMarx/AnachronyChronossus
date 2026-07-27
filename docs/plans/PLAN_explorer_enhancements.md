# PLAN — BoardExplorer Enhancements

Six UX/quality features for the Chronobot BoardExplorer (the default view). Three
of them (Undo, History, Persistence) share one **serializable state-history**
backbone, so that backbone is built once and reused.

## Goal

Turn the debug harness into something closer to a real play tool: a clean
**play mode**, richer tracker tooltips, mistake recovery (**undo**), a visible
**history**, and **persistence across refresh** — without disturbing the pure,
tested engine more than necessary.

---

## Shared backbone — the state-history stack

A single serializable **Snapshot** captures everything needed to restore a moment:

```ts
interface Snapshot {
  state: GameState;              // already plain data (no funcs) → serializable
  tokens: CommandTokensState;    // positions + stacking order
  botDie: number | null;         // the die shown for the turn that produced this
  activeToken: CommandToken | null;
  label: string;                 // short human summary for the History pane
}
```

- **Undo** = a stack of snapshots; pop to restore the previous one.
- **History** = the same list rendered newest-first in a side pane.
- **Persistence** = serialize `{ current, past[] }` to `localStorage` on change,
  rehydrate on mount.

Because `GameState`, `CommandTokensState`, and the die are all plain JSON, the
whole thing round-trips through `JSON.stringify`/`parse` with no custom codecs.
A single `commit(nextState, nextTokens, {die, token, label})` helper in
BoardExplorer becomes the one place that (a) pushes the prior snapshot to the
undo stack, (b) appends the history entry, and (c) triggers a save. Every current
`setState(...)` for a committed turn routes through it.

---

## Feature 1 — Debug on/off toggle

**What:** Replace the static `DEBUG` badge with a real toggle (persisted). Two modes:

- **Debug ON** (current behavior): free-tapping a tile activates it through the
  engine; the **calibrate** control and the **outlines** control are both shown.
- **Debug OFF** ("play mode"):
  - Clicking an action space does **not** activate it. Instead it opens a
    **read-only rule panel**: the verbatim rule explanation **expanded**, with the
    **mech-placement** section **collapsed**. No mech gate, no "Start Your Turn".
  - The **calibrate** control is hidden (and calibrate forced off).
  - The **outlines** control is hidden and tile outlines are forced off.
  - `Take Bot Action` and `You Pass` still drive real play.

**Files:** `src/BoardExplorer.tsx` (StatsBar controls; `onTileClick` branch on a
new `debug` flag; a read-only variant of the rule display already rendered by
`RuleExplainer`/`DetailPanel`), `src/BoardExplorer.css`.

**Decisions:**
- `debug` defaults **OFF** (play mode) on a fresh game; persisted, so toggling it
  on sticks across refresh. (Confirmed 2026-07-27.)
- Play-mode tile click reuses the existing verbatim `rule` text + `RuleExplainer`;
  we render it in a lightweight panel without the action controls.

---

## Feature 2 — Tracker tooltips (with building VP values)

**What:** Every `BOARD_COUNTERS` badge gets a tooltip. For the four building
trackers (Factory / Lab / Power Plant / Life Support) and the Superproject
tracker, the tooltip lists the **specific VP values** of the tiles in that set,
e.g. `Factory ×2 — VP: 3, 4`.

**Engine change (required):** the engine currently tracks only an aggregate
`buildingVp`. Add per-type VP lists so tooltips can show them:

```ts
// ChronobotState
buildingVps: Record<BuildingType, number[]>;  // e.g. { factory: [3,4], ... }
superprojectVps: number[];
```

`takeActionTurn` pushes the constructed tile's VP into the matching list (it
already receives `buildingVP`). `emptyChronobotState` seeds empty arrays.
`buildingVp` (aggregate) stays for the VP pill.

**Files:** `src/engine/state.ts` (state shape + `emptyChronobotState`),
`src/engine/bots/chronobot.ts` (`takeActionTurn` construct/superproject cases +
a couple of tests), `src/BoardExplorer.tsx` (badge `title`/tooltip builder).

**Decisions:**
- Non-building trackers get a plain descriptive tooltip (label + count, plus a
  short note for resources/workers where helpful).
- Keep using the native `title` attribute unless a styled tooltip is wanted later
  (low risk, no new deps).

---

## Feature 3 — Undo button

**What:** An **Undo** button that reverts the last committed step. If undoing
takes you back **past a committed bot action**, the app restores that moment
**with the same die roll shown** (no new random roll) so you can re-resolve the
same turn — fixing a misclick without changing the dice.

**How:** Pop the top of the undo stack and restore its `Snapshot` wholesale
(`state`, `tokens`, `botDie`, `activeToken`). Because the die is part of the
snapshot, "the same roll" falls out for free. Undo is disabled when the stack is
empty. Any committed turn (`resolve`, `resolveBotPass`, `playerPass`, era
transitions) is undoable because they all route through `commit(...)`.

**Files:** `src/BoardExplorer.tsx` (the `commit` helper + `undo()` + button),
`src/BoardExplorer.css`.

**Decisions:**
- Undo restores the prior **committed** board + the **same die** shown; the player
  re-presses `Take Bot Action` / re-resolves. Re-opening the exact dialog mid-decision
  is explicitly **out of scope** for v1. (Confirmed 2026-07-27.)
- Undo stack is **capped** (e.g. last 50) to bound `localStorage` size.

---

## Feature 4 — History right pane

**What:** A **History** pane on the right, toggled by a button in the **top-right**.
Lists committed events newest-first: die + action + key effect (VP/resource
deltas), passes, and Era boundaries.

**How:** Render the snapshot `label`s (built by `commit`). The pane is a
right-docked column that pushes/overlays the board; the toggle button lives in the
top bar's right cluster. Persisted open/closed state is optional.

**Files:** `src/BoardExplorer.tsx` (new `HistoryPane` component + toggle),
`src/BoardExplorer.css`.

**Decisions:**
- History is derived from the same snapshot list as Undo (one source of truth).
- Each entry shows: Era, die (if any), action label, and a compact effect summary
  pulled from the committed `Instruction[]`.

---

## Feature 5 — Persistence + "Reset Game"

**What:** Game state survives a browser refresh. **Reset** is relabeled
**"Reset Game"** and, **after a confirmation**, clears saved state and starts a
brand-new game.

**How:** Save `{ current snapshot, undo stack (capped), history, debug flag }` to
`localStorage` under a versioned key (e.g. `anachrony:chronobot:v1`) on every
change (debounced/simple effect). On mount, rehydrate if present and schema
version matches; otherwise start fresh. "Reset Game" opens a confirm, then clears
the key and re-inits.

**Files:** `src/BoardExplorer.tsx` (load-on-mount, save-on-change effect, reset
confirm), possibly a small `src/persist.ts` helper, `src/BoardExplorer.css`.

**Decisions:**
- `localStorage` (survives refresh **and** browser restart) rather than a literal
  cookie — same intent, better fit, no size/HTTP overhead. Calibrate positions are
  **not** persisted here (they're dev data).
- A schema `version` guards against shape changes; a mismatch discards old state.

---

## Recommended implementation order

1. **Feature 2 — Tracker tooltips + building VPs.** Small, self-contained engine
   change + tooltips; unblocks nothing but is low-risk and quick. Do it first while
   touching the engine, with tests.
2. **Feature 1 — Debug toggle.** Independent UI gating; establishes play-vs-debug
   mode that later features (History button placement, Reset) live alongside.
3. **Shared backbone + Feature 3 — Undo.** Introduce `Snapshot` + `commit(...)`,
   route all committed turns through it, add the undo stack + button.
4. **Feature 4 — History pane.** Pure consumer of the snapshot list from step 3.
5. **Feature 5 — Persistence + Reset Game.** Serialize the step-3/4 structures to
   `localStorage`, rehydrate on mount, relabel Reset with a confirm. Done last so
   it persists the finished shape.

Rationale: the two independent features (2, 1) land first and de-risk the UI;
then the interdependent trio is built bottom-up (backbone → undo → history →
persistence) so each step consumes the previous.

---

## Open questions

Resolved 2026-07-27: **Debug default = OFF** (play mode). **Undo = restore board +
same die** (no mid-dialog re-open). Remaining:

1. **History detail** — one line per turn (die · action · ΔVP) enough, or do you
   want the full instruction text expandable per entry? _(Defaulting to compact one
   line with the effect summary; easy to expand later.)_
2. **Persist calibrate positions?** Currently excluded (dev-only). _(Defaulting to
   excluded.)_
