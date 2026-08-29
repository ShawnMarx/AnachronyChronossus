# TODO

Loose ends and deferred work. Bigger efforts become a `/plan` when picked up.

## Translation / i18n (layer shipped 2026-08-23)

The mechanism is in (`src/i18n/`, `src/i18n/locales/README.md`): drop a `<code>.json` in
`src/i18n/locales/` and it appears in the ⚙ menu. Ships English-only; no translations are
committed and none are planned in-house.

- [x] **Engine instructions → message descriptors — DONE 2026-08-28.** All 8 features;
      archived to `docs/complete/20260828_I18N_MESSAGE_DESCRIPTORS_COMPLETED.md`. The engine
      returns `{key, params}` and never prose, so a persisted History line is re-rendered on
      every read rather than frozen in the wording — and language — that wrote it. Surface
      **1,114 -> 1,450 keys**; the pseudolocale run's `untranslated.md` **40 -> 19 lines**;
      36-screen snapshot diff against the pre-refactor build identical (one deliberate
      wording fix, "Spent 1 {worker}"). `PersistedGame.version` deliberately NOT bumped, so
      games in progress keep their old English History (guarded by `pw-descriptors.mjs`).
- [ ] **Raise review coverage past ~21% (`COVERAGE=1 MODES=all`, 2026-08-28).** The
      denominator moved: the surface is now **1,450 keys** (was 1,114) and the message-
      descriptor refactor added the two families a screen sweep is *worst* at reaching —
      `instr.*` (4/234 seen) and `hist.*` (19/89), most of which only render after a rolled
      turn or a committed one. Two fixable causes: the **marker locale** gives the harness
      less text to navigate by, so it reaches 742 screens where the pseudolocale run reaches
      897; and the sweep **never plays a turn**, so Clean Up's lines, Construct's two VP
      branches, an Adventure's card line and Alternate Timelines can never appear. The
      pseudolocale run DOES exercise them (`untranslated.md` is down to 19 lines, none of
      them an instruction), so this is a coverage-reporting gap, not a translation gap.
      Superseded detail — the original entry:
      **Raise review coverage past ~47% (`MODES=Base`).** (`MODES=all` now runs clean —
      897 captures, zero layout faults — so what is left is the COVERAGE report, not the
      sweep itself.) `pw-i18n-review.mjs` reports what
      it missed in `coverage.md`; the known gaps and their routes:
      `tile.*` needs `MODES=all` plus a second `SIDES=B` run (all 28 tiles are reachable —
      verified against the mode matrix); `rule.blink` needs Fractures and
      `rule.doomsday.checkForImpact` needs Doomsday; `rule.passing` /
      `rule.chronossusPassing` need the bot's **final Time Travel then pass** sequence after
      stepping Exosuits to 0 (the new debug stepper reaches the state — the harness just
      does not yet drive the two turns that follow); `phase.actions.*` may render nowhere
      (the Action Rounds "phase screen" is the board) — check before keeping the key.
- [x] **Remaining app-voice chrome — DONE 2026-08-24.** All of it: `BoardExplorer.tsx`,
      `ChronossusGame.tsx`, `ChronossusSetupFlow.tsx`, `AdminStats.tsx`, plus `PhaseScreen`,
      `HistoryPane`, `TurnBarOverview`, `ReadyToBegin` and `FirstPlayerPrompt`. Surface
      314 -> 1,113 keys. Three families joined it so a word is translated once, not three
      times: `piece.<key>` (derived from `BOARD_COUNTERS`; used by the tracker tooltips AND
      the Mine/Recruit swatches), `module.<id>` / `extraModule.<id>` / `objectiveCard.<slug>`,
      and `blinkSpace.<key>`. Verbatim boxes moved into
      `src/engine/rules/chronossusSetupRules.ts` + `chronossusModuleRules.ts` as `rule.*`
      keys rather than being translated as app voice. Deliberately NOT swept: debug/calibrate
      (dev-only) and anything persisted — see the convention in `CLAUDE.md`.

