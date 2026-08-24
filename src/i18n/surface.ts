// The translatable surface: every string a locale file is allowed to override,
// as a flat `key -> English default` map.
//
// This is an OVERRIDE layer, not a relocation. The English text stays where it has
// always lived — the tile catalog, the Action catalog, the phase metadata — and stays
// the single source of truth for the rules. A locale file supplies replacements by key;
// anything it omits falls back to the English default, so a half-finished translation
// is a perfectly valid file.
//
// Why that shape: most of this text is transcribed VERBATIM from the "Chronobot &
// Chronossus Solo Opponents" rulebook, and official rulebooks exist in other languages.
// A translator's job here is therefore transcription from their own edition, not
// translation — and they can do it a tile at a time.
//
// NOT in the surface, deliberately:
//   * `src/data/adventureCards.ts` — the card prose is never rendered. It was transcribed
//     only to derive each card's bot outcome, which is data, not text.
//   * `action.*.summary` / `.jit` (the unbuilt guided runner) and the mode labels — the
//     setup screen writes its module names inline, so nothing reads `CHRONOSSUS_MODES.label`.
//   * Rule constants nothing currently renders (`ENDGAME_TRIGGER_RULE`, `FAILED_ACTIONS`,
//     the `QUANTUM_LOOPS_*` and most `DOOMSDAY_*` blocks). A key here costs a translator
//     real effort, so only publish one the app can actually show; add it when a screen
//     starts rendering it.
//   * Instructions generated inside the engine (`Instruction.text`). Those are assembled
//     from interpolated English inside the pure bot functions and persisted to History as
//     rendered strings; they need the message-descriptor refactor before a key can reach
//     them. See docs/plans for the phasing.

import {
  CHRONOBOT_ACTIONS,
  MECH_PLACEMENT,
  PASSING_RULE,
  PLAYER_SCORING_RULE,
  CHRONOBOT_SETUP_RULE_INTRO,
  CHRONOBOT_SETUP_RULE_BULLETS,
} from '../engine/rules/chronobotActions';
import { CHRONOSSUS_TILES } from '../board/chronossusTiles';
import { BOARD_COUNTERS } from '../board/chronobotHotspots';
import { PHASE_META, ENDGAME_RULES } from '../phases/phaseMeta';
import { CHRONOSSUS_PHASE_META, CHRONOSSUS_ENDGAME_RULES } from '../phases/chronossusPhaseMeta';
import {
  BLINK_RULE,
  BLINK_SPACE_LABEL,
  CHRONOSSUS_PASSING_RULE,
  HYPERSYNC_PARADOX_RULE,
} from '../engine/bots/chronossus';
import { DOOMSDAY_CHECK_FOR_IMPACT_RULE } from '../engine/bots/doomsday';
import {
  CX_SETUP_RULE,
  CX_SETUP_FRACTURES_RULE,
  CX_SETUP_GUARDIANS_RULE,
  CX_SETUP_PIONEERS_RULE,
  CX_SETUP_DOOMSDAY_RULE,
  CX_SETUP_HYPERSYNC_RULE,
  CX_SETUP_QUANTUM_LOOPS_RULE,
  CX_DOOMSDAY_TRACKER_RULE,
} from '../engine/rules/chronossusSetupRules';
import {
  CX_ALT_TIMELINES_WARP_RULE,
  CX_ALT_TIMELINES_SCORING_RULE,
  CX_ALT_TIMELINES_DIFFICULTY_RULE,
  CX_QUANTUM_LOOPS_WARP_RULE,
  CX_QUANTUM_LOOPS_ACTION_RULE,
  CX_QUANTUM_LOOPS_REMOVE_ON_5_RULE,
  CX_QUANTUM_LOOPS_2VP_RULE,
  CX_VARIABLE_ANOMALIES_SETUP_RULE,
  CX_VARIABLE_ANOMALIES_RECEIVING_RULE,
  CX_TARGETED_HYPERSYNC_RULE,
} from '../engine/rules/chronossusModuleRules';
import { UI_STRINGS } from './uiStrings';

/** A flat translation map: dotted key -> text. */
export type Messages = Record<string, string>;

/**
 * Build the English defaults for the whole translatable surface.
 *
 * Pure and derived from the catalogs, so a tile or Action added to the game shows up
 * here — and therefore in the generated `en.json` — without anyone remembering to.
 */
