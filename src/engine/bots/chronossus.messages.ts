// English defaults for every instruction the Chronossus and its modules emit.
//
// Per-bot, and beside the bot it belongs to (the plan's D10): a new module ships its own
// message file the same way it ships its own tiles and rules, rather than editing one
// central catalog every module touches. `src/i18n/surface.ts` folds them all in.
//
// The Chronossus's name is written INTO these sentences rather than passed as a `{bot}`
// param — a proper noun dropped into a slot cannot take a case ending or agree with an
// article, and the two bots share only 9 of their 79 strings anyway (D8).
//
// Two rules when adding one (D2 and D4):
//   * A mid-sentence branch is its own key, never a param — `.placing` / `.plain` below.
//   * A counted noun is a `.one` / `.other` pair emitted through `plural()`.

export const CHRONOSSUS_MESSAGES: Record<string, string> = {
  // --- Power Up phase -----------------------------------------------------------
  // Three keys rather than one with two ternaries: whether Guardians power up, and
  // whether any Exosuits are left after them, are different sentences.
  'instr.chronossus.powerUp.exosuits': "Power up {n} of the Chronossus's Exosuits.",
  'instr.chronossus.powerUp.guardiansAndExosuits':
    "Power up {guardians} of the Chronossus's Guardians and {n} of its Exosuits.",
  'instr.chronossus.powerUp.guardiansOnly':
    "Power up {guardians} of the Chronossus's Guardians (that uses up its whole number — no Exosuits power up).",
  'instr.chronossus.powerUp.drew.one':
    'Drew {n} token from the Energy Pool: {energized} Energy + {exhausted} Exhausted.',
  'instr.chronossus.powerUp.drew.other':
    'Drew {n} tokens from the Energy Pool: {energized} Energy + {exhausted} Exhausted.',
  // Before/after the Impact are separate keys rather than a {when} param: a conditional
  // English word dropped into a slot has no grammatical home in another language (D2).
  'instr.chronossus.powerUp.sum.before.one':
    '{base}+{energized} = {n} Exosuit (max {cap} before the Impact).',
  'instr.chronossus.powerUp.sum.before.other':
    '{base}+{energized} = {n} Exosuits (max {cap} before the Impact).',
  'instr.chronossus.powerUp.sum.after.one':
    '{base}+{energized} = {n} Exosuit (max {cap} after the Impact).',
  'instr.chronossus.powerUp.sum.after.other':
    '{base}+{energized} = {n} Exosuits (max {cap} after the Impact).',
  'instr.chronossus.powerUp.guardiansFirst.one':
    'It powers up its {n} Guardian first, then its own Exosuits.',
  'instr.chronossus.powerUp.guardiansFirst.other':
    'It powers up its {n} Guardians first, then its own Exosuits.',
  'instr.chronossus.powerUp.bonusVp':
    'Difficulty: +1 free Exosuit would exceed the max of {max} — +{vp} VP instead.',
  'instr.chronossus.powerUp.freeExosuit': 'Difficulty: +1 free Exosuit ({total} total).',
  'instr.chronossus.powerUp.returnCore':
    'Return 1 drawn Exhausted core to the Pool and remove the rest from the game.',
  'instr.chronossus.powerUp.returnNone':
    'Remove all drawn tokens from the game (no Exhausted core to return).',

  // --- The rolled turn ----------------------------------------------------------
  'instr.chronossus.turn.action': 'The Chronossus takes the "{action}" action.',

  // --- No-space fallbacks -------------------------------------------------------
  'instr.chronossus.noSpace.guardianBoard':
    "No Action space remained (including World Council) — place one of the Chronossus's Guardians on the Guardian board, on a slot marked with one of its Path markers, and perform the Action normally.",
  'instr.chronossus.noSpace.guardianBoard.detail':
    'It does not matter which of its marked slots you use. This is NOT a Failed Action, so it takes no +1 VP.',
  'instr.chronossus.noSpace.hypersyncTile':
    'No Action space remained — the Chronossus places a Solo Hypersync tile above Era {era} and performs the Action normally (no Exosuit placed, not a Failed Action).',
  'instr.chronossus.noSpace.hypersyncTile.detail':
    'It has a maximum of one Hypersync tile per Era and 3 pending Hypersync tiles total.',
  'instr.chronossus.noSpace.hypersyncFail':
    'No Action space remained and no Solo Hypersync tile could be placed (max one per Era, 3 pending) — Failed Action: the Chronossus takes +{vp} VP and additionally discards one active Exosuit.',
  'instr.chronossus.noSpace.fail':
    'No available Action space — the Chronossus takes +{vp} VP and additionally discards one active Exosuit (no Exosuit placed).',

  // --- Off-Main-board placements ------------------------------------------------
  // Where the figure goes. Each is a whole clause filling {where} below, so a translator
  // has something they can inflect.
  'instr.chronossus.place.where.adventure': "the Adventure board's hex pool space",
  'instr.chronossus.place.where.valleyCapital':
    'the Valley Capital Action space (no Valley Action space was free)',
  'instr.chronossus.place.where.valleyTopmost': 'the topmost available Valley Action space',
  'instr.chronossus.place.blink': 'Blink: move that Exosuit to {where} instead of placing a new one.',
  'instr.chronossus.place.blink.detail': "Return the moved Exosuit's Energy Core to the supply.",
  // Exosuit and Guardian are separate keys: the player picks up a different miniature.
  'instr.chronossus.place.exosuit': "Place the Chronossus's Exosuit on {where}.",
  'instr.chronossus.place.guardian': "Place the Chronossus's Guardian on {where}.",
  'instr.chronossus.place.detail.adventure':
    'Any number of figures can share the Adventure hex pool.',
  'instr.chronossus.place.experiment.exosuit':
    "Place the Chronossus's Exosuit on the Experiment hex pool space.",
  'instr.chronossus.place.experiment.guardian':
    "Place the Chronossus's Guardian on the Experiment hex pool space.",
  'instr.chronossus.place.detail.experiment':
    'Any number of figures can share the Experiment hex pool.',

  // --- Failed Actions -----------------------------------------------------------
  // The two halves of what was one string with a ternary in the middle (D2).
  'instr.chronossus.failed.placing':
    'Failed Action: {reason} — the Chronossus places an Exosuit and takes +{vp} VP instead.',
  'instr.chronossus.failed.plain':
    'Failed Action: {reason} — the Chronossus takes +{vp} VP instead.',
  // Why it failed. Each is a whole clause that fills {reason}, never a word.
  'instr.chronossus.reason.noAnomaly': 'it has no Anomaly to remove',
  'instr.chronossus.reason.lacksCubes': 'it lacks 2 Resource cubes to spend',
  'instr.chronossus.reason.threeBuildings': 'it already has 3 {building} buildings',
  'instr.chronossus.reason.threeSuperprojects': 'it already has 3 Superprojects',
  'instr.chronossus.reason.noBreakthrough': 'it has no Breakthrough to discard',

  // --- Actions ------------------------------------------------------------------
  'instr.chronossus.reboot': 'Reboot: the Chronossus does nothing (no Exosuit, no VP).',
  'instr.chronossus.recruitGenius.genius': 'Recruit a Genius for the Chronossus (+1 VP).',
  'instr.chronossus.recruitGenius.research':
    'No Genius available — perform a Research action instead.',
  'instr.chronossus.mine.gained': 'Mine {cubes} for the Chronossus.',
  'instr.chronossus.mine.detail':
    'Prioritises Resources it lacks; ties Neutronium > Uranium > Gold > Titanium.',
  'instr.chronossus.mine.set':
    'The Chronossus holds all 4 Resource types — discard one of each and add 5 VP.',
  'instr.chronossus.removeAnomaly.plain':
    'Discard {cubes} from the Chronossus and remove 1 Anomaly.',
  // Variable Anomalies: the removed tile's own penalty is named, so it is its own key
  // rather than a fragment spliced into the sentence above.
  'instr.chronossus.removeAnomaly.variable':
    'Discard {cubes} from the Chronossus and remove its largest-penalty Anomaly ({vp} VP).',
  'instr.chronossus.removeAnomaly.detail':
    'Discards the Resources it has most of; ties Titanium > Gold > Uranium > Neutronium (1 Neutronium = 2 cubes).',
  'instr.chronossus.construct.knownVp':
    'Give the Chronossus the higher-VP {building} (secondary stack if tied) — {vp} VP.',
  'instr.chronossus.construct.recordVp':
    'Give the Chronossus the higher-VP {building} (secondary stack if tied); record its printed VP.',
  'instr.chronossus.superproject.knownVp':
    'Discard 1 {shape} Breakthrough, then give the Chronossus the highest-VP face-up Superproject (oldest if tied) — {vp} VP.',
  'instr.chronossus.superproject.recordVp':
    'Discard 1 {shape} Breakthrough, then give the Chronossus the highest-VP face-up Superproject (oldest if tied); record its VP.',
  'instr.chronossus.evacuation': 'The Chronossus does not take Evacuation here.',
  'instr.chronossus.research.roll':
    'Research: roll the shape die and give the Chronossus any Breakthrough of the rolled shape.',
  'instr.chronossus.research.rolled':
    'Research: the shape die shows {shape} — give the Chronossus any Breakthrough of that shape.',
  'instr.chronossus.recruit.worker': 'Recruit a {worker} for the Chronossus (+1 VP).',
  // The +5 VP Worker set. Sentence-cased in the catalog rather than by a `capitalize()`
  // at the call site — a language may not capitalise the same word, and the caller can no
  // longer reach inside the string to do it.
  'instr.chronossus.workerSet.plain':
    'The Chronossus holds all 4 Worker types — discard one of each and add 5 VP',
  'instr.chronossus.workerSet.operators.one':
    'The Chronossus holds all 4 Worker types — discard one of each and add 5 VP ({n} of the discarded tokens is an Operator — return it to the Valley supply)',
  'instr.chronossus.workerSet.operators.other':
    'The Chronossus holds all 4 Worker types — discard one of each and add 5 VP ({n} of the discarded tokens are Operators — return them to the Valley supply)',
  'instr.chronossus.research.difficulty':
    "Research (difficulty): the Chronossus takes a Breakthrough shape it doesn't already have (or has the fewest of) — give it any Breakthrough of the {shape} shape.",

  // --- Modular tiles ------------------------------------------------------------
  // The tile line and its Autoleap variant are whole sentences, not a sentence plus an
  // appended clause (D2) — a language may not put the extra step last.
  'instr.chronossus.tile.line': '{code} {name}: the Chronossus {gains}.',
  'instr.chronossus.tile.lineAutoleap':
    '{code} {name}: the Chronossus {gains}. Then advance its Command marker to the next position (Autoleap).',
  'instr.chronossus.tile.nothing': '{code} {name}: the Chronossus does nothing.',
  'instr.chronossus.tile.nothingAutoleap':
    '{code} {name}: the Chronossus does nothing. Then advance its Command marker to the next position (Autoleap).',
  'instr.chronossus.tile.autoleap':
    '{code} {name}: advance its Command marker to the next position (Autoleap).',
  // What a tile granted, as clauses the line above joins.
  'instr.chronossus.tile.gain.vp': 'gains {n} VP',
  'instr.chronossus.tile.gain.energyCore.one': 'gains {n} Energy Core',
  'instr.chronossus.tile.gain.energyCore.other': 'gains {n} Energy Cores',
  'instr.chronossus.tile.gain.fluxCore.one': 'gains {n} Flux Core into the Flux Pool',
  'instr.chronossus.tile.gain.fluxCore.other': 'gains {n} Flux Cores into the Flux Pool',

  // --- Assimilate (Fractures' C04/C14) ------------------------------------------
  'instr.chronossus.assimilate.noOperators':
    'finds no Operators left — Failed Action: it takes +1 VP instead',
  'instr.chronossus.assimilate.operator':
    'recruits an Operator (place it in the {slot} space — the topmost empty space of its Worker collection) and gains 1 Flux Core into the Flux Pool',
  'instr.chronossus.assimilate.technology':
    'takes a Technology card (preferring the secondary stack) — worth 3 VP at the end',

  // --- Guardians: the Acquire Guardian Action (C11) ------------------------------
  'instr.chronossus.guardian.postImpact2VP':
    'The Impact has happened, so the Chronossus can no longer acquire Guardians — difficulty option: it scores 2 VP instead.',
  'instr.chronossus.guardian.postImpactFail':
    'The Impact has happened, so the Chronossus can no longer acquire Guardians — Failed Action: it takes +{vp} VP.',
  'instr.chronossus.guardian.noneAvailable':
    'No Guardian is available to recruit — Failed Action: the Chronossus takes +{vp} VP.',
  // Exosuit and Guardian are separate keys: a different miniature comes off the table.
  'instr.chronossus.guardian.worldCouncil.exosuit':
    "Place the Chronossus's Exosuit on the World Council Action space — it becomes the First Player. It performs no Action there; instead it recruits the leftmost available Guardian at no cost.",
  'instr.chronossus.guardian.worldCouncil.guardian':
    "Place the Chronossus's Guardian on the World Council Action space — it becomes the First Player. It performs no Action there; instead it recruits the leftmost available Guardian at no cost.",
  'instr.chronossus.guardian.worldCouncil.detail':
    "Put one of the Chronossus's Path markers on an empty Guardian board slot for it — that slot becomes this Guardian's own Action space. (Solo Path markers are not meant to be limited: if they run out, use an unused Path's markers.)",
  'instr.chronossus.guardian.worker':
    'The World Council Action space is taken — the Chronossus spends a {worker} and recruits the leftmost available Guardian without placing an Exosuit.',
  'instr.chronossus.guardian.worker.detail':
    "Worker priority: the one it has most of, then Scientist > Engineer > Administrator > Genius. Put one of the Chronossus's Path markers on an empty Guardian board slot for the new Guardian — that slot becomes its own Action space.",
  'instr.chronossus.guardian.noWorkers':
    'It has no Workers left to spend on a Guardian — Failed Action: the Chronossus takes +{vp} VP.',

  // --- Time Travel --------------------------------------------------------------
  // Two failure keys rather than a {why} fragment: they read as different sentences.
  'instr.chronossus.timeTravel.failCurrentEra':
    'The Chronossus’s only Warp tiles are on the current Era’s Timeline tile, which Time Travel may not take from — Time Travel is Failed; the Chronossus takes +{vp} VP (no Exosuit).',
  'instr.chronossus.timeTravel.failNone':
    'No Warp tiles remain on the Timeline — Time Travel is Failed; the Chronossus takes +{vp} VP (no Exosuit).',
  'instr.chronossus.timeTravel.done':
    'Remove one of the Chronossus’s Warp tiles from {tile}; advance its Time Travel marker 1 spot.',
  'instr.chronossus.timeTravel.done.detail': 'The marker is now worth {vp} VP.',

  // --- Passing ------------------------------------------------------------------
  'instr.chronossus.pass':
    'The Chronossus is out of Exosuits and passes. (Its Command token does not advance.)',

  // --- Hypersync (C12/C13) ------------------------------------------------------
  'instr.chronossus.hypersync.turn': 'The Chronossus takes the "{name}" action ({code}).',
  'instr.chronossus.hypersync.where.hex': 'Hypersync hex {hex}',
  'instr.chronossus.hypersync.where.matching':
    'the Hypersync space matching your furthest-in-the-past pending tile',
  // Exosuit and Guardian are separate keys: a different miniature comes off the table.
  'instr.chronossus.hypersync.send.exosuit':
    'Send an Exosuit to {where}; the Chronossus scores 2 VP and retrieves its pending Solo Hypersync tile from Era {era}.',
  'instr.chronossus.hypersync.send.guardian':
    'Send a Guardian to {where}; the Chronossus scores 2 VP and retrieves its pending Solo Hypersync tile from Era {era}.',
  'instr.chronossus.hypersync.send.detail':
    'Do NOT advance the Time Travel marker. In post-Impact Eras it ignores the printed effect of Supercharge tiles.',
  'instr.chronossus.hypersync.fail':
    'Neither a Hypersync nor a Time Travel Action is possible — Failed Action: the Chronossus takes +{vp} VP.',
  'instr.chronossus.hypersync.bonus.energyCore.one':
    'Finally, the Chronossus gains {n} Energy Core.',
  'instr.chronossus.hypersync.bonus.energyCore.other':
    'Finally, the Chronossus gains {n} Energy Cores.',
  'instr.chronossus.hypersync.bonus.vp': 'The Chronossus gains {n} VP instead of an Energy Core.',

  // --- Paradox phase ------------------------------------------------------------
  'instr.chronossus.paradox.capped':
    'The Chronossus already has 3 Anomalies — it gains no Anomaly and removes no Warp tile. It stops rolling.',
  'instr.chronossus.paradox.anomalyVariable':
    'The Chronossus rolls +{gain} Paradox — reaching 3, so it gains an Anomaly and stops rolling.',
  'instr.chronossus.paradox.anomaly':
    'The Chronossus rolls +{gain} Paradox — reaching 3, so it gains 1 Anomaly (−3 VP) and stops rolling.',
  'instr.chronossus.paradox.anomaly.removed':
    'Remove one of the Chronossus’s Warp tiles from {tile}. Its Paradox tracker resets to {n}.',
  'instr.chronossus.paradox.anomaly.none': 'It has no Warp tiles on the Timeline to remove.',
  'instr.chronossus.paradox.blank':
    'The Chronossus rolls a blank — no Paradox this roll. It keeps rolling.',
  'instr.chronossus.paradox.gain':
    'The Chronossus rolls +{gain} Paradox — its tracker is now {total}. It keeps rolling.',

  // --- Variable Anomalies (extra module) ----------------------------------------
  // Whether the tile also retrieves a Warp tile changes the sentence, not a word in it.
  'instr.chronossus.variableAnomaly.plain': 'The Chronossus takes the {vp} VP Anomaly.',
  'instr.chronossus.variableAnomaly.retrieves':
    'The Chronossus takes the {vp} VP Anomaly and retrieves a Warp tile.',
  'instr.chronossus.variableAnomaly.removed':
    'Remove one of the Chronossus’s Warp tiles from {tile}.',
  'instr.chronossus.variableAnomaly.none': 'It has no Warp tiles on the Timeline to remove.',

  // --- Warp phase ---------------------------------------------------------------
  // Where the tiles land — Era Zero (Fractures) is its own clause, not "Era 0".
  'instr.chronossus.warp.where.timeline': 'on the Timeline',
  'instr.chronossus.warp.where.eraZero': 'on the Era Zero tile',
  'instr.chronossus.warp.place.one': 'Place {n} Warp tile for the Chronossus {where}.',
  'instr.chronossus.warp.place.other': 'Place {n} Warp tiles for the Chronossus {where}.',
  'instr.chronossus.warp.none': 'The Chronossus places no Warp tiles this Era.',
  'instr.chronossus.warp.none.eraZero':
    'The Chronossus places no Warp tiles in the Era Zero Warp Phase.',
  'instr.chronossus.warp.detail':
    'Warping happens in player order. The Chronossus gains nothing for its Warp tiles and it does not matter which tiles it places. (You place your own 0–2 Warp tiles as normal.)',
  'instr.chronossus.warp.detail.eraZero':
    'You may not warp an Exosuit during the Era Zero Warp Phase.',
  'instr.chronossus.warp.detail.altTimelines':
    'Alternate Timelines: {spaces} landed on a positive-effect space — +{vp} VP ({each} each). It ignores negative-space penalties entirely.',

  // --- Quantum Loops (extra module) ---------------------------------------------
  'instr.chronossus.quantumLoops.removes':
    'Remove the Quantum Loop card **farthest from the draw deck** from play — permanently.',
  'instr.chronossus.quantumLoops.keeps': 'No Quantum Loop card is removed this Warp Phase.',
  'instr.chronossus.quantumLoops.rolled':
    'The Chronossus placed a Warp tile, so it rolled the AI die: {roll}.',
  'instr.chronossus.quantumLoops.gone':
    'It never returns a card, so this one is out of the game for good.',
  'instr.chronossus.quantumLoops.vp': 'It also receives {vp} VP for the removal.',
  // The roll a removal needs, as whole sentences — the difficulty option changes which.
  'instr.chronossus.quantumLoops.onlyOn4': 'A card is only removed on a roll of 4.',
  'instr.chronossus.quantumLoops.onlyOn4or5': 'A card is only removed on a roll of 4 or 5.',

  // --- Clean Up -----------------------------------------------------------------
  'instr.chronossus.cleanUp.retrieve': "Retrieve the Chronossus's Exosuits along with your own.",
  'instr.chronossus.cleanUp.collapse':
    'After the Impact, follow the usual procedure for flipping Collapsing Capital tiles.',
  'instr.chronossus.cleanUp.casings.one':
    'Return the {n} Empty Flux Casing set aside this Era to the Flux Pool.',
  'instr.chronossus.cleanUp.casings.other':
    'Return the {n} Empty Flux Casings set aside this Era to the Flux Pool.',
  'instr.chronossus.cleanUp.adventureMarkers':
    "Retrieve the Chronossus's Path markers from the Power slots next to the Adventure Action space, along with your own.",
};
