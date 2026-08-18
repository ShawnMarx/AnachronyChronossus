# TODO

Loose ends and deferred work. Bigger efforts become a `/plan` when picked up.

## Deployment / publishing (deferred from the 2026-07-27 DO deploy)
See `docs/complete/20260727_DEPLOY_DIGITALOCEAN_COMPLETED.md`. Staging is done — live at
`anachrony.staging.boardgameedge.com`, deploying from the `staging` branch (`docs/DEPLOYMENT.md`).

- [ ] **Access-gating / SSO** — protect the copyrighted board art by wiring nginx
      `auth_request` against `auth.boardgameedge.com` (shared `bge_session` cookie).
- [ ] **Landing-page listing** — add Anachrony to the `boardgameedge.com` landing
      service's app registry (`boardgameedge/services/landing/`).
- [ ] **Link back to BGE landing** — once `boardgameedge.com` landing is live, add a
      reference/link from this app (e.g. the Landing/home screen) back to it. Include a
      "support me" message linking to whatever donation platform I set up (Ko-fi /
      Patreon / etc. — TBD).
- [ ] **Security: rotate the CI deploy key** — the `the deploy key` SSH
      private key was printed to a tool output during an earlier session. Regenerate the
      keypair, update the Droplet `authorized_keys` + repo secret `DEPLOY_SSH_KEY`.
- [ ] **Make the GitHub repo public** — currently private because the board art is
      copyrighted. Before flipping: strip/relocate the copyrighted board art + sprite
      assets (or confirm licensing), scrub git history for any secrets, and re-confirm
      the CI deploy key was rotated (see above).

## App
- [ ] **Show real die art on the existing Paradox / Research-shape rolls** (2026-08-15) —
      `public/assets/solo/paradox-die-{0,1,2}.png` and `shape-die-{circle,triangle,square}.png`
      are extracted and committed, but nothing renders them yet; both rolls still show text.
      Both bots share these dice. Extracted alongside the Pioneers Adventure die — see the
      die-art notes in `docs/plans/LOG_pioneers.md` for the TTS atlas geometry.
      **Shape-die display rule:** the die face *replaces the rolled-shape readout only* —
      it does not replace the outcome art beside it.
      - **Research:** show the die face, and **keep the Breakthrough art next to it** (the
        shape rolled vs. the Breakthrough actually taken are two different things).
      - **Assimilate (Fractures, C04):** the **black die alone**, no shape art beside it —
        that roll resolves to an Operator / Technology / fewer-of, never a Breakthrough, so
        pairing it with Breakthrough art would state something false.
      **The AI / Solo die is deliberately NOT extracted** (decided 2026-08-15). `.bot-die`
      draws it in CSS — black face, red `tabular-nums` numeral — which stays sharp at any
      size and retints per bot; a raster crop would be a downgrade. Leave it as is.
- [ ] **`impact` flag** is reminder-only (Era-4 Clean Up note); no logic reads it.
      Wire it if Collapsing-Capital timing/automation is ever wanted.
- [ ] **Narrow top bar ≤390px** — the ⚙ menu wraps to a second row (acceptable;
      could tighten button sizing/gaps if desired).
- [ ] **Push local games to the server on first login** — deferred enhancement from
      the auth/stats work: offer a one-time "import my local (localStorage) finished
      games" action; currently local prior games are export/import only.

## Chronossus follow-ups (from the 2026-08-08 playtest fixes)
See `docs/complete/20260808_CHRONOSSUS_PLAYTEST_FIXES_COMPLETED.md`.

- [ ] **On-device verification** — never ran a `/plan review`. Manually check on iPad/
      iPhone: undo/roll-persistence (Paradox/Warp/Hypersync re-show the same roll), the
      side-by-side tally at tablet width, and the share-sheet flow.
