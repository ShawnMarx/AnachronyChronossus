# Adding a language

**Adding a language is one file.** Drop a `<code>.json` in this directory and it appears in
the app's ⚙ menu — there is no registry, import list or enum to edit. Nothing else in the
codebase has to change.

**Translating into Spanish?** `GLOSSARY-es.md` in this directory has the official
terminology transcribed from the Spanish base-game rulebook, and flags every solo-only term
that had to be inferred because no Spanish solo edition exists.

## The short version

1. Copy `en.json` to `<code>.json` (BCP-47: `de`, `fr`, `es`, `pl`, `hu`, …).
2. Edit its `$locale` header (see below).
3. Translate the values you want. **Delete the keys you haven't done** — or leave them in
   English, either works. Anything absent falls back to English *per key*, so a file with
   forty keys is a valid, useful file.
4. `npm test` — the suite checks the file is loadable and that no `{placeholder}` went
   missing. `npm run dev` and pick the language from ⚙ → 🌐.

## The `$locale` header

```json
{
  "$locale": {
    "code": "de",
    "name": "Deutsch",
    "credit": "Translated by …",
    "officialRulebook": false
  },
  "ui.common.continue": "Weiter"
}
```

| Field | |
|---|---|
| `code` | Must match the filename. |
| `name` | The language's name **in that language** — this is the picker's label. |
| `credit` | Optional, shown under the picker. |
| `officialRulebook` | See below. Leave it out unless you mean it. |

## Rulebook text vs. the app's own voice

Two different jobs live in this file, and they have different standards.

**`ui.*` keys are the app's own voice** — buttons, menu items, labels. Translate them
however reads best. Nothing depends on exact wording.

**`rule.*`, `action.*.rule`, `tile.*.rule`, `tile.*.detail` and `phase.*.rules` are
verbatim rulebook text.** The app shows these so they match the rulebook *in the player's
hands*. Anachrony and the Solo Opponents rules were published in several languages, so for
those the right source is **your own official edition**, transcribed — not a translation of
the English.

That distinction is what `officialRulebook` controls:

- **`false` / omitted** — the app keeps showing rule text in **English** and says so in a
  short notice inside each 📖 box. Your `ui.*` translations are used as normal. This is the
  right setting while you are still working, and the right permanent setting if you don't
  have the official edition to transcribe from.
- **`true`** — the app shows your rule text. Only set this once those keys really do come
  from the official rulebook.

A fan translation of rule text is worse than English here: it reads plausibly and matches
nothing the player can check.

## Seeing your translation in the app

You do not have to play the game to review your work. One command captures every screen
the app can show, in **English and your language side by side**, and writes an HTML page
you scroll through:

```bash
npm run dev                                    # in one terminal
LANG_CODE=de MODES=all SHOT_DIR=/tmp/review node pw-i18n-review.mjs
open /tmp/review/report.html
```

Each screen appears twice — a screenshot and the exact text the app rendered — so you can
check two different things at once: whether the wording reads right, and whether it still
**fits** (a longer string that overflows its button or wraps a dialog title under the ✕ is
the most common translation bug, and it is invisible in a spreadsheet).

- `MODES=all` walks every Chronossus module. Each module lays different modular tiles, and
  a tile's rule text only appears in a module that places it — so this is what covers the
  `tile.*` keys. Run it a second time with `SIDES=B` for the B-side tiles. Between them,
  all 28 tiles are reachable. It takes several minutes; `MODES=Base` is the quick pass.
- `LANG_CODE` is your file's code. Run it before you have translated much: untranslated
  keys show their English fallback, so the report doubles as a checklist.

### Before you start: the pseudolocale run

You do not need a translator — or any language — to find most of what a translation will
break. `--pseudo` writes a fake locale where every string is accented, padded ~40% longer
(a realistic German worst case) and wrapped in `⟦ ⟧`:

```bash
node pw-i18n-review.mjs --pseudo                       # writes src/i18n/locales/xx.json
LANG_CODE=xx MODES=all SHOT_DIR=/tmp/pseudo node pw-i18n-review.mjs
rm src/i18n/locales/xx.json
```

Then just look. Three bugs are obvious on sight, in any language:

- **A string still in plain English** — it is hard-coded in the JSX and no locale file can
  reach it. The run lists every one in `untranslated.md`, with the screen it was on.
- **Text clipped or overflowing** — the layout cannot take a longer language.
  `layout-faults.md` lists these; `PSEUDO_PAD=1.5` models a worse case.
- **A sentence split across two `⟦ ⟧` blocks** — it was concatenated in code, so its word
  order is frozen and no translator can fix it. Those need `<T>` and one key.

`FAULT_SELFTEST=1` forces every button to `nowrap` and must produce a flood of faults —
run it if a clean report ever looks too good, because a detector that silently does nothing
reports "none" exactly like a healthy app does.

### Knowing what the report did NOT show you

Some strings only appear deep in a game state a scripted walk cannot reach. The harness is
honest about this rather than letting you assume you saw everything:

```bash
node pw-i18n-review.mjs --markers              # writes a locale of ⟦key⟧ markers
COVERAGE=1 MODES=all LANG_CODE=zz SHOT_DIR=/tmp/cov node pw-i18n-review.mjs
cat /tmp/cov/coverage.md                       # keys seen, and every key not reached
rm src/i18n/locales/zz.json
```

`coverage.md` lists exactly which keys never appeared. Review those in the JSON directly —
you are reading them without context, so they deserve more care, not less.

## Keeping in step with the app

`en.json` is **generated** from the catalogs — don't hand-edit it. When the game gains a
tile or a module, regenerate it and diff to see what's new:

```bash
UPDATE_LOCALES=1 npm test
git diff src/i18n/locales/en.json
```

`npm test` also enforces, for every other locale file:

- valid JSON with a usable `$locale` header whose `code` matches the filename,
- no unknown keys (a key the app no longer shows is dead weight — it tells you the text
  moved),
- `{placeholder}` names identical to English, so a reworded string can't silently drop the
  value that was meant to go in it.

## What is *not* here

- **The bot's turn-by-turn instructions** ("Place the Chronossus's Exosuit on **Mine**").
  Those are assembled inside the pure rules engine and written into the saved History as
  finished sentences, so they need a further refactor before a key can reach them. They
  stay English for now.
- **Adventure card text.** Never shown to the player — it was transcribed only to derive
  each card's bot outcome, which is data, not prose.