- [ ] **Rule constants nothing renders.** `ENDGAME_TRIGGER_RULE`, `FAILED_ACTIONS`, the
      `QUANTUM_LOOPS_*` blocks and `DOOMSDAY_SETUP/DIFFICULTY/PLANNED_EXPERIMENTS_RULE` are
      exported but shown nowhere — they were pulled back out of the translatable surface so
      a translator is not asked to do invisible work. Add the key back when a screen renders
      one.
- [ ] **Reconcile the duplicated setup rule constants.** `doomsday.ts` and
      `quantumLoops.ts` carry `*_SETUP_RULE` in the rulebook's headed/bulleted form and
      nothing renders them; the setup screen shows the same text reflowed into prose from
      `src/engine/rules/chronossusSetupRules.ts`. Merging them changes displayed text, so it
      was kept out of the i18n conversion on purpose.
- [ ] **When a translator appears:** point them at `src/i18n/locales/README.md`, and be clear
      that `officialRulebook: true` means the rule text was transcribed from that language's
      **official** Anachrony / Solo Opponents edition — not translated from the English.

- [ ] **Extend `es.json` past its 174 keys — now the gate on promoting to `main`** (measured
      2026-08-28: **58 `instr.*`, all Chronobot; 0 `hist.*`; 58 `ui.*`**). The Spanish locale is
      partial by design — everything else falls back to English per key. The message-descriptor
      refactor just made the two biggest missing slices reachable, so take them in this order:
      the **History families** (`hist.*`, 89 keys — every line a saved game shows) and the
      **Chronossus's instructions** (`instr.chronossus.*`, 133), then the Chronossus setup prose
      (`ui.cxSetup.*`, 152) and the dialogs (`ui.dialog.*`, 56). Terminology is settled in
      `src/i18n/locales/GLOSSARY-es.md`; the ⚠ solo terms there are inferred and should be
      revisited if an official Spanish solo edition ever appears. A full EN-vs-ES capture of the
      current state (761 per side, zero layout faults) was run 2026-08-28 — regenerate with
      `LANG_CODE=es MODES=all node pw-i18n-review.mjs` after each slice.

## Deployment / publishing (deferred from the 2026-07-27 DO deploy)
See `docs/complete/20260727_DEPLOY_DIGITALOCEAN_COMPLETED.md`. Staging is done — live at
`anachrony.staging.boardgameedge.com`, deploying from the `staging` branch (`docs/DEPLOYMENT.md`).

- [ ] **Access-gating / SSO** — protect the copyrighted board art by wiring nginx
      `auth_request` against `auth.boardgameedge.com` (shared `bge_session` cookie).
- [x] **Landing-page listing** — **already done** (confirmed 2026-08-21): Anachrony is an
      `AppCard` in `boardgameedge/services/landing/src/bge_landing/config.py` (slug
      `anachrony`, icon `clock`). Confirmed live on the landing service at `staging.boardgameedge.com`; the
      prod apex is still a GoDaddy placeholder.
- [x] **Link back to BGE landing** — **done 2026-08-22**: the apex now serves the landing
      service, so `BGE_LANDING_URL` returns it in prod and the link renders everywhere. Still
      open: the **"support me"** line — no donation platform chosen.
      Superseded note — **half done 2026-08-21.** The link ships on the home
      screen, env-aware (`BGE_LANDING_URL` in `Landing.tsx`), but **prod returns null so it
      does not render**: `boardgameedge.com` is still a GoDaddy "Launching Soon" placeholder,
      while the landing service itself is live at `staging.boardgameedge.com`. One line to
      flip when the apex cuts over. Still open: the **"support me" message** — the donation
      platform (Ko-fi / Patreon / …) is undecided, so nothing was shipped for it.
