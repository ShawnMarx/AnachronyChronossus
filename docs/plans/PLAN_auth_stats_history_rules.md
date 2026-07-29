# Plan — Optional BGE login, stats & history, and an in-app rules frame

> **Status:** Finalized 2026-07-29. **Not started.** This is the concrete plan for
> what `docs/PLAN.md` calls **Phase 5 — Optional login + stats**, plus a new
> in-app rules frame. Touches three repos: `AnachronyChronossus` (this app),
> `boardgameedge` (shared platform), and `GameBrain` (rules content + a new
> public-access tier). See the Decision Log at the bottom.

## Context

The Anachrony solo-guide app (`anachrony.boardgameedge.com`) is a **pure static
site** — nginx serves `dist/` directly, no backend. We add three things without
giving up static-first where we can:

1. **Optional BGE login** — fully optional; the app works logged-out exactly as
   today. Logging in is additive (enables history + stats).
2. **Overall statistics** — aggregate play data, **admin-only** for now.
3. **Personal history** — a logged-in user's past games, cross-device, with
   **BG Stats import/export** mirroring the Bullet app.

Plus an **in-app rules frame** mirroring Bullet: a single rules-notes icon opens
an embedded GameBrain `/games/anachrony/` iframe; a **◀ Back to Game** button
returns to the exact prior game view (scroll + phase preserved).

### Key findings from research (why the shape below)

- **Auth needs no backend.** The `bge_session` cookie is scoped to
  `.boardgameedge.com`; `anachrony.boardgameedge.com` is same-site with
  `auth.boardgameedge.com`, so `SameSite=Lax` cookies ride cross-origin
  fetches. The app learns "who am I" client-side via
  `fetch('https://auth.boardgameedge.com/api/me', {credentials:'include'})` and
  logs in by redirecting to `.../login?return=<app url>`. This is exactly how the
  landing service works (`boardgameedge/services/landing/src/bge_landing/routes.py`).
  The auth service already has credentialed CORS — we just add our origin to
  `CORS_ORIGINS` (`boardgameedge/services/auth/src/bge_auth_service/main.py:44`).
- **Stats + history DO need a server.** Chosen: a **shared BGE data service** in
  the `boardgameedge` monorepo, so future apps reuse it. The static SPA POSTs
  results with `credentials:'include'`; the service validates via the shared
  cookie-or-Bearer resolver `bge_shared.guards.get_current_user`.
- **Rules embed target exists.** `GameBrain/games/anachrony/config.py` is built and
  `STATUS='published'`, `DEFAULT_RESOURCE='Rulebook'`, `CHAT_CONTEXT_PRESETS`
  present. The embed contract (`?embedded=true`, `postMessage` API) is documented in
  `GameBrain/docs/concepts/INTEGRATING_RULES_REFERENCE.md`. Reference impl:
  `BulletHeartSingles/static/js/app.js` (`setMode`, `rulesSetTab`, `gb:resources`).
- **BG Stats format** to mirror: `BulletHeartSingles/core/bgs_export.py`
  (`build_bgs_json`) + `routers/import_export.py`. Anachrony BGG id **185343**.

### Design note — a new "true public access" tier in GameBrain
Today `OPEN_ACCESS = True` only removes the *platform-approval* gate;
`require_game_access` still calls `require_login`
(`GameBrain/core/game_deps.py:10-19`), so a logged-out Anachrony user would see
GameBrain's login inside the iframe. Since login is optional in Anachrony, we add
a **new truly-public tier** to GameBrain so the rules frame renders for anonymous
visitors (see Phase D). Only the four read routes the frame uses become
anonymous-capable; chat stays login-gated.

