# Anachrony Solo Assistant

A companion web app for playing **[Anachrony](https://boardgamegeek.com/boardgame/231733/anachrony)**
solo against its automated opponents. It runs the *opponent's* turns — rolling its dice,
making its decisions, and telling you where to move its pieces — and explains each rule as
it applies it.

It does **not** simulate your side of the game. You play your own turns on the physical
board exactly as normal.

> **You need the physical game to use this.** It is a play aid, not an implementation.

## The two opponents

| | |
|---|---|
| **Chronobot** | The base-game automa. Four Command tokens and the AI die. The easiest place to start. |
| **Chronossus** | The advanced automa, with every official module and their combinations — Hypersync Future Actions, Fractures of Time, Guardians of the Council, Pioneers of New Earth, Doomsday, plus the Variable Anomalies, Quantum Loops and Alternate Timelines add-ons. |

The app tracks the opponent's Energy Pool, Exosuits, Warp tiles, modular Action tiles and
scoring; performs every random draw on its behalf; and shows the rulebook's own wording for
whatever it is doing at the time.

## Running it

```bash
npm install
npm run dev      # Vite dev server
npm run build    # type-check + production build into dist/
npm test         # vitest
npm run lint     # oxlint
```

React 19 + Vite + TypeScript, and **no backend** — `dist/` is a static site you can serve
from anywhere. Optional sign-in and saved play history talk to a separate service; without
them the app is fully functional and simply saves nothing beyond your own browser.

The rules engine under `src/engine/` is deliberately pure and UI-agnostic: no React, and no
randomness inside it — callers pass in rolled dice and player answers. That is what makes
the opponent's behaviour testable, and most of the test suite is aimed at it.

## Finding your way around

```
src/engine/      the pure rules engine — types, state, and one module per opponent
src/board/       board geometry: hotspots, marker paths, tile definitions
src/phases/      the guided phase screens shared by both opponents
src/*Game.tsx    the two play views (BoardExplorer = Chronobot, ChronossusGame = Chronossus)
docs/            PLAN.md (roadmap), BUILD-LOG.md (newest-first changelog), complete/ (archive)
pw-*.mjs         Playwright harnesses for the things unit tests can't see
```

`CLAUDE.md` is working guidance for AI coding agents rather than a document for
humans — it is checked in because that is where the project's conventions actually
live, and it stays accurate as the code changes.

## Translating it

The app is built to take a language as **one dropped-in file**, and the English side is
finished: every string a player sees resolves through a key, verified by a pseudolocale run
that replaces all 1,450 of them and then reports anything still in English. As of
2026-09-06 that report is **four strings** — two proper nouns, the signed-in user's own
name, and the language menu — across 897 screens, with no layout breakage at +40% text
length. So there is nothing to discover: `src/i18n/locales/en.json` is the complete list of
what needs translating.

To add a language, copy `en.json` to `<code>.json` in the same directory and translate the
values. It appears in the ⚙ menu on the next build — there is no registry, import list or
enum to edit.

**Two things to know before you start:**

- **Do not translate the verbatim rulebook boxes.** Those quote Mindclash's rulebook, which
  is not licensed by this repository (see below), and translating it would publish an
  unofficial translation of their text. Set `"officialRulebook": false` in your file's
  `$locale` header and the app keeps that text in English and explains why. Set it `true`
  **only** if you are transcribing from an official edition of the *Chronobot & Chronossus
  Solo Opponents* rulebook in your language.
- **A partial file is valid** — lookups fall back to English per key. But judge readiness by
  screens reached, not keys translated: the highest-frequency strings appear everywhere, so
  a file covering 12% of the keys showed some translated text on 92% of screens, which reads
  as broken rather than as in progress.

`src/i18n/locales/README.md` is the full guide, including how to see your own work on every
screen. `src/i18n/locales/drafts/` holds a partial Spanish file kept as a worked example of
the format — it is outside the loader on purpose and is not offered in the app —
with `GLOSSARY-es.md` beside it showing how published terminology was pinned to rulebook
pages, and marked ⚠ where a solo-only term had to be inferred.

## Credits and rights

**Anachrony** is designed by Dávid Turczi, Richard Amann and Viktor Peter, and published by
**[Mindclash Games](https://mindclashgames.com/)**.

**All artwork in this repository is © Mindclash Games**, as is the game itself, its rules,
and all rulebook text quoted in the app and its documentation. None of it is mine, none of
it is licensed to you by this repository, and it is included here only so that a play aid
for people who own the game can show them the right pieces and the right rules.

This is an **unofficial, fan-made** project with no affiliation to or endorsement from
Mindclash Games. If Mindclash would like anything here changed or removed, that request will
be honoured.

The **code** is separately licensed — see [LICENSE](LICENSE).