- [x] **Security: rotate the CI deploy key** — **done 2026-08-21.** Rotated, new key
      proven by a real deploy before the old one was removed. Procedure lives with the
      infrastructure docs, not here.
- [x] **Make the GitHub repo public** — **done 2026-08-22.** Ops docs moved to `droplet-ops`,
      history rewritten to scrub the droplet IP / fleet key names / a personal email / the
      services' loopback ports, README + LICENSE added (MIT code; Mindclash owns the art and
      rulebook text, expressly not licensed here). A verified pre-scrub mirror is on the NAS at
      `/Volumes/shawn/git/AnachronyChronossus-pre-scrub-20260822.git` — the ONLY copy of the
      original history; keep it and do not publish it.
      Superseded note — it was private because the board art is
      copyrighted. Before flipping: strip/relocate the copyrighted board art + sprite
      assets (or confirm licensing), scrub git history for any secrets, and re-confirm
      the CI deploy key was rotated (see above).

## App
- [ ] **Experiment placement on the paths I cannot drive** (2026-08-22) — reported as "the
      Exosuit prompt is skipped when Step 1 is skipped". Every branch reachable from a rolled
      turn shows it, and it is now its own box at the top of the dialog rather than a line
      inside Step 2. Two paths remain unexercised: an **Autoleap** landing on an Experiment
      tile, and a turn that **passes** for want of figures (where no placement is correct).
- [ ] **`rounds` in the BG Stats export is the Era reached** (2026-08-22) — BG Stats' own file
      had 0 there. The app knows the Era, so it fills it; revert to 0 if it reads wrong in the
      app. Expansions are deliberately not listed (each needs a BGG id, and the modules are
      already named in `board`).
- [x] **History and stats now work in prod AND staging** (2026-08-22) — the long-standing
      "nothing saves" was **not** in this app: prod's `gamedata` had a trailing inline comment
      in its systemd `EnvironmentFile` (`COOKIE_NAME=bge_session   # staging: …`), and systemd
      does not strip those, so the service looked up a 60-character cookie name that could
      never match and every authenticated request resolved to anonymous. Fixed by the
      `boardgameedge` session; `gamedata-staging` stood up the same day. Verified end to end
      on both environments: admin/stats 401 → 403, `/me/games` 200, both bots save, and a
      queued game drains by itself once the service returns.
      **What was ours:** the app reported that 401 as "Your login session expired" — a false
      claim about a service that was working, and the reason this went unfound for three
      weeks. Both bots now re-check `/api/me` before blaming the login.
- [ ] **Admin stats still 403** (2026-08-22) — the last piece of "overall stats isn't
      working". the test account has no admin role for this app on the shared auth service. That insert is blocked in the `boardgameedge`
      session and is waiting on Shawn. 403 is the correct answer until then, not a fault.
