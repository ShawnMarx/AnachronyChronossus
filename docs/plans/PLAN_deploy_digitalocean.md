# PLAN — Deploy Anachrony to DigitalOcean (publishing setup)

## Overview & goal

Publish the Anachrony Chronossus solo-guide app to **production** at
**`anachrony.boardgameedge.com`**, auto-deploying on push to `main`, as a
**public static site** on the existing BoardGameEdge (BGE) Droplet
(`the deploy host`). No staging, no login, no backend — this is the first
publishing pass.

### Why this is the simplest app in the fleet

Anachrony is a **pure static Vite/React SPA** (`CLAUDE.md`: "No backend yet").
Compared to Marvel Champions / GameBrain, it needs **no** systemd service, **no**
PostgreSQL, **no** seed/index step, and **no `sudo`** in the deploy workflow —
nginx serves the built `dist/` directly and a `git reset --hard` + `npm run build`
replaces the files in place.

### Decisions locked (from scope discussion)

| Decision | Choice | Rationale |
|---|---|---|
| Environments | **Production only** | Fastest to live; staging is a ~15-min add later. |
| Subdomain | **anachrony.boardgameedge.com** | Matches the one-word style of `gamebrain`/`mcdraft`. |
| Access | **Public** | Same posture as the other apps' art; gating deferred to a later phase. |
| Build location | **On the droplet** | Matches fleet convention; Vite build is ~140 ms, Node 20 already installed. |

### Established fleet pattern this plan follows (from the other repos)

- Single Droplet `the deploy host`; deploy user `deploy`
  (`ssh -i ~/.ssh/id_ed25519_claude deploy@the deploy host`).
- Each app cloned to `/var/www/<app>`; nginx per-subdomain in
  `/etc/nginx/sites-available/`; SSL via certbot; DNS A-records at GoDaddy.
- CI = GitHub Actions → `appleboy/ssh-action@v1` → `git fetch` + `git reset --hard`
  → rebuild → (restart service). Secrets `DEPLOY_SSH_KEY`, `PROD_HOST`.
- Private repos: the deploy user authenticates via a PAT already in the droplet's
  git credential store (used by GameBrain/Marvel).

Reference guides: `MarvelChampions_DraftBuilder/DEPLOYMENT.md` and
`GameBrain/docs/complete/20260314_DEPLOYMENT.md`.

---

## Feature / step list

### Feature 1 — Repo-side prep (done from here, committed to `main`)
- **1.1** Verify the production build is clean and confirm output dir (`dist/`) and
  Vite `base` (`/`, correct for a root-of-subdomain deploy). `npm run build` is
  already green.
- **1.2** Add `.github/workflows/deploy-production.yml` — on push to `main`, SSH to
  the droplet, `cd /var/www/anachrony`, `git fetch origin main` + `git reset --hard
  origin/main`, `npm ci`, `npm run build`. **No `systemctl`, no `sudo`** (static site).
- **1.3** Add `docs/DEPLOYMENT.md` — Anachrony-specific deploy guide mirroring the
  fleet's docs (server paths, nginx block, CI, verify, troubleshooting) so the setup
  is reproducible and self-documented.
- **1.4** Sanity-check that nothing in the app assumes a dev-only path (asset URLs are
  `/assets/solo/...` absolute from web root — correct under nginx `root dist`).
- **Key decision:** build on the droplet (not CI artifact upload) to match convention.

### Feature 2 — GoDaddy DNS
- **2.1** Add an **A record**: `anachrony` → `the deploy host`, TTL 1 hr.
- **2.2** Confirm propagation (`ping anachrony.boardgameedge.com` resolves to the IP)
  before running certbot (Feature 5). Kick this off early — propagation lags.
- *(User action — GoDaddy console.)*

