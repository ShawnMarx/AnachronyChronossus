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

## Feature B — Shared BGE data service (`services/gamedata`)

1. [ ] boardgameedge: add `GameResult` model to `bge_shared/models.py`
       (app_slug, user_id, played_at, won, bot_score, player_score, difficulty,
       era_reached, payload JSON, source, created_at).
2. [ ] Scaffold `services/gamedata` (uv member; `main/config/routes`; `tests/`),
       mirroring `services/landing`; `Base.metadata.create_all` on startup; CORS block.
3. [ ] Endpoint `POST /api/anachrony/games` (require_login) — record finished game.
4. [ ] Endpoints `GET /api/anachrony/me/games` + `DELETE /me/games/{id}` (require_login).
5. [ ] Endpoint `GET /api/anachrony/admin/stats` (require_admin) — aggregates.
6. [ ] Endpoint `GET /api/anachrony/me/games/bgstats` — BG Stats export (adapt
       `build_bgs_json`, bggId 185343).
7. [ ] Endpoint `POST /api/anachrony/me/import` — BG Stats import + dry-run
       (mirror Bullet `_run_import`).
8. [ ] Tests: CRUD, admin gating (403), BG Stats round-trip; `ruff` + `pytest` clean.
9. [ ] Draft deploy confs (systemd unit + nginx block + workflow) mirroring existing
       services. **Server-side apply is the user's step** (host/DNS decision pending).

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
