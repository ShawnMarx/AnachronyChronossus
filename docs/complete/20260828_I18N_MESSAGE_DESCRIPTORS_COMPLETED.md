# Engine instructions → `{key, params}` message descriptors — COMPLETED

> Archived **2026-08-28**. Features 1–2 shipped 2026-08-25 (commits `81c2a75`, `be92d1a`);
> Features 3–8 the same session on 2026-08-28 (`f54a108` … `1d57b07`). All on `staging`.
>
> **What it changed:** the engine no longer returns prose. Every instruction and every
> History line is a `{key, params}` descriptor, rendered at read time. A saved game's
> History is therefore re-rendered on every read instead of frozen in the wording — and the
> language — that wrote it, which is why this was worth doing in an English-only build:
> rewording an instruction fixes **old saves** too.
>
> **Measured outcome.** The translatable surface went **1,114 → 1,450 keys** (234 `instr.*`,
> 89 `hist.*`). The all-modes pseudolocale run's `untranslated.md` went **40 lines → 19**,
> and every line it lost is one this work keyed. A snapshot diff against a production build
> of the pre-refactor commit: **36 screens, text and layout identical, worst pixel delta 0** —
> exactly one wording change was made deliberately, and it is named below.
>
> No `REVIEW_` file was produced — the effort was verified by unit tests and browser
> harnesses rather than a walkthrough (see Production Notes). Frozen record; do not edit.

---

# PLAN — Engine instructions → `{key, params}` message descriptors

> Created 2026-08-25. Follows the i18n layer (2026-08-23) and the app-voice chrome sweep
> (2026-08-24, archived in `docs/BUILD-LOG.md`). This closes the last player-facing surface
> a locale file cannot reach.

## Overview and goal

Every player-facing string in the app now resolves through a key — **except the ones the
engine writes**. `Instruction.text` / `.detail` are assembled from interpolated English
inside the pure bot functions, and the History pane's turn labels and per-turn effects are
assembled the same way in the summarizers and the two views. All of it is **persisted to
`localStorage` as finished sentences**, which is why translating it in place is not an
option: a saved sentence would freeze in whatever language was active when the turn
happened (the "Never translate a string that gets persisted" convention in `CLAUDE.md`).

**Goal:** the engine and the summarizers stop returning prose and start returning message
descriptors — `{ key, params }` — which the view resolves at render time through `t()`.

**This is worth doing whether or not anyone ever translates the app.** A persisted key is
re-rendered on every read, so rewording an instruction fixes **old saves** too; today a
typo is frozen into every game that already logged it. And the engine tests stop asserting
English prose and start asserting keys, which makes them robust to copy edits.

## Scope — decided 2026-08-25

**All three producers of persisted prose**, not just `Instruction`:

| Producer | Where | Sites |
|---|---|---|
| `Instruction.text` / `.detail` | `bots/chronossus.ts` (54), `bots/chronobot.ts` (35), `bots/doomsday.ts` (9), `bots/pioneers.ts` (8) | ~106 |
| `HistoryEntry.effects[]` | `game/turnHistory.ts` (12 pushes), `game/chronossusHistory.ts` (15 pushes) | ~27 |
| `HistoryEntry.effects[]` / `.label` built in the views | `ChronossusGame.tsx`, `BoardExplorer.tsx` (`turnLabel`, `enteredLabel`, `commitPhase` literals, inline `effects.push`) | ~30 |

Roughly **160 call sites**. Not in scope: the debug bar and calibrate mode (dev-only,
deliberately never swept), and the history service's difficulty column / BG Stats notes,
which are written for machines and other tools to read, not for the player.

## Key decisions

### D1 — Descriptor shape, with nested params
```ts
export interface Msg {
  key: string;
  params?: Record<string, string | number | Msg | Msg[]>;
}
/** A persisted or displayed message. A bare string is a LEGACY saved sentence. */
export type Text = string | Msg;
```
Params must accept **nested descriptors** because many sites interpolate other prose:
`describeCubes(mined)`, `chronossusActionLabel(id)`, `gains.join(' and ')`, the Blink's
space label. Those helpers return a `Msg` (or a `Msg[]` the parent joins) instead of a
sentence, and the resolver walks them depth-first.

### D2 — A mid-sentence branch becomes its own key, never a param
`Failed Action: ${why} — the Chronossus ${def.placesExosuit ? 'places an Exosuit and ' : ''}takes +${failVP} VP instead.`
becomes two keys (`…failed.placing` / `…failed.plain`). A conditional English fragment
passed as a param is unusable to a translator — word order moves between languages and the
fragment has no grammatical home. **Any site with a ternary inside the template string gets
split.**

### D3 — Back-compat by union type, no save-version bump
The persisted field becomes `Text`. A plain string renders as-is; a descriptor resolves
through `t()`. Games in progress on the live site survive the deploy with their existing
English History intact, and new turns arrive keyed. Bumping `PersistedGame.version` would
have discarded every in-progress game, which is not a trade worth making for tidier types.

### D4 — Plurals as separate `.one` / `.other` keys
No new machinery — it matches the existing flat `key -> string` catalog. `plural(key, n)`
returns `{ key: n === 1 ? key + '.one' : key + '.other', params: { n } }`. **Known limit:**
a language with more plural categories (Polish, Russian, Arabic) cannot express all of them.
If a translator ever hits it, the upgrade is `Intl.PluralRules` inside `t()` resolving
`key.<category>` — a contained change, since every counted key is already a `.one`/`.other`
family. Logged to `TODO.md` at cleanup.

