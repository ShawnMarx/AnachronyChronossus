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
