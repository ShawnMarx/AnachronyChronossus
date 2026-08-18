# REVIEW — Doomsday module

A walkthrough you can follow from a phone or tablet. Each section is one thing to try and
what you should see. Mark each ✅ PASS / ❌ FAIL / ⚠️ PARTIAL as you go.

Where to play it: **staging** — https://anachrony.staging.boardgameedge.com

> Doomsday requires the **Classic Expansion Pack** physically. You can click through most of
> this without the components, but the Experiment steps ask what is on your table.

---

## 1. Setup — picking the module

1. Landing → **Chronossus** → **Continue**.
2. On the module list, pick **Doomsday**.
3. Look for the **"Doomsday — which Path are you playing?"** radio group.

**Expect:** four Paths. Harmony and Dominance each say *you* move "Save Earth" and the
Chronossus moves "Seal Fate"; Salvation and Progress say the reverse.

4. Tick **Doomsday: play without the Planned Experiments variant**, then untick it again.
5. Tick **Doomsday: it starts with Path markers on future Experiments** and set the count.
6. **Continue** to the setup instructions.

**Expect:**
- A verbatim **"Doomsday — setup"** box: requires the Classic Expansion Pack, C07A to (I),
  C08A to (II), leave C03A, add the **"Completed Experiments"** Solo Objective card.
- An app-voice **"Doomsday setup"** list: the Doomsday board, the **Impact tile between the
  5th and 6th Timeline tile**, the Experiment card layout, which tracker each side moves,
  the pre-seeded markers line (with your count), and a line saying **you** run Check for
  Impact each Clean Up.
- The Level 2 stack line should say **face up** with the variant on, **face down** with it off.

**Verdict:**

## 2. The board

1. **Continue** through to Era 1.

**Expect:** the Chronossus board shows **C07** in slot I, **C08** in slot II, **C03** in
slot III. No tile covering any printed Action space.

2. Find the status chips near the turn overview.

**Expect:** a chip reading e.g. **"Seal Fate 6/10 · 0 Exp"**. Tap/hover it.

**Expect tooltip:** which tracker it moves and why, the slot's VP, and that it takes **both**
Paths' printed values unlike you.

**Verdict:**

## 3. The first Experiment of the game

Roll **🎲 Take Bot Action** until a marker lands on **C07** or **C08**.

**Expect:** the dialog opens **straight on Step 2 — Prepare for Experimentation**. It should
NOT ask whether an Experiment carries a Path marker — none can be out yet.

> If you turned on the pre-seed difficulty, it **should** ask. That is the intended exception.

**Expect the Step 2 text:** place a Path marker on a face-up Experiment with none, **Level 1
before Level 2**, **furthest in the past** to break a tie, never the one under the next Era.

Press **▶ Start Your Turn**.

**Verdict:**

## 4. A later Experiment — all three steps

Roll until another Experiment comes up.

1. **Expect Step 1:** *"Is there a Level N Experiment … with one of the Chronossus's Path
   markers on it?"* — with a note that it takes the **leftmost**.
2. Answer **Yes**.
3. **Expect the VP step:** "What is the Victory Point value printed on that Experiment?" with
   **2 VP** and **3 VP** buttons, and a line below saying which tracker will move and the VP
   it will score there.
4. Pick one, then **▶ Start Your Turn**.

**Expect afterwards:**
- The status chip's slot has moved one step and the Exp count went up.
- **History** shows *"Executed an Experiment (N completed)"* and *"Moved the … tracker one
  step (+N VP printed there)"*.
- The VP pill total went up by the card VP **plus** the track VP.

**Verdict:**

## 5. Both steps can fail

1. On an Experiment, answer Step 1 with **"✗ None — skip this step"**.

**Expect:** it still goes on to Step 2 — a failed step is skipped, not fatal.

2. On another, answer Step 2 with **"✗ All of them already have one"**.

**Expect:** the turn still commits, and if Step 1 succeeded the VP and tracker move still
happened.

**Verdict:**

## 6. Clean Up — Check for Impact

Play to the end of an Era and reach **Clean Up**.

**Expect, before anything else:**
- A note telling you to roll the two Trajectory dice and move the Impact tile.
- A collapsible **📖 Doomsday — Check for Impact** box with the verbatim rule.
- **"Is either tracker locked in?"** with three buttons.

1. Press **Neither**.

**Expect:** *"Did the Impact occur at the end of this Era?"* — Yes / No.

2. Press **No — not yet**.

**Expect:** the Era ends normally.

**Verdict:**

## 7. The Impact, when you say so

Reach a Clean Up and answer **Neither → Yes — the Impact resolved**.

**Expect:** from the **next** Era on, Power Up gives **2+X Exosuits (max 4)** instead of
3+X (max 6), and the Collapsing Capital check appears in Clean Up. It should follow the Era
*you* named, not a fixed Era 5 or 6.

**Verdict:**

## 8. The two hard stops

1. **Seal Fate bottommost.** In Clean Up, press *"Seal Fate is bottommost — Impact now"*.

**Expect:** the Impact is recorded for this Era and the game continues post-Impact.

2. **Save Earth topmost.** In a later game, press *"Save Earth is topmost — Earth is saved"*.

**Expect:** the game **ends immediately** and goes to the score screen. No Impact, no
Evacuation.

3. If the **Chronossus's own** marker reaches the end of the ladder during an Experiment,
   the turn should say so itself (*"the Impact is mitigated and the game is over"* or
   *"resolve the Impact immediately"*) without waiting to ask you.

**Verdict:**

## 9. Out of Exosuits

Play an Era until the Chronossus has no figures left, then roll onto an Experiment.

**Expect:** it **passes** rather than asking you to place an Exosuit it does not have.

**Verdict:**

## 10. Tap explanations

With **Debug** off, tap the C07 and C08 tiles on the board.

**Expect:** a read-only panel with that tile's own art, name and **expanded** verbatim rule —
C07 must show C07's text and C08 must show C08's, never each other's.

**Verdict:**

---

## Follow-ups / edge cases to consider

- B-side tiles: with "Flip Action tiles to their B side" on, C07B should add 1 Energy Core and
  C08B should add 1 VP **and** 1 Energy Core on top of the Experiment itself.
- The score screen's player tally: Experiment card VP goes under **Victory Point tokens**, and
  the "Completed Experiments" objective under **Solo Objectives**.
- Undo across an Experiment turn and across a Check-for-Impact answer.

## Bugs found and fixed during review

_(none yet)_
