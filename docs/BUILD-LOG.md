# Build Log

Running log of implementation progress. Newest first.

## 2026-08-23 — A translation layer, where adding a language is one file

**Someone offered to translate the app, so the plumbing went in — not the translations.**
The requirement set the whole design: *a language must be addable by dropping in one file*,
with no registry to edit, no import list, no enum. `src/i18n/catalog.ts` gets there with
Vite's `import.meta.glob` — the file's presence IS its registration — and the file names
itself through its own `$locale` header, so the ⚙ picker builds from what is on disk.

**It is an override layer, not a relocation.** The English text stays exactly where the rules
live: the tile catalog, the Action catalog, the phase metadata. `surface.ts` derives a flat
`key -> English default` map from those catalogs (so a new tile joins the translatable
surface without anyone remembering to), and a locale file supplies replacements by key.
Every lookup falls back to English **per key**, which is what makes a forty-key file valid
and useful — a translator can land one module at a time. `en.json` is generated from the
surface (`UPDATE_LOCALES=1 npm test`) as the starting point; 215 keys, ~46 KB of text.

**The verbatim boxes are the interesting problem, and the answer is `officialRulebook`.**
Most of that 46 KB is transcribed verbatim from the Solo Opponents rulebook, and it is shown
precisely so it matches the book in the player's hands. A fan translation of it would read
plausibly and match nothing they can check. So a locale declares whether its rule text came
from the **official** edition: without that flag the app uses the locale's app-voice strings
but keeps rule text in English and **says so** inside each 📖 box. Anachrony was published in
several languages, so the real job there is transcription, not translation — and it is
optional, per language, per key.

**What stayed English, deliberately.** The bot's generated instructions ("Place the
Chronossus's Exosuit on **Mine**") are assembled inside the pure engine and written into the
saved History as finished sentences — translating them would freeze whatever language was
active when the turn happened. They need the `{key, params}` message-descriptor refactor
first (~150-200 call sites), which is worth doing on its own merits and is now the next
phase. Adventure card prose is out entirely: it is never rendered, having been transcribed
only to derive each card's bot outcome. Rule constants nothing renders were pulled back out
of the surface too — a published key costs a translator real effort.

**Proved by before/after, not by inspection.** `pw-i18n-snapshot.mjs` walks both bots through
setup, every phase screen, the board, an Action dialog and the ⚙ menu, expanding every 📖 box,
and records innerText + a screenshot at each of 36 steps. It pins `Math.random` to a fixed LCG
(the app rolls its own dice, so an unseeded run diverges and every diff is noise) and freezes
CSS transitions. Baseline and post-change captures are **byte-identical, text and pixels, on
all 36 screens**, with no console errors. `pw-i18n-dropin.mjs` then proves the mechanism does
something: it writes a synthetic `zz.json`, checks the picker appears, an app-voice string
changes, the untranslated default label is gone, rule text stays English with the interpolated
notice, the choice survives a reload — then deletes the file. `pw-nostorage.mjs` still passes
for both bots, so the new language preference did not break the degraded-storage guarantee.

## 2026-08-22 — The repo goes public, the history that never saved, and a playtest sweep

**Saved games have never worked in production, and it was not this app.** A save from a
logged-in player 401'd, and the app reported it as *"Your login session expired"* — a claim
about a service that was working perfectly, which is what pointed everyone at auth for three
weeks. The cause was a **trailing inline comment in a systemd `EnvironmentFile`** on the
droplet: `COOKIE_NAME=bge_session   # staging: …` gave the data service a 60-character cookie
name that could never match, so every authenticated request resolved to anonymous from Aug 1.
Fixed by the `boardgameedge` session; verified end to end here, both bots, both environments.
Staging had a second, separate cause — **no `gamedata-staging` service existed at all** — now
stood up. Our half of it: the app re-checks `/api/me` before blaming the login, and says
*"You're still logged in, but the history service rejected the save"* when the session is
demonstrably fine.

**The repo is public.** `docs/DEPLOYMENT.md` and the staging nginx vhost moved to the private
`droplet-ops` repo: the runbook stated that the droplet's `authorized_keys` is shared across
every BGE repo and named the other keys in it, which would have told any reader that
compromising one key reaches all five app families. History was rewritten (`git filter-repo`)
to remove those files and scrub the droplet IP, a personal email, the fleet key names and the
services' loopback ports from all 373 commits — after a verified mirror of the original went
to the NAS. A README and a LICENSE were added: MIT for the code, with an explicit carve-out
that Mindclash Games owns the artwork and rulebook text and that neither is licensed by this
repository.

**BG Stats export, rebuilt client-side.** The data service generated it, so it could neither
honour a selection nor know the mode — every play said `board: "Solo - Chronobot"`, so a
Doomsday game imported as a Chronobot game. It is now built in the app from a real `.bgsplay`
file's shape: the bot is the seat's **role** with `isNpc` rather than a player, modules are
separated by BG Stats' fullwidth solidus, the difficulty is the comment, and each play carries
a stable uuid so re-exporting updates rather than duplicates. The history screen has a
checkbox per game; ticking nothing still exports everything.

**Playtest fixes.** Mine ranked by *has it / does not have it*, so with one of everything it
fell through to the fixed priority and took a third Neutronium over a lone Titanium — it ranks
by **fewest held** now, which is what completing the +5 set actually needs. A double Paradox
drew one token instead of two. The Collapsing Capital prompt asked "are all flipped?" and put
"Game continues" on the affirmative button. The Doomsday track kept moving after the Impact
(Classic Expansion p.4 forbids it) because the lock read the *recorded* Impact Era rather than
the derived one. An Experiment no longer asks the card's VP — every Level 1 is 2 and every
Level 2 is 3 — and its Exosuit placement is its own prompt box rather than a line buried in
Step 2. Experiment VP is ordinary VP tokens, so it lost its separate score and overview lines.
Variable Anomalies' rule box moved to the foot of the phase and now names which Timeline tile
the retrieved Warp tile comes from.

## 2026-08-21 — Quantum Loops, and the wrap-up that takes the card to 100%

The last module in the Solo Opponents matrix, plus the four loose ends that stood between the
landing card's 90% and 100%. With this, **every module and add-on in the matrix is implemented**.

**Quantum Loops.** The smallest module by a distance, because the Chronossus barely touches it:
in each Warp Phase where it places at least one Warp tile, roll the AI die, and on a **4** the
Quantum Loop card farthest from the player's draw deck leaves play — permanently, since the bot
never *returns* a card. Two difficulty bullets (also remove on a **5**; **2 VP** per removal) and
a setup line about keeping the cards in a row so "farthest from the draw deck" means something.
It is an **add-on checkbox**, not a base mode, and it combines with everything including Doomsday.

The card row itself is **deliberately not modelled**. The player takes and returns cards and
Preparation refills the offer, so any model would drift silently within an Era — the same call
Doomsday's Experiment cards got. The upshot is a module with **no `ChronossusState` slice at
all**, a first: an instruction, a History line, and VP that already had a home.

**The die shows on a miss too.** A check that only ever appears when it fires is
indistinguishable from one that never ran, so a 3 reads "no card is removed" with the face
beside it. And it shares the Warp screen rather than chaining after it — which turned up a real
bug: **Alternate Timelines was still a chained prompt**, asking "how many landed on a positive
space?" only after the Continue button. Its question now replaces that button on the Warp screen
itself, so the placement, the Quantum Loops outcome and the answer commit as one entry.