- [ ] **Mirror roll-persistence + save-retry to the Chronobot** — the Chronobot
      (`BoardExplorer`) uses its own separate snapshot system and still has the latent
      reroll-on-undo bug (#4/#10) and the generic save-error message (#1). Port the
      Chronossus fixes.
- [ ] **Mirror the phase-screen ↶ Undo to the Chronobot** (2026-08-11) — the Chronossus
      phase screens gained the header Undo plus `commitPhase` (every phase advance is
      undoable); the Chronobot's phase screens have neither. Pairs with the item above.

## Guardians follow-ups (from the 2026-08-14 module build)
- [ ] **Mirror the Chronossus's phase/History polish to the Chronobot** where it applies —
      the Chronobot's pass entry gained a reason line, but its phase screens still lack the
      turn-overview rule-box footer treatment and the History pane opens docked only because
      both views default it now.
- [ ] **Guardian board art/overlays** — the board stays player-managed (the app names the
      Path-marked slot in text). Only worth doing if the Valley board ever gets art too.

## Pioneers follow-ups (from the 2026-08-15 build; module shipped 2026-08-17)
- [ ] **Calibrate the Upgrade-board pop-out coordinates** — the four Resource-slot markers
      (`UPGRADE_SLOT_POS` in `ChronossusGame.tsx`) are still positioned by eye off
      `upgrade-board-A.jpg` (565×800); they land correctly but were never set in calibrate
      mode like the main board's overlays. The pop-out is a modal, so calibrate mode doesn't
      currently reach it. (`UPGRADE_VP_POS` was measured off the art 2026-08-16 — the ▼ in
      the ringed circle at (283, 749), same on both board sides.)
- [ ] **On-device pass on Pioneers** (updated 2026-08-17) — the Blink-check → Adventure gate
      is now exercised in a browser (`pw-pass.mjs` drives `fractures+pioneers` at 0
      Exosuits), and the dialog was checked at 760/1000/1280px. Still unverified on a real
      device: Undo re-showing the same roll (and, in shared-deck mode, the same rolled die
      before the card is picked), and the Adventure dialog at tablet width. Now playable
      from production.
- [ ] **Autoleap onto an Exosuit-placing tile doesn't run the passing rule** (2026-08-16) —
      `passIfOutOfFigures` now guards every rolled Action (printed space, tile slot, covered
      space), but the Autoleap chain in `ChronossusGame.tsx` opens `leap.actionId` /
      `owed.actionId` directly. Only reachable in a combo where an Autoleap tile can send a
      marker onto a Valley/Adventure tile, and it needs a rules call first: does the bot
      pass mid-turn on the second Action of an Autoleap, or is the leap simply skipped?
- [ ] **Adventure card follow-ups stay manual** — cards that construct a specific building
      or grant Research/Recruit Actions emit a player instruction rather than driving the
      existing Construct/Research flows. Wiring them through would let the app score the
      building VP itself.

## Guided-phase UX (from the 2026-08-11 pass)
- [ ] **Paradox roll log clears on Undo** — `ParadoxPhaseBody` keeps its roll log and
      check count in local state that no snapshot rewinds, so Undo remounts it. Earlier
      roll lines vanish from the screen (🕑 History keeps them) and the check count
      restarts, which could allow one extra check that phase. Lift that state into the
      snapshot if it ever matters.

## Fractures of Time (from the 2026-08-11 module build)
See `docs/complete/20260813_CHRONOSSUS_DIFFICULTY_TEST_FRACTURES_COMPLETED.md` — the module
shipped to production 2026-08-13.

- [ ] **Module-section rules text for the other modules' tiles** — C04/C05/C14 now carry the
      rulebook's fuller write-up in `ModularTile.detail` (shown under the Appendix summary
      in the 📖 box). C07–C13 (Experiments, Adventure, Guardian, Hypersync) still have only
      the Appendix line; their sections are Solo Opponents pp.14–17.
- [ ] **Optional Flux Pool badge** on the Chronossus board — the pool isn't printed on the
      board, so any position has to be set in calibrate mode. State shows in the turn
      overview meanwhile. (Dropped from the plan 2026-08-12; lives here if ever wanted.)
- [ ] **Manual Fractures playthrough on device** + assets/theme pass — the only item the
      plan closed unfinished (F6). Everything else was verified automated/live in-browser.
- [ ] **Verbatim rule box for the Solo Hypersync tile prompt** — `HypersyncTilePrompt` (the
      "no Action space → place a Solo Hypersync tile" dialog) is the one Action-ish dialog
      with no 📖 box, because that fallback's rulebook text was never transcribed. Pull it
      from the Future Imperfect / Solo Opponents rules if wanted.
