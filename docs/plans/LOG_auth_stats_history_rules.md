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

## Feature C — Wire Anachrony to the data service  ✅ code complete + deployed 2026-07-30

1. [x] `src/data/gameData.ts` client (host-detected `DATA_BASE` → data.boardgameedge.com,
       all credentialed): recordGame/listMyGames/deleteGame/adminStats/exportUrl/importGames.
2. [x] Score screen: **Save to my history** button (logged-in only), enabled once a player
       score is entered. POSTs won/bot_score/player_score/difficulty(+labels)/era + a payload
       (score breakdown, bot turns, difficulty flags). localStorage resume save untouched.
3. [x] `src/history/HistoryScreen.tsx` (⚙ → My history) — table, delete, Export to BG Stats
       (credentialed link), Import from BG Stats (dry-run then real). + `HistoryScreen.css`.
4. [x] `src/history/AdminStats.tsx` (⚙ → Overall stats, `user.isAdmin` only) — cards +
       by-difficulty table.
5. [~] Both repos build/test/lint green (Anachrony 53; gamedata 6). Redeployed gamedata
       (a21b8c0) + pushed app (ead8a60, auto-deploys). **End-to-end click-through in the live
       app is the user's runtime check.**

### Feature C deviations / notes
- **BG Stats format** (per user): board = **"Solo - Chronobot"** (the mode); difficulty
  adjustments go in the play **notes** (empty for Base); the Chronobot is an **anonymous**
  non-human player (`isAnonymous: true`). Import reads difficulty from notes. Client sends
  the detailed modifier labels as `difficulty` so notes + History column are meaningful.
- **Record trigger**: an explicit Save button (not auto-POST) since the player score is
  entered by hand on the score screen — auto would fire before a score exists.
- Two ⚙ "History" entries now: 🕑 **History** (current game's per-turn log, localStorage) and
  🗄 **My history** (server-backed past games). Kept distinct on purpose.

## Feature D — In-app rules frame  ✅ code complete 2026-07-30

1. [x] GameBrain: added `PUBLIC_ACCESS` to `config_writer.py` (serialized right after
       `OPEN_ACCESS`) + `_mod_to_config` (`admin_games.py`) so it round-trips through
       admin saves; new **POST `/{slug}/access/public`** toggle + a "Public Access"
       card in `templates/admin/games/access.html` (red-accented; warns it exposes the
       page to logged-out visitors).
2. [x] GameBrain: `core/game_deps.py` — `require_game_access` now returns `User | None`;
       PUBLIC_ACCESS games resolve the user optionally via `get_user_from_cookie`
       (**no redirect** when logged out). OPEN_ACCESS/normal branches unchanged.
3. [x] GameBrain: `game_page`/`game_info` (`routers/games.py`) + `get_pdf`/`get_resources`
       (`routers/pdf.py`) take `user: User | None`; `_can_see_game` guards `None`
       (admin check only when a user exists; PUBLIC_ACCESS ⇒ visible). `privileged`
       computed as `user is not None and (admin or creator)`. **Chat stays gated** —
       `routers/chat.py` uses `require_app_access`, untouched. Full test suite green.
4. [x] GameBrain: `games/anachrony/config.py` → `OPEN_ACCESS = True` + `PUBLIC_ACCESS = True`.
       `DEFAULT_RESOURCE='Rulebook'` already set. **Server-side source symlink + synced
       PDFs is the user's runtime check** (INTEGRATING_RULES_REFERENCE §1.3).
5. [x] Anachrony: new `src/rules/gamebrain.ts` (host-detected `GAMEBRAIN_URL` +
       `RULES_FRAME_URL`) and `src/rules/RulesFrame.tsx` (+ `.css`): a `📖 Rules` entry
       button and a full-viewport overlay whose collapsed bar is **◀ Back to Game ·
       📖 Rules Reference · ⚙ · 🏠**. Wired into `BoardExplorer.tsx` via a `modeRules`
       state; the ⚙ menu is the same `SettingsMenu`, passed in as a node.
6. [x] Anachrony: the `<iframe id="gamebrain-frame">` src is set lazily on first open
       (`http://localhost:8000` dev / `gamebrain.boardgameedge.com` prod), then kept
       mounted forever — the overlay only toggles `display`, never unmounts, so the
       iframe (PDF scroll/session) and the game view (phase/scroll) both survive
       Back-to-Game. Esc also returns.
7. [x] Verified locally (Playwright, port 5203, fresh game → Era 1 Phase 1): 📖 button
       present; open ⇒ overlay `display:flex`, iframe src
       `…/games/anachrony/?embedded=true&tab=rules&preset=Solo%20Chronobot`, ⚙ + 🏠
       present; Back ⇒ overlay `display:none`, **iframe still mounted**, game restored.
       (Iframe body blank only because no local GameBrain was running.) Build/53 tests/
       lint all green. **Logged-out live `?embedded=true` (no login prompt) is the
       user's runtime check** once GameBrain redeploys with the public tier.

### Feature D deviations / notes
- **Rules button placement**: added to *both* the Phase-5 top bar (`StatsBar`) and the
  non-Action `PhaseScreen` header (via `headerRight`), so rules are reachable from every
  in-game phase (1–6), not only the play view. Not surfaced on Setup/Score screens.
- **Iframe persistence scope**: the `RulesFrame` lives in `modals`, which each render
  branch (`setup`/non-Action/Action) emits at its own position — so a **phase change**
  (e.g. Action Rounds → Clean Up) remounts it and reloads the iframe. Persistence holds
  *within* a phase (the Back-to-Game requirement); reopening after a phase transition
  reloads GameBrain. Acceptable; hoisting the frame above the phase switch would remove
  even that reload if wanted later.
- **Server steps remaining (user's)**: redeploy GameBrain so the new `PUBLIC_ACCESS`
  code + anachrony config land; confirm the anachrony `source/` symlink + PDFs exist on
  the droplet; then verify logged-out `?embedded=true` shows rules with no login prompt.

---

## Deviation notes

_(record any changes from the plan here as work proceeds)_
