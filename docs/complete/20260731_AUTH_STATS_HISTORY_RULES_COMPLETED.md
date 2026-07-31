# COMPLETED — Optional BGE login, stats & history, and an in-app rules frame

**Archived:** 2026-07-31 · **Status:** ✅ All four phases (A–D) code-complete and
deployed to production. Remaining items are the user's server-side/runtime
verification loose ends (captured under *Production Notes* below); no unstarted
code features. Spanned three repos: `AnachronyChronossus` (app), `boardgameedge`
(platform), `GameBrain` (rules).

There was no REVIEW doc; the app has been in live use with login, My-history,
Overall-stats, and the in-app rules frame all working.

---

# Plan (as finalized 2026-07-29)

> Concrete plan for what `docs/PLAN.md` calls **Phase 5 — Optional login + stats**,
> plus a new in-app rules frame.

## Context

The Anachrony solo-guide app (`anachrony.boardgameedge.com`) is a **pure static
site** — nginx serves `dist/` directly, no backend. Added three things without
giving up static-first where possible:

1. **Optional BGE login** — fully optional; the app works logged-out exactly as
   before. Logging in is additive (enables history + stats).
2. **Overall statistics** — aggregate play data, **admin-only** for now.
3. **Personal history** — a logged-in user's past games, cross-device, with
   **BG Stats import/export** mirroring the Bullet app.

Plus an **in-app rules frame**: a rules icon opens an embedded GameBrain
`/games/anachrony/` iframe; **◀ Back to Game** returns to the exact prior view.

### Key findings (why the shape below)

- **Auth needs no backend.** The `bge_session` cookie is scoped to
  `.boardgameedge.com`; `anachrony.boardgameedge.com` is same-site with
  `auth.boardgameedge.com`, so `SameSite=Lax` cookies ride cross-origin fetches.
  The app learns "who am I" via `GET /api/me` with `credentials:'include'` and
  logs in by redirecting to `.../login?return=<app url>`. Auth already has
  credentialed CORS — just add our origin to `CORS_ORIGINS`.
- **Stats + history DO need a server.** Chosen: a **shared BGE data service** in
  the `boardgameedge` monorepo, so future apps reuse it.
- **Rules embed target exists.** `GameBrain/games/anachrony/config.py` is built;
  embed contract `?embedded=true` documented in
  `GameBrain/docs/concepts/INTEGRATING_RULES_REFERENCE.md`. BGG id **185343**.

### Design note — a new "true public access" tier in GameBrain
`OPEN_ACCESS=True` alone still calls `require_login`, so a logged-out visitor
would see GameBrain's login inside the iframe. A new **`PUBLIC_ACCESS`** tier makes
the four read routes the frame uses anonymous-capable; chat stays login-gated.
**Accepted tradeoff:** exposes the Anachrony rulebook PDFs publicly (the user's
call; the repo is private because the board art is copyrighted).

## Phase A — Optional BGE login
- **boardgameedge:** add `https://anachrony.boardgameedge.com` to auth
  `CORS_ORIGINS` (`.env` + `.env.example`). No code change.
- **Anachrony:** `src/auth/bgeAuth.ts` (host-detected `AUTH_BASE`, `fetchMe()`,
  login/logout URLs); `src/auth/useAuth.ts` context; `<AuthProvider>` in
  `main.tsx`; replace the ⚙-menu "Log in (soon)" placeholder with a real account
  row. Login never gates gameplay.

## Phase B — Shared BGE data service (`services/gamedata`)
- Generic `GameResult(app_slug, user_id, played_at, won, bot_score, player_score,
  difficulty, era_reached, payload JSON, source, created_at)` in `bge_shared`.
- Endpoints under `/api/anachrony`: `POST /games`, `GET /me/games`,
  `DELETE /me/games/{id}`, `GET /admin/stats`, `GET /me/games/bgstats`,
  `POST /me/import?dry_run=`. Credentialed CORS; systemd/nginx/deploy confs
  mirroring existing units.

## Phase C — Wire Anachrony to the data service
- `src/data/gameData.ts` client (host-detected `DATA_BASE`, credentialed).
- Score screen **Save to my history** (logged-in, once a player score entered).
- `src/history/HistoryScreen.tsx` (⚙ → My history): table, delete, BG Stats
  export/import. `src/history/AdminStats.tsx` (⚙ → Overall stats, admin only).

## Phase D — In-app rules frame
- **GameBrain:** new `PUBLIC_ACCESS` config field preserved through admin saves;
  `require_game_access` returns `User | None` (no redirect when logged out) for
  PUBLIC_ACCESS games; the four frame routes tolerate `user: None`; chat stays
  gated. `games/anachrony/config.py` → `OPEN_ACCESS=True` + `PUBLIC_ACCESS=True`.
- **Anachrony:** `src/rules/gamebrain.ts` + `src/rules/RulesFrame.tsx` (+ css): a
  📖 Rules button and a full-viewport overlay (collapsed bar: **◀ Back to Game ·
  📖 Rules Reference · ⚙ · 🏠**). One persistent `<iframe>`, src set lazily, kept
  mounted so game + PDF state survive Back-to-Game. Esc also returns.