- [ ] **Export the score tally, not just BG Stats** (2026-08-19, open question) — the home
      screen's history modal exports BG Stats' summary fields (result, scores, era,
      difficulty). Asked for but never specified: a per-game export of the full scoring
      breakdown the tally collects. Needs a format decision (CSV? the share card's rows?).
- [ ] **Engine instruction voice** (2026-08-19) — the score-screen and Action dialogs now say
      what the *bot* does ("The Chronossus discards … and removes 1 Anomaly from its board").
      A few engine `Instruction.text` strings still address the player about the bot's supply
      (`chronobot.ts` `resolveRemoveAnomaly`: "Discard … from the Chronobot"). They feed
      History labels rather than dialogs, so nothing is wrong on screen — worth a sweep if the
      voice ever shows.
- [ ] **Paradox roll count could be derived now** (2026-08-19) — the phase asks the player how
      many past Timeline tiles the bot leads/ties on, capped by `state.era - 1` and its total
      Warp tiles. With `warpTilesByEra` the app knows exactly which past tiles hold the bot's
      tiles; it still cannot know the *player's*, so the question stays — but the cap could be
      exact rather than an upper bound.
- [ ] **`impact` flag** is reminder-only (Era-4 Clean Up note); no logic reads it.
      Wire it if Collapsing-Capital timing/automation is ever wanted.
- [ ] **Narrow top bar ≤390px** — the ⚙ menu wraps to a second row (acceptable;
      could tighten button sizing/gaps if desired).
- [~] **Anonymous-visitor counting** (2026-08-21) — the platform's `login_events` can't see
      anyone who never signs in, which for this app is most sessions, so the admin dashboard
      would read usage as *falling* as anonymous use grows. Spec:
      `~/repos/boardgameedge/docs/CONTRACT_anonymous_usage.md`.
      **This app can't implement the contract's usual shape** — a static SPA has no server,
      no request pipeline and **no DB role** (anything in `dist/` is public), so it is
      explicitly granted nothing. Shawn chose the contract's **third mode** (2026-08-21).
      - [x] **Step 1 — the cookie** (`src/data/anonVisit.ts`, called from `main.tsx`):
            mints a random 128-bit **host-only** `bge_anon`, never derived from the visitor,
            never throwing, and returns null rather than claiming an id a blocked browser
            never stored. **Inert today — nothing reads it**, which is deliberate: it lets
            the cookie age into real browsers before anything counts it. 8 unit tests.
      - [ ] **Step 2 — nginx** logs that cookie plus a signed-in boolean, so the *server*
            decides anonymous-vs-authenticated. **Send the `log_format` line to the
            `boardgameedge` session before it ships** — that is where an IP or user-agent
            could sneak back in.
      - [ ] **Step 3 — a local rollup job** inserts daily uniques into `bge_auth.anon_visits`
            (`app_slug='anachrony'`). Bias it toward overlapping days: `ON CONFLICT DO
            NOTHING` makes double-counting free, while a gap is unrecoverable.
      **Steps 2–3 are held** until the platform's `limit_req` work, so droplet nginx is
      touched once. Notes: host-only means staging and prod count separately, so testing
      can't contaminate the prod figure; the figure is a floor, not a census; and a cached
      shell opened offline is invisible — an undercount, the same honest direction as the
      rest of the design.
- [ ] **Push local games to the server on first login** — deferred enhancement from
      the auth/stats work: offer a one-time "import my local (localStorage) finished
      games" action; currently local prior games are export/import only. (Distinct from the
      2026-08-19 pending-upload queue, which only holds games whose save *failed*.)

## Chronossus follow-ups (from the 2026-08-08 playtest fixes)
See `docs/complete/20260808_CHRONOSSUS_PLAYTEST_FIXES_COMPLETED.md`.

- [ ] **On-device verification** — never ran a `/plan review`. Manually check on iPad/
      iPhone: undo/roll-persistence (Paradox/Warp/Hypersync re-show the same roll), the
      side-by-side tally at tablet width, and the share-sheet flow.
- [x] **Mirror roll-persistence to the Chronobot** — **done 2026-08-21.** The Warp and
      Paradox rolls are on the Chronobot's `Snapshot` (and in its save), so Undo — and a
      reload — re-show the same roll instead of re-rolling. Verified with
      `pw-chronobot-parity.mjs`.
- [x] **Mirror the phase-screen ↶ Undo to the Chronobot** — **done 2026-08-21.** The header
      Undo and `commitPhase` are both there; `advancePhase`, `startNextEraNow` and
      `endGameNow` all commit, so every phase move is undoable and lands in History.

## Guardians follow-ups (from the 2026-08-14 module build)
- [ ] **Mirror the Chronossus's phase/History polish to the Chronobot** where it applies —
      the Chronobot's pass entry gained a reason line, but its phase screens still lack the
      turn-overview rule-box footer treatment and the History pane opens docked only because
      both views default it now.
- [ ] **Guardian board art/overlays** — the board stays player-managed (the app names the
      Path-marked slot in text). Only worth doing if the Valley board ever gets art too.

