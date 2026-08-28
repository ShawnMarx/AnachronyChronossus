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

- [ ] 5.1 `game/turnHistory.ts` — `summarizeTurn` returns `Text[]`; 12 push sites, plus the
      `BUILDING_LABEL` map, which becomes keys.
- [ ] 5.2 `game/chronossusHistory.ts` — `summarizeChronossusExtras`, 15 push sites, most of
      them counted (D4 plurals).
- [ ] 5.3 Update both test files to assert descriptors.

## Feature 6 — the views

- [ ] 6.1 `ChronossusGame.tsx` — `turnLabel`, `enteredLabel`, the `commitPhase` label
      literals and the inline `effects.push` sites.
- [ ] 6.2 `BoardExplorer.tsx` — the same set for the Chronobot.
- [ ] 6.3 Every dialog / panel that renders `instruction.text` or `.detail` resolves through
      `renderMsg`. Sweep for direct reads so none is missed.
- [x] 6.4 `HistoryPane` renders `Text` throughout; check the docked and overlay paths.
      _(done early in 1.6 — the widened type forced it.)_
- [ ] 6.5 **Sweep for silent string coercion** (added during Feature 1 — see the deviation
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
- [~] 7.3 Regenerate `en.json` — done for Feature 2 (**1,182** keys, up from 1,114; 58
      `instr.*`). Re-run after each remaining feature.
- [ ] 7.4 Extend `engine/playthrough.test.ts` per D7: collect every emitted `Msg`, assert
      the key exists and every `{placeholder}` is supplied.

## Feature 8 — verification

- [ ] 8.1 `npm test`, `npm run build`, `npm run lint` all clean.
- [ ] 8.2 `pw-i18n-review.mjs --pseudo` with `MODES=all` — History and the dialogs must now
      pseudolocalize; zero layout faults, and `untranslated.md` must not list an instruction.
- [ ] 8.3 `COVERAGE=1 LANG_CODE=zz --markers` — confirm the new families are reached, and
      record what is not.
- [ ] 8.4 Snapshot diff against a `vite preview` build of `staging` (build the baseline in a
      worktree, per `CLAUDE.md`): text and layout identical — this refactor changes no wording.
- [ ] 8.5 Play a real game in the browser: an in-progress save from before the change must
      still render its old English History (D3), and new turns must render keyed.

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
