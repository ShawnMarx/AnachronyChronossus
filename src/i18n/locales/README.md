# Adding a language

**Adding a language is one file.** Drop a `<code>.json` in this directory and it appears in
the app's ⚙ menu — there is no registry, import list or enum to edit. Nothing else in the
codebase has to change.

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