### D5 — English defaults live in the engine, as data — *amended by D10*
The engine stays **pure and i18n-free**: it returns keys, and imports nothing from
`src/i18n/`. The English text moves to `src/engine/messages.ts` as a flat
`key -> English default` map (the same shape every other catalog in `surface.ts` has), which
`surface.ts` folds in as the `instr.*` and `hist.*` families. This keeps the established
rule that English lives with the rules and the locale file is an override layer.

### D8 — Per-bot keys, with the bot's name written into the sentence

Measured before deciding: of the 79 instruction strings the two bots emit, **only 9 are
identical once the bot's name is normalised away** (~11%). The rest genuinely differ — the
Chronobot's Reboot says "not a Failed Action" and the Chronossus's does not; Construct's VP
wording diverges; the Chronossus's Failed Action VP is a variable where the Chronobot's is
always +1. So a shared `{bot}` param would have saved nine strings out of seventy-nine and
would still have needed per-bot keys for everything else.

Each bot therefore gets its own namespace (`instr.chronobot.*`, `instr.chronossus.*`) and
the name is **written into the string, not passed as a param**. A proper noun dropped into
a slot cannot take a case ending or agree with an article; written in, it can.

### D9 — Keys are dotted and grouped by phase or Action

`instr.chronobot.construct.knownVp`, not `instr.chronobot.construct`. This matches the
conventions the surface already uses (`action.*.label`, `rule.*`, `piece.*`, `ui.*`), sorts
a translator's file into meaningful blocks, and tells a reader where a string appears
without opening the code.

**Not** derived mechanically from the existing `Instruction.id`. The ids are terse internal
shorthand — `rgr`, `tt`, `ra`, `evac` — and a key is a thing a translator reads.

**A split ternary (D2) becomes sibling keys** under the same group: `…failed.placing` /
`…failed.plain`.

### D10 — The defaults live in per-bot files, beside the rules they describe

Amends D5's single `src/engine/messages.ts`. Each bot and each summarizer carries its own
catalog — `bots/chronobot.messages.ts`, `bots/chronossus.messages.ts`,
`bots/doomsday.messages.ts`, `bots/pioneers.messages.ts`, `game/history.messages.ts` — and
`surface.ts` folds them all in. That is the pattern the surface already follows (it derives
from a dozen catalogs), and it means **a new module ships its own message file** exactly as
it ships its own tiles and rules, rather than editing a central file that every module
touches. `engine/messages.ts` remains for the genuinely shared keys (the list separators).

### D6 — Markup survives untouched
`**bold**` (every board location the player acts on) and `{flux}` icon tokens move **inside
the locale strings**. `HistoryText` keeps segmenting the resolved string, so both mechanisms
work unchanged and a translator can move a bold run where their grammar needs it.

### D7 — The playthrough test is the completeness check
`src/engine/playthrough.test.ts` already drives a full game. Extend it to collect every
`Msg` the run emits and assert (a) the key exists in `messages.ts`, and (b) every
`{placeholder}` in the English default is supplied a param. That catches the failure mode
this refactor invites — a key with no default, or a renamed param — which types alone cannot.

## Implementation order and rationale

1. **Infrastructure** — `Msg` / `Text` types, `renderMsg`, `plural`, `HistoryText` taking
   `Text`, `messages.ts` skeleton. Nothing else can start until the resolver exists.
2. **`chronobot.ts` (35 sites)** — the smaller, simpler bot goes first, as the shakedown for
   the key-naming scheme and the helper conversions before committing to 54 more.
3. **`chronossus.ts` (54 sites)** — the bulk, plus the prose helpers
   (`chronossusActionLabel`, `describeCubes`, `spaceLabel`, `tileInstruction`,
   `tileDescription`) which currently take an optional `translate`; they become `Msg`
   producers and that parameter goes away.
4. **`doomsday.ts` + `pioneers.ts` (17 sites)** — the module bots, same pattern.
5. **The summarizers** — `turnHistory.ts`, `chronossusHistory.ts`.
6. **The views** — `turnLabel`, `enteredLabel`, `commitPhase` label literals, inline
   `effects.push`, and every place a dialog renders `instruction.text` / `.detail`.
7. **Surface + locale** — publish `instr.*` / `hist.*`, regenerate `en.json`
   (`UPDATE_LOCALES=1 npm test`), update `surface.ts`'s "NOT in the surface" note which
   currently names this refactor as the reason instructions are excluded.
8. **Verification** — unit tests green, `pw-i18n-review.mjs --pseudo` with `MODES=all`
   (the History pane must now pseudolocalize), `COVERAGE=1` to confirm the new families are
   reachable, and `pw-i18n-snapshot.mjs` + `pw-i18n-diff.mjs` against a **`vite preview`
   build of `staging`** — text and layout must be identical, since this changes no wording.

## Open questions / deferred

- **Whether the same treatment should reach the history *service*** (server-backed My-history
  and `AdminStats`). Its difficulty column is written for the server, and the export formats
  are read by other tools — out of scope here, noted so it is a decision rather than an
  oversight.
