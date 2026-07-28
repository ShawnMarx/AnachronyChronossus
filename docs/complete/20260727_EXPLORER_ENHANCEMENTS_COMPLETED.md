# COMPLETED — BoardExplorer Enhancements (2026-07-27)

Archived from docs/plans/. All 7 planned features built, reviewed, and shipped
to main (auto-deployed). Follow-on work this session (Warp/Paradox trackers,
settings gear menu, endgame + score screen, Era/Phase display, Exosuit rename,
landing page) is documented in CLAUDE.md and docs/HANDOFF.md.

---

## PLAN

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

## Feature 6 — Full-screen dialogs on small screens

**What:** Below a breakpoint (phone/narrow), the `DetailPanel` (and the read-only
rule panel) fill the **entire viewport** instead of overlaying a slice of the
board's right zone, so the action controls/rules are readable on a small screen.

**How:** A CSS media query (e.g. `max-width: 640px`) overrides `.detail-panel`'s
percentage `left/top/width/height` with a fixed full-screen layout
(`position: fixed; inset: 0`), scrollable body, larger close target. The inline
`style` positions from `hotspot.panel` still apply at desktop widths; the media
query wins on small screens (add `!important` or move the desktop positions behind
a `min-width` guard).

**Files:** `src/BoardExplorer.css` (media query), possibly a class hook on
`.detail-panel`. Likely no TS change.

**Decisions:**
- Single breakpoint to start (~640px). Calibrate/History panes can get the same
  treatment later if needed.

## Feature 7 — Bottom bar as a dismissible large tooltip

**What:** The persistent bottom **End of Actions** strip (You/Bot flags, Actions
N/min, decision hint) becomes an on-demand **large tooltip/popover** rather than
an always-visible bar. It **closes when you click the action controls at the top**
(Take Bot Action / You Pass / a tile).

**How:** Replace the always-rendered `EndOfActionsBar` with a small **status
chip/button** (in the top bar) that toggles a large popover containing the same
details. Opening is explicit (click the chip); the popover is dismissed whenever a
top action fires (wire a `closeStatus()` into `takeBotAction`, `playerPass`, and
tile clicks) and on outside-click/Esc.

**Files:** `src/BoardExplorer.tsx` (status chip + popover state; dismissers in the
action handlers), `src/BoardExplorer.css`.

**Decisions / open:**
- The bottom-bar content is unchanged; only its presentation moves to a popover.
- Confirm the trigger: a top-bar **status chip** (recommended) vs. hovering the
  Actions pill. Plan assumes a click-to-open chip that any top action closes.

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
6. **Feature 6 — Full-screen dialogs on small screens.** CSS-only; independent.
7. **Feature 7 — Bottom bar → dismissible tooltip.** Small UI refactor of the
   existing status strip; done after the top-bar action handlers are settled.

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

---

## LOG

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

---

## REVIEW

# REVIEW — BoardExplorer Enhancements

Scripted walkthrough to verify each of the 7 features. Test on the live site
**https://anachrony.boardgameedge.com** (push-to-`main` auto-deploys; give CI a
minute after the last push) or a local `npm run dev`.

Tip: a couple of steps need **Debug ON**. The badge in the **top-left** toggles
**▶ PLAY ⇄ 🛠 DEBUG**. "Free-tap" = clicking a board action tile directly.

---

## Feature 1 — Debug on/off toggle  ✅ PASS

1. On load, the top-left badge shows **▶ PLAY** and the top-right has **no**
   `outlines`/`calibrate` checkboxes.
   - *Expected:* play mode by default; dev controls hidden.
2. Tap any action tile on the board (e.g. top-left **Construct — Life Support**).
   - *Expected:* a panel opens reading **"Rule reference (view only)…"** with the
     rule text **expanded** and **"Placing the Chronobot's mech"** collapsed. No
     "Confirm placed"/"Start Your Turn" buttons.
3. Click the **▶ PLAY** badge → it becomes **🛠 DEBUG**; the `outlines` and
   `calibrate` checkboxes appear top-right.
4. With Debug ON, tap a tile again.
   - *Expected:* now it's the interactive dialog (e.g. "Confirm placed / Cannot place").
5. Toggle back to **PLAY**.
   - *Expected:* checkboxes disappear again.

## Feature 2 — Tracker tooltips + building VPs  ✅ FIXED

**Issue (review):** No tooltip appeared on hover.
**Root cause:** `.count-badge` had `pointer-events: none`, so badges never
received hover and the native `title` couldn't show.
**Fix applied:** `.count-badge` → `pointer-events: auto`; disabled only during
calibration. Verified: badge title now reads e.g. "Powered Exosuits: 6 powered
Exosuits available"; Power Plant tooltip lists the per-tile VP.

1. Turn **Debug ON**. Tap the middle-row **Construct — Power Plant** tile →
   **Confirm placed** → tap a printed VP number (say **3**) → **▶ Start Your Turn**.
2. Do it again for Power Plant with a different VP (say **5**).
3. Hover the **Power Plant** tracker badge on the board (lower building row).
   - *Expected:* tooltip reads **"Power Plant ×2 — VP: 3, 5 (max 3 of a type)"**.
4. Hover a resource or worker badge.
   - *Expected:* a plain tooltip like **"Neutronium: 0 cubes"** / **"Genius: 0"**.

