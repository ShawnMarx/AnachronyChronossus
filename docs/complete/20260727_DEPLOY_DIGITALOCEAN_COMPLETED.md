# COMPLETED — Deploy Anachrony to DigitalOcean (publishing setup)

**Completed 2026-07-27.** Consolidated archive of `PLAN_deploy_digitalocean.md` +
`LOG_deploy_digitalocean.md`. No REVIEW doc was produced (verified inline via curl +
a live green Actions run).

**Outcome:** 🚀 **https://anachrony.boardgameedge.com is LIVE** (public static site,
HTTPS) with **auto-deploy on push to `main`** working end-to-end.

---

## Plan (decisions & scope)

Publish the app to **production** at **`anachrony.boardgameedge.com`**, auto-deploying
on push to `main`, as a **public static site** on the shared BoardGameEdge (BGE) Droplet
(`the deploy host`). No staging, no login, no backend — first publishing pass.

Anachrony is a **pure static Vite/React SPA**, so it's the simplest app in the fleet:
**no** systemd service, **no** PostgreSQL, **no** seed/index, **no `sudo`** in the deploy
workflow — nginx serves the built `dist/` directly.

### Decisions locked

| Decision | Choice | Rationale |
|---|---|---|
| Environments | **Production only** | Fastest to live; staging is a ~15-min add later. |
| Subdomain | **anachrony.boardgameedge.com** | Matches the one-word style of `gamebrain`/`mcdraft`. |
| Access | **Public** | Same posture as other apps' art; gating deferred. |
| Build location | **On the droplet** | Matches fleet convention; Vite build ~375 ms, Node 20 present. |

### Fleet pattern followed
- Single Droplet `the deploy host`; deploy user `deploy`.
- Each app in its own directory; nginx per-subdomain; SSL via certbot.
- CI = GitHub Actions → `appleboy/ssh-action@v1` → `git fetch` + `git reset --hard` →
  rebuild. Secrets `DEPLOY_SSH_KEY`, `PROD_HOST`.
- Reference guides: `MarvelChampions_DraftBuilder/DEPLOYMENT.md`,
  `GameBrain/docs/complete/20260314_DEPLOYMENT.md`.

---

## Execution log (all features complete ✅)

**Feature 1 — Repo prep** (`main`)
- `.github/workflows/deploy-production.yml` (SSH deploy; `workflow_dispatch` too; no
  sudo/systemd), `docs/DEPLOYMENT.md`, verified build (`dist/` + Vite `base: /`), asset
  paths confirmed. Committed `ae919fa`.

**Feature 2 — DNS** — A record `anachrony` → `the deploy host` (user added); `nslookup`
confirmed resolution before certbot.

**Feature 3 — Server clone + build** (via SSH as `deploy`)
- `/var/www` is owned by `deploy` → no sudo needed to `mkdir the app directory.
- Clone authenticated from the Droplet's stored PAT; `npm ci && npm run build` → `dist/`.

**Feature 4 — Nginx** — staged `~/anachrony.nginx` + `~/setup-anachrony-nginx.sh`; user
ran the helper (sudo): installed `/etc/nginx/sites-available/anachrony`, symlinked,
`nginx -t` ok, reloaded.

**Feature 5 — SSL** — user ran `sudo certbot --nginx -d anachrony.boardgameedge.com`;
cert issued, HTTP→HTTPS 301 works.

**Feature 6 — GitHub Actions auto-deploy**
- Repo secrets `PROD_HOST` + `DEPLOY_SSH_KEY` added.
- Pushed `dbc3f49..bdeb5a7`; workflow ran **green in 21s** (run 30285303195). Idempotent
  (`git reset --hard` + rebuild each run).

**Feature 7 — Verify** — `curl -I` → 200 + valid cert; live bundle `index-Cx2j9geX.js`
contains `eoa-bar` / "Resolve the Chronobot" (End-of-Actions feature live); board art
serves; the push auto-updated the live site `dbc3f49` → `bdeb5a7`.

### Key deviations
- **`/var/www` owned by `deploy`** → no sudo for the app dir or clone/build; only the
  nginx install + certbot needed a password (user ran them).
- **`DEPLOY_SSH_KEY`:** a fleet CI key's private
  half wasn't locally findable (lives only in GameBrain's secret). Generated a fresh
  dedicated **the deploy key** ed25519 key, appended its public half to the
  host's authorized_keys (backed up first),
  login-tested it; user pasted the private half into the secret; temp private key deleted
  from scratchpad after the first green run. Matches the per-app `github-actions-*`
  convention.
- **Static-site simplifications:** no systemd unit, no DB, no `sudo` in the workflow.

---

## Production Notes (ongoing maintenance)

- **Deploy:** just `git push origin main`. Watch the run: `gh run list --repo
  ShawnMarx/AnachronyChronossus`. Manual re-run: `gh workflow run "Deploy Anachrony to
  Production"` (or push).
- **Server layout:** app at the app directory (`deploy`-owned); nginx site
  `/etc/nginx/sites-available/anachrony` → `dist/`; cert auto-renews (fleet certbot).
- **Manual rebuild on the box:** `cd the app directory && git pull && npm ci && npm run
  build` (nginx needs no reload — it serves the files directly).
- **CI key:** the deploy key (public half in the server's `authorized_keys`).
  To rotate: regenerate, re-append the pub, replace the `DEPLOY_SSH_KEY` secret.
- **Private repo:** the Droplet clones via the stored PAT (git `credential.helper=store`).
  If a future PAT rotation breaks the clone, refresh `~/.git-credentials` on the Droplet.
- **RAM:** 1 GB Droplet shared with Marvel/GameBrain/BGE. The Vite build is light
  (~0.4 s), but if builds ever contend for RAM, the fallback is build-in-CI + rsync of
  `dist/`.
- **Shared host:** never restart or reconfigure other apps' nginx/systemd when touching
  this one.

## Deferred to later phases → see `TODO.md`
- Staging (`anachrony.staging.boardgameedge.com`) under the wildcard cert.
- Access-gating / SSO via `auth.boardgameedge.com` (nginx `auth_request`).
- Listing on the `boardgameedge.com` landing page.
- Saved stats / optional login (needs a backend).