- **Plural categories beyond one/other** — see D4.
- **A key-naming lint.** With ~160 keys added by hand, a stale key (renamed in the engine,
  left in `messages.ts`) is invisible. D7's playthrough check catches missing keys; the
  reverse — an *unused* default — needs a separate sweep. Decide at review whether it earns
  a test.

---

# LOG — Engine instructions → `{key, params}` message descriptors

Execution tracker for `PLAN_i18n_message_descriptors.md`. Steps in implementation order;
note deviations and decisions inline as they happen.

---

## Feature 1 — Infrastructure: the descriptor and its resolver

- [x] 1.1 Add `Msg` / `Text` to `src/engine/state.ts` (or a new `src/engine/message.ts`),
      and widen `Instruction.text` / `.detail` to `Text`.
- [x] 1.2 Add `src/i18n/msg.ts` — `renderMsg(t, value: Text): string`, resolving nested
      `Msg` / `Msg[]` params depth-first; a bare string passes through untouched (D3).
      Unit-test it, including a legacy string, a nested param and an unknown key.
- [x] 1.3 Add `plural(key, n)` (D4) next to it, unit-tested.
- [x] 1.4 Create `src/engine/messages.ts` — the flat `key -> English default` map, empty
      but exported, with the header comment explaining D5.
- [x] 1.5 `HistoryText` takes `Text` and resolves before segmenting, so `**bold**` and
      `{flux}` keep working from inside a locale string (D6). Extend its tests.
- [x] 1.6 Widen `HistoryEntry.label` / `.effects[]` to `Text` in `src/game/undo.ts`; leave
      `PersistedGame.version` alone (D3). Confirm `npm run build` is clean with the wider
      types before touching any call site.

## Feature 2 — `chronobot.ts` (35 sites) — the shakedown

- [x] 2.1 Convert the phase functions' instructions to descriptors, adding each English
      default to `messages.ts` under `instr.chronobot.*`.
- [x] 2.2 Convert the action-turn instructions.
- [x] 2.3 Split every mid-sentence ternary into distinct keys (D2); list them here.
- [x] 2.4 Update `chronobot`'s unit tests to assert keys and params, not prose.
- [x] 2.5 Review the key-naming scheme now, before it is repeated 120 more times.
      _(done FIRST, before writing any of Feature 2 — see D8/D9/D10 in the plan. Measured
      the overlap to decide it: only 9 of 79 strings are shared between the bots.)_

## Feature 3 — `chronossus.ts` (54 sites) + the prose helpers

- [x] 3.1 Convert the prose helpers to `Msg` producers and drop their optional `translate`
      parameter: `chronossusActionLabel`, `describeCubes`, `tileInstruction`,
      `tileDescription` (`board/tileText.ts`). Update their tests.
      _(`spaceLabel` is NOT one of them — see the deviation below.)_
- [x] 3.2 Convert the phase-function instructions.
- [x] 3.3 Convert the action-resolution instructions (the bulk).
- [x] 3.4 Convert the tile / Blink / Autoleap instructions.
- [x] 3.5 Update `chronossus`'s unit tests to assert keys.

## Feature 4 — the module bots (17 sites)

- [x] 4.1 `doomsday.ts` (9 sites) + tests — note `doomsday.test.ts` asserts `text:` today.
- [x] 4.2 `pioneers.ts` (8 sites) + tests.

## Feature 5 — the summarizers

- [x] 5.1 `game/turnHistory.ts` — `summarizeTurn` returns `Msg[]`; 12 push sites, plus the
      `BUILDING_LABEL` map, which is deleted in favour of `piece.*`.
- [x] 5.2 `game/chronossusHistory.ts` — `summarizeChronossusExtras`, 15 push sites, most of
      them counted (D4 plurals).
- [x] 5.3 Update both test files to assert descriptors.

## Feature 6 — the views

- [x] 6.1 `ChronossusGame.tsx` — `turnLabel`, `enteredLabel`, the `commitPhase` label
      literals and the inline `effects.push` sites.
- [x] 6.2 `BoardExplorer.tsx` — the same set for the Chronobot.
- [x] 6.3 Every dialog / panel that renders `instruction.text` or `.detail` resolves through
      `renderMsg`. Sweep for direct reads so none is missed.
- [x] 6.4 `HistoryPane` renders `Text` throughout; check the docked and overlay paths.
      _(done early in 1.6 — the widened type forced it.)_
- [x] 6.5 **Sweep for silent string coercion** (added during Feature 1 — see the deviation
      note below). `${instr.text}` and `instructions.map((i) => i.text).join(' ')` do NOT
      raise a type error; they coerce a descriptor to `[object Object]`. Known sites:
      `BoardExplorer.tsx` 1151, 1162, 1402 (`setPassMsg`) and 2589 (`rollLine`). Grep for
      template-literal and `join` reads of `.text` / `.label` / `effects` before calling
      Feature 6 done.

## Feature 7 — surface, locale and the completeness check

- [x] 7.1 Fold `messages.ts` into `src/i18n/surface.ts` as `instr.*` / `hist.*`.
      _(done early in Feature 2 — the English-rendering test needed it.)_
- [x] 7.2 Rewrite the "NOT in the surface" note in `surface.ts` — it currently names this
      refactor as the reason instructions are excluded.