## Decision Log (locked 2026-07-29)
1. Login fully optional, no backend (client `/api/me` + redirect).
2. Stats + history in a **shared** BGE data service, generic `GameResult` table.
3. BG Stats import/export required (BGG id 185343).
4. Overall stats admin-only for now.
5. Rules frame intentionally minimal vs Bullet; top bar collapses to ◀/⚙/🏠.
6. GameBrain gets a **new `PUBLIC_ACCESS` tier**; chat stays login-gated.
   Accepted tradeoff: public rulebook PDFs.
7. Sequencing A → B → C, then D. Three repos.
8. Server-side steps are the user's; agent drafts confs.

---

# Execution Log (all steps completed)

**Feature A — Optional BGE login** (code complete 2026-07-29)
1. [x] boardgameedge: added anachrony origin to auth `CORS_ORIGINS`
   (`.env.example`). Prod `.env` line was the user's server step.
2. [x] `src/auth/bgeAuth.ts` — `AUTH_BASE` detection, `fetchMe()`, login/logout.
3. [x] `src/auth/useAuth.ts` context; `<AuthProvider>` in `main.tsx` (uses
   `createElement`, stays a `.ts`).
4. [x] Replaced ⚙-menu "Log in (soon)" with a real account row.
5. [~] build/test/lint green; gameplay unaffected logged out. Live `/api/me` +
   CORS was the user's runtime step.

**Feature B — Shared data service** ✅ code complete 2026-07-29; **SERVER LIVE 2026-07-30**
1–9. [x] `GameResult` in `bge_shared`; scaffolded `services/gamedata`; all six
   endpoints; 6 service tests (suite 71 passed, ruff clean); drafted systemd/nginx/
   workflow confs.
- Deviations: JSON 401/403 (not 303 redirect); dedicated `data.boardgameedge.com`
  subdomain; gamedata DB user needs **write** access.
- **Server live:** `data.boardgameedge.com` DNS + cert + nginx → `a loopback port`
  (port 8006, not 8002 — 8000–8005 taken); `gamedata.service` active; `.env` shares
  auth `SECRET_KEY` + `AUTH_DATABASE_URL` (`localhost/bge_auth`),
  `CORS_ORIGINS=https://anachrony.boardgameedge.com`. Verified: healthz ok, 401
  when anon, OPTIONS preflight 200, `game_results` table created. Repo confs
  updated (commit ed6b942).

**Feature C — Wire Anachrony to the data service** ✅ code complete + deployed 2026-07-30
1–4. [x] `src/data/gameData.ts`; score-screen **Save to my history**;
   `HistoryScreen.tsx` (+ css) with delete + BG Stats export/import; `AdminStats.tsx`.
5. [~] Both repos build/test/lint green; redeployed gamedata (a21b8c0), app pushed
   (ead8a60). End-to-end live click-through was the user's runtime check.
- Deviations: BG Stats board = "Solo - Chronobot", difficulty in play notes,
  Chronobot is an anonymous non-human player; explicit Save button (not auto-POST);
  two distinct ⚙ "History" entries — 🕑 **History** (per-turn localStorage log) vs
  🗄 **My history** (server-backed past games).

**Feature D — In-app rules frame** ✅ code complete 2026-07-30
1–7. [x] GameBrain `PUBLIC_ACCESS` field + admin toggle + optional-user routes +
   anachrony config (`OPEN_ACCESS` + `PUBLIC_ACCESS`); Anachrony `gamebrain.ts` +
   `RulesFrame.tsx` (+ css) wired into `BoardExplorer` via `modeRules`; iframe
   src set lazily, kept mounted. Verified locally with Playwright (build/tests/lint
   green).
- Deviations: Rules button on **both** the Phase-5 top bar and the non-Action
  `PhaseScreen` header. Iframe persists **within** a phase; a phase change remounts
  `modals` and reloads the frame (acceptable; could hoist above the phase switch).

---

# Production Notes

**Live infrastructure introduced by this plan:**
- **`data.boardgameedge.com`** → nginx → `a loopback port`, systemd
  `gamedata.service`. `.env` shares auth's `SECRET_KEY` + `AUTH_DATABASE_URL`
  (`localhost/bge_auth`); `CORS_ORIGINS=https://anachrony.boardgameedge.com`. The
  gamedata DB user needs **write** access to `game_results`. Server uses a pip
  editable install (no `uv` on the droplet); `uv.lock` maintained on dev.
- **GameBrain `PUBLIC_ACCESS`** is enabled for `anachrony` — the rules page + its
  PDFs are publicly reachable at
  `gamebrain.boardgameedge.com/games/anachrony/?embedded=true`. Chat remains
  login-gated. Board art / rulebook exposure is intentional.
- The app has **two** history surfaces: 🕑 **History** (current game's per-turn
  localStorage log) and 🗄 **My history** (server-backed past games). Keep distinct.

**Runtime/server loose ends that were the user's steps** (verify if not already):
- Auth prod `.env` `CORS_ORIGINS` includes the anachrony origin (login works live).
- GameBrain redeployed with the `PUBLIC_ACCESS` code + anachrony `source/` symlink
  + synced PDFs; logged-out `?embedded=true` shows rules with no login prompt.
- `uv lock`/`uv sync` records `bge-gamedata` before CI relies on it.

**Deferred enhancement (was an open item, not built):**
- Optional one-time "push my local (localStorage) finished games to the server on
  first login" — left as export/import only for now. Tracked in `TODO.md`.