**Chronobot parity.** Three behaviours the Chronossus had and the Chronobot never got. Its phase
rolls lived in component state where no snapshot could see them, so **Undo silently re-rolled** —
the playtest's bug #10, still live on that side. They are on the `Snapshot` now (and in the save,
so a reload mid-Warp doesn't re-roll either). Every **phase advance commits**, so it is undoable
and appears in History. And **History is reachable from a phase screen** at last — the pane was a
flex child of the Action Rounds board stage, so during Preparation / Paradox / Power Up / Warp
there was nowhere showing it, which is what made the Era Zero Warp look unlogged. `PhaseHistoryDock`
gives it somewhere to sit, on **both** bots — **opt-in**, unlike the board's docked-open pane:
it is an overlay there, and defaulting it open covered every phase screen with an empty
"No turns taken yet." panel from the moment a game began (caught in play, fixed the same day).

**The real dice on the real rolls.** The shape die now shows its own face: on **Research** beside
the Breakthrough art (the shape rolled and the Breakthrough kept are two statements), and on
Fractures' **Assimilate** alone, because that roll resolves to an Operator / Technology /
fewer-of and never to a Breakthrough. The Paradox die was already done. The AI die stays
CSS-drawn, as decided.

**Publishing.** The CI deploy key is **rotated** — new pair added to the Droplet before the old
was removed, each half proven by a real staging deploy, and the runbook now carries the
add-before-remove recipe. The BGE landing card turned out to have been registered all along and
renders on the live landing service; the app's own "Part of BoardGameEdge" link ships env-aware
and stays hidden in prod, because `boardgameedge.com` is still a GoDaddy "Launching Soon"
placeholder and linking a finished app to one is worse than not linking.

Landing card: **100%**, and the bar stops saying "Uploading…". 493 tests, build and lint clean.

## 2026-08-20 — Doomsday's Impact check on one screen, the overview off the board, and production

The Doomsday review walkthrough turned up its own UX rather than a rules bug, and a playtest
sweep of the phase screens caught three smaller things. All of it, plus the 22 commits waiting
on `staging`, went to **production**.

**Check for Impact is one screen now.** It used to be a branch: a first prompt asking "is either
tracker locked in?", then — only once that was answered — a second screen asking whether the
Impact occurred, with the Era-end button hidden behind both and nothing else on the Clean Up
screen visible while it ran. The three things the player might have to report are now **toggles**
on the ordinary Clean Up screen — "Save Earth" reached its topmost slot, "Seal Fate" reached its
bottommost slot, the Impact occurred — at most one on, tapping the on one turns it off, and
reporting nothing needs no option of its own. The Era-end button below carries the answer and
becomes **"Earth is saved — Finish & Score"** for the outcome that ends the game, committing the
check and the end of the Era as one History entry (`finishCleanUp`, replacing `answerImpactCheck`
+ `afterCleanUp`). The check is recorded even when nothing is reported, so `checkedEra` stays
truthful. The Collapsing-Capital branch can never collide with a pending answer: it only appears
once an Impact Era is recorded, which is exactly when the toggles stop.

**Rule boxes at the foot of every screen, not just the dialogs.** Four screens still put a
verbatim box above what the player has to act on: Clean Up's Doomsday box sat above its own
prompt; Variable Anomalies rendered its box *inside* the `.place-prompt` step box; both Setup
screens led with the rulebook's setup (and each module's block) ahead of "Setup for this app";
and both score screens carried "End Game scoring" mid-screen. The convention the Action dialogs
already followed now holds everywhere — the app's own instructions first, the rulebook text
under them. On the score screens the box sits above the sticky Close / New Game row, since
anything after it renders under that row.

**The Turn overview is no longer Phase-5-only.** Its counts, trackers, modes, difficulty and
recent bot turns are just as useful between phases, but it was reachable only from the Action
Rounds' Turn chip. Both bots' phase screens carry the same chip in their header now; the
Chronossus's overview moved out of the Phase 5 branch into a `turnOverview` const both returns
render. Off the Action Rounds its pass hint would answer a question the player has not reached,
so it reads "Outside the Action Rounds — the counts and recent turns below are this Era so far"
and the "Action Rounds Phase ends" line is suppressed.

**A half-line under the score box** turned out to be the Number / Tally toggle. The score screen
is a scrolling flex column, so on a short viewport it shrank its children: the toggle collapsed
to its own 2px border with the buttons clipped by its `overflow: hidden`. `.score-screen > * {
flex-shrink: 0 }` — the same trap waits for any bordered child of a scrolling flex column.

**A finished game no longer needs a login to survive.** With a score settled and nobody logged
in, both score screens now offer **"Log in & save"**: it queues the game on this device *first*
(the login is a full-page redirect, so anything only in React state is gone by the time it
returns) and `AppRoot` uploads the queue as soon as it knows who the player is. Until now the
logged-out case simply dropped the result.

Landing: the Chronossus card reads **90%** and lists Doomsday. `pw-doomsday.mjs`'s `CLEANUP=1`
and `CLEANUP=1 EARTH=1` runs were rewritten for the toggles and both pass; 478 tests, build and
lint clean. `staging` fast-forwarded onto `main` and the production deploy succeeded — every
module in the Solo Opponents matrix is now live, with only the **Quantum Loops** add-on left.

## 2026-08-19 — A playtest pass: the Time Travel rule the app got wrong, and a finished game that couldn't be saved

A completed Fractures + Pioneers game, read back line by line. Most of what it turned up was
History not saying what happened; one item was a rule the engine had never enforced.