- [x] 7.3 Regenerate `en.json` — re-run after every feature; now **1,450** keys (up from
      1,114 before the refactor): 234 `instr.*`, 89 `hist.*`, plus the shared `msg.*` /
      `board.*`.
- [x] 7.4 D7's completeness check — as its own file, `engine/messageKeys.test.ts`, rather
      than inside `playthrough.test.ts`: that test drives the CHRONOBOT and asserts game
      state, and bolting a message walk onto it would have made one test answer two
      questions. Written during Feature 3 and extended in Feature 4.

## Feature 8 — verification

- [x] 8.1 `npm test`, `npm run build`, `npm run lint` all clean.
- [x] 8.2 `pw-i18n-review.mjs --pseudo` with `MODES=all` — **897 captures, zero layout
      faults, 19 untranslated lines** (was 40), and not one of them an instruction or a
      History line. See the deviation note below: the pseudolocale must be present at BUILD
      time or the whole run is a false negative.
- [x] 8.3 `COVERAGE=1 LANG_CODE=zz --markers` — run, and **what it does not reach is
      reported rather than glossed**: see the note below and the extended `TODO.md` item.
- [x] 8.4 Snapshot diff against a `vite preview` build of the pre-refactor commit (built in
      a worktree, per `CLAUDE.md`): **36 screens, text and layout identical, worst pixel
      delta 0** — no regressions.
- [x] 8.5 D3's back-compat guarantee is now **automated** in `pw-descriptors.mjs` rather
      than played by hand: it rewrites the last saved entry as a finished English sentence,
      reloads, and asserts it still renders. Green on both bots.

---

## Deviations and decisions during execution

### Feature 2 — chronobot.ts, 2026-08-25

**The key scheme was settled BEFORE writing any of it** (step 2.5, done first), grounded in
a measurement: only 9 of the 79 strings the two bots emit are identical once the bot's name
is normalised away. See D8/D9/D10.

**Two English strings improved on the way through, both the same bug.** Construct named the
building by slicing the Action label — `def.label.replace('Construct — ', '')` — which only
works in English; it now nests the published `piece.<type>` key. The rolled-turn header
interpolated `def.label` itself, which would have put an English Action name in the middle
of a translated sentence; it nests `action.<id>.label`. Both render byte-identical English.

**A hard-coded English fallback surfaced in `ChronossusGame.tsx`** — "the Timeline tile where
it has the most (oldest if tied)", used when per-Era tracking cannot name the tile. The
pseudolocale sweep never caught it because it only renders for a pre-tracking save. It is now
`board.timelineTile.mostOldest`, shared with both bots.

**`renderMsg` moved to `src/engine/message.ts`** (it was in `src/i18n/msg.ts` after Feature
1). It depends on nothing but a lookup function, and the ENGINE needs it: `warpTileLabel` is
shared, so converting it broke four not-yet-converted `chronossus.ts` sites that interpolate
it into a template string — the coercion hazard, caught by a failing test rather than by
`tsc`. They now call `englishText()`, which is honest about what they are and goes away with
them in Feature 3. `src/i18n/msg.ts` is now the view-facing binding and adds `renderEnglish`,
which renders against the WHOLE surface — the engine's own `englishText` cannot see
surface-owned keys like `piece.factory`, and cannot import them without a cycle.

**`MsgList` was added** — a list param with catalog-key separators, because mined cubes join
with `" + "` and step 8.4 requires displayed text to stay byte-identical.

**Steps 7.1–7.2 were pulled forward** out of necessity: the English-rendering test could not
pass until `ENGINE_MESSAGES` was in the surface.

**Verification.** 58 keys. Every default was checked against the pre-change source
automatically: 52 matched a literal verbatim, and the remaining 6 — the ones built at runtime
by splicing a clause or pasting a shared tail, i.e. exactly the D2 splits — are pinned by
hand in the new `chronobot.messages.test.ts`. `npm test` 568 passing, `tsc`/build/lint clean.
`pw-chronobot-parity.mjs` passes with no page errors.

**New harness `pw-descriptors.mjs`**, which catches the two failures neither `tsc` nor the
unit suite can: a coerced descriptor rendering `[object Object]`, and an unresolved key
rendering as if it were a sentence. It scans RENDERED text only (the save legitimately
contains keys) and asserts the converse — that instructions really are persisted as
descriptors. **Its coverage stops at the Action Rounds board**: it does not yet drive the
guided Action dialogs, which need the Debug-on hotspot-tapping route `pw-i18n-review.mjs`
uses. Stated in the file's header so nobody reads a pass as more than it is.

**Fixed a live bug this created:** `setPassMsg` (×3) and `rollLine` in `BoardExplorer.tsx`
read `instruction.text` through `.join(' ')` and a template literal. The moment the Chronobot
emitted descriptors those rendered `[object Object]` — step 6.5's sweep, needed within the
same commit rather than at Feature 6.

### Feature 1 — 2026-08-25

**`plural()` lives in `src/engine/message.ts`, not `src/i18n/msg.ts`** (plan step 1.3 put it
with the resolver). It only BUILDS a key — `.one` / `.other` plus the count — and the engine
is what emits descriptors, so it has to be reachable without importing i18n. `renderMsg`
stays on the i18n side, which keeps the engine free of any translation dependency.