## Pioneers follow-ups (from the 2026-08-15 build; module shipped 2026-08-17)
- [ ] **Calibrate the Upgrade-board pop-out coordinates** — the four Resource-slot markers
      (`UPGRADE_SLOT_POS` in `ChronossusGame.tsx`) are still positioned by eye off
      `upgrade-board-A.jpg` (565×800); they land correctly but were never set in calibrate
      mode like the main board's overlays. The pop-out is a modal, so calibrate mode doesn't
      currently reach it. (`UPGRADE_VP_POS` was measured off the art 2026-08-16 — the ▼ in
      the ringed circle at (283, 749), same on both board sides.)
- [ ] **On-device pass on Pioneers** (updated 2026-08-17) — the Blink-check → Adventure gate
      is now exercised in a browser (`pw-pass.mjs` drives `fractures+pioneers` at 0
      Exosuits), and the dialog was checked at 760/1000/1280px. Still unverified on a real
      device: Undo re-showing the same roll (and, in shared-deck mode, the same rolled die
      before the card is picked), and the Adventure dialog at tablet width. Now playable
      from production.
- [ ] **Autoleap onto an Exosuit-placing tile doesn't run the passing rule** (2026-08-16) —
      `passIfOutOfFigures` now guards every rolled Action (printed space, tile slot, covered
      space), but the Autoleap chain in `ChronossusGame.tsx` opens `leap.actionId` /
      `owed.actionId` directly. Only reachable in a combo where an Autoleap tile can send a
      marker onto a Valley/Adventure tile, and it needs a rules call first: does the bot
      pass mid-turn on the second Action of an Autoleap, or is the leap simply skipped?
- [ ] **Adventure card follow-ups stay manual** — cards that construct a specific building
      or grant Research/Recruit Actions emit a player instruction rather than driving the
      existing Construct/Research flows. Wiring them through would let the app score the
      building VP itself.

## Guided-phase UX (from the 2026-08-11 pass)
- [ ] **Paradox roll log clears on Undo** — `ParadoxPhaseBody` keeps its roll log and
      check count in local state that no snapshot rewinds, so Undo remounts it. Earlier
      roll lines vanish from the screen (🕑 History keeps them) and the check count
      restarts, which could allow one extra check that phase. Lift that state into the
      snapshot if it ever matters.

## Fractures of Time (from the 2026-08-11 module build)
See `docs/complete/20260813_CHRONOSSUS_DIFFICULTY_TEST_FRACTURES_COMPLETED.md` — the module
shipped to production 2026-08-13.

- [ ] **Module-section rules text for the other modules' tiles** — C04/C05/C14 now carry the
      rulebook's fuller write-up in `ModularTile.detail` (shown under the Appendix summary
      in the 📖 box). C07–C13 (Experiments, Adventure, Guardian, Hypersync) still have only
      the Appendix line; their sections are Solo Opponents pp.14–17.
- [ ] **Optional Flux Pool badge** on the Chronossus board — the pool isn't printed on the
      board, so any position has to be set in calibrate mode. State shows in the turn
      overview meanwhile. (Dropped from the plan 2026-08-12; lives here if ever wanted.)
- [ ] **Manual Fractures playthrough on device** + assets/theme pass — the only item the
      plan closed unfinished (F6). Everything else was verified automated/live in-browser.
- [ ] **Verbatim rule box for the Solo Hypersync tile prompt** — `HypersyncTilePrompt` (the
      "no Action space → place a Solo Hypersync tile" dialog) is the one Action-ish dialog
      with no 📖 box, because that fallback's rulebook text was never transcribed. Pull it
      from the Future Imperfect / Solo Opponents rules if wanted.
- [ ] **Randomized tile arrangement** (deferred open question from the D2 discussion) —
      a difficulty-ish option that shuffles **all** of the active mode's modular-tile slots,
      not just Slot I↔III like D2. Needs its own definition; not a strict difficulty increase.

