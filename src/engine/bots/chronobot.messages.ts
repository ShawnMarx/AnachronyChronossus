// English defaults for every instruction the Chronobot emits.
//
// Per-bot, and beside the bot it belongs to: a new module ships its own message file the
// same way it ships its own tiles and rules, rather than editing one central catalog that
// every module touches. `src/i18n/surface.ts` folds them all in.
//
// The Chronobot's name is written INTO these sentences rather than passed as a `{bot}`
// param. Of the 79 instruction strings the two bots emit, only 9 are identical once the
// name is normalised away — so sharing would have saved almost nothing, and a proper noun
// dropped into a slot cannot take a case ending or agree with an article.
//
// Two rules when adding one (see the plan's D2 and D4):
//   * A mid-sentence branch is its own key, never a param — `.placing` / `.plain` below.
//   * A counted noun is a `.one` / `.other` pair emitted through `plural()`.

export const CHRONOBOT_MESSAGES: Record<string, string> = {
  // --- Setup --------------------------------------------------------------------
  'instr.chronobot.setup.board':
    'Use the Chronobot side of the Solo board; place it next to the Main board.',
  'instr.chronobot.setup.exosuits': 'Give the Chronobot its 6 Exosuits and 8 Warp tiles.',
  'instr.chronobot.setup.exosuits.detail': 'It receives no Starting Assets and no Workers.',
  'instr.chronobot.setup.commands':
    'Place the 4 Command tokens on the 4 marked positions on the Chronobot board.',
  'instr.chronobot.setup.commands.detail':
    'The Chronobot does not use a Focus marker. Its die is the AI die (the Flux die reused).',
  'instr.chronobot.setup.banner':
    "Place the Chronobot's Banner on the First Player spot — it is First Player in Era 1.",
  'instr.chronobot.setup.banner.detail':
    'You take 1 additional Water for being the second player.',
  'instr.chronobot.setup.endgame': 'Leave all Endgame Condition cards in the box.',
  'instr.chronobot.setup.player':
    'Choose the "A" or "B" side of your Player board and set up your own game normally.',

  // --- Paradox phase ------------------------------------------------------------
  'instr.chronobot.paradox.capped':
    'The Chronobot already has 3 Anomalies — it gains no Anomaly and removes no Warp tile. It stops rolling.',
  'instr.chronobot.paradox.anomaly':
    'The Chronobot rolls +{gain} Paradox — reaching 3, so it gains 1 Anomaly (−3 VP) and stops rolling.',
  'instr.chronobot.paradox.anomaly.removed':
    'Remove one of the Chronobot’s Warp tiles from {tile}. Its Paradox tracker resets to {n}.',
  'instr.chronobot.paradox.anomaly.none':
    'It has no Warp tiles on the Timeline to remove.',
  'instr.chronobot.paradox.blank':
    'The Chronobot rolls a blank — no Paradox this roll. It keeps rolling.',
  'instr.chronobot.paradox.gain':
    'The Chronobot rolls +{gain} Paradox — its tracker is now {total}. It keeps rolling.',

  // --- Power Up phase -----------------------------------------------------------
  'instr.chronobot.powerUp': "Power up {n} of the Chronobot's Exosuits.",
  'instr.chronobot.powerUp.detail':
    'Eras 1–4 power up 6 Exosuits; Eras 5–7 power up 4 (this is Era {era}). It neither gains nor spends Energy Cores or Water. Pile the powered-up Exosuit markers on the upper-right hex slot.',

  // --- Warp phase ---------------------------------------------------------------
  'instr.chronobot.warp.place.one': 'Place {n} Warp tile for the Chronobot on the Timeline.',
  'instr.chronobot.warp.place.other': 'Place {n} Warp tiles for the Chronobot on the Timeline.',
  'instr.chronobot.warp.none': 'The Chronobot places no Warp tiles this Era.',
  'instr.chronobot.warp.detail':
    'Warping happens in player order. The Chronobot gains nothing for its Warp tiles and it does not matter which tiles it places. (You place your own 0–2 Warp tiles as normal.)',

  // --- The rolled turn ----------------------------------------------------------
  'instr.chronobot.turn.die':
    'AI die shows {die} → the Command token with that number performs the "{action}" action on its space, then advances along its colored arrow.',

  // --- Failed Actions -----------------------------------------------------------
  'instr.chronobot.failed.noSpace':
    'No available Action space — the Chronobot does NOT place an Exosuit and takes +1 VP.',
  // The two halves of what was one string with a ternary in the middle.
  'instr.chronobot.failed.placing':
    'Failed Action: {reason} — the Chronobot places an Exosuit and takes +1 VP instead.',
  'instr.chronobot.failed.plain':
    'Failed Action: {reason} — the Chronobot takes +1 VP instead.',
  // Why the Action failed. Each is a fragment that fills {reason} above — and each is a
  // whole clause, never a word, so a translator has something they can actually inflect.
  'instr.chronobot.reason.noAnomaly': 'it has no Anomaly to remove',
  'instr.chronobot.reason.lacksCubes': 'it lacks 2 Resource cubes to spend',
  'instr.chronobot.reason.threeBuildings': 'it already has 3 {building} buildings',
  'instr.chronobot.reason.threeSuperprojects': 'it already has 3 Superprojects',
  'instr.chronobot.reason.noBreakthrough': 'it has no Breakthrough to discard',

  // --- Actions ------------------------------------------------------------------
  'instr.chronobot.reboot':
    'Reboot: the Chronobot does nothing (no Exosuit, no VP, not a Failed Action).',
  'instr.chronobot.recruitGenius.genius': 'Recruit a Genius for the Chronobot (+1 VP).',
  'instr.chronobot.recruitGenius.research':
    'No Genius available — perform a Research action instead.',
  'instr.chronobot.removeAnomaly.done':
    'Discard {cubes} from the Chronobot and remove 1 Anomaly.',
  'instr.chronobot.removeAnomaly.detail':
    'Discards the Resources it has most of; ties: Titanium > Gold > Uranium > Neutronium (1 Neutronium = 2 cubes).',
  'instr.chronobot.construct.knownVp':
    'Give the Chronobot the higher-VP {building} (secondary stack if tied) — worth {vp} VP. Add {vp} to its score, then discard the tile.',
  'instr.chronobot.construct.recordVp':
    'Give the Chronobot the higher-VP {building} (secondary stack if tied); record its printed VP, then discard the tile.',
  'instr.chronobot.superproject.knownVp':
    'Discard 1 {shape} Breakthrough, then give the Chronobot the highest-VP face-up Superproject (oldest if tied) — worth {vp} VP. Add {vp} to its score.',
  'instr.chronobot.superproject.recordVp':
    'Discard 1 {shape} Breakthrough, then give the Chronobot the highest-VP face-up Superproject (oldest if tied); record its VP.',
  'instr.chronobot.evacuation':
    'The Chronobot never takes Evacuation — advance the token per the board routing.',

  // --- Time Travel --------------------------------------------------------------
  // Two failure keys rather than a `{why}` fragment: the two read as different sentences.
  'instr.chronobot.timeTravel.failCurrentEra':
    'The Chronobot’s only Warp tiles are on the current Era’s Timeline tile, which Time Travel may not take from — Time Travel is Failed; the Chronobot takes +1 VP (no Exosuit).',
  'instr.chronobot.timeTravel.failNone':
    'No Warp tiles remain on the Timeline — Time Travel is Failed; the Chronobot takes +1 VP (no Exosuit).',
  'instr.chronobot.timeTravel.done':
    'Remove one of the Chronobot’s Warp tiles from {tile}; advance its Time Travel marker 1 spot along the track.',
  'instr.chronobot.timeTravel.done.detail':
    'Time Travel places no Exosuit. The marker is now worth {vp} VP.',

  // --- Research -----------------------------------------------------------------
  'instr.chronobot.research.rolled':
    'Research: the shape die shows {shape} — give the Chronobot any Breakthrough of that shape.',
  'instr.chronobot.research.roll':
    'Research: roll the shape die and give the Chronobot any Breakthrough of the rolled shape.',

  // --- Recruit ------------------------------------------------------------------
  'instr.chronobot.recruit.worker': 'Recruit a {worker} for the Chronobot (+1 VP).',
  'instr.chronobot.recruit.detail':
    'Priority: Genius > Administrator > Engineer > Scientist. If unavailable, take the next available type by that order (still +1 VP). No Recruit bonus.',
  'instr.chronobot.recruit.set':
    'The Chronobot now holds all 4 Worker types — discard one of each and add 5 VP to its score.',

  // --- Mine ---------------------------------------------------------------------
  'instr.chronobot.mine.gained':
    'Mine: give the Chronobot {cubes} from the Mine space you used.',
  'instr.chronobot.mine.detail':
    'It wants the 2 Resources it has fewest of, decided one pick at a time; ties: Neutronium > Uranium > Gold > Titanium. Completing the set of all 4 is what it is after, so a Resource it has none of always comes first.',
  'instr.chronobot.mine.set':
    'The Chronobot now holds all 4 Resource types — discard one of each and add 5 VP to its score.',

  // --- Passing ------------------------------------------------------------------
  'instr.chronobot.pass.finalTimeTravel':
    'The Chronobot is out of Exosuits — it takes one final Time Travel Action, then passes.',
  'instr.chronobot.pass.already': 'The Chronobot has already passed for this Era.',
  'instr.chronobot.pass.playerPassed':
    'You passed and the Chronobot has taken its minimum {min} Actions — the Action Rounds Phase ends immediately.',
  'instr.chronobot.pass.plain': 'The Chronobot passes for this Era.',

  // --- Clean Up -----------------------------------------------------------------
  'instr.chronobot.cleanUp.retrieve': "Retrieve the Chronobot's Exosuits along with your own.",
  'instr.chronobot.cleanUp.collapse':
    'After the Impact, follow the usual procedure for flipping Collapsing Capital tiles.',
};