**Widening the type does NOT find every broken read — the important discovery.** After
`Instruction.text` became `Text`, `tsc` reported only 5 errors. It should have been more:
`${ins.text}` in a template literal and `instructions.map((i) => i.text).join(' ')` are both
legal on `string | Msg` and would silently render `[object Object]`. TypeScript cannot help
here, so Feature 6 gains **step 6.5**, an explicit grep sweep for coercion sites. Four are
already known and listed there.

**New module `src/game/historyLabels.ts`** — not in the plan. Two places decided what a
History entry MEANT by parsing its English prose: `isSupersededPhaseEntry` ran
`/^(Era \d+) · → (.+)$/` over the label, and the Chronossus's "turns this Era" count
filtered on `/You passed|Power Up|Warp|Paradox|· → /`. Neither survives a translated label,
and both were already fragile — a reworded label silently changed a **count the player
sees**. They now read the label's KEY, with the prose paths kept as a legacy fallback (D3).
The turn count also flipped from a **blocklist to an allowlist**: the old filter counted
anything it forgot to exclude, which is how the phase-entry rows came to be counted as turns
in the first place. `HistoryPane.test.ts` moved to `game/historyLabels.test.ts` with the
function, and gained descriptor coverage (13 tests).

This establishes a contract Feature 6 must honour: **every phase-result label carries `era`
and `phase` params**, because the superseded-row rule pairs it with the `enteredPhase` row
before it. The keys are in `HISTORY_LABEL`.

**List params join through the catalog** (`msg.list.sep`, `msg.list.last`), so a language
that writes lists differently — no comma, another conjunction, a trailing particle — can say
so. Needed because several instructions interpolate a list (`gains.join(' and ')`,
`describeCubes`).

**Interim in `bots/chronossus.test.ts`:** four assertions read `i.text.includes(...)`. A
local `textOf()` helper narrows them so the tree stays green; Feature 3 replaces them with
key assertions and deletes the helper.

**Verification:** `npx tsc --noEmit` clean, `npm test` 559 passing (was 538 — +21 new),
`npm run build` clean, `npm run lint` 0 errors (the fast-refresh warnings are pre-existing).

### Feature 3 — 2026-08-28

`chronossus.ts` is fully converted: every `text` / `detail` it emits is a descriptor, and
its English lives in the new `bots/chronossus.messages.ts` (D10), folded into
`ENGINE_MESSAGES` beside the Chronobot's. **133 keys**, `en.json` regenerated. The engine
file no longer imports `englishText` at all — nothing in it renders text any more.

**`spaceLabel` is not in this feature.** The plan listed it with the prose helpers, but the
only `spaceLabel` in the tree is a **view** function in `BoardExplorer.tsx` (the Chronobot's
Blink panel); `Chronossus.BLINK_SPACE_LABEL` is a plain map the view reads through
`blinkSpace.*`. It belongs to Feature 6, and step 3.1 is complete without it.

**New: `sentences(...)` in `message.ts`.** Several `detail` lines are assembled from a fixed
opening plus whichever optional notes apply — the Power Up draw, the Warp phase's Era Zero
and Alternate Timelines notes, the Quantum Loops roll. Concatenating translated fragments is
exactly what D2 forbids, so each sentence stays its own key and `sentences()` joins them
through `msg.sentenceSep` (a key, since a language may not separate sentences with a space).
Falsy entries drop out, so a condition can be passed inline.

**Two normalisations, both following Feature 2's precedent.** Worker and shape names now come
from `piece.*` / `piece.shape.*` rather than the raw enum value, so "Recruit a genius" reads
"Recruit a **Genius**" — the Chronobot's conversion made the same change, and a translator
cannot be handed a bare enum. And `applyWorkerSetBonus` now returns a **sentence-cased** key
instead of a lower-case phrase the caller ran `capitalize()` over: a caller can no longer
reach inside a translated string to change its first letter, and a language may not
capitalise that word at all. `capitalize` is deleted.

**Mid-sentence ternaries split (D2), eleven of them:** the Failed Action's "places an Exosuit
and", the Exosuit/Guardian placement lines (a different miniature comes off the table, so
`.exosuit` / `.guardian` throughout — placements, the Experiment hex, the World Council, the
Hypersync send), Remove Anomaly's plain vs Variable-Anomalies removal, Time Travel's two
failure reasons, the Warp phase's "this Era" vs "in the Era Zero Warp Phase", Power Up's
"before/after the Impact" (which becomes `sum.before` / `sum.after`, each a `.one`/`.other`
pair), the tile line's appended Autoleap clause (`tile.line` / `tile.lineAutoleap` /
`tile.nothing` / `tile.nothingAutoleap`, and the same in `tileText.ts`), and Quantum Loops'
"a roll of 4" vs "4 or 5".

**Tile gains join with " and ", as they always have** — `joinGains` passes `msg.list.last`
as BOTH separators rather than taking the default "a, b and c". Preserving the rendered
English was the point: this refactor changes no wording.

**Pulled forward from Feature 8: `src/engine/messageKeys.test.ts`** (D7's completeness
check). It drives the Chronossus through a full Era — every phase, eleven Actions, both tile
sides — collects every `Msg` including nested params, and asserts each key has a catalog
entry and each `{placeholder}` in the English default is supplied. Written now rather than at
F8 because it is what validates 133 hand-written keys; **self-tested both ways** (a renamed
key and an unsupplied param each fail it) before being believed. Feature 8 extends it to the
other bots rather than writing its own.

