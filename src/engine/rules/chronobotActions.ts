// Chronobot action catalog + rule text.
//
// `rule` is transcribed VERBATIM from the official "Chronobot & Chronossus Solo
// Opponents" rulebook (Chronobot Rules, pp. 4–6). Paragraphs are separated by
// blank lines. The literal phrases "places an Exosuit" / "places the Exosuit"
// are turned into clickable "how to place a mech" links by the UI.
//
// `summary` / `jit` are the app's own shorter phrasings, kept for the guided
// game runner; the board explorer shows `rule` (verbatim).

import type { Resource, Worker } from '../types';

export type ChronobotActionId =
  | 'research'
  | 'recruit'
  | 'recruit-genius-research'
  | 'mine-resource'
  | 'time-travel'
  | 'remove-anomaly'
  | 'reboot'
  | 'construct-factory'
  | 'construct-lab'
  | 'construct-powerplant'
  | 'construct-support'
  | 'construct-superproject'
  | 'evacuation';

export interface ChronobotActionDef {
  id: ChronobotActionId;
  label: string;
  /** One-line app summary (guided runner). */
  summary: string;
  /** App's shorter "why"/priority phrasing (guided runner). */
  jit: string;
  /** Verbatim rulebook text for this Action (paragraphs split by blank lines). */
  rule: string;
  /** Whether taking this action places an Exosuit (Time Travel / Reboot do not). */
  placesExosuit: boolean;
}

/** Chronobot Recruit priority (rulebook): Genius > Administrator > Engineer > Scientist. */
export const RECRUIT_PRIORITY: Worker[] = [
  'genius',
  'administrator',
  'engineer',
  'scientist',
];

/** Chronobot Mine priority when tied: Neutronium > Uranium > Gold > Titanium. */
export const MINE_PRIORITY: Resource[] = [
  'neutronium',
  'uranium',
  'gold',
  'titanium',
];

/** Remove-Anomaly discard priority when tied: Titanium > Gold > Uranium > Neutronium. */
export const REMOVE_ANOMALY_PRIORITY: Resource[] = [
  'titanium',
  'gold',
  'uranium',
  'neutronium',
];

/**
 * Verbatim "GENERAL RULES OF THE CHRONOBOT'S ACTIONS" (rulebook p. 5) — how the
 * Chronobot places its mech (Exosuit). Surfaced by the "how to place a mech"
 * link on any action that places one.
 */
export const MECH_PLACEMENT: string[] = [
  'The Chronobot does not use Workers to take Main board Actions, only empty Exosuits.',
  'It ignores everything printed on Action spaces or Collapsing Capital tiles and never pays the costs of Actions. It cannot place on face-down Collapsing Capital tiles.',
  'It always picks the topmost available space on Capital Actions.',
  'If there are no available spaces on a Capital Action the Chronobot rolled, it places on a World Council Action space instead, always taking the First Player spot if possible.',
];

/**
 * Verbatim "PASSING AND END OF ACTIONS" rule (rulebook p. 7). Paragraphs are
 * separated by blank lines. Shown in the End-of-Actions popover.
 */
export const PASSING_RULE =
  'Once the Chronobot has run out of Exosuits, it takes a Time Travel Action on its next turn (if able), then passes. However, if you pass first, and the Chronobot has taken at least 3 Actions, the Action Rounds Phase ends immediately. If the Chronobot has not yet taken 3 Actions, it will continue taking turns until it has, at which point the Action Rounds Phase would end.\n\nNOTE: You can use an unused Path’s Exosuits to track the number of Actions the Chronobot takes, especially if you decide to raise the number of Actions to 6.\n\nNOTE: The Chronobot will never take fewer than 3 Actions.';

/** Verbatim End-Game trigger rule (rulebook). */
export const ENDGAME_TRIGGER_RULE =
  'The game ends at the end of the Era when the last Capital Action space becomes unavailable or if the final Era (7th) is finished.';

/** Verbatim player End-Game scoring rule (rulebook). */
export const PLAYER_SCORING_RULE =
  'Tally up points from buildings, Anomalies, Superprojects, Time Travel, Morale, Victory Point tokens, Timeline penalties and Endgame Conditions using the scoring pad provided. Each individual Breakthrough is worth 1 VP. In addition, a set of three Breakthroughs with different shapes (i.e. Circle, Triangle, Square; the icons do NOT have to match) is worth an additional 2 VP/set.';

