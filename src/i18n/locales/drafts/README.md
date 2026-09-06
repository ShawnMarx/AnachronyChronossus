# Draft locales — present in the repo, absent from the app

A `<code>.json` in the **parent** directory is a published language: `import.meta.glob`
treats its presence as its registration, so it appears in the ⚙ menu the moment it exists.
This subdirectory is outside that glob (`./locales/*.json` does not recurse), so a file here
ships in the source tree and reaches no player.

A file here is an **example to read, not a translation in progress**. Anyone adapting a
language works locally against their own file in the parent directory and produces their
own; see `../README.md`.

## Why `es.json` is here (2026-09-05)

It covers **174 of the surface's 1,450 keys (12%)**, and its own header says so
(`"credit": "…resto sin revisar"`). Lookups fall back to English per key, so nothing
breaks — but a visitor who picks "Español" gets a mostly-English UI, which reads as broken
rather than as partial. Shawn's call at the production ship: hold it until it is worth
offering, rather than let the first Spanish speaker who finds it conclude the app is.

`GLOSSARY-es.md` sits beside it — the official-rulebook terminology with page citations
and ⚠ on every solo-only term that had to be inferred. That work stands on its own and is
what a future translator should start from.

## Promoting one back

`git mv drafts/<code>.json ../` and it is live again — no registry, no import list.

**Do that before trusting it.** The suite validates every locale in the parent directory
(header shape, no unknown keys, `{placeholder}` parity with English) and cannot see this
directory at all, so a file sitting here is unvalidated and drifts silently as the surface
grows. Re-run `npm test` immediately after promoting, not after translating further.
