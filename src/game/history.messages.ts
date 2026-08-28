// English defaults for the History change-lists both bots build.
//
// The summarizers' lines are PERSISTED with each turn, which is exactly why they are
// descriptors: a saved sentence freezes in the wording — and the language — that wrote it,
// while a saved `{key, params}` is re-rendered on every read. `src/engine/messages.ts`
// folds this in and `src/i18n/surface.ts` publishes it.
//
// A counted noun is a `.one` / `.other` pair (D4), and here the singular usually drops the
// number entirely ("Gained gold", not "Gained 1 gold") — which is precisely why the two
// forms are separate strings rather than one with an `s` glued on.

export const HISTORY_MESSAGES: Record<string, string> = {
  // --- Entry labels ---------------------------------------------------------------
  // The one-line label a History entry carries. `game/historyLabels.ts` decides what an
  // entry MEANS from these keys, so they are a contract, not just text: every phase row
  // carries `era` and `phase` (the phase ID, not its name) so the pane can pair an
  // "entered" row with the result that supersedes it.
  'hist.label.enteredPhase': 'Era {era} · → {name}',
  'hist.label.phaseResult': 'Era {era} · {text}',
  'hist.label.botTurn': 'Era {era} · {action}',
  'hist.label.botTurn.vp': 'Era {era} · {action} · +{vp} VP',
  'hist.label.autoleap': 'Autoleap — {action}',
  'hist.label.youPassed': 'Era {era} · You passed',
  'hist.label.botPassed': 'Era {era} · Bot passed',
  'hist.label.chronossusPassed': 'Era {era} · Chronossus passed',
  'hist.label.botTimeTravelPass': 'Era {era} · Bot: Time Travel + pass',
  'hist.label.endGame': 'Era {era} · → End Game',

  // What a phase did — nested into `hist.label.phaseResult` as `{text}`.
  'hist.phase.powerUp.one': 'Power Up: {n} Exosuit',
  'hist.phase.powerUp.other': 'Power Up: {n} Exosuits',
  'hist.phase.paradoxRoll': 'Paradox roll (+{n})',
  'hist.phase.warp': 'Warp: placed {n}',
  'hist.phase.variableAnomaly': 'Variable Anomaly gained',

  // --- Phase effects ----------------------------------------------------------------
  'hist.paradoxTracker': 'Paradox tracker → {n}/3',
  'hist.anomalyGained': 'Gained 1 Anomaly (−3 VP)',
  'hist.anomalyGained.variable': 'Gained an Anomaly — resolve which Variable Anomaly tile',
  'hist.warpTileRemoved': 'Warp tile removed from the Timeline',
  'hist.warpPlaced.one': 'Placed {n} Warp tile on the Timeline',
  'hist.warpPlaced.other': 'Placed {n} Warp tiles on the Timeline',
  // Fractures' Era Zero Warp puts them on a tile with its own name, not on "the Timeline".
  'hist.warpPlacedEraZero.one': 'Placed {n} Warp tile on the Era Zero tile',
  'hist.warpPlacedEraZero.other': 'Placed {n} Warp tiles on the Era Zero tile',
  'hist.warpPlacedNone': 'Placed no Warp tiles',
  'hist.altTimelines.one': 'Alternate Timelines: +{vp} VP ({n} positive space)',
  'hist.altTimelines.other': 'Alternate Timelines: +{vp} VP ({n} positive spaces)',
  'hist.quantumLoops.removed':
    'Quantum Loops: rolled {roll} — removed the card **farthest from the draw deck**',
  'hist.quantumLoops.removedVp':
    'Quantum Loops: rolled {roll} — removed the card **farthest from the draw deck** (+{vp} VP)',
  'hist.quantumLoops.kept': 'Quantum Loops: rolled {roll} — no card removed',
  'hist.earthSavedNote': 'Earth is saved — the Impact never happens',
  'hist.fateSealedNote': '“Seal Fate” locked in — the Impact resolves at the end of this Era',
  'hist.impactOccurred': 'The Impact occurred at the end of Era {era}',
  'hist.anomalyVp': 'Anomaly VP: {vp}',
  // Who leads next Era: two keys, because "you" and "the Chronossus" are not
  // interchangeable words — one is a pronoun, the other a proper noun.
  'hist.firstPlayer.you': 'First Player next: you',
  'hist.firstPlayer.bot': 'First Player next: the Chronossus',

  // --- Power Up -----------------------------------------------------------------
  'hist.powerUp.drew': 'Drew {energized} Energy + {exhausted} Exhausted',
  'hist.powerUp.exosuits.one': 'Powered up {n} Exosuit',
  'hist.powerUp.exosuits.other': 'Powered up {n} Exosuits',
  'hist.powerUp.normalExosuits.one': 'Powered up {n} Normal Exosuit',
  'hist.powerUp.normalExosuits.other': 'Powered up {n} Normal Exosuits',
  'hist.powerUp.guardians.one': 'Powered up {n} Guardian',
  'hist.powerUp.guardians.other': 'Powered up {n} Guardians',
  'hist.powerUp.pool': 'Pool now {energized}/{exhausted}',

  // --- Passing ----------------------------------------------------------------------
  'hist.rolledOntoNeedsFigure': 'Rolled onto {action}, which needs a figure placed',
  'hist.outOfExosuitsPasses': 'Out of Exosuits — it passes',
  'hist.playerPassedMinMet':
    'You passed and it has taken its {min} Actions — the Action Rounds Phase ends',

  // --- The figure ----------------------------------------------------------------
  'hist.exosuitPlaced': 'Exosuit placed',
  'hist.exosuitDiscarded': 'Discarded an active Exosuit',
  'hist.failedAction': 'Failed action (+{vp} VP)',

  // --- Buildings -----------------------------------------------------------------
  'hist.buildingTaken': '{building} taken ({vp} VP)',
  'hist.superprojectTaken': 'Superproject taken ({vp} VP) · Breakthrough discarded',
  'hist.breakthroughTaken': 'Breakthrough taken ({shape})',

  // --- Workers and Resources ------------------------------------------------------
  'hist.recruited': 'Recruited {worker}',
  'hist.workerSet': 'Worker set completed — discard one of each (+5 VP)',
  'hist.gained.one': 'Gained {resource}',
  'hist.gained.other': 'Gained {n} {resource}',
  'hist.discarded.one': 'Discarded {resource}',
  'hist.discarded.other': 'Discarded {n} {resource}',
  'hist.resourceSet': 'Resource set completed — discard one of each (+5 VP)',

  // --- Anomalies and Time Travel ---------------------------------------------------
  'hist.anomalyRemoved': 'Removed 1 Anomaly',
  'hist.warpRemoved': 'Warp tile removed — Time Travel advances',

  // --- Lines the views add around the summarizer ---------------------------------
  'hist.finalTimeTravelPass': 'Out of Exosuits — its final Time Travel, then it passes',
  // `{flux}` is the Flux Core art token, swapped in by `history/HistoryText.tsx`; it and
  // the `**bold**` runs live INSIDE the string so a translator can move them.
  'hist.blink': '{flux} Blink — Exosuit moved from **{from}** to **{to}**',
  'hist.energyCore.one': '+{n} Energy Core',
  'hist.energyCore.other': '+{n} Energy Cores',

  // --- Fractures ------------------------------------------------------------------
  'hist.fluxCore.one': '+{n} Flux Core to the Flux Pool',
  'hist.fluxCore.other': '+{n} Flux Cores to the Flux Pool',
  'hist.technology.one': '+{n} Technology card (3 VP each at the end)',
  'hist.technology.other': '+{n} Technology cards (3 VP each at the end)',
  // Which Worker column the Operator filled is a whole clause, so "into the … column" is
  // not spliced in — the two readings are separate keys.
  'hist.operator': 'Recruited an Operator (wildcard Worker)',
  'hist.operator.column': 'Recruited an Operator into the {column} column (wildcard Worker)',

  // --- Guardians --------------------------------------------------------------------
  'hist.guardianAcquired.one': 'Acquired {n} Guardian',
  'hist.guardianAcquired.other': 'Acquired {n} Guardians',
  // "Spent 1 Engineer", not "Spent a Engineer": the Worker's name comes from `piece.*` and
  // is capitalised, and an English indefinite article cannot be chosen without knowing the
  // word that follows it — a problem every language has its own version of. The count
  // sidesteps it. (This is the one line whose wording this refactor changed.)
  'hist.guardianWorkerSpent': 'Spent 1 {worker} to acquire it',
  'hist.guardianPlaced.one': 'Placed {n} Guardian',
  'hist.guardianPlaced.other': 'Placed {n} Guardians',
  'hist.guardianPlacedBoard.one': 'Placed {n} Guardian on the **Guardian board**',
  'hist.guardianPlacedBoard.other': 'Placed {n} Guardians on the **Guardian board**',

  // --- Pioneers ---------------------------------------------------------------------
  'hist.adventure': 'Adventure succeeded',
  'hist.adventure.card': 'Adventure succeeded — took "{card}" (Power {power})',
  'hist.powerUpgrade': 'Power Upgrade: 1 {resource} onto the **Upgrade board** (+{power} Power)',
  'hist.powerUpgrade.tokens': 'Power Upgrade: +{n} VP token on the Upgrade board (Power, not VP)',

  // --- Doomsday ---------------------------------------------------------------------
  'hist.experiment': 'Executed an Experiment ({total} completed)',
  'hist.doomsdayTracker': 'Moved the {tracker} tracker one step',
  'hist.doomsdayTracker.vp': 'Moved the {tracker} tracker one step (+{vp} VP printed there)',
  'hist.earthSaved': 'Save Earth is topmost — the Impact is mitigated and the game ends',
  'hist.fateSealed': 'Seal Fate is bottommost — the Impact resolves immediately',

  // --- Hypersync --------------------------------------------------------------------
  'hist.hypersyncPlaced': 'Solo Hypersync tile placed on the Timeline',
  'hist.hypersyncRetrieved': 'Solo Hypersync tile retrieved',
};
