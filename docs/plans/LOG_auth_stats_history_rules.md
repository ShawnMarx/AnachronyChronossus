# Execution Log — Optional BGE login, stats & history, and an in-app rules frame

Tracks `PLAN_auth_stats_history_rules.md`. Steps are worked in order; mark `[x]`
when done and note any deviation inline. **Feature A complete (code) 2026-07-29.**

Repos: `AnachronyChronossus` (app), `boardgameedge` (platform), `GameBrain` (rules).

---

## Feature A — Optional BGE login (client-side, no backend)

1. [x] boardgameedge: added `https://anachrony.boardgameedge.com` to
       `services/auth/.env.example` `CORS_ORIGINS`. **Prod `.env` line is the
       user's server-side step** (still pending). Staging origin not added (staging
       deferred).
2. [x] Anachrony: added `src/auth/bgeAuth.ts` — `AUTH_BASE` host detection,
       `fetchMe()` (credentialed `/api/me`), `loginUrl()` / `logoutUrl()`.
3. [x] Anachrony: added `src/auth/useAuth.ts` context (`{user, loading, login, logout}`),
       calling `fetchMe()` on mount. Uses `createElement` (no JSX) so it stays a `.ts`.
       Wired `<AuthProvider>` in `main.tsx`.
4. [x] Anachrony: replaced the ⚙-menu "Log in (soon)" placeholder in
       `BoardExplorer.tsx` `SettingsMenu` with a real account row (loading … /
       "Log in with BoardGameEdge" / "Sign out ({username})").
5. [~] `npm run build` + `npm test` (53) + `npm run lint` all green; gameplay
       unaffected logged out (login only renders a menu row). **Live `/api/me` 200 +
       CORS check against a real cookie is the user's runtime step** (needs prod/staging).

## Feature B — Shared BGE data service (`services/gamedata`)  ✅ code complete 2026-07-29

1. [x] boardgameedge: added `GameResult` to `bge_shared/models.py` (app_slug,
       user_id, played_at, won, bot_score, player_score, difficulty, era_reached,
       payload JSON, source, created_at). Generic `JSON` column (SQLite + PG).
2. [x] Scaffolded `services/gamedata` (uv member; `main/config/routes/bgs`; `tests/`),
       mirroring `services/landing`; `Base.metadata.create_all` on startup; CORS block
       from `CORS_ORIGINS`.
3. [x] `POST /api/anachrony/games` — record finished game.
4. [x] `GET /api/anachrony/me/games` + `DELETE /me/games/{id}`.
5. [x] `GET /api/anachrony/admin/stats` — aggregates (games, wins, win_rate,
       distinct_users, by_difficulty), admin-scoped to `anachrony`.
6. [x] `GET /api/anachrony/me/games/bgstats` — BG Stats export (bggId 185343,
       two players: human + "Chronobot" so both scores + winner round-trip).
7. [x] `POST /api/anachrony/me/import?dry_run=` — BG Stats import (accepts the
       play JSON as the request body, not multipart).
8. [x] Tests: 6 (health, anon 401, CRUD, delete-own-only, admin gating 401/403/200,
       BG Stats round-trip). Full suite **71 passed**; `ruff` clean.
9. [x] Drafted deploy confs: `deploy/systemd/gamedata{,-staging}.service` (prod 8002 /
       staging 8012), `deploy/nginx/data{,.staging}.boardgameedge.com.conf`,
       `.github/workflows/deploy-gamedata.yml`, README section. **Server-side apply
       (DNS `data.boardgameedge.com`, cert, `.env`, enable unit) is the user's step.**

### Feature B deviations / notes
- **Auth deps**: JSON endpoints raise plain **401/403** (local `require_user` /
  `require_admin_user`) instead of the shared `require_login`'s 303 login redirect,
  which suits a fetch client.
- **Host decision** (was an open item): drafted as a dedicated **`data.boardgameedge.com`**
  subdomain (mirrors auth./gamebrain./bullet.), not a path proxy. Prod port **8002**,
  staging **8012** — confirm free on the shared droplet before enabling.
- **`uv.lock` NOT updated**: `uv` isn't installed on this dev machine; I editable-installed
  the new member into `.venv` via pip to run tests. **Run `uv lock` (or `uv sync`) where
  uv is available** so the lockfile records `bge-gamedata` before CI/deploy uses it.
- **DB role**: unlike landing (read-only), gamedata **writes** `game_results` — give its
  DB user write access.

### Feature B — SERVER LIVE (2026-07-30)
Prod bring-up complete on the shared droplet:
- `data.boardgameedge.com` DNS + prod cert (certbot) + nginx block → `a loopback port`.
- systemd `gamedata.service` active; `.env` shares auth's `SECRET_KEY` + `AUTH_DATABASE_URL`
  (`localhost/bge_auth`), `CORS_ORIGINS=https://anachrony.boardgameedge.com`.
- **Port 8006** (not 8002 — 8000–8005 were already taken by other prod gunicorns).
  Repo confs updated to match (commit ed6b942).
- Verified: healthz ok; GET `/api/anachrony/me/games` → 401; OPTIONS preflight → 200 with
  allow-origin/credentials/methods; `game_results` table created by `create_all`.
- Server uses **pip editable install** (no uv on the droplet); `uv.lock` updated on dev.

## Feature C — Wire Anachrony to the data service

1. [ ] Anachrony: add `src/data/gameData.ts` client (host-detected `DATA_BASE`,
       credentialed): record/list/delete/adminStats/exportUrl/import.
2. [ ] Anachrony: on game end (score screen, ~`BoardExplorer.tsx:1965`) POST a summary
       when logged in; keep the localStorage in-progress save untouched.
3. [ ] Anachrony: `src/history/HistoryScreen.tsx` (⚙ menu, logged-in) — list, delete,
       Export to BG Stats, Import from BG Stats.
4. [ ] Anachrony: `src/history/AdminStats.tsx` (admin-only) — render aggregates.
5. [ ] Verify end-to-end: finish game → row appears → delete → export → re-import
       recreates rows; admin sees stats, non-admin does not.

## Feature D — In-app rules frame (build after A–C)

1. [ ] GameBrain: add `PUBLIC_ACCESS` config field + admin `/access` toggle +
       `config_writer` preservation.
2. [ ] GameBrain: `core/game_deps.py` — `require_game_access` anonymous branch for
       `PUBLIC_ACCESS` games (returns `User | None`, no redirect).
3. [ ] GameBrain: make `game_page`, `game_info` (`routers/games.py`) + `get_pdf`,
       `get_resources` (`routers/pdf.py`) tolerate `user=None`; keep chat gated.
4. [ ] GameBrain: set `PUBLIC_ACCESS=True` (+ `OPEN_ACCESS=True`) for `anachrony`;
       confirm default resource + source symlink/PDFs on the server.
5. [ ] Anachrony: add the rules button (rules-notes icon) + `mode-rules` state that
       collapses the top bar to ◀ Back to Game · ⚙ · 🏠.
6. [ ] Anachrony: persistent lazy-loaded `<iframe>` →
       `${GAMEBRAIN_URL}/games/anachrony/?embedded=true&tab=rules&preset=Solo+Chronobot`;
       game view hidden (not unmounted) so Back to Game restores phase/scroll.
7. [ ] Verify: logged-out direct `?embedded=true` shows rules with no login prompt;
       in-app 📖 toggles frame; Back to Game returns to exact spot.

---

## Deviation notes

_(record any changes from the plan here as work proceeds)_