**View call sites touched only as far as compiling required** (the sweep is Feature 6), and
the display/persisted split was decided per site: `renderMsg(t, …)` for the SCV rows, the
tile tooltip, the Valley space name and the tile's expanded line; `renderEnglish(…)` for the
two persisted paths — `finishTurn`'s turn label and `passEffects`' History lines — so a saved
string still holds English exactly as before.

**Step 6.5 caught its first one already.** `doomsday.test.ts` had
`instructions.map((i) => i.text).join('\n')`, which rendered `[object Object]` and typechecked
clean — the failure mode that grep sweep exists for.

**Verification:** `npx tsc --noEmit` clean, `npm test` **570 passing** (was 559 — +11:
2 new message-key tests, 9 from the converted assertions), `npm run build` clean, `npm run
lint` 0 errors. Every literal and templated key in the engine checked against `en.json`.

### Feature 4 — 2026-08-28

Both module bots converted, each with its own catalog beside its rules (D10):
`bots/doomsday.messages.ts` (20 keys) and `bots/pioneers.messages.ts` (25).

**Doomsday's track line was one string with two ternaries** — which way the marker moves,
and whether the spot prints VP — so it becomes four whole sentences
(`track.up.vp` / `.up.noVp` / `.down.vp` / `.down.noVp`). The tracker's name now comes from
the existing `ui.track.saveEarth` / `ui.track.sealFate` rather than a literal, so it is
translated once for the board and the instruction alike.

**Pioneers: `AdventureResult.gains` / `.actions` / `.followUps` are `Msg[]` now.** They are
not just instruction fragments — the Adventure result panel renders the same three lists —
so leaving them as prose would have been a translated instruction next to an untranslated
summary of itself. `adventureDid()` is **exported** and builds the "gains 2 VP, 1 Gold,
removes 1 Anomaly" line for both the engine's instruction and the panel, so the two cannot
drift; `msg.join` joins clause lists the way `msg.sentences` joins sentences.

**An Adventure card's own text stays a plain string.** The card catalog (`data/adventureCards.ts`)
is untranslated data — the name, the conversion note — so it fills a param rather than
becoming a key. Publishing it would ask a translator to translate a card catalog we do not
own the wording of.

**The worker/building normalisation continues** (Feature 3's note): a card's Worker gain
reads "1 Scientist" and its free Construct "1 Power Plant", from `piece.*`, where the raw
enum previously printed "1 scientist" / "1 powerplant". A bare enum value cannot be handed
to a translator, and the capitalised forms are the ones the rest of the UI already uses.

**Step 6.5 caught a second coercion**: `doomsday.test.ts`'s own `run()` helper built its
assertion text with `instr.map((i) => i.text).join('\n')`. Both module test files now render
through `renderEnglish` — deliberately, because what those tests assert IS the English
wording, and rendering keeps them able to catch a wording regression.

**`messageKeys.test.ts` extended to both modules** — the Experiment's five branches (both
steps, locked, the Failed Action, Earth saved, fate sealed) and the Adventure's three (a card
taken, neither met, the no-slot penalty into the VP-token upgrade). It also **counts what it
checked** and asserts a floor now: a walk that silently visited nothing would otherwise pass
while proving nothing.

**Verification:** `npx tsc --noEmit` clean, `npm test` **572 passing**, `npm run build`
clean, `npm run lint` 0 errors.

### Feature 5 — 2026-08-28

Both summarizers return `Msg[]` now, with their English in `game/history.messages.ts`
(42 keys). This is the part of the refactor that pays off most directly: these lines are
written into `localStorage` with every turn, so until now a game's History was frozen prose.

**`BUILDING_LABEL` is gone.** It was a private four-entry map duplicating names the board
trackers already publish as `piece.factory` / `piece.lab` / `piece.powerplant` /
`piece.support`; the History line now nests those, so the word is translated once.

**Two rules that matched on English are now matching on keys** — the same class of bug
`historyLabels.ts` fixed in Feature 1, still live here:

* The Operator line replaces the shared summarizer's plain "Recruited …" row, found with
  `e.startsWith('Recruited ')`.
* The Power Upgrade line replaces "Discarded uranium" — a Resource **spent onto the board**,
  not discarded — found with `e === \`Discarded ${upgraded}\``.

Both now match on the key (and, for the second, on the nested `ui.pieceInline.*` param), so
rewording an English default can no longer make a line silently print twice.

**A third one was in the view:** `withBlink` filtered `e !== 'Exosuit placed'` to stop a
Blink turn also claiming a placement. Same treatment.

**Feature 6 spill-over, taken here deliberately.** The three inline `effects.push` lines the
views add around the summarizers — the final-Time-Travel pass note, the Blink line and the
Energy Cores gained — had to become descriptors for the arrays to typecheck at all, so they
join `history.messages.ts` rather than being stranded as the last prose in a keyed list.
`{flux}` and the `**bold**` runs move inside the strings, where a translator can place them
(D6). `UndoableGame.commit` and `BoardExplorer`'s `Snapshot.effects` widen to `Text[]`.

**A trap worth naming: `Text` collides with the DOM's global `Text`.** Widening
`useUndoableGame`'s `effects?: string[]` to `Text[]` without the import typechecked
**clean** — against `lib.dom`'s `Text` node — and then failed on `string` not being
assignable to it. `tsc` reports it as a type error somewhere else entirely. Import
`type { Text }` explicitly in every file that names it.

