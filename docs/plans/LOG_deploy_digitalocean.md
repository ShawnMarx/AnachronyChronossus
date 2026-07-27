# LOG — Deploy Anachrony to DigitalOcean

Execution tracker for `PLAN_deploy_digitalocean.md`. Mark steps `[x]` as completed;
note deviations inline.

---

## Feature 1 — Repo-side prep (from here, → `main`)
- [x] 1.1 Verify `npm run build` clean; confirm `dist/` output + Vite `base: /`. — build OK; default base `/`; dist has index.html, favicon.svg, assets/solo/.
- [x] 1.2 Add `.github/workflows/deploy-production.yml` (SSH deploy; no sudo/systemd). Added `workflow_dispatch` trigger too.
- [x] 1.3 Add `docs/DEPLOYMENT.md` (Anachrony-specific guide).
- [x] 1.4 Sanity-check asset paths work under nginx `root dist` (absolute `/assets/...`). — confirmed `dist/assets/solo/board-chronobot.jpg` + `dist/favicon.svg` present.
- [x] Commit deploy files locally. **Push to `main` held** until the server dir + Actions secrets exist (avoids a guaranteed-fail first run).

## Feature 2 — GoDaddy DNS  *(user action)*
- [x] 2.1 Add A record `anachrony` → `the deploy host` (TTL 1 hr). — user added.
- [x] 2.2 Confirm `anachrony.boardgameedge.com` resolves — `nslookup` → `the deploy host`. ✅

## Feature 3 — Server clone + first build  ✅ done via SSH
- [x] 3.1 `mkdir -p /var/www/anachrony` — `/var/www` is owned by `deploy`, no sudo needed.
- [x] 3.2 Clone private repo — stored PAT authenticated; HEAD `dbc3f49`.
- [x] 3.3 `npm ci && npm run build` → `dist/` built (index.html, favicon, assets/solo/).

## Feature 4 — Nginx  *(config staged; user runs sudo)*
- Config + helper staged in `~` on the server: `~/anachrony.nginx`, `~/setup-anachrony-nginx.sh`.
- [x] 4.1 `bash ~/setup-anachrony-nginx.sh` — installed, `nginx -t` ok, reloaded. ✅

## Feature 5 — SSL  ✅ done
- [x] 5.1 `sudo certbot --nginx -d anachrony.boardgameedge.com` — cert issued; HTTP→HTTPS 301 works. ✅ **Site LIVE.**

## Feature 6 — GitHub Actions auto-deploy  ✅ done
- [x] 6.1 Added repo secrets `PROD_HOST` + `DEPLOY_SSH_KEY` (a dedicated new CI key — see deviation).
- [x] 6.2 Pushed `dbc3f49..bdeb5a7` to `main`; workflow ran **green in 21s** (run 30285303195).
- [x] 6.3 Deploy is idempotent (`git reset --hard` + rebuild each run).

## Feature 7 — Verify & smoke test  ✅ done
- [x] 7.1 `curl -I https://anachrony.boardgameedge.com` → 200, valid cert, HTTP→HTTPS 301.
- [x] 7.2 Live bundle `index-Cx2j9geX.js` contains `eoa-bar` + "Resolve the Chronobot" — End-of-Actions feature live; board art serves.
- [x] 7.3 The push updated the live site from `dbc3f49` → `bdeb5a7` automatically.

---

## Deviations / decisions during execution
- **`/var/www` is owned by `deploy`**, so no sudo was needed to create the app dir or
  clone/build. Only the nginx-config install + certbot needed a password (user ran them).
- **`DEPLOY_SSH_KEY`:** the existing fleet CI key (`a fleet CI key`) private
  half wasn't locally findable (lives only in GameBrain's secret). Generated a fresh
  dedicated **`the deploy key`** ed25519 key instead, appended its public half
  to the server's `~/.ssh/authorized_keys` (backup saved), login-tested it, and the user
  pasted the private half into the secret. Temp private key deleted from scratchpad after
  the first green run proved it. Matches the per-app `github-actions-*` convention.
- **Static-site simplifications:** no systemd unit, no DB, no `sudo` in the deploy
  workflow — nginx serves `dist/` directly.

## ✅ COMPLETE — `anachrony.boardgameedge.com` is LIVE with working auto-deploy on push to `main`.