- [ ] **Randomized tile arrangement** (deferred open question from the D2 discussion) —
      a difficulty-ish option that shuffles **all** of the active mode's modular-tile slots,
      not just Slot I↔III like D2. Needs its own definition; not a strict difficulty increase.

## Chronossus base — ✅ shipped (2026-08-09)
Base game + Hypersync module are live in prod. See
`docs/complete/20260809_CHRONOSSUS_BASE_COMPLETED.md`.

The playthrough test harness, all 10 difficulty options, Alternate Timelines, Variable
Anomalies and **Fractures of Time** (incl. the Fractures + Hypersync combo) shipped with it —
archived 2026-08-13 in
`docs/complete/20260813_CHRONOSSUS_DIFFICULTY_TEST_FRACTURES_COMPLETED.md`.

**Guardians of the Council** + the `guardians+hypersync` combo shipped 2026-08-14 —
archived in `docs/complete/20260814_GUARDIANS_COMPLETED.md`. No plan is active.

**Pioneers of New Earth** + the `fractures+pioneers` / `guardians+pioneers` combos shipped
to production 2026-08-17 — archived in `docs/complete/20260817_PIONEERS_COMPLETED.md`.
No plan is active.

**Doomsday** — the last module — is **implemented and on staging** (2026-08-18). Its plan,
log and review walkthrough are in `docs/plans/`; run the review, then `/plan cleanup` to
archive it. With it, every module in the Solo Opponents matrix is done.

Still backlog (not yet in a plan):
- [ ] **Blink check: a pool of only Empty Flux Casings never draws** (2026-08-17) —
      `shouldCheckBlink` short-circuits on `cores === 0`, but the rulebook asks "at least 1
      token in the Flux Pool" (Solo Opponents p.12). The Blink outcome is the same either
      way (no Core → no Blink), but skipping the draw leaves the Casing in the pool instead
      of set aside, so the pool composition drifts from the physical game until Clean Up.
- [ ] **Fractures + Pioneers: the post-Era-Zero Power Upgrade** — "after the Era Zero Warp
      Phase, each player may choose to spend one of their Titanium, Uranium, or Gold to
      upgrade the Power of their Exosuit as though they had taken a Power Upgrade Action"
      (Fractures rulebook p.15). The Solo Opponents book doesn't say whether the Chronossus
      takes it; if it does, it's Pioneers' Step 2 `powerUpgradeChoice` restricted to
      Ti/U/Gold, run once after the Era Zero Warp screen.
- [ ] **Doomsday: the review walkthrough** — `docs/plans/REVIEW_doomsday.md` is written but
      not yet walked. Needs the Classic Expansion Pack on the table for the Experiment steps.
- [ ] **Doomsday: Experiment / Doomsday-board iconography** — deliberately out of scope for
      the module itself (Guardians and Pioneers shipped without their equivalents). Revisit
      as its own pass across all the modules rather than one at a time.
- [ ] **Chronossus-specific stats/history in `AdminStats`** — likely revisits **stats + BG
      Stats import/export**.

Chronobot is the main stopping point — the guided Era loop, optional BGE login,
server-backed My-history + admin Overall-stats with BG Stats import/export, and the
in-app GameBrain rules frame are all shipped and live. See
`docs/complete/20260731_AUTH_STATS_HISTORY_RULES_COMPLETED.md`.

Done: the full **guided Era loop** (Landing → Start/Difficulty/Setup → Phases 1–6 →
End Game) with per-phase splash shells, verbatim rulebook boxes, the Paradox/Warp
dice flows, First-Player handling, game-end in Clean Up, and difficulty flags. See
`docs/complete/20260728_CHRONOBOT_FULL_PHASES_COMPLETED.md`.

Earlier: AI_DIE_FACES `[2,3,3,4,4,5]`; Command-token paths + Take Bot Action; Warp +
Paradox board trackers; Undo/History/persistence; settings gear menu; Era/Phase
display; Exosuit rename; favicon; landing/home screen. See
`docs/complete/20260727_EXPLORER_ENHANCEMENTS_COMPLETED.md`.