**One deliberate wording change**, the only one in this refactor: "Spent a engineer to
acquire it" became **"Spent 1 {worker} to acquire it"**. Worker names now come from
`piece.*` and are capitalised, which turned an already-wrong article into a visibly wrong
one ("a Engineer"); an English indefinite article cannot be chosen without knowing the word
that follows, and every language has its own version of that problem. The count sidesteps
it. Noted here because Feature 8 diffs rendered text and will flag this line.

**The test files render rather than assert keys**, unlike the engine's. What these tests are
about IS the sentence the player reads — that a Mine logs "Gained titanium" and not a
discard — so both wrap the summarizer in `renderEnglish`. Where a *rule* depends on a line's
identity, the key is what decides it, and the code above matches on that.

**Verification:** `npx tsc --noEmit` clean, `npm test` **572 passing**, `npm run build`
clean, `npm run lint` 0 errors.

### Feature 6 — 2026-08-28

Both views converted. Every History label is a descriptor now, so nothing a game persists
is a finished English sentence any more.

**The label keys are a contract, not just text.** `historyLabels.ts` decides what an entry
MEANS from its key, so `enteredLabel` carries the **phase ID** (`warp`), not its name —
`isSupersededPhaseEntry` pairs the arrow row with the result row by comparing that param,
and a translated word would break the pairing in every language but English. The phase's
NAME rides alongside as a nested `phase.<id>.name` / `phase.chronossus.<id>.name`.
`HISTORY_LABEL` gains `botTurnVp`, `chronossusPassed` and `botTimeTravelPass`, and
`isBotTurnEntry` allowlists both bot-turn keys — the VP suffix is a separate key (D2), and
missing it would have silently changed the "turns this Era" count.

**Two more English-parsing rules found and fixed** (five in all across the refactor): the
turn overview's `!e.label.includes('You passed')` filter in `BoardExplorer`, and
`HistoryPane`'s React key, `` `${rows.length - i}-${e.label}` `` — which would have rendered
every row's key as `[object Object]`. Both keep a legacy-prose fallback.

**A local `plural` shadow.** `drawAndPowerUp` had `const plural = (n) => (n === 1 ? '' : 's')`
one scope inside the imported `plural()`; converting the label made the call resolve to the
local one. The Power Up effect lines became proper `.one`/`.other` keys and the shadow is
gone. Worth watching for wherever a view is converted.

**Verified in a real browser, both bots.** `pw-descriptors.mjs` gains a **`BOT=chronossus`**
mode — each view has its own save key and its own undo stack, so a descriptor coerced in one
says nothing about the other. Both runs report no `[object Object]` and no raw keys on
screen, and the persisted stack is descriptors throughout:

    {"label":{"key":"hist.label.phaseResult","params":{"era":1,"phase":"powerup",
      "text":{"key":"hist.phase.powerUp.other","params":{"n":4}}}},
     "effects":[{"key":"hist.powerUp.drew","params":{"energized":1,"exhausted":2}}, …]}

That run is also what caught the four view effect literals the type checker could not: the
Warp phase's placed/none lines, Alternate Timelines, Quantum Loops, the Variable Anomaly VP
and the First-Player note. **A screen-reading harness sees what `tsc` cannot** — the same
lesson `pw-i18n-review.mjs` taught about keyed `title` attributes.

**`pw-quantum.mjs` was matching on English** (`/Quantum Loops/i` over the persisted effects)
and failed — correctly, in the sense that the prose it looked for is gone. It now matches the
descriptor's key, and reads `entries` as well as `undoStack`, since the Chronossus's stack
lives in the shared undo hook. `pw-chronobot-parity.mjs`, `pw-shapedie.mjs` and
`pw-nostorage.mjs` all pass untouched.

**Verification:** `npx tsc --noEmit` clean, `npm test` **572 passing**, `npm run build`
clean, `npm run lint` 0 errors; `pw-descriptors` (both bots), `pw-chronobot-parity`,
`pw-quantum`, `pw-shapedie` and `pw-nostorage` all green.

### Feature 8 — verification, 2026-08-28

**A trap that made the first pseudolocale run a false negative: `import.meta.glob` resolves
at BUILD time.** `--pseudo` writes `src/i18n/locales/xx.json`, but the `vite preview` build
being served was made before that file existed, so the app had no such locale, the ⚙ menu
could not switch to it, and every screen captured in English. The harness dutifully reported
**675 untranslated lines** — a number that looks like a catastrophic regression and is
actually "the locale was never loaded". **Rebuild after writing the pseudolocale (or the
marker locale), then serve that build.** This is the same class of mistake as capturing a
baseline with `vite dev`, and it now sits next to it in `CLAUDE.md`.

**The corrected run is the measurement this refactor was for.** 897 captures, **zero layout
faults**, and `untranslated.md` down from **40 lines to 19**. Every line it lost is one this
refactor keyed:

    Era 1 · → Power Up            Era 1 · Power Up: 3 Exosuits
    Era 1 · Warp: placed 1        Placed 1 Warp tile on the Timeline
    Failed action (+1 VP)         Drew 0 Energy + 3 Exhausted
    Era 1 · Remove Anomaly · +1 VP    Era 1 · Score · +2 VP    …

