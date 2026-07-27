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
