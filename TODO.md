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
- [ ] **Saved stats / optional login** — needs a backend; not started. Also confirm the
      **shared-auth integration contract** (staging endpoints / SDK) first.
- [ ] **Security: rotate the CI deploy key** — the `the deploy key` SSH
      private key was printed to a tool output during an earlier session. Regenerate the
      keypair, update the Droplet `authorized_keys` + repo secret `DEPLOY_SSH_KEY`.

## App
- [ ] **Player play-history + overall stats** — needs the backend + BGE auth; the
      ⚙ menu already has a "Log in (soon)" placeholder.
- [ ] **`impact` flag** is reminder-only (Era-4 Clean Up note); no logic reads it.
      Wire it if Collapsing-Capital timing/automation is ever wanted.
- [ ] **Narrow top bar ≤390px** — the ⚙ menu wraps to a second row (acceptable;
      could tighten button sizing/gaps if desired).
- [ ] **Chronossus** automa — the advanced Solo opponent (Coming Soon on the landing
      page). Its own `/plan` when picked up.

Done: the full **guided Era loop** (Landing → Start/Difficulty/Setup → Phases 1–6 →
End Game) with per-phase splash shells, verbatim rulebook boxes, the Paradox/Warp
dice flows, First-Player handling, game-end in Clean Up, and difficulty flags. See
`docs/complete/20260728_CHRONOBOT_FULL_PHASES_COMPLETED.md`.

Earlier: AI_DIE_FACES `[2,3,3,4,4,5]`; Command-token paths + Take Bot Action; Warp +
Paradox board trackers; Undo/History/persistence; settings gear menu; Era/Phase
display; Exosuit rename; favicon; landing/home screen. See
`docs/complete/20260727_EXPLORER_ENHANCEMENTS_COMPLETED.md`.