## Chronossus base — ✅ shipped (2026-08-09)
Base game + Hypersync module are live in prod. See
`docs/complete/20260809_CHRONOSSUS_BASE_COMPLETED.md`.

The playthrough test harness, all 10 difficulty options, Alternate Timelines, Variable
Anomalies and **Fractures of Time** (incl. the Fractures + Hypersync combo) shipped with it —
archived 2026-08-13 in
`docs/complete/20260813_CHRONOSSUS_DIFFICULTY_TEST_FRACTURES_COMPLETED.md`.

**Guardians of the Council** + the `guardians+hypersync` combo shipped 2026-08-14 —
archived in `docs/complete/20260814_GUARDIANS_COMPLETED.md`. No plan is active.

**Pioneers of New Earth** + the `fractures+pioneers` / `guardians+pioneers` combos shipped
to production 2026-08-17 — archived in `docs/complete/20260817_PIONEERS_COMPLETED.md`.
No plan is active.

**Doomsday** shipped to production 2026-08-20 and was archived 2026-08-21 to
`docs/complete/20260821_DOOMSDAY_COMPLETED.md`. **Quantum Loops** — the last one — shipped to
`staging` 2026-08-21 and is archived in
`docs/complete/20260821_QUANTUM_WRAPUP_COMPLETED.md`. With it, **every module AND add-on in
the Solo Opponents matrix is done** and the picker has nothing left to add.

Still backlog (not yet in a plan):
- [ ] **Blink check: a pool of only Empty Flux Casings never draws** (2026-08-17) —
      `shouldCheckBlink` short-circuits on `cores === 0`, but the rulebook asks "at least 1
      token in the Flux Pool" (Solo Opponents p.12). The Blink outcome is the same either
      way (no Core → no Blink), but skipping the draw leaves the Casing in the pool instead
      of set aside, so the pool composition drifts from the physical game until Clean Up.
- [ ] **Fractures + Pioneers: the post-Era-Zero Power Upgrade** — "after the Era Zero Warp
      Phase, each player may choose to spend one of their Titanium, Uranium, or Gold to
      upgrade the Power of their Exosuit as though they had taken a Power Upgrade Action"
      (Fractures rulebook p.15). The Solo Opponents book doesn't say whether the Chronossus
      takes it; if it does, it's Pioneers' Step 2 `powerUpgradeChoice` restricted to
      Ti/U/Gold, run once after the Era Zero Warp screen.
- [ ] **Doomsday: Experiment / Doomsday-board iconography** — deliberately out of scope for
      the module itself (Guardians and Pioneers shipped without their equivalents). Revisit
      as its own pass across all the modules rather than one at a time.
- [ ] **Chronossus-specific stats/history in `AdminStats`** — likely revisits **stats + BG
      Stats import/export**.

Chronobot is the main stopping point — the guided Era loop, optional BGE login,
server-backed My-history + admin Overall-stats with BG Stats import/export, and the
in-app GameBrain rules frame are all shipped and live. See
`docs/complete/20260731_AUTH_STATS_HISTORY_RULES_COMPLETED.md`.

Done: the full **guided Era loop** (Landing → Start/Difficulty/Setup → Phases 1–6 →
End Game) with per-phase splash shells, verbatim rulebook boxes, the Paradox/Warp
dice flows, First-Player handling, game-end in Clean Up, and difficulty flags. See
`docs/complete/20260728_CHRONOBOT_FULL_PHASES_COMPLETED.md`.

Earlier: AI_DIE_FACES `[2,3,3,4,4,5]`; Command-token paths + Take Bot Action; Warp +
Paradox board trackers; Undo/History/persistence; settings gear menu; Era/Phase
display; Exosuit rename; favicon; landing/home screen. See
`docs/complete/20260727_EXPLORER_ENHANCEMENTS_COMPLETED.md`.