export function englishMessages(): Messages {
  const m: Messages = {};
  const put = (key: string, value: string | undefined) => {
    if (value != null && value !== '') m[key] = value;
  };

  // --- App chrome (the app's own voice) -------------------------------------
  for (const [key, value] of Object.entries(UI_STRINGS)) put(`ui.${key}`, value);

  // --- Chronobot Action catalog (verbatim rulebook, pp. 4-6) ----------------
  for (const def of Object.values(CHRONOBOT_ACTIONS)) {
    put(`action.${def.id}.label`, def.label);
    put(`action.${def.id}.rule`, def.rule);
    // `summary` / `jit` belong to the guided game runner (src/App.tsx), which is not
    // built — nothing renders them, so they are not published.
  }

  // --- Standalone Chronobot rule blocks -------------------------------------
  MECH_PLACEMENT.forEach((line, i) => put(`rule.mechPlacement.${i}`, line));
  put('rule.passing', PASSING_RULE);
  put('rule.playerScoring', PLAYER_SCORING_RULE);
  put('rule.endgame', ENDGAME_RULES);
  put('rule.chronobotSetup.intro', CHRONOBOT_SETUP_RULE_INTRO);
  put('rule.chronobotSetup.bullets', CHRONOBOT_SETUP_RULE_BULLETS);

  // --- Chronossus rule blocks -----------------------------------------------
  put('rule.blink', BLINK_RULE);
  put('rule.chronossusPassing', CHRONOSSUS_PASSING_RULE);
  put('rule.hypersyncParadox', HYPERSYNC_PARADOX_RULE);
  put('rule.chronossusEndgame', CHRONOSSUS_ENDGAME_RULES);
  put('rule.doomsday.checkForImpact', DOOMSDAY_CHECK_FOR_IMPACT_RULE);

  // --- Chronossus setup, verbatim (one block per module) --------------------
  put('rule.cxSetup.base', CX_SETUP_RULE);
  put('rule.cxSetup.fractures', CX_SETUP_FRACTURES_RULE);
  put('rule.cxSetup.guardians', CX_SETUP_GUARDIANS_RULE);
  put('rule.cxSetup.pioneers', CX_SETUP_PIONEERS_RULE);
  put('rule.cxSetup.doomsday', CX_SETUP_DOOMSDAY_RULE);
  put('rule.cxSetup.hypersync', CX_SETUP_HYPERSYNC_RULE);
  put('rule.cxSetup.quantumLoops', CX_SETUP_QUANTUM_LOOPS_RULE);
  put('rule.cxSetup.doomsdayTracker', CX_DOOMSDAY_TRACKER_RULE);

  // --- Module rules shown on the phase screens ------------------------------
  put('rule.cx.altTimelines.warp', CX_ALT_TIMELINES_WARP_RULE);
  put('rule.cx.altTimelines.scoring', CX_ALT_TIMELINES_SCORING_RULE);
  put('rule.cx.altTimelines.difficulty', CX_ALT_TIMELINES_DIFFICULTY_RULE);
  put('rule.cx.quantumLoops.warp', CX_QUANTUM_LOOPS_WARP_RULE);
  put('rule.cx.quantumLoops.action', CX_QUANTUM_LOOPS_ACTION_RULE);
  put('rule.cx.quantumLoops.removeOn5', CX_QUANTUM_LOOPS_REMOVE_ON_5_RULE);
  put('rule.cx.quantumLoops.twoVp', CX_QUANTUM_LOOPS_2VP_RULE);
  put('rule.cx.variableAnomalies.setup', CX_VARIABLE_ANOMALIES_SETUP_RULE);
  put('rule.cx.variableAnomalies.receiving', CX_VARIABLE_ANOMALIES_RECEIVING_RULE);
  put('rule.cx.targetedHypersync', CX_TARGETED_HYPERSYNC_RULE);

  // --- Modular Action tiles (verbatim Appendix, pp. 20-21) ------------------
  for (const tile of Object.values(CHRONOSSUS_TILES)) {
    put(`tile.${tile.code}.name`, tile.name);
    put(`tile.${tile.code}.rule`, tile.rule);
    put(`tile.${tile.code}.detail`, tile.detail);
  }

  // --- Game piece names -----------------------------------------------------
  // The components themselves ("Neutronium", "Power Plant", "Genius") — one family, used
  // by every place that names a piece: the board tracker tooltips, the Mine resource
  // swatches and the Recruit Worker swatches. Derived from the board layout so a new
  // tracker joins the surface with it; `water` is the one piece with no tracker of its own.
  for (const c of BOARD_COUNTERS) put(`piece.${c.key}`, c.label);
  put('piece.water', 'Water');

  // Capital Action space names, as the Blink panels and placement prompts say them.
  // Derived from the engine map so a new space joins the surface with it.
  for (const [key, label] of Object.entries(BLINK_SPACE_LABEL)) put(`blinkSpace.${key}`, label);

  // --- Phase metadata (verbatim phase summaries) ----------------------------
  for (const [phase, meta] of Object.entries(PHASE_META)) {
    if (!meta) continue;
    put(`phase.${phase}.name`, meta.name);
    put(`phase.${phase}.overview`, meta.overview);
    put(`phase.${phase}.rules`, meta.rules);
  }
  for (const [phase, meta] of Object.entries(CHRONOSSUS_PHASE_META)) {
    if (!meta) continue;
    put(`phase.chronossus.${phase}.name`, meta.name);
    put(`phase.chronossus.${phase}.overview`, meta.overview);
    put(`phase.chronossus.${phase}.rules`, meta.rules);
  }

  return m;
}
