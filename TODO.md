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
- [ ] **Saved stats / optional login** — needs a backend; not started.

## App
- [ ] Wire the **difficulty flags** into a setup UI (engine already honors
      `min-actions-6`; the "extra turn after you pass" option is unimplemented).
- [ ] Build the full **per-Era phase/turn structure** on top of the engine (the app
      still runs single Action turns via **Take Bot Action**). Active plan:
      `docs/plans/PLAN_chronobot_full_phases.md`. The endgame flags
      (`endgameTriggered`, `chronobotPoweredExosuits(era)`, score screen) are already
      wired and will hook in.
- [ ] **Player play-history + overall stats** — needs the backend + BGE auth; the
      ⚙ menu already has a "Log in (soon)" placeholder.

Done this session: AI_DIE_FACES confirmed `[2,3,3,4,4,5]`; Command-token paths +
Take Bot Action; Warp + Paradox board trackers; Undo/History/persistence; settings
gear menu; endgame trigger + score screen; Era/Phase display; Exosuit rename; favicon;
landing/home screen. See `docs/complete/20260727_EXPLORER_ENHANCEMENTS_COMPLETED.md`.
