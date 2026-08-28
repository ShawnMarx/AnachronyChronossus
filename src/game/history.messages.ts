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