/** Verbatim "FAILED ACTIONS" rule (rulebook p. 5). */
export const FAILED_ACTIONS =
  'If an Action cannot be taken because there are no available Action spaces, it does not place an Exosuit and receives 1 VP instead. If an Action can be taken but cannot be performed (examples are given in each Action’s section), the Chronobot places the Exosuit and receives the 1 VP instead of the normal effect of the Action.';

const CONSTRUCT_RULE =
  'Each of the Chronobot’s Construct Actions is for a specific building type (or Superproject). When using the Construct Action, the Chronobot always picks the building with the higher VP value. If tied, it takes the one in the secondary stack. If it already has 3 buildings of the desired type, it takes nothing (but it still places an Exosuit to block a Construct Action space, and takes 1 VP, as usual, for Failed Actions).';

export const CHRONOBOT_ACTIONS: Record<ChronobotActionId, ChronobotActionDef> = {
  research: {
    id: 'research',
    label: 'Research',
    summary: 'Roll only the shape die; take any Breakthrough of the rolled shape.',
    jit: 'The Chronobot ignores the icon die — it just takes a Breakthrough matching the rolled shape.',
    rule: 'When using the Research Action, only roll the shape die, taking any Breakthrough of the rolled shape.',
    placesExosuit: true,
  },
  recruit: {
    id: 'recruit',
    label: 'Recruit',
    summary: 'Recruit a Worker type it does not yet have (priority order), +1 VP.',
    jit: 'Priority: Genius > Administrator > Engineer > Scientist. Once it holds all 4 types, discard one of each for +5 VP.',
    rule:
      'When taking the Recruit Action, the Chronobot takes a Worker type it does not yet have, following the priority order below. If this Worker type is unavailable, it takes an available type, following the priority order. It does not receive its respective Recruit bonus; however, it receives 1 VP regardless of the Worker type.\n\nGenius > Administrator > Engineer > Scientist\n\nOnce it has at least one of all 4 Worker types, it discards one of each and gains 5 VPs.',
    placesExosuit: true,
  },
  'recruit-genius-research': {
    id: 'recruit-genius-research',
    label: 'Recruit Genius / Research',
    summary: 'Recruit a Genius (+1 VP) if available, otherwise do a Research action.',
    jit: 'If a Genius is available, recruit it with +1 VP (even if it already has a Genius); otherwise perform a Research action.',
    rule:
      'When using the Recruit Genius/Research Action, perform a Recruit Action (see previous page) only if a Genius is available, taking it along with 1 VP (even the Chronobot already has a Genius). If no Genius is available, perform a Research Action instead (see above).',
    placesExosuit: true,
  },
  'mine-resource': {
    id: 'mine-resource',
    label: 'Mine Resource',
    summary: 'Gain the 2 Resources it wants most from a single Mine space.',
    jit: 'Prioritises Resources it lacks; ties break Neutronium > Uranium > Gold > Titanium. Once it holds all 4 types, discard one of each for +5 VP.',
    rule:
      'When taking the Mine Resource Action, the Chronobot determines which 2 Resources it wants the most.\n\n• It prioritizes Resources it does not have.\n• If tied, it chooses based on the following priority:\n\nNeutronium > Uranium > Gold > Titanium\n\nThen, it takes the Mine Resource Action space from which these 2 Resources can be gained. If multiple possibilities are available, it selects the topmost one.\n\nOnce it has at least one of all 4 Resource types, it discards one of each and gains 5 VPs.',
    placesExosuit: true,
  },
  'time-travel': {
    id: 'time-travel',
    label: 'Time Travel',
    summary: 'Remove one of its Warp tiles from the past; advance the Time Travel track.',
    jit: 'Places NO Exosuit. If no Warp tiles remain on the Timeline, the action is Failed (+1 VP).',
    rule:
      'When “Time Travel” is selected, it removes any one Warp tile from the past Timeline tile where the Chronobot has the most Warp tiles (oldest if tied). If a Warp tile was removed the Chronobot advances one step on the Time Travel track.\n\nThe Chronobot does not place any Exosuits on a Time Travel Action. If there are no Warp tiles left on the Timeline, the Action is failed, and it scores 1 VP as usual.',
    placesExosuit: false,
  },
  'remove-anomaly': {
    id: 'remove-anomaly',
    label: 'Remove Anomaly',
    summary: 'Discard 2 Resource cubes to remove 1 Anomaly.',
    jit: 'Discard the Resources it has most of; ties: Titanium > Gold > Uranium > Neutronium. One Neutronium = two cubes.',
    rule:
      'Each time “Remove Anomaly” is selected, it discards any 2 Resource cubes. Choose Resources it has the most of; if tied, the order of priority is:\n\nTitanium > Gold > Uranium > Neutronium\n\n1 Neutronium cube is equal to 2 non-Neutronium cubes when calculating priority and discarding. Then, if it has the Resources to discard, it removes 1 Anomaly. If it doesn’t have an Anomaly or the Resources to remove one, it takes 1 VP instead as usual for Failed Actions.',
    placesExosuit: false,
  },
  reboot: {
    id: 'reboot',
    label: 'Reboot',
    summary: 'Do nothing (not a Failed Action, no VP).',
    jit: 'The Chronobot simply does nothing. Not a Failed Action; no VP.',
    rule:
      'Each time “Reboot” is selected, the Chronobot simply does nothing. This does not count as a Failed Action, and it does not receive 1 VP.',
    placesExosuit: false,
  },
  'construct-factory': {
    id: 'construct-factory',
    label: 'Construct — Factory',
    summary: 'Take the higher-VP Factory (max 3 of a type).',
    jit: 'Higher-VP building; secondary stack if tied. Already 3? Failed Action.',
    rule: CONSTRUCT_RULE,
    placesExosuit: true,
  },
  'construct-lab': {
    id: 'construct-lab',
    label: 'Construct — Lab',
    summary: 'Take the higher-VP Lab (max 3 of a type).',
    jit: 'Higher-VP building; secondary stack if tied. Already 3? Failed Action.',
    rule: CONSTRUCT_RULE,
    placesExosuit: true,
  },
  'construct-powerplant': {
    id: 'construct-powerplant',
    label: 'Construct — Power Plant',
    summary: 'Take the higher-VP Power Plant (max 3 of a type).',
    jit: 'Higher-VP building; secondary stack if tied. Already 3? Failed Action.',
    rule: CONSTRUCT_RULE,
    placesExosuit: true,
  },
  'construct-support': {
    id: 'construct-support',
    label: 'Construct — Life Support',
    summary: 'Take the higher-VP Life Support (max 3 of a type).',
    jit: 'Higher-VP building; secondary stack if tied. Already 3? Failed Action.',
    rule: CONSTRUCT_RULE,
    placesExosuit: true,
  },
  'construct-superproject': {
    id: 'construct-superproject',
    label: 'Construct — Superproject',
    summary: 'Discard a Breakthrough; take the highest-VP face-up Superproject.',
    jit: 'Discard the Breakthrough it has most of (random if tied); take the highest-VP face-up Superproject (oldest if tied). No Breakthrough or already 3? Failed Action.',
    rule:
      CONSTRUCT_RULE +
      '\n\nWhen Constructing a Superproject, the Chronobot first discards a Breakthrough (of any shape or icon; if it has multiples, it discards one of whichever it has the most of—choose one randomly if tied). Then, it takes the highest-VP, face-up Superproject from the Present or any past Era (oldest if tied).\n\nIf “Construct Superproject” is rolled and the Chronobot does not have a Breakthrough to discard or it already has 3 Superprojects, it does nothing (but it still places an Exosuit to block a Construct Action space and takes the 1 VP as usual for Failed Actions).',
    placesExosuit: true,
  },
  evacuation: {
    id: 'evacuation',
    label: 'Evacuation',
    summary: 'The Chronobot never takes the Evacuation action.',
    jit: 'The Chronobot never takes Evacuation.',
    rule: 'The Chronobot never takes the Evacuation Action.',
    placesExosuit: false,
  },
};

export function actionDef(id: ChronobotActionId): ChronobotActionDef {
  return CHRONOBOT_ACTIONS[id];
}
