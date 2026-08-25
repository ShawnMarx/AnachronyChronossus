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

- [ ] 2.1 Convert the phase functions' instructions to descriptors, adding each English
      default to `messages.ts` under `instr.chronobot.*`.
- [ ] 2.2 Convert the action-turn instructions.
- [ ] 2.3 Split every mid-sentence ternary into distinct keys (D2); list them here.
- [ ] 2.4 Update `chronobot`'s unit tests to assert keys and params, not prose.
- [ ] 2.5 Review the key-naming scheme now, before it is repeated 120 more times.

## Feature 3 — `chronossus.ts` (54 sites) + the prose helpers

- [ ] 3.1 Convert the prose helpers to `Msg` producers and drop their optional `translate`
      parameter: `chronossusActionLabel`, `describeCubes`, `spaceLabel`,
      `tileInstruction`, `tileDescription` (`board/tileText.ts`). Update their tests.
- [ ] 3.2 Convert the phase-function instructions.
- [ ] 3.3 Convert the action-resolution instructions (the bulk).
- [ ] 3.4 Convert the tile / Blink / Autoleap instructions.
- [ ] 3.5 Update `chronossus`'s unit tests to assert keys.

## Feature 4 — the module bots (17 sites)

- [ ] 4.1 `doomsday.ts` (9 sites) + tests — note `doomsday.test.ts` asserts `text:` today.
- [ ] 4.2 `pioneers.ts` (8 sites) + tests.

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

- [ ] 7.1 Fold `messages.ts` into `src/i18n/surface.ts` as `instr.*` / `hist.*`.
- [ ] 7.2 Rewrite the "NOT in the surface" note in `surface.ts` — it currently names this
      refactor as the reason instructions are excluded.
- [ ] 7.3 Regenerate `en.json` (`UPDATE_LOCALES=1 npm test`); record the new key count.
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