## Feature 3 — Undo (restores the same die roll)  ✅ PASS

1. Press **🎲 Take Bot Action**. Note the **die number** (red on black) and finish
   the turn (resolve whatever dialog appears).
2. The **↶ Undo** button (top-right) is now enabled; the **Actions** count went up.
3. Press **↶ Undo**.
   - *Expected:* Actions count drops back, and the **same die number** is shown again.
4. Press **Take Bot Action** again.
   - *Expected:* it **reuses that same die** (same number) rather than rolling anew.

## Feature 4 — History pane (+ board shift)  ✅ PASS (enhancement applied)

**Applied:** each entry now shows a `summarizeTurn` change-list under the label —
mech placed, tile taken for X VP, breakthrough/shape taken, cubes gained/discarded,
Anomaly removed, Warp removed, and the +5 VP worker/resource set discards, plus a
failed-action marker. Verified e.g. "🤖 Mech placed · 🏛 Power Plant taken (1 VP)".


Base pane (newest-first, numbered, board-shift) works. **Enhancement requested
during review:** each history entry should summarize the concrete board/virtual
changes for that turn, not just the action name. Include, as applicable:
- **Failed action** indicator.
- **Mech placed** (for Exosuit-placing actions).
- **Building/Superproject taken (discarded) for X VP** (Construct).
- **Warp tile removed** (Time Travel) + marker advance.
- **Worker recruited** / **worker set discarded for +5 VP**.
- **Breakthrough taken** of shape (Research).
- **Resource(s) gained** of type (Mine) / **resource discards** of type (Remove
  Anomaly) / **resource set discarded for +5 VP**.
Implementation note: the engine's `Instruction[]` per turn already carry these as
text; store/condense them into the history entry (e.g. a secondary detail line or
expandable) rather than only the current one-line label.

1. Take a couple of actions and/or press **🛑 You Pass**.
2. Click **🕑 History** (top-right).
   - *Expected:* a right pane lists the turns **newest-first**, numbered, e.g.
     "Era 1 · 🎲4 · Construct — Power Plant · +3 VP", "Era 1 · You passed".
3. On a wide screen (desktop), note the board.
   - *Expected:* the **board shifts left** so it isn't covered by the pane. (On a
     phone-width screen the pane overlays instead — that's intended.)
4. Close the pane with its **×**.

## Feature 5 — Persistence + "Reset Game"  ✅ PASS

1. Take an action or two (Actions count > 0), optionally toggle Debug ON.
2. **Refresh the page.**
   - *Expected:* the Actions count, tokens, history, and the Debug/Play state are
     **exactly as you left them**.
3. Click **⟳ Reset Game**.
   - *Expected:* a confirm dialog "Start a new game? This clears the current…".
     Cancel → nothing changes. Accept → a fresh game (Actions 0, empty history).

## Feature 6 — Full-screen dialogs on small screens  ✅ FIXED (2 issues)

**Issue 6a:** Landscape on iPhone Max stays in the small desktop panel — it should
use the full-screen dialog. The 640px **width** breakpoint misses landscape phones
(wide but short). **Fix:** also trigger full-screen on short viewports, e.g.
`@media (max-width: 640px), (max-height: 480px)`.
**Issue 6b:** The top title bar items don't wrap when the screen is too small —
they should flow onto a new line. **Fix:** `flex-wrap: wrap` on `.stats-bar`
(and let `.stats-row`/controls wrap), so nothing is clipped on narrow widths.
**Fixes applied + verified:** breakpoint is now `(max-width: 640px), (max-height:
480px)` → landscape 926×428 dialog is full-screen; `.stats-bar` wraps at 360px.

1. On a **phone** (or narrow the browser to < ~640px wide), tap any action tile.
   - *Expected:* the dialog **fills the whole screen** (not a small panel over the
     board), with a large **×** to close.
2. Widen the window back out and tap a tile.
   - *Expected:* the dialog is the smaller panel docked over the board's right zone.

## Feature 7 — Status popover (bottom bar replaced)  ✅ PASS (change applied)

Popover open/dismiss behaviour works. **Change requested during review:**
- Remove the existing top-bar **"Actions" stat pill** (bot totalActions tracker) —
  redundant now.
- Simplify the status **chip** to just read **"Actions #"** (styled like the other
  pills), still opening the popover. Drop the **You/Bot dots** from the chip — the
  **Take Bot Action / You Pass** buttons to its left already show who's still in
  the round ("✓ Bot Passed" / "✓ You passed").
- (#) = Actions this Era (matches the popover's "Actions N / min M").

1. Note there is **no permanent bar at the bottom** anymore.
2. In the top center, click the **status chip** (shows `You` `Bot` `N/M`).
   - *Expected:* a **large popover** opens with You/Bot pass state, Actions N/min,
     and the decision hint.
3. With the popover open, press **Take Bot Action** (or tap a tile, or **You Pass**).
   - *Expected:* the popover **closes** automatically.
4. Open it again, then press **Esc** or click **outside** it.
   - *Expected:* it closes.

---

## Follow-ups / edge cases to watch

- Undo across a **pass** or the bot's **final Time Travel** (out of Exosuits).
- Hard mode (min 6 Actions) isn't wired to a setup UI yet (known, deferred).
- The exposed CI **SSH deploy key** should be rotated (unrelated to these features).
