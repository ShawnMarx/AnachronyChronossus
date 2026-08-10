# LOG — Chronossus difficulty options, playthrough tests, & Fractures of Time

Execution tracker. Steps in implementation order. Mark `[x]` as completed; note
deviations inline. Difficulty options (Part 2) are worked **one at a time with a feedback
pause** — restate the rule + intended logic, get a thumbs-up, then implement/test/enable.

## PART 1 — Playthrough test harness (first)
### T1 — Base-game playthrough test
- [ ] `chronossusPlaythrough.test.ts` drives a full game (setup → Eras → End Game) deterministically
- [ ] Invariant + score-sanity assertions; ends at MAX_ERA
- [ ] Reusable `playChronossus({ config, rolls… })` helper

### T2 — HFA (Hypersync) variation
- [ ] Same driver with `hypersync` config; asserts Hypersync Action + Autoleap paths

### T3 — Extensibility
- [ ] File-header doc: how to add a per-mode variation (Fractures + future modes)

## PART 2 — Difficulty settings (one at a time)
- [ ] **D0** — thread `config`/counters into `scoreChronossus` (scoring seam for D5/D7)
- [ ] **D1** — `chronossus-tiles-b-side` (live): verify + test
- [ ] **D2** — `chronossus-swap-tiles`: swap tiles between spaces (engine/config + setup)
- [ ] **D3** — `chronossus-extra-energy`: +1/2/3 starting cores (1/2/3 selector)
- [ ] **D4** — `chronossus-extra-powerup`: +1 powered Exosuit/Era, VP overflow rule
- [ ] **D5** — `chronossus-leftover-energy-vp`: leftover core = 1 VP (score + line)
- [ ] **D6** — `chronossus-fewer-objectives`: reveal fewer/no Solo Objectives (setup only)
- [ ] **D7** — `chronossus-failed-action-vp`: +2 VP per Failed Action (counter + score)
- [ ] **D8** — `chronossus-research-new-shape`: Research takes an unowned shape
- [ ] **D9** — `chronossus-hex-unavailable`: cover right World Council space (verify/finalize)
- [ ] **D10** — `chronossus-hypersync-targeted` (live): verify + test

## PART 3 — Fractures of Time (full module)
### F-R — Research & design
- [ ] Read Fractures rules (Chronossus deltas) + pull TTS art; capture design note here

### F1 — Mode entry & setup
- [ ] Un-stub Fractures in `MODULE_CONFIGS`; wire `getMode` slots/tiles
- [ ] Fractures Setup screens (verbatim + app-modified)

### F2 — Engine: Flux Pool / Cores / Fracture Device
- [ ] State + types; draw/spend/exhaust + Fracture Device; unit tests

### F3 — Engine: X-series actions & tiles
- [ ] X-series catalog in tile/resolver machinery (+ Autoleap); unit tests

### F4 — Board / view / overlays
- [ ] Art + overlays (Flux Pool, Cores, Fracture Device, X-tiles); calibrate positions; routes

### F5 — Scoring & objectives
- [ ] Expansion scoring deltas + objectives (player vs Chronossus — confirm); score screen

### F6 — Ship
- [ ] Fractures playthrough variation
- [ ] build + test + lint clean; manual playthrough; assets/theme pass

---
### Deviations / decisions
(record here as work proceeds)