> **Copyright note:** making the Anachrony page truly public exposes its rulebook
> PDFs to anyone with the URL. The Anachrony repo is private precisely because the
> board art is copyrighted; a public rules page is a deliberate exposure decision
> (the user's call). Scope the new tier to the game page + PDF/resource reads only.

---

## Phase A — Optional BGE login (Anachrony static app + one auth-service env line)

**boardgameedge repo:**
- Add `https://anachrony.boardgameedge.com` (and the staging equivalent if used) to
  `CORS_ORIGINS` in the auth service prod `.env`, and document it in
  `services/auth/.env.example:32`. No code change — the middleware already reads it.

**Anachrony repo:**
- New `src/auth/bgeAuth.ts` — a tiny, framework-free auth client:
  - `AUTH_BASE` from hostname (mirror Bullet's `GAMEBRAIN_URL` detection:
    localhost → dev, `*staging*` → staging, else prod).
  - `fetchMe(): Promise<{id,username,isAdmin}|null>` → `GET ${AUTH_BASE}/api/me`
    with `credentials:'include'`; 401/other → null.
  - `loginUrl()` / `logoutUrl()` → `${AUTH_BASE}/login?return=<current>` /
    `.../logout?return=<current>`.
- New `src/auth/useAuth.ts` (small React context) — calls `fetchMe()` on mount,
  exposes `{ user, loading, login(), logout() }`.
- UI wiring in `BoardExplorer.tsx`: replace the existing **"Log in (soon)"**
  placeholder in the ⚙ menu (settings menu, ~`BoardExplorer.tsx:2516+`) with a real
  account row — logged out: "Log in with BoardGameEdge"; logged in: "Signed in as
  {username}" + Log out. Login never gates gameplay.

## Phase B — Shared BGE data service (game results) in the monorepo

New uv-workspace member **`boardgameedge/services/gamedata`** (mirror
`services/landing`: `pyproject.toml`, `src/bge_gamedata/{main,config,routes}.py`,
`tests/`). FastAPI, uses `bge_shared.database` + `bge_shared.guards`.

- **Table** (generic so other apps reuse it): add `GameResult` to
  `bge_shared/models.py` — `id, app_slug, user_id, played_at, won:bool,
  bot_score:int, player_score:int|null, difficulty, era_reached, payload:JSON
  (full ChronobotState summary + breakdown), source ('app'|'import'), created_at`.
  `Base.metadata.create_all` on startup.
- **Endpoints** (under `/api/anachrony`, `APP_SLUG=anachrony`):
  - `POST /games` — record a finished game (`require_login`); body = score-screen
    summary; returns the created row.
  - `GET /me/games` — this user's history, newest-first (`require_login`).
  - `DELETE /me/games/{id}` — delete one of the user's own rows.
  - `GET /admin/stats` — aggregate (games, win-rate, by-difficulty, distinct users)
    via `require_admin` (universal or `anachrony`-scoped).
  - `GET /me/games/bgstats` — BG Stats JSON download; adapt `build_bgs_json`:
    `bggId:185343, name:"Anachrony"`, one `play` per game, `board` = difficulty /
    "Solo Chronobot", `playerScores` = player score + `winner`.
  - `POST /me/import` — accept a BG Stats play file, upsert `GameResult`
    (`source='import'`), dry-run supported (mirror Bullet's `_run_import`).
- **CORS**: `CORSMiddleware`, `allow_credentials=True`, methods `GET/POST/DELETE`,
  origins from `CORS_ORIGINS` (copy the auth service's block).
- **Deploy**: systemd unit + nginx block + deploy workflow mirroring
  `services/auth` + `services/landing`. Shares `SECRET_KEY` + `AUTH_DATABASE_URL`.

## Phase C — Wire Anachrony to the data service

- New `src/data/gameData.ts` client (host-detected `DATA_BASE`, all
  `credentials:'include'`): `recordGame(summary)`, `listMyGames()`,
  `deleteGame(id)`, `adminStats()`, `exportUrl()`, `importGames(file, dryRun)`.
- **On game end**: in the score screen (`BoardExplorer.tsx`, ~`scoreChronobot`
  usage near line 1965), when logged in, POST a summary built from
  `Chronobot.scoreChronobot(bot)` + `state` (era, difficulty, win/lose, player
  score). Keep the existing `localStorage` in-progress save (it's the resume
  mechanism; server records are finished-game history).
- **Personal History view** (`src/history/HistoryScreen.tsx`, opened from the ⚙
  menu, logged-in only): list rows, delete, **Export to BG Stats** (link to
  `exportUrl()`), **Import from BG Stats** (upload → `importGames`).
- **Admin Stats view** (`src/history/AdminStats.tsx`, shown only when
  `user.isAdmin`): render `adminStats()`.

## Phase D — In-app rules frame

**GameBrain repo — add a true-public tier (new feature), then enable it:**
- New config field, e.g. `PUBLIC_ACCESS = True` (default `False`) on
  `games/anachrony/config.py`. Preserve it through admin saves
  (`core/config_writer.py`); add a toggle on `/admin/games/{slug}/access`
  (`routers/admin_games.py` + `templates/admin/games/access.html`).
- `core/game_deps.py`: give `require_game_access` a third branch — for a
  `PUBLIC_ACCESS` game, resolve the user optionally (return `User | None`, **no
  redirect** when logged out) instead of `require_login`.
- Make the four frame routes tolerate `user: User | None`: `game_page` +
  `game_info` (`routers/games.py:39-65`) and `get_pdf` + `get_resources`
  (`routers/pdf.py:25-62`). Chat/LLM routes stay `require_login`.
- Keep `OPEN_ACCESS = True` too; confirm `DEFAULT_RESOURCE='Rulebook'` and the
  server-side source symlink + synced PDFs (INTEGRATING_RULES_REFERENCE §1.3).

**Anachrony app (deliberately simpler than Bullet — no GameBrain chrome relayed):**
- **One rules button** — the same rules-notes icon already used inside the app (the
  📖 glyph on the `RulesBox` collapsibles), placed in the top bar. Clicking enters
  `mode-rules`.
- **In `mode-rules` the top bar collapses** to exactly three controls:
  **◀ Back to Game · ⚙ Settings · 🏠 Landing**. All play controls (VP pill, Take Bot
  Action, etc.) are hidden.
- **Everything below the top bar is the GameBrain frame** — one persistent
  `<iframe id="gamebrain-frame">`, created once, `src` set lazily on first open to
  `${GAMEBRAIN_URL}/games/anachrony/?embedded=true&tab=rules&preset=Solo+Chronobot`.
  GameBrain's header is hidden by `embedded=true`; we relay **no** Resources / Chat /
  ⇔ controls.
- **◀ Back to Game** clears `mode-rules`, restoring the full top bar and the game
  view. The game view is only hidden via CSS (`display:none`), never unmounted, so
  scroll + current phase are preserved automatically. The iframe stays alive too.
- Host detection for `GAMEBRAIN_URL` (same helper as `AUTH_BASE`).
- With the true-public tier the frame renders for logged-out visitors — no
  login-in-frame, no logged-out special-casing.

---

## Sequencing & scope

- **Implement first:** A (login) → B (data service) → C (history + admin stats +
  BG Stats I/O).
- **Then:** D (rules frame + GameBrain public tier) — independent of A–C.
- Server-side steps (prod `.env` CORS line, the new service's systemd/nginx/DNS)
  are the user's; the agent drafts the confs mirroring existing units.

## Verification

- **Auth (A):** `npm run dev`; with a valid `bge_session` cookie the ⚙ menu shows
  "Signed in as …"; logged out shows "Log in". `npm run build` + `npm test` stay
  green. Confirm `fetch(.../api/me,{credentials:'include'})` returns 200 from the
  anachrony origin (CORS) — test against staging first.
- **Data service (B):** `uv run pytest` in `boardgameedge`; new tests for
  `POST/GET/DELETE /api/anachrony/*`, admin gating (403 for non-admin on
  `/admin/stats`), and the BG Stats round-trip (export → import → same rows).
  `uv run ruff check .` clean.
- **End-to-end (C):** finish a Chronobot game while logged in → row appears in the
  History view; delete works; Export downloads a BG-Stats-valid JSON; re-importing
  recreates the rows. Admin sees `/admin/stats`; non-admin does not.
- **Rules frame (D):** in a **logged-out** browser, open
  `https://gamebrain.boardgameedge.com/games/anachrony/?embedded=true` directly →
  header hidden, Rulebook PDF auto-opens, **no login prompt** (confirms the
  true-public tier). In the app, the 📖 icon collapses the top bar to ◀ Back · ⚙ ·
  🏠 with the frame below; ◀ Back to Game returns to the same phase/scroll.

---

## Decision Log

Choices locked during planning (2026-07-29):

1. **Login stays fully optional and needs no backend** — client-side `/api/me`
   check + redirect-to-login; app unchanged when logged out.
2. **Stats + personal history live in a shared BGE data service**, not an
   Anachrony-specific backend — future BGE apps reuse it. Generic
   `GameResult(app_slug, user_id, …, payload)` table in `bge_shared`.
3. **BG Stats import/export is required**, mirroring the Bullet app. BGG id 185343.
4. **Overall stats are admin-only for now** (`require_admin`, `APP_SLUG=anachrony`).
5. **Rules frame is intentionally minimal** vs. Bullet: one rules-notes icon; rules
   mode collapses the top bar to **◀ Back to Game · ⚙ Settings · 🏠 Landing**, with
   the whole area below being the GameBrain `?embedded=true` frame; no relayed
   Resources/Chat/⇔. Back to Game restores the exact prior phase/scroll.
6. **GameBrain needs a NEW true-public access tier.** `OPEN_ACCESS=True` alone still
   calls `require_login`; a new `PUBLIC_ACCESS` tier makes the four frame routes
   anonymous-capable so logged-out users see rules. Chat stays login-gated.
   **Accepted tradeoff:** exposes the Anachrony rulebook PDFs publicly.
7. **Sequencing:** A → B → C first; D right after. Three repos.
8. **Server-side steps are the user's**; the agent drafts confs mirroring existing
   units.

### Open items to resolve at implementation time
- Data service host: dedicated `data.boardgameedge.com` vs. a path proxied under an
  existing host — decide alongside the nginx/systemd draft.
- Whether to offer a one-time "push my local (localStorage) finished games to the
  server" action on first login, or leave prior local games as export/import only.
- Chat context preset for the frame (`Solo Chronobot` vs. leaving it unset).
