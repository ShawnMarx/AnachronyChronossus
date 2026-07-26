# Handoff — 2026-07-26

Snapshot for continuing without this chat's context. Read `CLAUDE.md` first, then
this. Longer history is in `docs/BUILD-LOG.md`.

## Where things are

- **Committed & pushed** to `main` on private repo `ShawnMarx/AnachronyChronossus`.
- `npm run build`, `npm test` (21), `oxlint` all clean.
- **Default view = `src/BoardExplorer.tsx`** (a board-first explorer + debug harness).
  The guided game runner `App.tsx` exists but is not the current view.
- The **Chronobot engine** (`src/engine`) is complete and tested for base actions.

## What works in the explorer today

- Tap any of the 12 action tiles → verbatim rule panel; "places an Exosuit" links to
  the mech-placement rules.
- Tapping a tile also **resolves the action through the engine** (debug), updating live
  counts. Seeded with 2 Warp tiles + 6 Exosuits; Reset restores it.
- **Mech-placement gate** (Confirm placed / Cannot place) before any Exosuit is spent.
- **Construct VP entry**: buildings 1–4, superprojects 3–7 → added to VP; max 3/type.
- **8 on-board count badges** (Mechs, Breakthroughs, Superproject, 4 buildings,
  Anomalies) — positions just calibrated and baked into `BOARD_COUNTERS`.
- **Calibrate mode** (top-bar toggle): click board to place a badge, arrow-keys nudge,
  panel emits the `BOARD_COUNTERS` literal to paste back.

## Next up (user's stated direction)

1. **More board positions to set soon** — the user will calibrate additional overlay
   spots (beyond the 8 counters). Use the same pattern: add entries with `pos` %,
   place them via **calibrate mode**, paste the literal back, bake it in, verify with
   `node pw-validate.mjs`. Generalize calibrate to cover the new spot list when asked.
2. Keep filling in Chronobot behavior the debug harness surfaces; correct any rule/text
   mismatches the user finds while clicking through.
3. Then per roadmap: **Chronossus base**, then **Chronossus + Fractures of Time**.

## Gotchas / decisions locked

- Chronobot = the **PnP** version (6 tokens 1–6 + standard D6), **not** the 4-Command-
  token "Solo Opponents" version. Board art = `public/assets/solo/board-chronobot.jpg`.
- Overlay positions are **% of the board image** (1500×1110); `.board-wrap` preserves
  that aspect so % maps 1:1. Don't switch to pixel positioning.
- `pw-validate.mjs` hardcodes the cached Chromium path (`chromium_headless_shell-1217`);
  update if that version changes. Playwright is a devDependency; browsers are the
  machine's `ms-playwright` cache (not downloaded per-install).
- Reference PDFs/art live outside the repo (see `CLAUDE.md`); read with PyMuPDF.

## Paths

- Repo: `c:\repos\AnachronyChronossus`
- Reference: `C:/Users/shawn/OneDrive/Program Development/Anachrony Chronossus/reference/`
- Persistent memory: `C:/Users/shawn/.claude/projects/c--repos-AnachronyChronossus/memory/`