The 19 that remain are all legitimate: the two bots' proper nouns, the dev-only Debug bar
(deliberately never swept), the signed-in user's name, the language names in the ⚙ menu, and
four lines that are a translated string's tail split off by a bold run (the trailing `⟧`
gives them away).

**8.4 — the no-wording-change proof.** `pw-i18n-snapshot.mjs` against a `vite preview` build
of the pre-refactor commit (`c783bd3`, built in a worktree): **36 screens, text and layout
identical, worst pixel delta 0**. The one deliberate wording change (Feature 5's "Spent 1
{worker}") is a History line and does not appear on those screens.

**8.3 — the coverage run, reported honestly.** `COVERAGE=1 LANG_CODE=zz MODES=all`:
**742 captures, zero layout faults, 300 of 1,450 keys (21%) displayed** — `instr.*` 4/234,
`hist.*` 19/89. That is NOT evidence the new families are unreachable; the **pseudolocale**
run (897 captures) is what exercised them, and its `untranslated.md` proves it — every
History line it used to list in English is gone from the list.

Two separate reasons for the gap, and they belong in `TODO.md` rather than being smoothed
over:

* The marker locale replaces every string with `⟦key⟧`, so the harness has **less text to
  navigate by** and reaches 742 screens where the pseudolocale run reaches 897. It is a
  weaker sweep by construction.
* Most `instr.*` / `hist.*` keys only render **after a rolled turn or a committed one** —
  Clean Up's lines, Construct's two VP branches, an Adventure's card line, Alternate
  Timelines. A screen sweep that never plays a turn cannot show them.

The existing TODO item ("raise review coverage past ~47%") is updated with the new
denominator: the surface grew 1,114 -> 1,450, and the families that grew it are exactly the
ones a screen sweep is worst at reaching.

**Housekeeping:** `xx.json` was swept into a commit by `git add -A` (it is a build input for
one run, never a source file). Both generated locales are now in `.gitignore`.

---

# Production Notes

**The failure modes this refactor invites, and what catches each.**

| Failure | Why types miss it | What catches it |
|---|---|---|
| A descriptor coerced to `[object Object]` | `${instr.text}` and `.map(i => i.text).join()` are legal on `string \| Msg` | `pw-descriptors.mjs` (both bots) + the grep sweep of step 6.5 |
| A key with no catalog entry | it renders as the key, which looks like a sentence | `src/engine/messageKeys.test.ts`, and `pw-descriptors.mjs` scans rendered text |
| A renamed param | `{n}` is simply left on screen | `messageKeys.test.ts` checks every `{placeholder}` is supplied |
| A rule that reads a label's English | nothing type-checks prose | five of them found; all now match on the KEY (`game/historyLabels.ts`) |
| A legacy saved sentence stops rendering | it is a valid `Text` | `pw-descriptors.mjs` injects one, reloads and asserts it renders |

**Five rules used to decide meaning by parsing English.** The superseded-arrow-row rule and
the Chronossus's "turns this Era" count (Feature 1), the Operator line's "Recruited …"
replacement and the Power Upgrade line's "Discarded uranium" replacement (Feature 5), and the
turn overview's "You passed" filter plus `HistoryPane`'s React key (Feature 6). Every one of
them silently changed something the player sees — a count, or a duplicated line. They now
read the key, with the prose path kept as a **legacy fallback** for saves written before this.

**`PersistedGame.version` was NOT bumped** (D3). A game in progress when this deploys keeps
its finished-English History and carries on; new turns arrive keyed. Bumping would have
discarded every in-progress game for tidier types.

**One deliberate wording change.** `Spent a engineer to acquire it` → **`Spent 1 {worker} to
acquire it`**. Worker names now come from `piece.*` and are capitalised, which turned an
already-wrong article into a visibly wrong one; an English indefinite article cannot be
chosen without knowing the word after it. The same normalisation makes a card's Worker gain
read "1 Scientist" and a free Construct "1 Power Plant" rather than the raw enum value.

**Two traps worth remembering, both now in `CLAUDE.md`:**

* **`Text` collides with the DOM's global `Text`.** Widening a field to `Text` without the
  import type-checks *clean* — against `lib.dom`'s Text node — and then fails somewhere else
  entirely. Import `type { Text }` explicitly.
* **A generated locale must exist before the build you serve.** `import.meta.glob` is
  build-time, so a `vite preview` build made before `--pseudo` writes `xx.json` has no such
  locale and captures everything in English — reported as 675 "untranslated" lines that
  really mean "the locale never loaded".

**What a new module must now ship.** Its own `bots/<module>.messages.ts` beside its rules
(D10), folded into `engine/messages.ts`. Never a sentence from the engine; a mid-sentence
branch is its own key (D2); a counted noun is a `.one`/`.other` pair (D4); a proper noun is
written into the string, not passed as `{bot}` (D8).

**Left open, in `TODO.md`:** the review sweep's coverage (300/1,450 keys under the marker
locale) — the marker run reaches 742 screens where the pseudolocale run reaches 897, and a
sweep that never plays a turn cannot show most `instr.*` / `hist.*` keys. That is a
coverage-reporting gap, not a translation gap: the pseudolocale run does exercise them.
Also still open: extending `es.json` past its 174 keys, now that `instr.*` exists to extend
into.