**Time Travel may only take a Warp tile off a PAST Timeline tile** (Solo Opponents p.5), and
the Warp phase (4) runs before Action Rounds (5) — so the tiles the bot places this Era sit on
the *current* tile and are not eligible. The engine only ever had a total, so it removed one
anyway and told the player to take a tile the bot may not touch. `warpTilesByEra` (both bot
states, key 0 = Fractures' Era Zero tile) now records which tile each one is on, with the rules
in a pure `src/engine/warpTiles.ts`. Time Travel is a **Failed Action** when everything it has
is on the current tile — the dialog says why rather than claiming no Warp tiles remain — and,
now that the app can compute the target, it *names* it ("the Era 2 Timeline tile") instead of
leaving the player to work out where it has the most. Tapping the Warp marker breaks the count
out into past tiles (itemised per Era) versus the current Era's; that is a check of the app
against the board, not a rules explainer, so it carries no footnote. A game already in progress
when the map arrived carries anonymous older tiles alongside tracked ones: those read as past —
which is what they are — and are removed first, so the pre-tracking pool drains and the map
takes over on its own.

**History gained the lines it was quietly dropping.** The +5 VP set discards one of each type,
which cancels out the very thing the turn just gained, so diffing pre against post left the
Recruit / Mine line with nothing to show and the old code printed the set line *instead of* it;
it now diffs against the state before the discard and the set reads as a line underneath. The
Worker-set branch had never fired for the Chronossus at all — it matches an instruction id, and
the Chronossus ids it `rec-set` where the Chronobot uses `recruit-set`. Assimilate's Operator
completing that set (Solo Opponents p.13) reached History for the first time: the engine had
always applied it, but the text was folded into the tile's run-on sentence with no id to find,
and the Operator line had the same cancelling problem — the column key left behind in
`operatorSlots` is what identifies it now. `summarizeTurn` moved out of the view into
`src/game/turnHistory.ts` so all of it is unit-tested (importing the view hits `window`).

Two smaller UI corrections came out of the same read-back. Every **board location the player has
to act on now reads bold**, both ends of a move included — the dialogs already did, History
couldn't, since a persisted string can't hold JSX, so it carries `**…**` for
`HistoryText` to render alongside the existing `{flux}` icon token (written into `CLAUDE.md`).
The **turn overview lists the modules in play** above the difficulty options, a combo mode split
into its parts. And Remove Anomaly speaks in the bot's voice ("The Chronossus discards … and
removes 1 Anomaly from its board") rather than instructing the player about the bot's supply.

**A finished game now survives a lapsed login.** The score screen auto-saves; when that failed it
said "log in again to save this game", offered no way to log in, and held nothing — so leaving
the screen lost the result, which is exactly what a long game produces when the shared
`bge_session` expires mid-play. A failed save is written to this device first
(`src/data/pendingGames.ts`), *then* the error appears with a **Log in** button, and `AppRoot`
flushes the queue as soon as it knows who the player is — including the load right after that
redirect returns. Ordering is the whole trick, and it generalises to every BGE app: see
`~/brain` — "A redirect login can't be the last thing holding unsaved work". Both bots share it;
the Chronobot's score screen previously had no reason text at all. The home screen's user name
is also a button now, opening the same play-history modal (list + BG Stats export/import) that
until now lived only in the ⚙ menu of a game in progress. Finally the shared score card dropped
the "vs" between the totals — it was centred on the value columns below, not on the numerals, so
it drifted into whichever score was wider — and moved "Bot turns taken" under the rule, since
with no You side it read as a comparison with a hole in it.

## 2026-08-18 — Doomsday: the last module, and an Impact that will not stay put

Doomsday completes the module roadmap. It is the only one that combines with **nothing**
(Solo Opponents p.19), so it ships as a single mode — C07 in slot I, C08 in slot II, C03 left
in play — with no combos to reconcile. The new Action is the **Experiment**, two steps that
can each fail on their own: execute an Experiment already carrying one of the bot's Path
markers, then mark another one for a later turn.

The interesting part is what the app *doesn't* do. Doomsday moves the Impact tile: it starts
a slot later than usual and the Trajectory dice can push it earlier or later every Clean Up.
Tracking that would have meant modelling the dice, the `+`/`−` symbols beside both trackers,
and the tile's position on the Timeline. Instead **Check for Impact is the player's job** —
the app says when to do it and asks two questions: is either tracker locked in, and if not,
did the Impact occur. That deleted a two-mode setting, a settings toggle and a whole column
of board data before any of it was written.

Which forced the one deliberate departure from a rule this codebase otherwise holds
absolutely. Post-Impact is always *derived* from the Era, never stored — but under Doomsday
the Era genuinely cannot decide it. So `postImpactEraFor` grew an optional bot parameter and,
for Doomsday alone, reads the Era the player reported. `earthSaved` is a separate flag from
"no Impact Era yet", and the test suite is why: conflating them left a saved-Earth game still
treating Era 6 as post-Impact, with the 2+X Power Up that implies.

Two smaller calls worth recording, both of them *not* building something the plan asked for:

- **No Energy Core on the Experiment placement.** The first pass reasoned from "treat the
  Doomsday board as part of the Main board" to a Core and a `placedExosuits` record. Both
  serve Fractures' Blink, which Doomsday can never coexist with — and the Core line was
  invented outright, since the engine mentions one nowhere else. It would have had players
  reaching for a component their game does not use.
- **No board overlay for the tracker.** The Doomsday board is a separate physical board the
  app never renders, so a `%`-anchored marker would have nothing to sit on. It became a status
  chip instead: tracker name, slot `n/10`, Experiment count, with the slot's VP in the tooltip.

The Chronossus takes **both** Path columns' printed VP on a track slot ("regardless of which
Path that VP belongs to", p.14), so slots 2 and 9 pay it 4 where a human takes 2. The ladder
itself is transcribed from the Classic rulebook and confirmed against the physical board — the
TTS mod turned out not to contain the Doomsday board at all.

Verified the way the Pioneers bugs finally were: a new `pw-doomsday.mjs` parks a Command
marker on the C07 slot and re-rolls until the die picks it, then checks the dialog steps, the
first-run skip, the hard stops, the pass rule, the dialog's width on a tablet, both Clean Up
questions, and — the one that matters most — that the module's History lines actually appear,
since a shallow-copied state slice fails silently.

Playing the setup through then corrected three things. The **Path question moved to its own
screen** between Modules and Difficulty: sitting beside Pioneers' deck-mode question it was
easy to miss, and unlike a deck preference it decides which half of the Doomsday track the
whole game runs on. The **setup block stopped restating the base module's own setup** — where
the Impact tile goes, how the Experiments are dealt — which is the established pattern
everywhere else ("Set up the Guardian board as for a 2-player game") and was worth writing into
`CLAUDE.md`. And the tracker line stopped claiming *the Chronossus* moves its own token: the
player moves every physical piece, and needs the bot's marker position for their own Trajectory
roll besides.

Scoring ended up split finer than first built. **Experiment cards get their own score line**,
on both sides of the tally, because the Chronossus *discards* each card as it claims it —
unlike a Technology or a Guardian there is nothing left on the table to recount, so the app's
running total is the only record. The **Doomsday track's VP does not**: those points are
granted as ordinary VP as the marker is pushed along (the multiplayer rule, kept in solo), so
they stay in the plain token line. The card VP is already inside `bot.vp`, so it is split *out
of* the token line rather than added on top, with a test pinning that the parts still sum.

Archive: `docs/complete/` once the review walkthrough is done (`docs/plans/REVIEW_doomsday.md`).

## 2026-08-17 — Fractures of Time: the Era Zero Warp, a game two Eras shorter, and the Blink check's missing second half

Two rules from the Fractures rulebook had never been implemented, both of them about the
*shape of the game* rather than any one Action — which is exactly why nothing caught them:
every unit test and the full-game playthrough agreed with each other on a Timeline that was
wrong.

- **The Era Zero Warp Phase** (Fractures p.6). "At the beginning of the game, before
  starting the regular round sequence for Era 1, perform a Warp Phase (but no other
  Phases), placing the Warp tiles on the Era Zero tile." A new `era0warp` phase sits
  between Setup and Era 1's Preparation for every Fractures mode; the header reads
  **Era 0 · Phase 4** while `state.era` stays 1, since Era Zero has a Timeline tile but is
  not an Era of the round sequence. The screen is the normal Warp body with Era-Zero copy
  and the "you may not warp an Exosuit" rule. Its consequence had been missed too: Era 1's
  **Paradox phase is no longer skipped** in a Fractures game, and `pastTimelineTiles`
  counts the Era Zero tile, so Era 1 offers the roll it always should have.
- **Fractures is a 5-Era game** (Fractures p.4) — "only three Eras pre-Impact and two Eras
  post-Impact, plus an Era Zero" — where the app was still playing all 7 with the Impact
  after Era 4. Era counts are now per-config (`maxEraFor` / `postImpactEraFor` /
  `isPostImpact(era, config)`), reached through a new `SoloEngine.maxEraFor` seam. The real
  bug was in the Clean Up screen, where the three branches were literals: `era === 4` for
  the Impact note and `era === 5 || era === 6` for the Collapsing-Capital choice. All three
  are derived now, and verified in the browser at each Era.

The seam is written up in `CLAUDE.md`: a module may re-cut the Timeline, so no rule may
hard-code an Era number. Still open (`TODO.md`): Fractures + Pioneers grants a Power Upgrade
right after the Era Zero Warp (p.15), and the Solo Opponents book doesn't say whether the
Chronossus takes it.

Playtesting that build then turned up a third rule, this one in the Blink check — and it was
the same shape of miss as the Era counts: a decision taken once where the rules take it twice.

- **A failed Blink check has to fall back to the pass.** Out of Exosuits with Flux in the
  pool, a rolled Mine ran the check and then, on an Empty Flux Casing, told the player to
  place an Exosuit the bot did not have. The Fractures exemption only ever stands in for a
  Blink that *might* happen; once the Casing is out there is no Blink, and "the Chronossus
  places an Exosuit or passes, as usual" (Solo Opponents p.12) resolves to the **pass**. So
  every Casing continuation — printed space, Valley Action, Adventure — re-runs the passing
  rule with the exemption dropped, and the panel says it passes instead of asking for a
  figure that does not exist.
- **The check belongs at the Action's placement gate, not a dialog later.** Mine ran it
  after the Resources were picked (on the theory that the Resources identify the space); it
  now runs the moment "is a Mining space open?" is answered, like Recruit Genius. The Blink
  is settled at the Action's granularity and the Resources step only names *which* Mine
  space, dropping its duplicate "place the Exosuit" clause.
- **An Action with no gate of its own checks first.** The Adventure asked for the Path
  marker before checking, so a Casing with no figure left had the player place a marker for
  a turn that then passed. It now opens on the check; both outcomes hand off to the marker
  question with the figure already moved or placed.

All of it was confirmed the way the last two Fractures bugs were — a Playwright run against a
patched save (zero figures, one Blink-ready Exosuit, a stacked Flux Pool), since no UI control
reaches "out of Exosuits with Flux left".

## 2026-08-17 — Pioneers to production, and the playtest pass that got it there

Pioneers of New Earth (with `fractures+pioneers` and `guardians+pioneers`) is **live in
production**; the landing page moves to 80%, the module is archived in
`docs/complete/20260817_PIONEERS_COMPLETED.md`, and no plan is active. Doomsday is the one
module left.

The day's work was playtest feedback, and two items were rules bugs rather than copy:

- **The passing rule was missing on paths that could reach the Adventure.** The
  covered-space path (a rolled marker landing on the printed Action C10 covers) ran no
  check at all, so the bot adventured with no Exosuits left; the tile-slot path checked but
  skipped Fractures' Blink exemption, so it passed when it should have Blinked onto the
  Adventure board. Debug taps on a tile had the same hole while taps on a printed space did
  not. The whole decision is now `Chronossus.passesInsteadOfAction` behind one view helper
  that every path calls.
- **A failed Time Travel resolved silently** — with no Warp tiles on the Timeline the +VP
  showed only in History. It now opens its dialog and says so, for both bots, using the
  difficulty-adjusted VP (which also fixed a hardcoded "+1 VP" on Remove Anomaly's failure).

The rest was the Adventure dialog reworked into the rulebook's own order — pre-roll Power
(the Upgrade-board chip + the Path marker) → the deck that Power picked → both drawn cards
→ only then the die and the total → what the Chronossus takes. A card's printed Success box
is the *player's* rule and is never shown; `resolveAdventure` returns what the bot actually
got. Also: the End Game tally gained its missing module lines (Technologies shared,
Fracture Device, Glitches −2, Hypersync tiles −4), setup names every module's Solo Objective
card in one step, Fractures got its own setup section, off-board placements no longer ask
for an Energy Core, Warp shows one tile per Paradox rolled, and History drops the bare
"→ Phase" row when that phase reports its own result.

Three browser harnesses were kept and documented: `pw-adv.mjs`, `pw-warp.mjs`, and
`pw-pass.mjs` — the last edits the persisted save to reach states the UI has no control
for (out of Exosuits), which is how both passing bugs were confirmed fixed.

## 2026-08-16 — Pioneers UI pass (playtest feedback)

Follow-ups on the module shipped the day before, all from playing it rather than from
tests. Two were real bugs behind accurate-looking surfaces: **C10 rendered and resolved as
C09** (both families share the one `tile-adventure` action, so the first-listed family won —
meaning C10B's +1 Energy Core could never have applied), and an Adventure tile **described
itself as "the Chronossus does nothing this turn"**, the fallback meant for Reboot. The SCV
also named the printed Action on the space C10 covers.

The Adventure dialog now opens on its first step rather than a summary behind a ▶ button,
carries one generic Adventure rule box across all four tiles, and — in shared-deck mode —
rolls first, then asks which single card the bot takes from a filtered dropdown.

Added the **Exosuit Upgrade board pop-out**: the real component art with its state marked
on it, reachable from the Exo tracker on the board and in the turn overview. The **Paradox
die** now shows its real face in the Warp and Paradox phases, for both bots.

Still open, and deliberately not claimed as done: the `fractures+pioneers` Blink-check →
Adventure gate has never run in a browser, and nothing has been checked on a device.

## 2026-08-15 — Pioneers of New Earth

The Classic expansion's Pioneers module for the Chronossus, plus both combos it unlocks
(`fractures+pioneers`, `guardians+pioneers`). The module adds one Action — **Adventure**
(tiles C09/C10) — and one piece of state, the **Chronossus Exosuit Upgrade board**.

An Adventure runs two ordered steps. **Perform Adventure**: the app asks which strength-bonus
slot the player put the bot's Path marker on (that column is shared with the player's own
markers, so it never assumes), adds it to the Upgrade board's Power, picks the 5+ or 10+ deck
at the 9 threshold, rolls the Adventure die, and takes the card with the **highest Power
requirement it meets** — or gains 1 VP if it meets neither. **Power Upgrade**: it moves the
Resource it has most of onto its Upgrade board (ties Titanium > Gold > Uranium > Neutronium),
or places a VP token when nothing fits. All 36 Adventure cards are transcribed with the four
p.15 conversions applied (W → VP, Morale → 2 VP, choices → Research, purple/ongoing → discard
for 3 VP + 1 Energy Core).

**Two deck modes**, chosen at module selection and switchable in ⚙: the bot draws from its own
shuffled copy and the app **shows the real card art** (default — your physical decks are never
touched), or it draws from your decks and you name the cards.

Pioneers is the first module to use **slot IV**, covering the printed "Recruit Genius or
Research" space with C10 — which needed a board overlay of its own, since only Hypersync's
C13-over-Time-Travel had that path.

Playing it surfaced a bug tests had missed: `cloneChronossus` was shallow, so `resolveAdventure`
wrote through to the pre-turn state and every Pioneers History line diffed to nothing. Fixed
with a regression test. New art extracted from the TTS mod: the 36 Adventure cards, the C09/C10
tiles (whose B-side art independently confirmed their coded effects), both Upgrade board sides,
the Adventure die faces, and a Power fist icon. Also extracted, but not yet wired up, the
shared Paradox and Research-shape die faces (see `TODO.md`).

## 2026-08-14 — Guardians of the Council

The Classic expansion's Guardians module for the Chronossus, plus the `guardians+hypersync`
combo — archived as `docs/complete/20260814_GUARDIANS_COMPLETED.md`. A Guardian is a
Path-independent Exosuit the bot powers up **first**, places **last**, and can drop onto its
own reserved Guardian board space when the Capital is full; C11 Acquire Guardian is the new
Action tile.

- **One figure count, one code path.** `spendFigure` / `nextFigure` / `placeableFigures`
  replaced six scattered `exosuitsAvailable -= 1` sites, so "Guardians last" holds for
  Main-board and Valley placements, the Hypersync hex and the Failed-Action discards at once.
  Power Up splits its number Guardians-first (the rulebook's own 4-with-2-Guardians example is
  a test), the pass rule counts both, and Clean Up resets `powered` while `owned` persists.
- **The Guardian board fallback**: a Capital Action with no space left anywhere places a
  Guardian on a Path-marked slot and resolves normally — no +1 VP, no discard. It beats
  Hypersync's Solo-tile fallback in the combo and needs no question, because every Guardian
  brings its own space.
- **Acquire Guardian** asks only what the app can't see: whether the World Council space is
  open (and only when it has a figure to place — otherwise it isn't an Exosuit Action at all),
  and, in Era 4 alone, whether a Guardian is still on the board. Post-Impact it fails for VP.
- **Playtesting drove four rounds of fixes**, including two genuine rules bugs: the board
  fallback was spending a plain Exosuit rather than a Guardian (it fires when Action *spaces*
  run out, not figures), and the targeted-Hypersync difficulty matched the **bot's** pending
  tiles instead of the **player's**, which is the whole point of the option.
- **Also fixed along the way:** an Autoleap dialog closed mid-chain was lost (Take Bot Action
  re-rolled instead of resuming — the owed leap is persisted now); the debug Era stepper
  didn't set the Impact flag, so every post-Impact rule silently kept pre-Impact behaviour;
  two hard-coded Chronobot purples in shared CSS; tracker popovers that stacked instead of
  replacing; and a play-mode tap printing an app-voice line as if the tile had acted.
- **Rule boxes are now one thing everywhere** — labels lost their "rules"/"rulebook text"
  suffixes, and `RulesBox` matches the dialogs' 📖 bars (accent tint, chevron right), in the
  phase screens, setup, the turn overview and every dialog.
- 320 tests, build + lint clean. Landing page: Chronossus 60% → 70%.

## 2026-08-13 (later) — Guardians of the Council (build stages G1–G6)

The Classic expansion's Guardians module for the Chronossus, plus the
`guardians+hypersync` combo — built stage by stage (see the 2026-08-14 entry above for the
playtest rounds and the archive link).
A Guardian is a Path-independent Exosuit the bot powers up **first**, places **last**, and
can drop onto its own reserved space when the Capital is full.

- **Setup & modes.** `guardians` lays C02 / **C11** / C03 into the three tile slots (the combo:
  C12 / C11 / C03 + C13 covering Time Travel); both were un-stubbed in the module picker.
  `worldCouncilMandatory` already covered Guardians, so the Hex Unavailable line was free. The
  setup screen carries the verbatim p.16 box plus the two things the module needs from the
  player: keep the Chronossus's **Path markers** to hand, and place/retrieve the miniatures.
- **The rules that touch every placement.** `spendFigure` / `nextFigure` / `placeableFigures`
  put "Guardians last" in one place and replaced all six scattered `exosuitsAvailable -= 1`
  sites, so Main-board and Valley placements, the Hypersync hex and the Failed-Action discards
  all follow it at once. Power Up splits its number Guardians-first (the rulebook's own
  4-with-2-Guardians example is a test), the pass rule counts both, and Clean Up resets
  `powered` while `owned` persists — a Guardian's Path marker never leaves its slot.
- **The Guardian board fallback.** A Capital Action with no space left anywhere — World
  Council included — places a Guardian on a Path-marked slot and resolves **normally**: no
  +1 VP, no discard. It beats Hypersync's Solo-tile fallback in the combo, and needs no
  question, because every Guardian brings its own space.
- **Acquire Guardian (C11).** Asks whether the World Council space is open (only when it has
  a figure to place — otherwise it isn't an Exosuit Action at all), then either places there
  and takes First Player, or spends a Worker (Most > Scientist > Engineer > Administrator >
  Genius) and places nothing. Post-Impact, no Guardian left, or no Workers → a full Failed
  Action. The "is a Guardian still available?" prompt only appears in Era 4: the shared six
  can't run out earlier, and Eras 5+ fail regardless.
- **Reading as one figure count** (playtest feedback). Power Up says *"Powered up 5 in total —
  1 Guardian and 4 normal Exosuits"*; the Exosuit badge, its pop-out and the board marker art
  all count Guardians in the same pile, with the split in the pop-out; the turn chip reads
  `5 Exo (inc 1 Guardian)` beside `0/1 Guardian` for one it couldn't power up.
- **Two bugs the playtest surfaced.** The view's `FAMILY_TO_TILE_ACTION` had no `C11`, so the
  tile was inert — a marker landing on it silently did nothing (the engine and view keep
  separate maps; a module's tile needs both). And the board fallback called `spendFigure`,
  which takes a plain Exosuit while any remain — but it fires when **Action spaces** run out,
  not figures, so it now spends a Guardian specifically.
- 306 tests (four new end-to-end playthrough variations), build + lint clean. The playthrough
  helper gained an `onPhase` hook for per-Era state that Clean Up resets.

## 2026-08-13 — Fractures playtest fixes, and Fractures ships to production

The playtest-fix pass on Fractures of Time (logged as F8), then the whole effort — the
playthrough test harness, all 10 difficulty options, Alternate Timelines, Variable Anomalies
and Fractures — merged to `main` and deployed. Archived as
`docs/complete/20260813_CHRONOSSUS_DIFFICULTY_TEST_FRACTURES_COMPLETED.md`; no plan is active.

- **Ask, check, decide, *then* tell the player to place.** The gates were instructing a
  placement and only then running the Blink check — but a Blink moves an Exosuit already on
  the board, so the instruction came before the app knew what should happen. Every
  Exosuit-placing path now asks whether the space is free, runs the check, lets the app pick
  the Exosuit, and only then gives the instruction; with no check possible (no Cores in the
  pool, or no Blink-ready Exosuit) it instructs inline exactly like a base-game Action.
- **Mine and Recruit Genius were walking past the Blink check.** Neither uses the shared
  `mech` placement gate — the only place the check ran — so both always placed a new Exosuit
  even when the Chronossus should have Blinked. Both now route through `runBlinkCheck` via a
  continuation ref; Mine checks *after* the Resources are picked, since that choice is what
  identifies the space it's heading for.
- **The Valley gate asks a question that can be answered.** It now asks whether the Action
  space *or* the Valley Capital fallback is open, with a real "neither" that resolves the
  engine's no-space branch — before, the negative answer always placed on the Capital space,
  so a Valley Action could never fail. It also names the printed space (Assimilate / Extract)
  rather than the tile, so a B side no longer asks about "Assimilate and Score".
- **Module dialogs match base-game Action dialogs.** `CxTileDialog` / `HypersyncDialog` /
  `HypersyncTilePrompt` never took `DetailPanel`'s `flow` prop, so on a small screen a module
  Action went full-screen while a board Action didn't; all three render through
  `renderModDialogs(flow)` now. And every dialog puts its **verbatim rule box below the
  body**: the tile dialog used to show one only for read-only taps, B sides and tiles with a
  module write-up, the Hypersync dialog only in two of its five steps, and `BlinkRuleBlock`
  was drawn *inside* the action box.
- **History shows what the module did.** A Blink is an effect rather than the headline — the
  label names the Action, the Blink line names both ends by their Capital Action *space*, and
  it replaces "Exosuit placed" since nothing came from the supply. It carries the Flux Core
  art through a persisted `{flux}` token. `summarizeChronossusExtras` adds the pools
  `summarizeTurn` can't see (Flux Cores, Technologies, Operators, Hypersync tiles).
- **Operators are Workers.** The +5 VP set now always discards the Operator when a column
  holds both (a table call — the rulebook doesn't say), tapping a Worker badge says how many
  of that column are Operators, and there's no separate Operator tracker anywhere.
- Landing page: Chronossus 50% → 60%, now listing Fractures of Time. 247 tests, build + lint
  clean; deployed to production as `cbf6578` (39 commits).

## 2026-08-12 — Turn-overview + History polish (Fractures playtest feedback)

Part 4's F7 from `docs/plans/PLAN_chronossus_difficulty_test_fractures.md`, all view-side —
no rules change. F4 (board overlays) and F5 (scoring/objectives) were dropped from the plan:
the Valley board stays player-managed so there was no overlay work, and the scoring the
module needed already shipped.

- **The Turn overview reads as one panel again.** The long gap under the explanation text
  was `.eoa-hint`'s `flex: 1 1 240px` — in the popover's *column* flex container that basis
  is a 240px minimum height, not a width. The pass-state boxes ("You: active / Bot: active")
  are gone: the top-bar buttons already say whose turn it is. The turn count moved onto the
  title line and got a name — `Era 1 · Phase 5 · Bot Turns 3` (the Chronobot reads
  `Bot Actions N / min M`). Tracker chips are now `inline-flex` + `nowrap` in a stretch row,
  so "4 Exo" stops wrapping into a taller pill, and the Exosuit icon carries a teal outline.
  The Fractures chip lost its Ops count — an Operator is a wildcard Worker, so it is already
  visible in the Worker trackers.
- **A Blink no longer hides in History.** It reads as a normal placement otherwise, because
  a Blink spends no Exosuit from the supply and the state diff shows nothing moving. The
  entry is now labelled `Era 1 · ⚡ Blink → Assimilate` with a first effect line naming
  source, destination and the returned Energy Core (plus "(the bottom one)" when several
  Exosuits share the source space). One per-turn ref, consumed at commit, covers all three
  paths (Action, Valley tile, Hypersync hex).
- **Bot Turns was counting phase advances.** `commitPhase` writes `Era 1 · → Warp` labels,
  but the "not a turn" filter only matched `Power Up:` / `Warp:` *with a colon*, so every
  Era opened with the count already at 2. Fixed alongside the rename that exposed it.
- Verified end to end with Playwright against a real Fractures game (Flux draws pinned to
  Cores): the two-question placement gate, the Blink check, a Blink into Assimilate, and the
  panel itself — no console errors. 236 tests, build + lint clean.
- **Mod-tile taps showed the wrong tile's details** (playtest report, same day). The tap
  handler and the hover tooltip read `p.action` — the tile `chronossusPaths.ts` names for
  that slot, which is always the *base* game's C01/C02/C03 — so a Fractures game rendered
  C04/C05/C06 art but opened Reboot / Score / Energy Pack. Both now go through
  `tileActionAt(p.key)`, the same mode-aware lookup the die-driven turn and the SCV rows
  already used. Noted while confirming: with the SCV panel open it covers all three tile
  spaces, so ◂ Hide is required to reach them — left as is by choice.

## 2026-08-11 — Fractures of Time (Chronossus module) on staging

Part 4 of `docs/plans/PLAN_chronossus_difficulty_test_fractures.md` — the full module,
plus the `fractures+hypersync` combo. The Valley board stays player-managed, so the
module's state lives in the turn overview rather than in new board art.

- **Flux Pool + Blinking.** A second container (Flux Cores + 3 Empty Flux Casings) the
  Chronossus draws from before each Exosuit Action: a Core is spent to Blink, a Casing is
  set aside until Clean Up. Blink selection follows the rulebook's A/B rules (an Exosuit on
  another Command token's Action, smaller number winning; else bottom-left-most). The check
  runs *after* a free space is confirmed — the bot only Blinks into a space it could have
  placed into — and is skipped when the pool holds no Cores (documented departure from the
  literal "at least 1 token", since a Casing-only draw changes nothing that Era).
- **Valley Actions.** Assimilate (C04/C14) and Extract (C05) are Action spaces on the Valley
  board, so they take an Exosuit and gate on "is a Valley Action space open?" (else the
  Valley Capital space). The Valley board is a Blink **destination but never a source**;
  `placesExosuitFor` / `OFF_MAIN_BOARD_ACTIONS` now generalize that for the modules to come.
  Power Pack (C06) stays a Chronossus-board effect. Tile art added for C04–C06 + C14A/B.
- **Operators, in full.** The rulebook prints each new Action twice — a one-line Appendix
  entry and a fuller module-section write-up — and only the Appendix text had been
  captured, which left two rules unimplemented. An Operator is now a **wildcard Worker**:
  it fills the topmost empty space of the Worker collection and counts as that type for
  everything, so an Assimilate can complete the **+5 VP Worker set** (that discard returns
  Operators to the Valley supply; a column holding both discards the plain Worker first —
  our call, the rulebook is silent). And with **no Operators left** the branch is a Failed
  Action for +1 VP, which the Assimilate dialog now asks about after rolling the shape die.
- **Rules text.** Tiles carry a `detail` field with the verbatim module-section text
  (Assimilate + Recruiting Operators, Extract, the Valley placement rule), shown under the
  Appendix summary in the tile's 📖 rules box — which now opens for any tile that has one,
  not just B sides. C07–C13's own longer sections are still Appendix-only.
- **Scoring + combo.** Technologies (3 VP each) and the leftover-Flux-Core difficulty option
  appear in all three score displays. `fractures+hypersync` is un-stubbed per the setup
  matrix (C12 in slot I, C04/C05 in II/III, C13 covering Time Travel, Power Pack dropping
  out), with both modules' setup boxes and difficulty options unioned. 236 tests.

## 2026-08-11 — Guided-phase UX pass (prompts, Undo, rule sourcing)

Playtest feedback on the non-Action phase screens, worked through in order. All on staging.

- **Player prompts read as one thing.** Every "the app needs an answer from you" moment now
  uses the same box: the Paradox tie/lead and Hypersync extra-roll questions, the Clean Up
  game-end choice (both bots), the Alternate Timelines positive-space question, and the
  Variable Anomaly gain. The box tint became a `--sp-prompt-rgb` token (violet for the
  Chronobot, amber for the Chronossus) after the hard-coded amber clashed with the purple
  scheme; `.pp-sub` and the in-prompt number pickers were re-themed the same way.
  `.capital-check` / `.phase-end-pink` / `.va-candidate` retired.
- **Prompts stay on their phase screen.** The Alternate Timelines question had been
  replacing the whole Warp body and the Anomaly prompt was a modal over the Paradox log —
  both left the player answering with the triggering roll off-screen. `WarpPhaseBody` and
  `ParadoxPhaseBody` gained a `followUp` slot; both screens now read intro → what happened →
  what you must answer → trackers → verbatim rules.
- **Anomaly gain reworked** to the Construct pattern: state the verbatim criteria, the
  player applies it and reports only the taken tile (VP row, then a yes/no on Warp-tile
  retrieval, which commits). `resolveVariableAnomalyGain` takes one candidate, not two.
- **Undo on the phase screens**, the same control as the Action Rounds bar, plus
  `commitPhase` so phase advances that change nothing else are still undoable. Rolls are
  restored, never re-rolled.
- **Rule sourcing.** Confirmed the Hypersync Paradox rules (majority, zero-Warp exception,
  most-Hypersync extra roll) are verbatim Future Imperfect p.5 and unamended by Solo
  Opponents p.17 — now shown as a `RulesBox`. Alternate Timelines' p.18 Warp order
  ("decide first, then roll") replaced the contradicting base turn-order note.
- **Smaller fixes:** Paradox rolls render like Warp rolls (numbered die + Paradox symbol);
  four icon trackers on the Paradox screen; the Hypersync placement step keeps marked-off
  spaces visible instead of dropping them; landing-page Chronossus progress 40% → 50%.

## 2026-08-10 — Chronossus difficulty options shipped; Alternate Timelines & Variable Anomalies added ahead of Fractures

Parts 2 and 3 of `docs/plans/PLAN_chronossus_difficulty_test_fractures.md` are done, all
on staging (`https://anachrony.staging.boardgameedge.com`).

- **Difficulty options D1–D9** (base game) all implemented and un-stubbed, one at a time
  with a design-confirmation pass each: tile-swap (Slot I↔III), extra starting Energy
  Cores, extra powered Exosuit (+VP overflow), leftover-Energy-Core VP, fewer Solo
  Objectives, Failed-Actions-score-VP, Research-takes-a-new-shape, and the World Council
  checkbox (found to be dead code — the selectable-options filter had dropped it; fixed).
  D0 scoring seam threads `config.difficulty` into `scoreChronossus` for the one option
  that's an end-game addition (D5); D7 scores live mid-game instead, since it isn't one.
  Sub-selector values (D3/D6) now show wherever difficulty is listed.
- **Bug fixes found along the way:** the Setup flow listed physical actions the app
  already handles as if the player had to do them by hand; the turn-overview popover had
  `difficulty={[]}` hardcoded (never showed selections); `summarizeTurn`'s history line
  hardcoded "+1 VP" for Failed Actions, contradicting D7's +2; Research's message always
  claimed "the shape die shows X" even when D8 forced the pick; D5's leftover-Energy-Core
  VP only showed at End Game, not mid-game.
- **Alternate Timelines & Variable Anomalies** (new Part 3, prioritized ahead of Fractures
  after research showed Variable Anomalies only needs the physical Fractures expansion
  box, not its main module/mechanics — both are on Solo Opponents rulebook p.18).
  Alternate Timelines: Warp Phase scores 2/3 VP per positive-effect space the Chronossus's
  Warp tiles land on (player-reported). Variable Anomalies: replaces the flat −3 VP/Anomaly
  with a held-tile VP list (`anomalyVps`, mirrors `buildingVps`); gaining defers to a new
  player-input modal, removing always takes the largest penalty (engine already knows the
  values). New `GameConfig.extraModules` multi-select seam.
- **Anomaly gain prompt reworked** (same-day playtest note): it had asked for *both* offer
  tiles and let the engine pick, unlike every other player-reported value. Now it mirrors
  Construct — states the verbatim RECEIVING ANOMALIES criteria (Solo Opponents p.18, shown
  in a `RulesBox`), the player applies it, and reports only the taken tile: a VP digit row
  (−2…−6) plus a yes/no "does it retrieve a Warp tile". `resolveVariableAnomalyGain` takes
  one candidate instead of two.
- **Hypersync Paradox rules sourced.** Checked a doubt about whether Hypersync tiles really
  count toward the Warp-tile majority: they do — Future Imperfect p.5, along with the
  zero-Warp exception and the most-total-Hypersync extra roll, and Solo Opponents p.17
  carries the module over without amending the Paradox Phase. Added all three verbatim as a
  `RulesBox` in `ParadoxPhaseBody`'s Hypersync branch (the prompts were app-voice only).
- 26 new tests (168 total); build/lint clean throughout.

## 2026-08-09 — Chronossus base shipped; next effort planned

Chronossus base is officially done and live. Details in
`docs/complete/20260809_CHRONOSSUS_BASE_COMPLETED.md`.

- `chronossus.implemented` → `true` (base game + Hypersync module live).
- Removed the dead `default: setup` case in `ChronossusGame.tsx` (unreachable).
- Closed out `PLAN_chronossus_base.md` (all of Part A + B1/B3/B4 done, B5 shipped, B2
  dropped as player-managed); archived to `docs/complete/`.
- Docs process: added a "Docs & notes maintenance" section to `CLAUDE.md` and a
  user-level `/recap` skill for end-of-session note upkeep.
- Started the next effort: `PLAN_chronossus_difficulty_test_fractures.md` — playthrough
  test harness (base + HFA), then difficulty options one at a time, then Fractures of Time.

## 2026-08-08 — Chronossus playtest fixes (11 items)

A batch of bug/flow/score-screen fixes from an iPad solo play. Details in
`docs/complete/20260808_CHRONOSSUS_PLAYTEST_FIXES_COMPLETED.md`.

- **Bugs:** persist Paradox/Warp/Hypersync rolls across Undo (`ChronossusUi` gains
  `warpRoll`/`paradoxRoll`/`hsRolledHex`); save-error UX with a Retry button.
- **Rules/flow:** Paradox roll cap `min(Era−1, warpTilesOnTimeline)` + repeating
  leads/ties loop; Hypersync starts on the 3 hexes (skips the intro); Recruit tells the
  player to discard the Worker tile; Superproject max VP → 8.
- **Score screen:** Superproject VP broken out from Building VP in scoring + VP pill;
  side-by-side You-vs-Chronossus tally; share/save the result as a PNG via the Web Share
  API (`src/game/shareScore.ts`), download fallback on desktop.
- **Follow-ups (TODO):** on-device verification; mirror roll-persistence + save-retry to
  the Chronobot view (its own snapshot system).

## 2026-08 — Chronossus base underway (Part A parity + B1 tiles/Autoleap)

Active plan: `docs/plans/PLAN_chronossus_base.md`. Base-game Chronossus only; opened to
everyone on the landing page.

- **Shared solo-bot core:** `SoloEngine` interface + registry (`engine/bots/soloEngine.ts`);
  `flow.ts` routes through `engineFor(state.config.bot)`; Chronobot re-expressed as an
  implementation. `chronossus?` slice on `GameState`.
- **Chronossus engine:** `ChronossusState`, `EnergyPool` draw + power-up math,
  `resolveAction` (all base actions + A/B action tiles + energy-core gain), **Autoleap**,
  `resolveHypersyncAction`, passing, `scoreChronossus`. Unit-tested.
- **Chronossus view:** `ChronossusGame.tsx` full Era loop on the shared `PhaseScreen`;
  Phase 5 renders the real board with the shared `DetailPanel`. 4 command-marker routes
  (`chronossusPaths.ts`), calibrate mode, board overlays.
- **Part A parity:** extracted shared modules used by both views — `useUndoableGame` +
  `undo.ts` (Chronossus undo/history/persistence), `HistoryPane`, `ReadyToBegin`,
  `FirstPlayerPrompt`, `TurnTracker`, `DebugBar`, `useMediaQuery`, `BadgePopover`/
  `ShapeIcon`, Simple Command View.

## 2026-07-31 — Optional BGE login: My-history + admin stats + in-app rules

See `docs/complete/20260731_AUTH_STATS_HISTORY_RULES_COMPLETED.md`.

- Optional shared-BGE login (whole app works logged-out); server-backed My-history +
  admin Overall-stats with BG Stats import/export; in-app GameBrain rules frame.

## 2026-07-28 — Full guided Era loop + landing page (Chronobot complete)

Chronobot is feature-complete and live. Details in
`docs/complete/20260728_CHRONOBOT_FULL_PHASES_COMPLETED.md`.

- **Landing/home screen** (`AppRoot` → `Landing` → `BoardExplorer`): pick a Solo
  opponent (Chronobot ready; Chronossus "Coming Soon"); a home icon returns here, and
  a cached game prompts Continue-vs-New.
- **Full phase flow**: `BoardExplorer` renders the whole Era loop by switching on
  `state.phase` — Setup (`SetupFlow`: flavor → difficulty → verbatim/app-modified
  setup) → Phases 1–6 via the `PhaseScreen` splash shell (`src/phases/`, sequencing in
  `src/game/flow.ts`) → End Game score screen. Paradox/Warp dice flows, First-Player
  handling, and game-end decided in Clean Up (Eras 5–6 flip Collapsing Capital tiles).
- **Engine**: `preparation` phase, paradox tracker, `firstPlayer`, difficulty flags
  (`reboot-advance`/`bot-extra-turn`/`min-actions-6`/`no-leader`), corrected Paradox die
  `[0,1,1,1,1,2]`, `rollParadox`/`endParadoxPhase`, Anomaly scoring (−3). Persistence v6.
- **Removed** the unwired legacy runner (`App.tsx`/`useGame.ts`) + `resolveParadox` shim.
- Button theming via `--act` (yellow-green) / `--pass` (pink) CSS vars.

## 2026-07-25 — Board Explorer (current default view)

Pivoted the default view to a board-first **BoardExplorer** (`src/BoardExplorer.tsx`,
wired in `main.tsx`); the guided game runner (`App.tsx`) is preserved for later.

- **Tap an action tile → detail panel** overlaid on the board's right zone (dark,
  purple Chronobot border). Verbatim rulebook text per action (`rule` in
  `chronobotActions.ts`) + `MECH_PLACEMENT`/`FAILED_ACTIONS`. "places an Exosuit"
  is an inline link to the mech-placement rules.
- **Icons**: 12 action-tile icons cropped from the board into a sprite sheet
  (`public/assets/solo/chronobot-icons.png`, 4×3, 144×90 cells) via
  `src/board/ActionIcon.tsx`; shown 2× in the panel header.
- **Debug harness**: top stats row (VP · Warp · Actions), Reset, seeded with 2 Warp
  tiles + 6 Exosuits. Tapping a tile resolves the action through
  `Chronobot.takeActionTurn`.
- **Mech placement gate**: any mech-placing action prompts Confirm placed / Cannot
  place before spending an Exosuit (Cannot place → +1 VP, no Exosuit).
- **Construct VP entry**: after placement, tap the tile's printed VP — **buildings
  1–4**, **superprojects 3–7** — added to the bot's score, tile discarded; max 3 per
  type (4th fails). Engine scores it via `buildingVP` input.
- **Board trackers** (`BOARD_COUNTERS` in `chronobotHotspots.ts`): 8 on-board count
  badges — Mechs (hexagon), Breakthroughs (bottom-left), Superproject + 4 buildings +
  Anomalies (bottom row).
- **Position calibration**: `pw-validate.mjs` (Playwright, cached Chromium at
  `ms-playwright/chromium_headless_shell-1217`) measures each badge's rendered
  position; plus an in-app **calibrate mode** (toggle in the top bar) — click the
  board to place the selected badge, arrow-keys nudge, panel emits the exact
  `BOARD_COUNTERS` literal.

## 2026-07-22 — Chronobot v1

**Recon / assets**
- Proved the TTS asset pipeline end-to-end: resolve a component GUID (from the mod's
  global Lua `SOLO` table) → its `ImageURL` → the matching file inside the `.ttsmod`
  ZIP → extract. Solo board (both faces), AI die, and action tiles all extract cleanly.
- Extracted to `public/assets/solo/`: `board-chronossus.jpg`, `ai-die.jpg`.
- AI die faces read as numbers paired with a fist/exosuit glyph. **Open item:** confirm
  the exact 6 faces + how they map to the 4 Command tokens (2/3/4/5) with the physical
  die. Engine keeps `aiDieFaces` as configurable data so this is a one-line fix.
- The mod's Lua is a 3D-simulation engine (spatial moves), so it's an oracle for phase
  *text* and setup, not a clean die→action table. Board arrow routing is printed on the
  board; treating it as **seeded + player-correctable** data for v1 rather than guessing
  pixel-perfect geometry (user owns the physical board to verify in testing).

**Engine scope for v1 (Chronobot)**
- Full setup guide + per-Era phase flow: Paradox → Power Up → Warp → Action Rounds →
  Clean Up, then End-of-Game scoring.
- App performs all bot randomness (AI die, paradox die).
- Action Rounds: the valuable core = full **decision resolution** for every Chronobot
  action (Construct / Recruit / Research / Recruit-Genius-or-Research / Mine / Time
  Travel / Remove Anomaly / Reboot) with priority rules + JIT explanations, plus Failed
  Action handling, min-3-actions, and passing logic.
- Bot bookkeeping tracked by the app: exosuits, VP, resources, workers, breakthroughs,
  buildings, superprojects, anomalies, warp tiles, time-travel track, actions this era.
- Where a choice needs physical board info (e.g. which building has higher VP), the app
  states the rule and asks the player to apply it (`requiresInput`).

**Chronobot v1 — DONE (testable).** `npm run dev` then choose Chronobot.
- Engine: `src/engine/bots/chronobot.ts` (pure phase functions + decision helpers),
  `rules/chronobotActions.ts` (action catalog + JIT text), expanded `types.ts`/`state.ts`.
- UI: `src/App.tsx` guided flow — setup checklist → per-Era Paradox/Power Up/Warp/Action
  Rounds/Clean Up → end-game scoring; live Chronobot status panel; collapsible board art;
  action picker with per-action "why?" JIT text; app rolls AI/paradox/shape dice.
- Tests: 21 passing (`npm test`) — decision priorities, phase transitions, failed-action
  handling, pass logic, scoring, and a full-era integration playthrough.
- Verified: `tsc` + `vite build` clean, `oxlint` clean, dev server serves app + assets 200.

**Open items to confirm with the physical game during testing:**
1. AI die faces + how they map to the 4 Command tokens (2/3/4/5). Currently
   `AI_DIE_FACES=[1..6]` in `engine/index.ts` — one-line fix once known.
2. Board arrow routing / which action sits on each token's space. v1 has the player pick
   the action from the grid each roll (also serves as the JIT reference). Once geometry is
   confirmed we can auto-predict the action per die face (the true "roll-outcome grid").
3. Paradox phase: v1 asks "did it gain an Anomaly?" (player resolves the physical roll)
   because anomaly gain depends on maturing Warp tiles the app doesn't fully track.