### Feature 3 — Server: clone + first build
- **3.1** `sudo mkdir -p /var/www/anachrony && sudo chown deploy:deploy /var/www/anachrony`.
- **3.2** Clone the **private** repo:
  `git clone https://github.com/ShawnMarx/AnachronyChronossus.git /var/www/anachrony`
  (relies on the droplet's stored PAT; if it prompts, use the
  `https://<PAT>@github.com/...` form — note the BGE handoff mentions the old PAT was
  rotated, so confirm the stored credential is current).
- **3.3** `cd /var/www/anachrony && npm ci && npm run build` → produces `dist/`.
- *(Execution-phase server work — requires go-ahead to touch the shared Droplet.)*

### Feature 4 — Nginx
- **4.1** Create `/etc/nginx/sites-available/anachrony`:
  - `server_name anachrony.boardgameedge.com;`
  - `root /var/www/anachrony/dist; index index.html;`
  - `location / { try_files $uri $uri/ /index.html; }` (SPA fallback)
  - long-cache headers for `/assets/` (hashed filenames).
  - **No `/api/` proxy** (no backend).
- **4.2** Symlink into `sites-enabled/`, `sudo nginx -t`, `sudo systemctl reload nginx`.
- *(Execution-phase server work.)*

### Feature 5 — SSL (certbot)
- **5.1** After DNS resolves: `sudo certbot --nginx -d anachrony.boardgameedge.com`.
  Auto-renew is already configured fleet-wide.
- *(Execution-phase server work.)*

### Feature 6 — GitHub Actions auto-deploy
- **6.1** Add repo secrets to **this** repo (Actions secrets are per-repo): `PROD_HOST`
  = `the deploy host`, `DEPLOY_SSH_KEY` = the existing deploy private key. The matching
  public key is already in the server's `authorized_keys` (reused across the fleet), so
  no new server key is needed — just confirm.
- **6.2** Push the workflow from 1.2 to `main`; watch the **Actions** tab go green.
- **6.3** Confirm the deploy is idempotent (a second push redeploys cleanly).
- *(User action for secrets; workflow file ships in Feature 1.)*

### Feature 7 — Verify & smoke test
- **7.1** `curl -I https://anachrony.boardgameedge.com` → 200, valid cert.
- **7.2** Load in a browser: board art renders, action tiles + the new End-of-Actions
  bar work, no console errors, favicon/title correct.
- **7.3** Make a trivial commit to `main` and confirm auto-deploy reflects it live.

---

## Recommended implementation order

1. **Feature 1** (repo prep) — can be done immediately from here; unblocks CI.
2. **Feature 2** (DNS) — start early, in parallel, so it propagates before certbot.
3. **Feature 3** (clone + build) — needs Droplet access.
4. **Feature 4** (nginx) — depends on 3.
5. **Feature 5** (SSL) — depends on 2 (DNS) + 4 (nginx serving on :80).
6. **Feature 6** (CI) — depends on 3 (target dir exists); secrets can be added anytime.
7. **Feature 7** (verify) — last.

Rationale: DNS has the longest external latency, so it goes early; the server must be
reachable over HTTP before certbot can validate the domain; CI needs the target
directory to already exist so its first `git reset --hard` has somewhere to land.

---

## Deferred / out of scope (later phases)

- **Staging** (`anachrony.staging.boardgameedge.com`) under the existing wildcard cert.
- **Access gating / SSO** via `auth.boardgameedge.com` (nginx `auth_request`) — the
  copyright-protection option we discussed.
- **Listing on the `boardgameedge.com` landing page** — requires updating the landing
  service's app registry (`boardgameedge/services/landing/`).
- **Saved stats / optional login** — needs a backend; not started (see `CLAUDE.md`).
- **Build-in-CI + rsync** — fallback if the Droplet's RAM gets tight during builds.

## Open questions

- Is the Droplet's **stored deploy PAT current** for this private repo? (BGE handoff
  noted the old PAT was rotated and some repos' remotes still embed the old token.)
- Is `DEPLOY_SSH_KEY` an **org-level** secret (auto-available) or must it be added
  per-repo? Assume per-repo until confirmed in the GitHub UI.
