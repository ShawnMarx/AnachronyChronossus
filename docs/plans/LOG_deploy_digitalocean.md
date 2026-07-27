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

## Feature 3 — Server clone + first build  *(needs Droplet go-ahead)*
- [ ] 3.1 `mkdir -p /var/www/anachrony` + chown deploy.
- [ ] 3.2 Clone private repo (stored PAT; fall back to PAT-in-URL if prompted).
- [ ] 3.3 `npm ci && npm run build` → `dist/`.

## Feature 4 — Nginx  *(needs Droplet go-ahead)*
- [ ] 4.1 Write `/etc/nginx/sites-available/anachrony` (root dist, SPA fallback, asset cache, no /api).
- [ ] 4.2 Symlink → sites-enabled, `nginx -t`, reload.

## Feature 5 — SSL  *(needs Droplet go-ahead; after DNS)*
- [ ] 5.1 `certbot --nginx -d anachrony.boardgameedge.com`.

## Feature 6 — GitHub Actions auto-deploy
- [ ] 6.1 Add repo secrets `PROD_HOST`, `DEPLOY_SSH_KEY` (confirm per-repo vs org).
- [ ] 6.2 Push workflow to `main`; Actions run green.
- [ ] 6.3 Confirm a second push redeploys idempotently.

## Feature 7 — Verify & smoke test
- [ ] 7.1 `curl -I https://anachrony.boardgameedge.com` → 200 + valid cert.
- [ ] 7.2 Browser: art, tiles, End-of-Actions bar, no console errors, title/favicon.
- [ ] 7.3 Trivial `main` commit → auto-deploy reflected live.

---

## Deviations / decisions during execution
_(none yet)_
