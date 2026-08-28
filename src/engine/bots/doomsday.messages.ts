// English defaults for every instruction the Doomsday module emits.
//
// Per-module, beside the rules it describes (the plan's D10) — a module ships its own
// message file the way it ships its own tiles. `src/engine/messages.ts` folds it in and
// `src/i18n/surface.ts` publishes it.
//
// The Chronossus's name is written into these sentences rather than passed as a param
// (D8), a mid-sentence branch is its own key (D2), and a counted noun is a `.one`/`.other`
// pair (D4).

export const DOOMSDAY_MESSAGES: Record<string, string> = {
  // --- Step 1: execute an Experiment --------------------------------------------
  'instr.doomsday.experiment.none':
    'No Level {level} Experiment carries one of the Chronossus’s Path markers — skip this step.',
  'instr.doomsday.experiment.none.detail':
    'A step that cannot be performed is simply ignored; the Action still continues to Step 2.',
  'instr.doomsday.experiment.take':
    'Give the Chronossus the leftmost Level {level} Experiment on the Timeline carrying one of its Path markers, and discard that marker. It scores the {vp} VP printed on the card.',

  // --- The Doomsday track -------------------------------------------------------
  'instr.doomsday.track.locked':
    'The Doomsday tracks are locked, so the {tracker} marker does not move.',
  'instr.doomsday.track.locked.detail':
    'No movement is allowed once the Impact has occurred or either tracker has reached its final slot — but Experiments still score their VP.',
  // Four keys: which way the marker moves, and whether the spot prints VP, are both
  // mid-sentence branches (D2) — and "up the track" is not a word another language can
  // slot in without knowing the rest of the sentence.
  'instr.doomsday.track.up.vp':
    'Move the {tracker} marker one step up the Doomsday track. The Chronossus scores the {vp} VP printed there.',
  'instr.doomsday.track.up.noVp':
    'Move the {tracker} marker one step up the Doomsday track (no VP printed there).',
  'instr.doomsday.track.down.vp':
    'Move the {tracker} marker one step down the Doomsday track. The Chronossus scores the {vp} VP printed there.',
  'instr.doomsday.track.down.noVp':
    'Move the {tracker} marker one step down the Doomsday track (no VP printed there).',
  'instr.doomsday.track.vp.detail':
    'The Chronossus takes any printed VP on the spot regardless of which Path it belongs to, so where a spot prints a value for each Path it takes both.',
  'instr.doomsday.track.earthSaved':
    'The Save Earth marker has reached the topmost slot — the Impact’s damage is completely mitigated and the game is over.',
  'instr.doomsday.track.earthSaved.detail':
    'In games where Earth is saved the Impact is never resolved, so there is no Evacuation.',
  'instr.doomsday.track.fateSealed':
    'The Seal Fate marker has reached the bottommost slot — place the Impact tile after the current Timeline tile and resolve the Impact immediately.',
  'instr.doomsday.track.fateSealed.detail':
    'Do not roll the Trajectory dice in this Era’s Check for Impact.',

  // --- Step 2: prepare for Experimentation --------------------------------------
  'instr.doomsday.prepare.done':
    'Place one of the Chronossus’s Path markers on a face-up Experiment that does not already have one — a Level 1 before a Level 2, and the furthest in the past on the Timeline to break a tie.',
  'instr.doomsday.prepare.done.detail':
    'Never the Experiment under the next Era. Your Focus marker has no effect on this choice.',
  'instr.doomsday.prepare.none':
    'Every available face-up Experiment already carries a Path marker — skip this step.',

  // --- Neither step could be performed ------------------------------------------
  'instr.doomsday.failed':
    'Neither step could be performed — a Failed Action, so the Chronossus takes {vp} VP instead.',
  'instr.doomsday.failed.detail':
    'The Exosuit is still placed: an Action that can be taken but cannot be performed pays VP in place of its normal effect.',
};
