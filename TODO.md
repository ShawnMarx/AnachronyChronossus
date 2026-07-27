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
- [ ] Verify `AI_DIE_FACES` (`engine/index.ts`) against the physical die — still a
      placeholder `[1..6]`.
- [ ] Build the full **per-Era phase/turn structure** on top of the engine (the app is
      still a single-action debug harness). See `docs/HANDOFF.md` "Next up".
