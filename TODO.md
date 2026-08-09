# TODO

Loose ends and deferred work. Bigger efforts become a `/plan` when picked up.

## Deployment / publishing (deferred from the 2026-07-27 DO deploy)
See `docs/complete/20260727_DEPLOY_DIGITALOCEAN_COMPLETED.md`.

- [ ] **Staging** — `anachrony.staging.boardgameedge.com` under the existing wildcard
      cert, deploying from a `staging` branch (mirror the fleet's staging workflow).
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

## In progress — Chronossus base
- [ ] **Chronossus** automa — active plan at `docs/plans/PLAN_chronossus_base.md`.
      Part A (action-stage parity + shared UI) and B1 (action tiles + Autoleap +
      energy-core gain + Hypersync) are done; remaining: Solo Objectives (B2), real
      per-phase bodies (B3), module selection (B4), and ship (B5). Continue with
      `/plan execute`. Likely revisits **stats + BG Stats import/export** then.

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
