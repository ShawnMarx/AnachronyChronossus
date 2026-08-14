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

Still backlog (not yet in a plan):
- [ ] **More modules** — Doomsday, Pioneers (stubbed in the Module menu). Each becomes its
      own `/plan`. Note the rulebook's limits (Solo Opponents p.18): Doomsday combines with
      nothing, and Fractures + Guardians is not allowed. Pioneers also unlocks the
      `guardians+pioneers` and `fractures+pioneers` combos (a 4th tile covers Recruit
      Genius / Research).
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
